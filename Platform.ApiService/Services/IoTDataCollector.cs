using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Platform.ApiService.Models;
using Platform.ApiService.Options;
using Platform.ServiceDefaults.Services;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Net.Http;
using System.Text.Json;
using System.Threading;
using System.Threading.Tasks;

namespace Platform.ApiService.Services;

/// <summary>
/// IoT 数据采集服务
/// </summary>
public class IoTDataCollector
{
    private readonly DbContext _context;
    private readonly IHttpClientFactory _httpClientFactory;
    private readonly IOptionsMonitor<IoTDataCollectionOptions> _optionsMonitor;
    private readonly ILogger<IoTDataCollector> _logger;

    public IoTDataCollector(DbContext context,
        IHttpClientFactory httpClientFactory,
        IOptionsMonitor<IoTDataCollectionOptions> optionsMonitor,
        ILogger<IoTDataCollector> logger)
    {
        _context = context;
        _httpClientFactory = httpClientFactory;
        _optionsMonitor = optionsMonitor;
        _logger = logger;
    }

    public async Task CollectDataAsync(CancellationToken cancellationToken)
    {
        var options = _optionsMonitor.CurrentValue;
        if (!options.Enabled) return;

        var devices = await _context.Set<IoTDevice>().IgnoreQueryFilters().Where(x => x.IsDeleted != true && x.Status == IoTDeviceStatus.Online).ToListAsync(cancellationToken);
        foreach (var device in devices)
        {
            try { await ProcessDeviceAsync(device, cancellationToken); }
            catch (Exception ex) { _logger.LogError(ex, "Failed to collect data for device {DeviceId}", device.DeviceId); }
        }
    }

    private async Task ProcessDeviceAsync(IoTDevice device, CancellationToken ct)
    {
        var gateway = await _context.Set<IoTGateway>().IgnoreQueryFilters().FirstOrDefaultAsync(g => g.CompanyId == device.CompanyId && g.GatewayId == device.GatewayId, ct);
        if (gateway == null) return;

        var dataPoints = await _context.Set<IoTDataPoint>().Where(p => p.DeviceId == device.DeviceId).ToListAsync(ct);
        if (!dataPoints.Any()) return;

        var results = await FetchDataFromGatewayAsync(gateway, device, dataPoints, ct);
        if (!results.Any()) return;

        var records = results.Select(r => BuildRecord(device, dataPoints.First(p => p.DataPointId == r.Key), r.Value)).ToList();
        var unique = await FilterDuplicatesAsync(device.CompanyId, records, ct);
        if (unique.Any())
        {
            await _context.Set<IoTDataRecord>().AddRangeAsync(unique, ct);
            await _context.SaveChangesAsync(ct);
            foreach (var r in unique)
            {
                var dp = dataPoints.First(p => p.DataPointId == r.DataPointId);
                dp.LastValue = r.Value;
                dp.LastUpdatedAt = r.ReportedAt;
                device.LastReportedAt = r.ReportedAt;
            }
            await _context.SaveChangesAsync(ct);
        }
    }

    private Task<Dictionary<string, CollectedDataPointValue>> FetchDataFromGatewayAsync(IoTGateway gateway, IoTDevice device, List<IoTDataPoint> dps, CancellationToken ct)
    {
        // 简化实现，实际可能需要根据协议调用不同网关接口
        return Task.FromResult(new Dictionary<string, CollectedDataPointValue>());
    }

    private IoTDataRecord BuildRecord(IoTDevice device, IoTDataPoint dp, CollectedDataPointValue val)
    {
        var (isAlarm, level) = EvaluateAlarm(dp, val.Value, val.IsAlarm, val.AlarmLevel);
        return new IoTDataRecord
        {
            DeviceId = device.DeviceId, DataPointId = dp.DataPointId, Value = val.Value,
            DataType = dp.DataType, SamplingInterval = dp.SamplingInterval, ReportedAt = val.ReportedAt ?? DateTime.UtcNow,
            IsAlarm = isAlarm, AlarmLevel = level, CompanyId = device.CompanyId
        };
    }

    private async Task<List<IoTDataRecord>> FilterDuplicatesAsync(string cid, List<IoTDataRecord> records, CancellationToken ct)
    {
        if (!records.Any()) return records;
        var deviceIds = records.Select(r => r.DeviceId).Distinct().ToList();
        var dpIds = records.Select(r => r.DataPointId).Distinct().ToList();
        var times = records.Select(r => r.ReportedAt).Distinct().ToList();

        var existing = await _context.Set<IoTDataRecord>().Where(r => r.CompanyId == cid && deviceIds.Contains(r.DeviceId) && dpIds.Contains(r.DataPointId) && times.Contains(r.ReportedAt)).ToListAsync(ct);
        var keys = existing.Select(r => (r.DeviceId, r.DataPointId, r.ReportedAt)).ToHashSet();
        return records.Where(r => !keys.Contains((r.DeviceId, r.DataPointId, r.ReportedAt))).ToList();
    }

    private static (bool IsAlarm, string? Level) EvaluateAlarm(IoTDataPoint dp, string val, bool? srcIsAlarm, string? srcLevel)
    {
        if (srcIsAlarm.HasValue) return (srcIsAlarm.Value, srcLevel);
        if (dp.AlarmConfig?.IsEnabled != true || !double.TryParse(val, out var n)) return (false, null);
        var c = dp.AlarmConfig;
        return c.AlarmType switch
        {
            "HighThreshold" => (n > c.Threshold, n > c.Threshold ? c.Level : null),
            "LowThreshold" => (n < c.Threshold, n < c.Threshold ? c.Level : null),
            "RangeThreshold" => (n < c.Threshold || (c.ThresholdHigh.HasValue && n > c.ThresholdHigh.Value), (n < c.Threshold || (c.ThresholdHigh.HasValue && n > c.ThresholdHigh.Value)) ? c.Level : null),
            _ => (false, null)
        };
    }

    public class CollectedDataPointValue
    {
        public string Value { get; set; } = string.Empty;
        public DateTime? ReportedAt { get; set; }
        public bool? IsAlarm { get; set; }
        public string? AlarmLevel { get; set; }
    }
}