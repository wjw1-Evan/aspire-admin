using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Platform.ApiService.Models;
using Platform.ServiceDefaults.Extensions;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace Platform.ApiService.Services.IoT;

/// <summary>
/// 物联网数据点服务
/// </summary>
public class IoTDataPointService
{
    private readonly DbContext _context;
    private readonly ILogger<IoTDataPointService> _logger;

    public IoTDataPointService(DbContext context, ILogger<IoTDataPointService> logger)
    {
        _context = context;
        _logger = logger ?? throw new ArgumentNullException(nameof(logger));
    }

    public async Task<IoTDataPoint> CreateDataPointAsync(CreateIoTDataPointRequest request)
    {
        var dataPoint = new IoTDataPoint
        {
            Name = request.Name,
            Title = request.Title,
            DeviceId = request.DeviceId,
            DataType = request.DataType,
            Unit = request.Unit,
            IsReadOnly = request.IsReadOnly,
            SamplingInterval = request.SamplingInterval,
            AlarmConfig = request.AlarmConfig
        };

        await _context.Set<IoTDataPoint>().AddAsync(dataPoint);
        await _context.SaveChangesAsync();
        _logger.LogInformation("DataPoint created: {DataPointId}", dataPoint.DataPointId);
        return dataPoint;
    }

    public async Task<System.Linq.Dynamic.Core.PagedResult<IoTDataPoint>> GetDataPointsAsync(Platform.ServiceDefaults.Models.PageParams request, string? deviceId = null)
    {
        var query = _context.Set<IoTDataPoint>().AsQueryable();

        if (!string.IsNullOrEmpty(deviceId))
        {
            query = query.Where(dp => dp.DeviceId == deviceId);
        }

        return query.OrderByDescending(dp => dp.CreatedAt).ToPagedList(request);
    }

    public async Task<IoTDataPoint?> GetDataPointByIdAsync(string id)
    {
        return await _context.Set<IoTDataPoint>().FirstOrDefaultAsync(x => x.Id == id);
    }

    public async Task<IoTDataPoint?> GetDataPointByDataPointIdAsync(string dataPointId)
    {
        return await _context.Set<IoTDataPoint>().FirstOrDefaultAsync(dp => dp.DataPointId == dataPointId);
    }

    public async Task<IoTDataPoint?> UpdateDataPointAsync(string id, UpdateIoTDataPointRequest request)
    {
        var dataPoint = await _context.Set<IoTDataPoint>().FirstOrDefaultAsync(x => x.Id == id);
        if (dataPoint == null) return null;

        if (!string.IsNullOrEmpty(request.Name)) dataPoint.Name = request.Name;
        if (!string.IsNullOrEmpty(request.Title)) dataPoint.Title = request.Title;
        if (request.DataType.HasValue) dataPoint.DataType = request.DataType.Value;
        if (request.Unit != null) dataPoint.Unit = request.Unit;
        if (request.IsReadOnly.HasValue) dataPoint.IsReadOnly = request.IsReadOnly.Value;
        if (request.SamplingInterval.HasValue) dataPoint.SamplingInterval = request.SamplingInterval.Value;
        if (request.IsEnabled.HasValue) dataPoint.IsEnabled = request.IsEnabled.Value;
        if (request.AlarmConfig != null) dataPoint.AlarmConfig = request.AlarmConfig;

        await _context.SaveChangesAsync();
        return dataPoint;
    }

    public async Task<bool> DeleteDataPointAsync(string id)
    {
        var dataPoint = await _context.Set<IoTDataPoint>().FirstOrDefaultAsync(x => x.Id == id);
        if (dataPoint == null) return false;

        _context.Set<IoTDataPoint>().Remove(dataPoint);
        await _context.SaveChangesAsync();
        _logger.LogInformation("DataPoint deleted: {DataPointId}", dataPoint.DataPointId);
        return true;
    }

    public async Task<IoTDataRecord> ReportDataAsync(ReportIoTDataRequest request, Func<string, Task<IoTDataPoint?>> getDataPointByIdAsync, Func<string, Task<IoTDevice?>> getDeviceByIdAsync)
    {
        var dataPoint = await getDataPointByIdAsync(request.DataPointId);
        if (dataPoint == null) throw new InvalidOperationException($"DataPoint {request.DataPointId} not found");

        var record = new IoTDataRecord
        {
            DeviceId = request.DeviceId,
            DataPointId = request.DataPointId,
            Value = request.Value,
            DataType = dataPoint.DataType,
            SamplingInterval = dataPoint.SamplingInterval,
            ReportedAt = request.ReportedAt ?? DateTime.UtcNow
        };

        if (dataPoint.AlarmConfig?.IsEnabled == true && double.TryParse(request.Value, out var numValue))
        {
            var isAlarm = CheckAlarm(numValue, dataPoint.AlarmConfig);
            record.IsAlarm = isAlarm;
            if (isAlarm) record.AlarmLevel = dataPoint.AlarmConfig.Level;
        }

        await _context.Set<IoTDataRecord>().AddAsync(record);

        dataPoint.LastValue = request.Value;
        dataPoint.LastUpdatedAt = DateTime.UtcNow;

        var device = await getDeviceByIdAsync(request.DeviceId);
        if (device != null) device.LastReportedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();
        return record;
    }

