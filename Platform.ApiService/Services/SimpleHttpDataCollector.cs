using System.Text.Json;
using Microsoft.Extensions.Options;
using Platform.ApiService.Models;
using Platform.ApiService.Options;
using Platform.ServiceDefaults.Services;

namespace Platform.ApiService.Services;

/// <summary>
/// 简化的HTTP数据采集器 - 直接从网关HTTP地址采集数据并自动保存
/// </summary>
public class SimpleHttpDataCollector
{
    private readonly IDatabaseOperationFactory<IoTGateway> _gatewayFactory;
    private readonly IDatabaseOperationFactory<IoTDevice> _deviceFactory;
    private readonly IDatabaseOperationFactory<IoTDataPoint> _dataPointFactory;
    private readonly IDatabaseOperationFactory<IoTDataRecord> _dataRecordFactory;
    private readonly IHttpClientFactory _httpClientFactory;
    private readonly IOptionsMonitor<IoTDataCollectionOptions> _optionsMonitor;
    private readonly ILogger<SimpleHttpDataCollector> _logger;

    public SimpleHttpDataCollector(
        IDatabaseOperationFactory<IoTGateway> gatewayFactory,
        IDatabaseOperationFactory<IoTDevice> deviceFactory,
        IDatabaseOperationFactory<IoTDataPoint> dataPointFactory,
        IDatabaseOperationFactory<IoTDataRecord> dataRecordFactory,
        IHttpClientFactory httpClientFactory,
        IOptionsMonitor<IoTDataCollectionOptions> optionsMonitor,
        ILogger<SimpleHttpDataCollector> logger)
    {
        _gatewayFactory = gatewayFactory;
        _deviceFactory = deviceFactory;
        _dataPointFactory = dataPointFactory;
        _dataRecordFactory = dataRecordFactory;
        _httpClientFactory = httpClientFactory;
        _optionsMonitor = optionsMonitor;
        _logger = logger;
    }

    /// <summary>
    /// 采集单个网关的HTTP数据
    /// </summary>
    public async Task<GatewayCollectionResult> CollectGatewayDataAsync(
        IoTGateway gateway,
        CancellationToken cancellationToken)
    {
        var result = new GatewayCollectionResult { GatewayId = gateway.GatewayId };

        if (!gateway.IsEnabled)
        {
            result.Warning = "网关未启用";
            return result;
        }

        if (gateway.ProtocolType?.Equals("HTTP", StringComparison.OrdinalIgnoreCase) != true)
        {
            result.Warning = "网关协议不是HTTP";
            return result;
        }

        var url = GetGatewayUrl(gateway);
        if (string.IsNullOrWhiteSpace(url))
        {
            result.Warning = "网关未配置HTTP地址";
            return result;
        }

        // 获取或创建默认设备
        // 优先使用网关下已有的设备，如果没有则创建默认设备
        var device = await GetOrCreateDefaultDeviceAsync(gateway, cancellationToken).ConfigureAwait(false);
        if (device == null)
        {
            result.Warning = "无法创建或获取设备";
            return result;
        }

        _logger.LogDebug("Using device {DeviceId} for gateway {GatewayId}", device.DeviceId, gateway.GatewayId);

        // 采集HTTP数据
        var httpData = await FetchHttpDataAsync(url, gateway, cancellationToken).ConfigureAwait(false);
        if (httpData == null || httpData.Count == 0)
        {
            result.Warning = "HTTP请求未返回数据";
            return result;
        }

        // 自动发现并创建数据点（如果不存在）
        var dataPoints = await EnsureDataPointsExistAsync(gateway, device, httpData, cancellationToken).ConfigureAwait(false);
        result.DataPointsFound = dataPoints.Count;

        // 保存数据记录
        var recordsInserted = 0;
        var recordsSkipped = 0;
        var reportedAt = DateTime.UtcNow;

        foreach (var kvp in httpData)
        {
            var dataPoint = dataPoints.FirstOrDefault(dp => 
                dp.Name.Equals(kvp.Key, StringComparison.OrdinalIgnoreCase) ||
                dp.DataPointId.Equals(kvp.Key, StringComparison.OrdinalIgnoreCase));

            if (dataPoint == null)
            {
                continue;
            }

            var value = ExtractValue(kvp.Value);
            var record = new IoTDataRecord
            {
                DeviceId = device.DeviceId,
                DataPointId = dataPoint.DataPointId,
                Value = value,
                DataType = dataPoint.DataType,
                SamplingInterval = dataPoint.SamplingInterval,
                ReportedAt = reportedAt,
                IsAlarm = false,
                CompanyId = gateway.CompanyId
            };

            // 检查重复
            var exists = await CheckDuplicateAsync(gateway.CompanyId, record, cancellationToken).ConfigureAwait(false);
            if (exists)
            {
                recordsSkipped++;
                continue;
            }

            await _dataRecordFactory.CreateAsync(record).ConfigureAwait(false);
            
            // 更新数据点最后值
            await UpdateDataPointLastValueAsync(gateway.CompanyId, dataPoint, value, reportedAt, cancellationToken).ConfigureAwait(false);
            
            recordsInserted++;
        }

        // 更新设备最后上报时间
        await UpdateDeviceLastReportedAsync(gateway.CompanyId, device, reportedAt, cancellationToken).ConfigureAwait(false);

        result.RecordsInserted = recordsInserted;
        result.RecordsSkipped = recordsSkipped;
        result.Success = true;

        _logger.LogInformation(
            "Gateway {GatewayId} collected: {RecordsInserted} records inserted, {RecordsSkipped} skipped",
            gateway.GatewayId, recordsInserted, recordsSkipped);

        return result;
    }

