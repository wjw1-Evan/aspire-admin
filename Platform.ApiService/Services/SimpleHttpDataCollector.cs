using Microsoft.EntityFrameworkCore;
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
    private readonly DbContext _context;
    private readonly IHttpClientFactory _httpClientFactory;
    private readonly IOptionsMonitor<IoTDataCollectionOptions> _optionsMonitor;
    private readonly ILogger<SimpleHttpDataCollector> _logger;

    public SimpleHttpDataCollector(
        DbContext context,
        IHttpClientFactory httpClientFactory,
        IOptionsMonitor<IoTDataCollectionOptions> optionsMonitor,
        ILogger<SimpleHttpDataCollector> logger)
    {
        _context = context;
        _httpClientFactory = httpClientFactory;
        _optionsMonitor = optionsMonitor;
        _logger = logger;
    }

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

        var device = await GetOrCreateDefaultDeviceAsync(gateway, cancellationToken);
        if (device == null)
        {
            result.Warning = "无法创建或获取设备";
            return result;
        }

        return await CollectDeviceDataAsync(gateway, device, cancellationToken);
    }

    public async Task<GatewayCollectionResult> CollectDeviceDataAsync(
        IoTGateway gateway,
        IoTDevice device,
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

        _logger.LogDebug("Collecting data for device {DeviceId} on gateway {GatewayId}", device.DeviceId, gateway.GatewayId);

        var httpData = await FetchHttpDataAsync(url, gateway, cancellationToken);
        if (httpData == null || httpData.Count == 0)
        {
            result.Warning = "HTTP请求未返回数据";
            return result;
        }

        var dataPoints = await GetDataPointsForDeviceAsync(gateway, device, cancellationToken);
        result.DataPointsFound = dataPoints.Count;

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

        if (unmatchedKeys.Count > 0)
        {
            _logger.LogWarning("HTTP response contains {Count} fields without configured data points for device {DeviceId}: {Fields}",
                unmatchedKeys.Count, device.DeviceId, string.Join(", ", unmatchedKeys));
        }

        if (recordsToSave.Count > 0)
        {
            var uniqueRecords = await FilterDuplicatesAsync(gateway.CompanyId, recordsToSave, cancellationToken);
            if (uniqueRecords.Count > 0)
            {
                await _context.Set<IoTDataRecord>().AddRangeAsync(uniqueRecords, cancellationToken);
                await _context.SaveChangesAsync(cancellationToken);

                foreach (var group in uniqueRecords.GroupBy(r => r.DataPointId))
                {
                    var latestRecord = group.OrderByDescending(r => r.ReportedAt).First();
                    if (dataPointValueMap.TryGetValue(latestRecord.DataPointId, out var dpInfo))
                    {
                        await UpdateDataPointLastValueAsync(dpInfo.DataPoint, latestRecord.Value, reportedAt, cancellationToken);
                    }
                }

                await UpdateDeviceLastReportedAsync(device, reportedAt, cancellationToken);
            }
            result.RecordsInserted = uniqueRecords.Count;
            result.RecordsSkipped = recordsToSave.Count - uniqueRecords.Count;
        }

        foreach (var dataPoint in dataPoints)
        {
            if (!matchedDataPointIds.Contains(dataPoint.DataPointId))
            {
                var entity = await _context.Set<IoTDataPoint>().FirstOrDefaultAsync(x => x.Id == dataPoint.Id, cancellationToken);
                if (entity != null)
                {
                    entity.LastUpdatedAt = reportedAt;
                    await _context.SaveChangesAsync(cancellationToken);
                }
            }
        }

        result.Success = true;
        if (dataPoints.Count == 0)
            result.Warning = $"设备 {device.DeviceId} 未配置任何数据点";
        
        return result;
    }

    private string? GetGatewayUrl(IoTGateway gateway)
    {
        if (gateway.Config != null && gateway.Config.TryGetValue("urlTemplate", out var urlTemplate) && !string.IsNullOrWhiteSpace(urlTemplate))
            return urlTemplate;
        return gateway.Address;
    }

    private async Task<Dictionary<string, object>?> FetchHttpDataAsync(string url, IoTGateway gateway, CancellationToken cancellationToken)
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
            if (gateway.Config != null && gateway.Config.TryGetValue("headers", out var headersStr))
            {
                try
                {
                    var headers = JsonSerializer.Deserialize<Dictionary<string, string>>(headersStr ?? "{}");
                    if (headers != null)
                        foreach (var h in headers) request.Headers.TryAddWithoutValidation(h.Key, h.Value);
                }
                catch { /* 忽略请求头解析错误 */ }
            }

            using var response = await httpClient.SendAsync(request, cancellationToken);
            if (!response.IsSuccessStatusCode) return null;

            var contentString = await response.Content.ReadAsStringAsync(cancellationToken);
            return JsonSerializer.Deserialize<Dictionary<string, object>>(contentString);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to fetch HTTP data for gateway {GatewayId}", gateway.GatewayId);
            return null;
        }
    }

    private async Task<IoTDevice?> GetOrCreateDefaultDeviceAsync(IoTGateway gateway, CancellationToken cancellationToken)
    {
        var device = await _context.Set<IoTDevice>()
            .FirstOrDefaultAsync(d => d.GatewayId == gateway.GatewayId && d.IsEnabled == true, cancellationToken);

        if (device != null) return device;

        device = await _context.Set<IoTDevice>()
            .FirstOrDefaultAsync(d => d.GatewayId == gateway.GatewayId, cancellationToken);

        if (device != null)
        {
            if (!device.IsEnabled)
            {
                device.IsEnabled = true;
                await _context.SaveChangesAsync(cancellationToken);
            }
            return device;
        }

        var defaultDevice = new IoTDevice
        {
            DeviceId = Guid.NewGuid().ToString("N"),
            GatewayId = gateway.GatewayId,
            CompanyId = gateway.CompanyId,
            Name = $"{gateway.Title}_设备",
            Title = $"{gateway.Title} - 默认设备",
            IsEnabled = true
        };

        await _context.Set<IoTDevice>().AddAsync(defaultDevice, cancellationToken);
        await _context.SaveChangesAsync(cancellationToken);
        return defaultDevice;
    }

    private async Task<List<IoTDataPoint>> GetDataPointsForDeviceAsync(IoTGateway gateway, IoTDevice device, CancellationToken cancellationToken)
    {
        var allDataPoints = await _context.Set<IoTDataPoint>()
            .Where(dp => dp.DeviceId == device.DeviceId && dp.IsEnabled == true)
            .ToListAsync(cancellationToken);

        var now = DateTime.UtcNow;
        return allDataPoints.Where(dp =>
        {
            if (!dp.LastUpdatedAt.HasValue) return true;
            return (now - dp.LastUpdatedAt.Value).TotalSeconds >= dp.SamplingInterval;
        }).ToList();
    }

    private static string ExtractValue(object? value)
    {
        if (value == null) return string.Empty;
        if (value is JsonElement je)
        {
            return je.ValueKind switch
            {
                JsonValueKind.String => je.GetString() ?? string.Empty,
                JsonValueKind.Number => je.GetRawText(),
                JsonValueKind.True => "true",
                JsonValueKind.False => "false",
                JsonValueKind.Null => string.Empty,
                _ => je.GetRawText()
            };
        }
        return value.ToString() ?? string.Empty;
    }

    private async Task<List<IoTDataRecord>> FilterDuplicatesAsync(string companyId, List<IoTDataRecord> records, CancellationToken cancellationToken)
    {
        if (records.Count == 0) return records;

        var deviceIds = records.Select(r => r.DeviceId).Distinct().ToList();
        var dataPointIds = records.Select(r => r.DataPointId).Distinct().ToList();
        var reportedAtValues = records.Select(r => r.ReportedAt).Distinct().ToList();

        var existingRecords = await _context.Set<IoTDataRecord>()
            .Where(r => r.CompanyId == companyId &&
                        deviceIds.Contains(r.DeviceId) &&
                        dataPointIds.Contains(r.DataPointId) &&
                        reportedAtValues.Contains(r.ReportedAt))
            .ToListAsync(cancellationToken);

        var existingKeys = existingRecords.Select(r => (r.DeviceId, r.DataPointId, r.ReportedAt)).ToHashSet();
        return records.Where(record => !existingKeys.Contains((record.DeviceId, record.DataPointId, record.ReportedAt))).ToList();
    }

    private async Task UpdateDataPointLastValueAsync(IoTDataPoint dataPoint, string value, DateTime reportedAt, CancellationToken cancellationToken)
    {
        var entity = await _context.Set<IoTDataPoint>().FirstOrDefaultAsync(x => x.Id == dataPoint.Id, cancellationToken);
        if (entity != null)
        {
            entity.LastValue = value;
            entity.LastUpdatedAt = reportedAt;
            await _context.SaveChangesAsync(cancellationToken);
        }
    }

    private async Task UpdateDeviceLastReportedAsync(IoTDevice device, DateTime reportedAt, CancellationToken cancellationToken)
    {
        var entity = await _context.Set<IoTDevice>().FirstOrDefaultAsync(x => x.Id == device.Id, cancellationToken);
        if (entity != null)
        {
            entity.LastReportedAt = reportedAt;
            await _context.SaveChangesAsync(cancellationToken);
        }
    }

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