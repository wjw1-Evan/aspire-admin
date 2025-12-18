using System.Text.Json;
using Microsoft.Extensions.Options;
using MongoDB.Driver;
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

    /// <summary>
    /// 初始化简化的 HTTP 数据采集器
    /// </summary>
    /// <param name="gatewayFactory">网关数据操作工厂</param>
    /// <param name="deviceFactory">设备数据操作工厂</param>
    /// <param name="dataPointFactory">数据点数据操作工厂</param>
    /// <param name="dataRecordFactory">数据记录数据操作工厂</param>
    /// <param name="httpClientFactory">HTTP 客户端工厂</param>
    /// <param name="optionsMonitor">数据采集配置选项监视器</param>
    /// <param name="logger">日志记录器</param>
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

        // 查询设备下已配置的数据点（仅使用用户手动创建的数据点）
        var dataPoints = await GetDataPointsForDeviceAsync(gateway, device, cancellationToken).ConfigureAwait(false);
        result.DataPointsFound = dataPoints.Count;

        // 构建数据记录（统一时间戳）
        var reportedAt = DateTime.UtcNow;
        var recordsToSave = new List<IoTDataRecord>();
        var dataPointValueMap = new Dictionary<string, (IoTDataPoint DataPoint, string Value)>();
        var matchedDataPointIds = new HashSet<string>();

        var unmatchedKeys = new List<string>();
        
        foreach (var kvp in httpData)
        {
            var dataPoint = dataPoints.FirstOrDefault(dp => 
                dp.Name.Equals(kvp.Key, StringComparison.OrdinalIgnoreCase) ||
                dp.DataPointId.Equals(kvp.Key, StringComparison.OrdinalIgnoreCase));

            if (dataPoint == null)
            {
                // HTTP响应中有该字段，但未配置对应的数据点，跳过
                unmatchedKeys.Add(kvp.Key);
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

            recordsToSave.Add(record);
            dataPointValueMap[dataPoint.DataPointId] = (dataPoint, value);
            matchedDataPointIds.Add(dataPoint.DataPointId);
        }

        // 记录未匹配的字段（HTTP响应中有但未配置数据点）
        if (unmatchedKeys.Count > 0)
        {
            _logger.LogWarning("HTTP response contains {Count} fields without configured data points for device {DeviceId}: {Fields}. " +
                "Please create data points manually for these fields.",
                unmatchedKeys.Count, device.DeviceId, string.Join(", ", unmatchedKeys));
        }

        // 批量检查重复并保存（如果有数据记录）
        var recordsInserted = 0;
        var recordsSkipped = 0;
        
        if (recordsToSave.Count > 0)
        {
            var uniqueRecords = await FilterDuplicatesAsync(gateway.CompanyId, recordsToSave, cancellationToken).ConfigureAwait(false);
            recordsInserted = uniqueRecords.Count;
            recordsSkipped = recordsToSave.Count - uniqueRecords.Count;

            if (uniqueRecords.Count > 0)
            {
                // 批量保存所有记录
                await _dataRecordFactory.CreateManyAsync(uniqueRecords).ConfigureAwait(false);
                
                // 按数据点分组，每个数据点只更新一次（使用最新的值）
                foreach (var group in uniqueRecords.GroupBy(r => r.DataPointId))
                {
                    var latestRecord = group.OrderByDescending(r => r.ReportedAt).First();
                    if (dataPointValueMap.TryGetValue(latestRecord.DataPointId, out var dpInfo))
                    {
                        await UpdateDataPointLastValueAsync(gateway.CompanyId, dpInfo.DataPoint, latestRecord.Value, reportedAt, cancellationToken).ConfigureAwait(false);
                    }
                }

                // 更新设备最后上报时间
                await UpdateDeviceLastReportedAsync(gateway.CompanyId, device, reportedAt, cancellationToken).ConfigureAwait(false);
            }
        }

        // 重要：更新所有被请求采集的数据点的 LastUpdatedAt，即使 HTTP 响应中没有它们的数据
        // 这样可以避免这些数据点一直被过滤出来但采集不到数据的情况
        foreach (var dataPoint in dataPoints)
        {
            // 如果这个数据点没有被采集到数据，也要更新它的 LastUpdatedAt，避免它一直被过滤出来
            if (!matchedDataPointIds.Contains(dataPoint.DataPointId))
            {
                _logger.LogDebug("Data point {DataPointId} ({Name}) not found in HTTP response, updating LastUpdatedAt to prevent repeated filtering", 
                    dataPoint.DataPointId, dataPoint.Name);
                
                var filter = _dataPointFactory.CreateFilterBuilder()
                    .Equal(dp => dp.DataPointId, dataPoint.DataPointId)
                    .WithTenant(gateway.CompanyId)
                    .ExcludeDeleted()
                    .Build();

                var update = _dataPointFactory.CreateUpdateBuilder()
                    .Set(dp => dp.LastUpdatedAt, reportedAt)
                    .Build();

                await _dataPointFactory.FindOneAndUpdateAsync(filter, update).ConfigureAwait(false);
            }
        }

        result.RecordsInserted = recordsInserted;
        result.RecordsSkipped = recordsSkipped;
        result.Success = true;
        
        if (dataPoints.Count == 0)
        {
            result.Warning = $"设备 {device.DeviceId} 未配置任何数据点，请先手动创建数据点";
        }
        else if (recordsToSave.Count == 0 && unmatchedKeys.Count > 0)
        {
            result.Warning = $"HTTP响应中的字段 [{string.Join(", ", unmatchedKeys)}] 未配置对应的数据点";
        }

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
            DeviceId = Guid.NewGuid().ToString("N"), // 使用无连字符格式，避免序列化问题
            GatewayId = gateway.GatewayId,
            CompanyId = gateway.CompanyId,
            Name = $"{gateway.Title}_设备",
            Title = $"{gateway.Title} - 默认设备",
            IsEnabled = true
        };

        await _deviceFactory.CreateAsync(defaultDevice).ConfigureAwait(false);
        _logger.LogInformation("Created default device {DeviceId} for gateway {GatewayId}",
            defaultDevice.DeviceId, gateway.GatewayId);

        return defaultDevice;
    }

    /// <summary>
    /// 获取设备下已配置的数据点（仅返回用户手动创建的数据点，并根据采样间隔过滤）
    /// </summary>
    private async Task<List<IoTDataPoint>> GetDataPointsForDeviceAsync(
        IoTGateway gateway,
        IoTDevice device,
        CancellationToken cancellationToken)
    {
        var filter = _dataPointFactory.CreateFilterBuilder()
            .Equal(dp => dp.DeviceId, device.DeviceId)
            .Equal(dp => dp.IsEnabled, true)
            .WithTenant(gateway.CompanyId)
            .ExcludeDeleted()
            .Build();

        var allDataPoints = await _dataPointFactory.FindAsync(filter).ConfigureAwait(false);
        
        // 根据采样间隔过滤数据点：只返回需要采集的数据点
        var now = DateTime.UtcNow;
        var dataPoints = allDataPoints.Where(dp =>
        {
            // 如果从未采集过，需要采集
            if (!dp.LastUpdatedAt.HasValue)
            {
                return true;
            }

            // 计算距离上次采集的时间间隔（秒）
            var elapsedSeconds = (now - dp.LastUpdatedAt.Value).TotalSeconds;
            
            // 如果已超过采样间隔，需要采集
            return elapsedSeconds >= dp.SamplingInterval;
        }).ToList();
        
        _logger.LogDebug("Found {ReadyCount}/{TotalCount} enabled data points ready for collection on device {DeviceId}", 
            dataPoints.Count, allDataPoints.Count, device.DeviceId);
        
        return dataPoints;
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

    /// <summary>
    /// 批量过滤重复记录
    /// </summary>
    private async Task<List<IoTDataRecord>> FilterDuplicatesAsync(
        string companyId,
        List<IoTDataRecord> records,
        CancellationToken cancellationToken)
    {
        if (records.Count == 0)
        {
            return records;
        }

        // 使用 MongoDB 的 $or 查询检查所有记录
        var builder = MongoDB.Driver.Builders<IoTDataRecord>.Filter;
        var orConditions = records.Select(record =>
            builder.And(
                builder.Eq(r => r.DeviceId, record.DeviceId),
                builder.Eq(r => r.DataPointId, record.DataPointId),
                builder.Eq(r => r.ReportedAt, record.ReportedAt)
            )
        ).ToList();

        // 构建完整查询：租户过滤 + 软删除过滤 + OR条件
        var baseFilter = _dataRecordFactory.CreateFilterBuilder()
            .WithTenant(companyId)
            .ExcludeDeleted()
            .Build();

        var orFilter = orConditions.Count > 0 ? builder.Or(orConditions) : builder.Empty;
        var combinedFilter = builder.And(baseFilter, orFilter);

        // 查询已存在的记录
        var existingRecords = await _dataRecordFactory.FindAsync(combinedFilter).ConfigureAwait(false);

        // 构建已存在记录的键集合（用于快速查找）
        var existingKeys = existingRecords
            .Select(r => (r.DeviceId, r.DataPointId, r.ReportedAt))
            .ToHashSet();

        // 过滤出不重复的记录
        var uniqueRecords = records
            .Where(record => !existingKeys.Contains((record.DeviceId, record.DataPointId, record.ReportedAt)))
            .ToList();

        return uniqueRecords;
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
        /// <summary>网关 ID</summary>
        public string GatewayId { get; set; } = string.Empty;
        /// <summary>是否采集成功</summary>
        public bool Success { get; set; }
        /// <summary>找到的数据点数量</summary>
        public int DataPointsFound { get; set; }
        /// <summary>插入的记录数量</summary>
        public int RecordsInserted { get; set; }
        /// <summary>跳过的记录数量（重复或无效）</summary>
        public int RecordsSkipped { get; set; }
        /// <summary>警告信息（如果有）</summary>
        public string? Warning { get; set; }
    }
}
