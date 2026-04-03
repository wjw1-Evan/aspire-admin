using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Platform.ApiService.Models;
using Platform.ServiceDefaults.Services;
using Platform.ServiceDefaults.Extensions;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Linq.Dynamic.Core;
using System.Threading.Tasks;

namespace Platform.ApiService.Services;

/// <summary>
/// 物联网服务实现
/// </summary>
public class IoTService : IIoTService
{
    private readonly DbContext _context;
    private readonly ILogger<IoTService> _logger;

    public IoTService(DbContext context, ILogger<IoTService> logger)
    {
        _context = context;
        _logger = logger ?? throw new ArgumentNullException(nameof(logger));
    }

    #region Gateway Operations

    public async Task<IoTGateway> CreateGatewayAsync(CreateIoTGatewayRequest request)
    {
        var gateway = new IoTGateway
        {
            Title = request.Title,
            Name = request.Title,
            ProtocolType = request.ProtocolType,
            Address = request.Address,
            Username = request.Username,
            Password = request.Password,
            Config = NormalizeConfig(request.Config)
        };

        await _context.Set<IoTGateway>().AddAsync(gateway);
        await _context.SaveChangesAsync();
        _logger.LogInformation("Gateway created: {GatewayId}", gateway.GatewayId);
        return gateway;
    }

    public async Task<System.Linq.Dynamic.Core.PagedResult<IoTGateway>> GetGatewaysAsync(Platform.ServiceDefaults.Models.PageParams request, IoTDeviceStatus? status = null)
    {
        var query = _context.Set<IoTGateway>().AsQueryable();

        if (status.HasValue)
        {
            query = query.Where(g => g.Status == status.Value);
        }

        return query.OrderByDescending(g => g.CreatedAt).ToPagedList(request);
    }

    public async Task<IoTGateway?> GetGatewayByIdAsync(string id)
    {
        return await _context.Set<IoTGateway>().FirstOrDefaultAsync(x => x.Id == id);
    }

    public async Task<IoTGateway?> GetGatewayByGatewayIdAsync(string gatewayId)
    {
        return await _context.Set<IoTGateway>().FirstOrDefaultAsync(g => g.GatewayId == gatewayId);
    }

    public async Task<IoTGateway?> UpdateGatewayAsync(string id, UpdateIoTGatewayRequest request)
    {
        var gateway = await _context.Set<IoTGateway>().FirstOrDefaultAsync(x => x.Id == id);
        if (gateway == null) return null;

        if (!string.IsNullOrEmpty(request.Title))
        {
            gateway.Title = request.Title;
            gateway.Name = request.Title;
        }
        if (!string.IsNullOrEmpty(request.ProtocolType)) gateway.ProtocolType = request.ProtocolType;
        if (!string.IsNullOrEmpty(request.Address)) gateway.Address = request.Address;
        if (request.Username != null) gateway.Username = request.Username;
        if (request.Password != null) gateway.Password = request.Password;
        if (request.IsEnabled.HasValue) gateway.IsEnabled = request.IsEnabled.Value;
        if (request.Config != null) gateway.Config = NormalizeConfig(request.Config);

        await _context.SaveChangesAsync();
        return gateway;
    }

    public async Task<bool> DeleteGatewayAsync(string id)
    {
        var gateway = await _context.Set<IoTGateway>().FirstOrDefaultAsync(x => x.Id == id);
        if (gateway == null) return false;

        _context.Set<IoTGateway>().Remove(gateway);
        await _context.SaveChangesAsync();
        _logger.LogInformation("Gateway deleted: {GatewayId}", gateway.GatewayId);
        return true;
    }

    public async Task<bool> UpdateGatewayStatusAsync(string gatewayId, IoTDeviceStatus status)
    {
        var gateway = await GetGatewayByGatewayIdAsync(gatewayId);
        if (gateway == null) return false;

        gateway.Status = status;
        if (status == IoTDeviceStatus.Online) gateway.LastConnectedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();
        return true;
    }