    private string? GetGatewayUrl(IoTGateway gateway)
    {
        // 优先从 Config 读取 urlTemplate
        if (gateway.Config != null && gateway.Config.TryGetValue("urlTemplate", out var urlTemplate) && !string.IsNullOrWhiteSpace(urlTemplate))
        {
            return urlTemplate;
        }

        // 回退到 Address
        return gateway.Address;
    }

    private async Task<Dictionary<string, object>?> FetchHttpDataAsync(
        string url,
        IoTGateway gateway,
        CancellationToken cancellationToken)
    {
        try
        {
            var httpClient = _httpClientFactory.CreateClient(nameof(SimpleHttpDataCollector));
            httpClient.Timeout = TimeSpan.FromSeconds(30);

            var method = HttpMethod.Get;
            if (gateway.Config != null && gateway.Config.TryGetValue("httpMethod", out var methodStr))
            {
                method = methodStr?.ToUpperInvariant() switch
                {
                    "POST" => HttpMethod.Post,
                    "PUT" => HttpMethod.Put,
                    "PATCH" => HttpMethod.Patch,
                    "DELETE" => HttpMethod.Delete,
                    _ => HttpMethod.Get
                };
            }

            var request = new HttpRequestMessage(method, url);
            
            // 添加请求头（如果有配置）
            if (gateway.Config != null && gateway.Config.TryGetValue("headers", out var headersStr))
            {
                try
                {
                    var headers = JsonSerializer.Deserialize<Dictionary<string, string>>(headersStr ?? "{}");
                    if (headers != null)
                    {
                        foreach (var h in headers)
                        {
                            request.Headers.TryAddWithoutValidation(h.Key, h.Value);
                        }
                    }
                }
                catch
                {
                    // 忽略头部解析错误
                }
            }

            using var response = await httpClient.SendAsync(request, cancellationToken).ConfigureAwait(false);
            if (!response.IsSuccessStatusCode)
            {
                _logger.LogWarning("HTTP {StatusCode} when fetching gateway {GatewayId} from {Url}",
                    response.StatusCode, gateway.GatewayId, url);
                return null;
            }

            var contentString = await response.Content.ReadAsStringAsync(cancellationToken).ConfigureAwait(false);
            var payload = JsonSerializer.Deserialize<Dictionary<string, object>>(contentString);

            if (payload == null || payload.Count == 0)
            {
                _logger.LogWarning("Gateway {GatewayId} returned empty or invalid JSON", gateway.GatewayId);
                return null;
            }

            _logger.LogDebug("Fetched {KeyCount} keys from gateway {GatewayId}: {Keys}",
                payload.Count, gateway.GatewayId, string.Join(", ", payload.Keys));

            return payload;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to fetch HTTP data for gateway {GatewayId} from {Url}",
                gateway.GatewayId, url);
            return null;
        }
    }

    private async Task<IoTDevice?> GetOrCreateDefaultDeviceAsync(
        IoTGateway gateway,
        CancellationToken cancellationToken)
    {
        // 查找网关下的设备（优先使用已启用的设备）
        var deviceFilter = _deviceFactory.CreateFilterBuilder()
            .Equal(d => d.GatewayId, gateway.GatewayId)
            .Equal(d => d.IsEnabled, true)
            .WithTenant(gateway.CompanyId)
            .ExcludeDeleted()
            .Build();

        var devices = await _deviceFactory.FindAsync(deviceFilter).ConfigureAwait(false);
        
        // 优先返回第一个启用的设备
        if (devices.Count > 0)
        {
            _logger.LogDebug("Found existing device {DeviceId} for gateway {GatewayId}", 
                devices[0].DeviceId, gateway.GatewayId);
            return devices[0];
        }

        // 如果没有启用的设备，检查是否有任何设备（包括禁用的）
        var anyDeviceFilter = _deviceFactory.CreateFilterBuilder()
            .Equal(d => d.GatewayId, gateway.GatewayId)
            .WithTenant(gateway.CompanyId)
            .ExcludeDeleted()
            .Build();

        var anyDevices = await _deviceFactory.FindAsync(anyDeviceFilter, limit: 1).ConfigureAwait(false);
        if (anyDevices.Count > 0)
        {
            // 如果有设备但被禁用了，启用它
            var device = anyDevices[0];
            if (!device.IsEnabled)
            {
                var updateFilter = _deviceFactory.CreateFilterBuilder()
                    .Equal(d => d.DeviceId, device.DeviceId)
                    .WithTenant(gateway.CompanyId)
                    .ExcludeDeleted()
                    .Build();
                var update = _deviceFactory.CreateUpdateBuilder()
                    .Set(d => d.IsEnabled, true)
                    .Build();
                await _deviceFactory.FindOneAndUpdateAsync(updateFilter, update).ConfigureAwait(false);
                _logger.LogInformation("Enabled existing device {DeviceId} for gateway {GatewayId}",
                    device.DeviceId, gateway.GatewayId);
            }
            return device;
        }

        // 创建默认设备（仅在网关下没有任何设备时）
        var defaultDevice = new IoTDevice
        {
            DeviceId = Guid.NewGuid().ToString(),
            GatewayId = gateway.GatewayId,
            CompanyId = gateway.CompanyId,
            Name = $"{gateway.Title}_设备",
            Title = $"{gateway.Title} - 默认设备",
            DeviceType = IoTDeviceType.Sensor,
            IsEnabled = true,
            Status = IoTDeviceStatus.Online
        };

        await _deviceFactory.CreateAsync(defaultDevice).ConfigureAwait(false);
        _logger.LogInformation("Created default device {DeviceId} for gateway {GatewayId}",
            defaultDevice.DeviceId, gateway.GatewayId);

        return defaultDevice;
    }

    private async Task<List<IoTDataPoint>> EnsureDataPointsExistAsync(
        IoTGateway gateway,
        IoTDevice device,
        Dictionary<string, object> httpData,
        CancellationToken cancellationToken)
    {
        var existingFilter = _dataPointFactory.CreateFilterBuilder()
            .Equal(dp => dp.DeviceId, device.DeviceId)
            .WithTenant(gateway.CompanyId)
            .ExcludeDeleted()
            .Build();

        var existing = await _dataPointFactory.FindAsync(existingFilter).ConfigureAwait(false);
        var existingKeys = existing.Select(dp => dp.Name).ToHashSet(StringComparer.OrdinalIgnoreCase);

        var dataPoints = existing.ToList();

        // 为HTTP响应中的新字段创建数据点（仅当不存在时）
        // 这样既支持自动发现，也支持手动创建的数据点
        foreach (var kvp in httpData)
        {
            // 检查是否已存在（按名称匹配）
            if (existingKeys.Contains(kvp.Key))
            {
                continue;
            }

            // 检查是否已存在（按DataPointId匹配，以防名称不同但ID相同）
            var existingByKey = existing.FirstOrDefault(dp => 
                dp.DataPointId.Equals(kvp.Key, StringComparison.OrdinalIgnoreCase));
            if (existingByKey != null)
            {
                continue;
            }

            // 自动创建新数据点
            var dataType = InferDataType(kvp.Value);
            var dataPoint = new IoTDataPoint
            {
                DataPointId = Guid.NewGuid().ToString(),
                DeviceId = device.DeviceId,
                CompanyId = gateway.CompanyId,
                Name = kvp.Key,
                Title = kvp.Key,
                DataType = dataType,
                IsEnabled = true,
                SamplingInterval = 60, // 默认60秒
                IsReadOnly = true
            };

            await _dataPointFactory.CreateAsync(dataPoint).ConfigureAwait(false);
            dataPoints.Add(dataPoint);
            existingKeys.Add(kvp.Key);

            _logger.LogInformation("Auto-created data point {DataPointId} ({Name}) for device {DeviceId}",
                dataPoint.DataPointId, dataPoint.Name, device.DeviceId);
        }

        // 返回所有启用的数据点（包括手动创建和自动创建的）
        return dataPoints.Where(dp => dp.IsEnabled).ToList();
    }

    private static DataPointType InferDataType(object? value)
    {
        if (value == null)
        {
            return DataPointType.String;
        }

        return value switch
        {
            bool => DataPointType.Boolean,
            sbyte or byte or short or ushort or int or uint or long or ulong or float or double or decimal => DataPointType.Numeric,
            string => DataPointType.String,
            JsonElement je when je.ValueKind == JsonValueKind.True || je.ValueKind == JsonValueKind.False => DataPointType.Boolean,
            JsonElement je when je.ValueKind == JsonValueKind.Number => DataPointType.Numeric,
            JsonElement je when je.ValueKind == JsonValueKind.String => DataPointType.String,
            JsonElement je when je.ValueKind == JsonValueKind.Object || je.ValueKind == JsonValueKind.Array => DataPointType.Json,
            _ => DataPointType.String
        };
    }

    private static string ExtractValue(object? value)
    {
        if (value == null)
        {
            return string.Empty;
        }

        if (value is JsonElement je)
        {
            return je.ValueKind switch
            {
                JsonValueKind.String => je.GetString() ?? string.Empty,
                JsonValueKind.Number => je.GetRawText(),
                JsonValueKind.True => "true",
                JsonValueKind.False => "false",
                JsonValueKind.Null => string.Empty,
                JsonValueKind.Object or JsonValueKind.Array => je.GetRawText(),
                _ => value.ToString() ?? string.Empty
            };
        }

        return value.ToString() ?? string.Empty;
    }

    private async Task<bool> CheckDuplicateAsync(
        string companyId,
        IoTDataRecord record,
        CancellationToken cancellationToken)
    {
        var filter = _dataRecordFactory.CreateFilterBuilder()
            .Equal(r => r.DeviceId, record.DeviceId)
            .Equal(r => r.DataPointId, record.DataPointId)
            .Equal(r => r.ReportedAt, record.ReportedAt)
            .WithTenant(companyId)
            .ExcludeDeleted()
            .Build();

        var count = await _dataRecordFactory.CountAsync(filter).ConfigureAwait(false);
        return count > 0;
    }

    private async Task UpdateDataPointLastValueAsync(
        string companyId,
        IoTDataPoint dataPoint,
        string value,
        DateTime reportedAt,
        CancellationToken cancellationToken)
    {
        var filter = _dataPointFactory.CreateFilterBuilder()
            .Equal(dp => dp.DataPointId, dataPoint.DataPointId)
            .WithTenant(companyId)
            .ExcludeDeleted()
            .Build();

        var update = _dataPointFactory.CreateUpdateBuilder()
            .Set(dp => dp.LastValue, value)
            .Set(dp => dp.LastUpdatedAt, reportedAt)
            .Build();

        await _dataPointFactory.FindOneAndUpdateAsync(filter, update).ConfigureAwait(false);
    }

    private async Task UpdateDeviceLastReportedAsync(
        string companyId,
        IoTDevice device,
        DateTime reportedAt,
        CancellationToken cancellationToken)
    {
        var filter = _deviceFactory.CreateFilterBuilder()
            .Equal(d => d.DeviceId, device.DeviceId)
            .WithTenant(companyId)
            .ExcludeDeleted()
            .Build();

        var update = _deviceFactory.CreateUpdateBuilder()
            .Set(d => d.LastReportedAt, reportedAt)
            .Build();

        await _deviceFactory.FindOneAndUpdateAsync(filter, update).ConfigureAwait(false);
    }

    /// <summary>
    /// 网关采集结果
    /// </summary>
    public class GatewayCollectionResult
    {
        public string GatewayId { get; set; } = string.Empty;
        public bool Success { get; set; }
        public int DataPointsFound { get; set; }
        public int RecordsInserted { get; set; }
        public int RecordsSkipped { get; set; }
        public string? Warning { get; set; }
    }
}