    public async Task<List<IoTDataRecord>> BatchReportDataAsync(BatchReportIoTDataRequest request, Func<string, Task<IoTDataPoint?>> getDataPointByIdAsync, Func<string, Task<IoTDevice?>> getDeviceByIdAsync)
    {
        const int maxBatchSize = 100;
        if (request.DataPoints == null || request.DataPoints.Count == 0) throw new ArgumentException("批量数据点列表不能为空");
        if (request.DataPoints.Count > maxBatchSize) throw new ArgumentException($"批量数据点数量不能超过 {maxBatchSize} 条");

        var requestedDataPointIds = request.DataPoints.Select(dp => dp.DataPointId).Distinct().ToList();
        var dpLookup = await _context.Set<IoTDataPoint>().Where(dp => requestedDataPointIds.Contains(dp.DataPointId)).ToDictionaryAsync(dp => dp.DataPointId);

        var reportedAt = request.ReportedAt ?? DateTime.UtcNow;
        var records = new List<IoTDataRecord>();

        foreach (var item in request.DataPoints)
        {
            if (!dpLookup.TryGetValue(item.DataPointId, out var dataPoint)) continue;

            var record = new IoTDataRecord
            {
                DeviceId = request.DeviceId,
                DataPointId = item.DataPointId,
                Value = item.Value,
                DataType = dataPoint.DataType,
                SamplingInterval = dataPoint.SamplingInterval,
                ReportedAt = reportedAt
            };

            if (dataPoint.AlarmConfig?.IsEnabled == true && double.TryParse(item.Value, out var numValue))
            {
                var isAlarm = CheckAlarm(numValue, dataPoint.AlarmConfig);
                record.IsAlarm = isAlarm;
                if (isAlarm) record.AlarmLevel = dataPoint.AlarmConfig.Level;
            }

            records.Add(record);
            dataPoint.LastValue = item.Value;
            dataPoint.LastUpdatedAt = reportedAt;
        }

        if (records.Count > 0)
        {
            await _context.Set<IoTDataRecord>().AddRangeAsync(records);
            var device = await getDeviceByIdAsync(request.DeviceId);
            if (device != null)
            {
                device.LastReportedAt = reportedAt;
                device.Status = IoTDeviceStatus.Online;
            }
            await _context.SaveChangesAsync();
        }

        return records;
    }

    public Task<System.Linq.Dynamic.Core.PagedResult<IoTDataRecord>> QueryDataRecordsAsync(Platform.ServiceDefaults.Models.PageParams request, string? deviceId = null, string? dataPointId = null, DateTime? startTime = null, DateTime? endTime = null)
    {
        var query = _context.Set<IoTDataRecord>().AsQueryable();

        if (!string.IsNullOrEmpty(deviceId))
        {
            query = query.Where(r => r.DeviceId == deviceId);
        }

        if (!string.IsNullOrEmpty(dataPointId))
        {
            query = query.Where(r => r.DataPointId == dataPointId);
        }

        if (startTime.HasValue)
        {
            query = query.Where(r => r.ReportedAt >= startTime.Value);
        }

        if (endTime.HasValue)
        {
            query = query.Where(r => r.ReportedAt <= endTime.Value);
        }

        return Task.FromResult(query.OrderByDescending(r => r.ReportedAt).ToPagedList(request));
    }

    public async Task<IoTDataRecord?> GetLatestDataAsync(string dataPointId)
    {
        return await _context.Set<IoTDataRecord>()
            .Where(r => r.DataPointId == dataPointId)
            .OrderByDescending(r => r.ReportedAt)
            .FirstOrDefaultAsync();
    }

    public async Task<DataStatistics?> GetDataStatisticsAsync(string dataPointId, DateTime startTime, DateTime endTime)
    {
        var records = await _context.Set<IoTDataRecord>().Where(r =>
            r.DataPointId == dataPointId &&
            r.ReportedAt >= startTime &&
            r.ReportedAt <= endTime).ToListAsync();

        if (records.Count == 0) return null;

        var numericValues = records
            .Where(x => double.TryParse(x.Value, out _))
            .Select(x => double.Parse(x.Value))
            .ToList();

        return new DataStatistics
        {
            DataPointId = dataPointId,
            RecordCount = records.Count,
            AverageValue = numericValues.Any() ? numericValues.Average() : null,
            MinValue = numericValues.Any() ? numericValues.Min() : null,
            MaxValue = numericValues.Any() ? numericValues.Max() : null,
            StartTime = startTime,
            EndTime = endTime
        };
    }

    private static bool CheckAlarm(double value, AlarmConfig config)
    {
        return config.AlarmType switch
        {
            "HighThreshold" => value > config.Threshold,
            "LowThreshold" => value < config.Threshold,
            "RangeThreshold" => value < config.Threshold || (config.ThresholdHigh.HasValue && value > config.ThresholdHigh.Value),
            _ => false
        };
    }
}