    public async Task<GatewayStatistics?> GetGatewayStatisticsAsync(string gatewayId)
    {
        var gateway = await GetGatewayByGatewayIdAsync(gatewayId);
        if (gateway == null) return null;

        var onlineThreshold = DateTime.UtcNow.AddMinutes(-5);
        var totalDevices = await _context.Set<IoTDevice>().LongCountAsync(d => d.GatewayId == gatewayId);
        var onlineDevices = await _context.Set<IoTDevice>().LongCountAsync(d => d.GatewayId == gatewayId && d.LastReportedAt.HasValue && d.LastReportedAt.Value >= onlineThreshold);

        return new GatewayStatistics
        {
            GatewayId = gatewayId,
            TotalDevices = (int)totalDevices,
            OnlineDevices = (int)onlineDevices,
            OfflineDevices = (int)(totalDevices - onlineDevices),
            FaultDevices = 0,
            LastConnectedAt = gateway.LastConnectedAt
        };
    }

    #endregion

    #region Device Operations

    public async Task<IoTDevice> CreateDeviceAsync(CreateIoTDeviceRequest request)
    {
        string deviceId;
        if (!string.IsNullOrWhiteSpace(request.DeviceId))
        {
            var deviceIdPattern = @"^[a-zA-Z0-9_-]+$";
            if (!System.Text.RegularExpressions.Regex.IsMatch(request.DeviceId, deviceIdPattern))
            {
                throw new ArgumentException("设备标识符只能包含字母、数字、连字符和下划线");
            }

            var exists = await _context.Set<IoTDevice>().AnyAsync(d => d.DeviceId == request.DeviceId);
            if (exists) throw new InvalidOperationException($"设备标识符 {request.DeviceId} 已存在");

            deviceId = request.DeviceId.Trim();
        }
        else
        {
            deviceId = Guid.NewGuid().ToString("N");
        }

        var device = new IoTDevice
        {
            Name = request.Name,
            Title = request.Title,
            DeviceId = deviceId,
            GatewayId = request.GatewayId ?? string.Empty,
            DeviceType = request.DeviceType,
            Description = request.Description,
            Location = request.Location,
            Tags = request.Tags,
            RetentionDays = request.RetentionDays
        };

        await _context.Set<IoTDevice>().AddAsync(device);

        if (!string.IsNullOrEmpty(request.GatewayId))
        {
            var gateway = await GetGatewayByGatewayIdAsync(request.GatewayId);
            if (gateway != null) gateway.DeviceCount += 1;
        }

        await _context.SaveChangesAsync();
        _logger.LogInformation("Device created: {DeviceId}", device.DeviceId);
        return device;
    }

    public async Task<System.Linq.Dynamic.Core.PagedResult<IoTDevice>> GetDevicesAsync(Platform.ServiceDefaults.Models.PageParams request, string? gatewayId = null)
    {
        var query = _context.Set<IoTDevice>().AsQueryable();

        if (!string.IsNullOrEmpty(gatewayId))
        {
            query = query.Where(d => d.GatewayId == gatewayId);
        }

        return query.OrderByDescending(d => d.CreatedAt).ToPagedList(request);
    }

    public async Task<IoTDevice?> GetDeviceByIdAsync(string id)
    {
        return await _context.Set<IoTDevice>().FirstOrDefaultAsync(x => x.Id == id);
    }

    public async Task<IoTDevice?> GetDeviceByDeviceIdAsync(string deviceId)
    {
        return await _context.Set<IoTDevice>().FirstOrDefaultAsync(d => d.DeviceId == deviceId);
    }

    public async Task<IoTDevice?> UpdateDeviceAsync(string id, UpdateIoTDeviceRequest request)
    {
        var device = await _context.Set<IoTDevice>().FirstOrDefaultAsync(x => x.Id == id);
        if (device == null) return null;

        if (!string.IsNullOrEmpty(request.Name)) device.Name = request.Name;
        if (!string.IsNullOrEmpty(request.Title)) device.Title = request.Title;
        if (!string.IsNullOrEmpty(request.GatewayId)) device.GatewayId = request.GatewayId;
        if (request.IsEnabled.HasValue) device.IsEnabled = request.IsEnabled.Value;
        if (request.DeviceType.HasValue) device.DeviceType = request.DeviceType.Value;
        if (request.Description != null) device.Description = request.Description;
        if (request.Location != null) device.Location = request.Location;
        if (request.Tags != null) device.Tags = request.Tags;
        if (request.RetentionDays.HasValue) device.RetentionDays = request.RetentionDays.Value;

        await _context.SaveChangesAsync();
        return device;
    }

    public async Task<bool> DeleteDeviceAsync(string id)
    {
        var device = await _context.Set<IoTDevice>().FirstOrDefaultAsync(x => x.Id == id);
        if (device == null) return false;

        var gateway = await GetGatewayByGatewayIdAsync(device.GatewayId);
        if (gateway != null) gateway.DeviceCount = Math.Max(0, gateway.DeviceCount - 1);

        _context.Set<IoTDevice>().Remove(device);
        await _context.SaveChangesAsync();
        _logger.LogInformation("Device deleted: {DeviceId}", device.DeviceId);
        return true;
    }

    public async Task<int> BatchDeleteDevicesAsync(List<string> ids)
    {
        if (ids == null || ids.Count == 0) return 0;

        var devices = await _context.Set<IoTDevice>().Where(d => ids.Contains(d.Id!)).ToListAsync();
        if (devices.Count == 0) return 0;

        foreach (var device in devices)
        {
            var gateway = await GetGatewayByGatewayIdAsync(device.GatewayId);
            if (gateway != null) gateway.DeviceCount = Math.Max(0, gateway.DeviceCount - 1);
        }

        _context.Set<IoTDevice>().RemoveRange(devices);
        await _context.SaveChangesAsync();
        _logger.LogInformation("Batch deleted {Count} devices", devices.Count);
        return devices.Count;
    }

    public async Task<bool> UpdateDeviceStatusAsync(string deviceId, IoTDeviceStatus status)
    {
        var device = await GetDeviceByDeviceIdAsync(deviceId);
        if (device == null) return false;

        if (status == IoTDeviceStatus.Online) device.LastReportedAt = DateTime.UtcNow;
        device.Status = status;

        await _context.SaveChangesAsync();
        return true;
    }

    public async Task<bool> HandleDeviceConnectAsync(DeviceConnectRequest request)
    {
        var device = await GetDeviceByDeviceIdAsync(request.DeviceId);
        if (device == null) return false;

        device.LastReportedAt = DateTime.UtcNow;
        device.Status = IoTDeviceStatus.Online;

        await _context.SaveChangesAsync();
        await CreateEventAsync(request.DeviceId, "Connected", "Info", "Device connected");
        _logger.LogInformation("Device connected: {DeviceId}", request.DeviceId);
        return true;
    }

    public async Task<bool> HandleDeviceDisconnectAsync(DeviceDisconnectRequest request)
    {
        var device = await GetDeviceByDeviceIdAsync(request.DeviceId);
        if (device == null) return false;

        device.Status = IoTDeviceStatus.Offline;
        await _context.SaveChangesAsync();
        await CreateEventAsync(request.DeviceId, "Disconnected", "Warning", request.Reason ?? "Device disconnected");
        _logger.LogInformation("Device disconnected: {DeviceId}", request.DeviceId);
        return true;
    }

    public async Task<DeviceStatistics?> GetDeviceStatisticsAsync(string deviceId)
    {
        var device = await GetDeviceByDeviceIdAsync(deviceId);
        if (device == null) return null;

        var dataPointCount = await _context.Set<IoTDataPoint>().LongCountAsync(dp => dp.DeviceId == deviceId);
        var enabledDataPointCount = await _context.Set<IoTDataPoint>().LongCountAsync(dp => dp.DeviceId == deviceId && dp.IsEnabled);
        var recordCount = await _context.Set<IoTDataRecord>().LongCountAsync(r => r.DeviceId == deviceId);
        var unhandledAlarms = await _context.Set<IoTDeviceEvent>().LongCountAsync(e => e.DeviceId == deviceId && e.IsHandled == false);

        return new DeviceStatistics
        {
            DeviceId = deviceId,
            TotalDataPoints = (int)dataPointCount,
            EnabledDataPoints = (int)enabledDataPointCount,
            TotalDataRecords = recordCount,
            UnhandledAlarms = unhandledAlarms,
            LastReportedAt = device.LastReportedAt
        };
    }

    #endregion

    #region DataPoint Operations

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

    #endregion

    #region Data Record Operations

    public async Task<IoTDataRecord> ReportDataAsync(ReportIoTDataRequest request)
    {
        var dataPoint = await GetDataPointByDataPointIdAsync(request.DataPointId);
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

        var device = await GetDeviceByDeviceIdAsync(request.DeviceId);
        if (device != null) device.LastReportedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();
        return record;
    }

    public async Task<List<IoTDataRecord>> BatchReportDataAsync(BatchReportIoTDataRequest request)
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
            var device = await GetDeviceByDeviceIdAsync(request.DeviceId);
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
            StartTime = startTime,
            EndTime = endTime
        };
    }

    #endregion

    #region Event Operations

    public async Task<IoTDeviceEvent> CreateEventAsync(string deviceId, string eventType, string level, string? description = null, Dictionary<string, object>? eventData = null)
    {
        var @event = new IoTDeviceEvent
        {
            DeviceId = deviceId,
            EventType = eventType,
            Level = level,
            Description = description,
            EventData = eventData,
            OccurredAt = DateTime.UtcNow
        };

        await _context.Set<IoTDeviceEvent>().AddAsync(@event);
        await _context.SaveChangesAsync();
        _logger.LogInformation("Event created: {EventType} for device {DeviceId}", eventType, deviceId);
        return @event;
    }

    public Task<System.Linq.Dynamic.Core.PagedResult<IoTDeviceEvent>> QueryEventsAsync(Platform.ServiceDefaults.Models.PageParams request, string? deviceId = null, string? eventType = null, string? level = null, bool? isHandled = null, DateTime? startTime = null, DateTime? endTime = null)
    {
        var query = _context.Set<IoTDeviceEvent>().AsQueryable();

        if (!string.IsNullOrEmpty(deviceId))
        {
            query = query.Where(e => e.DeviceId == deviceId);
        }

        if (!string.IsNullOrEmpty(eventType))
        {
            query = query.Where(e => e.EventType == eventType);
        }

        if (!string.IsNullOrEmpty(level))
        {
            query = query.Where(e => e.Level == level);
        }

        if (isHandled.HasValue)
        {
            query = query.Where(e => e.IsHandled == isHandled.Value);
        }

        if (startTime.HasValue)
        {
            query = query.Where(e => e.OccurredAt >= startTime.Value);
        }

        if (endTime.HasValue)
        {
            query = query.Where(e => e.OccurredAt <= endTime.Value);
        }

        return Task.FromResult(query.OrderByDescending(e => e.OccurredAt).ToPagedList(request));
    }

    public async Task<bool> HandleEventAsync(string eventId, string remarks)
    {
        var @event = await _context.Set<IoTDeviceEvent>().FirstOrDefaultAsync(x => x.Id == eventId);
        if (@event == null) return false;

        @event.IsHandled = true;
        @event.HandledRemarks = remarks;
        await _context.SaveChangesAsync();
        return true;
    }

    public async Task<long> GetUnhandledEventCountAsync(string? deviceId = null)
    {
        return await _context.Set<IoTDeviceEvent>().LongCountAsync(e => e.IsHandled == false && (deviceId == null || e.DeviceId == deviceId));
    }

    #endregion

    #region Statistics Operations

    public async Task<PlatformStatistics> GetPlatformStatisticsAsync()
    {
        var totalGateways = await _context.Set<IoTGateway>().LongCountAsync();
        var onlineGateways = await _context.Set<IoTGateway>().LongCountAsync(g => g.Status == IoTDeviceStatus.Online);
        var totalDevices = await _context.Set<IoTDevice>().LongCountAsync();
        var onlineDevices = await _context.Set<IoTDevice>().LongCountAsync(d => d.Status == IoTDeviceStatus.Online);
        var totalDataPoints = await _context.Set<IoTDataPoint>().LongCountAsync();
        var recordCount = await _context.Set<IoTDataRecord>().LongCountAsync();
        var unhandledAlarms = await _context.Set<IoTDeviceEvent>().LongCountAsync(e => e.IsHandled == false);

        return new PlatformStatistics
        {
            TotalGateways = (int)totalGateways,
            OnlineGateways = (int)onlineGateways,
            TotalDevices = (int)totalDevices,
            OnlineDevices = (int)onlineDevices,
            TotalDataPoints = (int)totalDataPoints,
            TotalDataRecords = recordCount,
            UnhandledAlarms = (int)unhandledAlarms,
            LastUpdatedAt = DateTime.UtcNow
        };
    }

    public async Task<DeviceStatusStatistics> GetDeviceStatusStatisticsAsync()
    {
        var online = await _context.Set<IoTDevice>().LongCountAsync(d => d.Status == IoTDeviceStatus.Online);
        var fault = await _context.Set<IoTDevice>().LongCountAsync(d => d.Status == IoTDeviceStatus.Fault);
        var maintenance = await _context.Set<IoTDevice>().LongCountAsync(d => d.Status == IoTDeviceStatus.Maintenance);
        var total = await _context.Set<IoTDevice>().LongCountAsync();

        return new DeviceStatusStatistics
        {
            Online = (int)online,
            Offline = (int)(total - online - fault - maintenance),
            Fault = (int)fault,
            Maintenance = (int)maintenance
        };
    }

    #endregion

    #region Helper Methods

    private bool CheckAlarm(double value, AlarmConfig config)
    {
        return config.AlarmType switch
        {
            "HighThreshold" => value > config.Threshold,
            "LowThreshold" => value < config.Threshold,
            "RangeThreshold" => value < config.Threshold || (config.ThresholdHigh.HasValue && value > config.ThresholdHigh.Value),
            _ => false
        };
    }

    private static Dictionary<string, string>? NormalizeConfig(Dictionary<string, string>? config)
    {
        if (config == null || config.Count == 0) return null;
        return config.ToDictionary(kv => kv.Key, kv => kv.Value ?? string.Empty);
    }

    private async Task<bool> ValidateDeviceExistsAsync(string deviceId)
    {
        return await _context.Set<IoTDevice>().AnyAsync(d => d.DeviceId == deviceId);
    }


    #endregion

    #region Device Twin Operations

    public async Task<IoTDeviceTwin> GetOrCreateDeviceTwinAsync(string deviceId)
    {
        var twin = await _context.Set<IoTDeviceTwin>().FirstOrDefaultAsync(t => t.DeviceId == deviceId);
        if (twin != null) return twin;

        twin = new IoTDeviceTwin { DeviceId = deviceId };
        await _context.Set<IoTDeviceTwin>().AddAsync(twin);
        await _context.SaveChangesAsync();
        return twin;
    }

    public async Task<IoTDeviceTwin?> UpdateDesiredPropertiesAsync(string deviceId, UpdateDesiredPropertiesRequest request)
    {
        if (!await ValidateDeviceExistsAsync(deviceId)) return null;

        var twin = await GetOrCreateDeviceTwinAsync(deviceId);
        var updated = new Dictionary<string, object>(twin.DesiredProperties);
        foreach (var (key, value) in request.Properties)
        {
            if (value == null) updated.Remove(key);
            else updated[key] = value;
        }

        twin.DesiredProperties = updated;
        twin.DesiredVersion++;
        twin.ETag = Guid.NewGuid().ToString("N");
        twin.DesiredUpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();
        return twin;
    }

    public async Task<IoTDeviceTwin?> ReportPropertiesAsync(string deviceId, string apiKey, Dictionary<string, object> properties)
    {
        if (!await ValidateApiKeyAsync(deviceId, apiKey)) throw new UnauthorizedAccessException($"Invalid ApiKey for device {deviceId}");

        var twin = await GetOrCreateDeviceTwinAsync(deviceId);
        var updated = new Dictionary<string, object>(twin.ReportedProperties);
        foreach (var (key, value) in properties) updated[key] = value;

        twin.ReportedProperties = updated;
        twin.ReportedVersion++;
        twin.ReportedUpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();
        return twin;
    }

    #endregion

    #region C2D Command Operations

    public async Task<IoTDeviceCommand> SendCommandAsync(string deviceId, SendCommandRequest request)
    {
        if (!await ValidateDeviceExistsAsync(deviceId)) throw new InvalidOperationException($"Device {deviceId} not found");

        var command = new IoTDeviceCommand
        {
            DeviceId = deviceId,
            CommandName = request.CommandName,
            Payload = request.Payload,
            ExpiresAt = DateTime.UtcNow.AddHours(Math.Max(1, request.TtlHours))
        };

        await _context.Set<IoTDeviceCommand>().AddAsync(command);
        await _context.SaveChangesAsync();
        return command;
    }

    public async Task<List<IoTDeviceCommand>> GetPendingCommandsAsync(string deviceId, string apiKey)
    {
        if (!await ValidateApiKeyAsync(deviceId, apiKey)) throw new UnauthorizedAccessException($"Invalid ApiKey for device {deviceId}");

        var now = DateTime.UtcNow;
        var commands = await _context.Set<IoTDeviceCommand>().Where(c =>
            c.DeviceId == deviceId &&
            c.Status == CommandStatus.Pending &&
            c.ExpiresAt > now).ToListAsync();

        if (commands.Count > 0)
        {
            foreach (var cmd in commands)
            {
                cmd.Status = CommandStatus.Delivered;
                cmd.DeliveredAt = now;
            }
            await _context.SaveChangesAsync();
        }

        return commands;
    }

    public async Task<bool> AckCommandAsync(string commandId, AckCommandRequest request)
    {
        var command = await _context.Set<IoTDeviceCommand>().FirstOrDefaultAsync(x => x.Id == commandId);
        if (command == null) return false;

        if (!await ValidateApiKeyAsync(command.DeviceId, request.ApiKey)) throw new UnauthorizedAccessException($"Invalid ApiKey for device {command.DeviceId}");

        command.Status = request.Success ? CommandStatus.Executed : CommandStatus.Failed;
        command.ExecutedAt = DateTime.UtcNow;
        command.ResponsePayload = request.ResponsePayload;
        command.ErrorMessage = request.ErrorMessage;

        await _context.SaveChangesAsync();
        return true;
    }

    public async Task<int> ExpireCommandsAsync()
    {
        var now = DateTime.UtcNow;
        var expired = await _context.Set<IoTDeviceCommand>().Where(c => c.Status == CommandStatus.Pending && c.ExpiresAt <= now).ToListAsync();

        if (expired.Count == 0) return 0;

        foreach (var cmd in expired) cmd.Status = CommandStatus.Expired;
        await _context.SaveChangesAsync();
        return expired.Count;
    }
    #endregion

    #region ApiKey Operations

    public async Task<GenerateApiKeyResult> GenerateApiKeyAsync(string deviceId)
    {
        var device = await GetDeviceByDeviceIdAsync(deviceId);
        if (device == null) throw new InvalidOperationException($"Device {deviceId} not found");

        var rawKey = Convert.ToBase64String(System.Security.Cryptography.RandomNumberGenerator.GetBytes(32));
        var hash = Convert.ToHexString(System.Security.Cryptography.SHA256.HashData(System.Text.Encoding.UTF8.GetBytes(rawKey)));

        device.ApiKey = hash;
        await _context.SaveChangesAsync();

        return new GenerateApiKeyResult { DeviceId = deviceId, ApiKey = rawKey };
    }

    public async Task<bool> ValidateApiKeyAsync(string deviceId, string apiKey)
    {
        if (string.IsNullOrWhiteSpace(apiKey)) return false;
        var device = await GetDeviceByDeviceIdAsync(deviceId);
        if (device?.ApiKey == null) return false;

        var hash = Convert.ToHexString(System.Security.Cryptography.SHA256.HashData(System.Text.Encoding.UTF8.GetBytes(apiKey)));
        return string.Equals(device.ApiKey, hash, StringComparison.OrdinalIgnoreCase);
    }

    #endregion
}
