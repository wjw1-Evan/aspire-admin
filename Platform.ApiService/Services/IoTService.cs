using MongoDB.Driver;
using Platform.ApiService.Models;
using Platform.ServiceDefaults.Services;
using Microsoft.Extensions.Logging;

namespace Platform.ApiService.Services;

/// <summary>
/// 物联网服务实现
/// </summary>
public class IoTService : IIoTService
{
    private readonly IDatabaseOperationFactory<IoTGateway> _gatewayFactory;
    private readonly IDatabaseOperationFactory<IoTDevice> _deviceFactory;
    private readonly IDatabaseOperationFactory<IoTDataPoint> _dataPointFactory;
    private readonly IDatabaseOperationFactory<IoTDataRecord> _dataRecordFactory;
    private readonly IDatabaseOperationFactory<IoTDeviceEvent> _eventFactory;
    private readonly ILogger<IoTService> _logger;

    public IoTService(
        IDatabaseOperationFactory<IoTGateway> gatewayFactory,
        IDatabaseOperationFactory<IoTDevice> deviceFactory,
        IDatabaseOperationFactory<IoTDataPoint> dataPointFactory,
        IDatabaseOperationFactory<IoTDataRecord> dataRecordFactory,
        IDatabaseOperationFactory<IoTDeviceEvent> eventFactory,
        ILogger<IoTService> logger)
    {
        _gatewayFactory = gatewayFactory ?? throw new ArgumentNullException(nameof(gatewayFactory));
        _deviceFactory = deviceFactory ?? throw new ArgumentNullException(nameof(deviceFactory));
        _dataPointFactory = dataPointFactory ?? throw new ArgumentNullException(nameof(dataPointFactory));
        _dataRecordFactory = dataRecordFactory ?? throw new ArgumentNullException(nameof(dataRecordFactory));
        _eventFactory = eventFactory ?? throw new ArgumentNullException(nameof(eventFactory));
        _logger = logger ?? throw new ArgumentNullException(nameof(logger));
    }

    #region Gateway Operations

    public async Task<IoTGateway> CreateGatewayAsync(CreateIoTGatewayRequest request)
    {
        var gateway = new IoTGateway
        {
            Name = request.Name,
            Title = request.Title,
            Description = request.Description,
            ProtocolType = request.ProtocolType,
            Address = request.Address,
            Port = request.Port,
            Username = request.Username,
            Password = request.Password,
            Config = request.Config,
            Tags = request.Tags ?? new(),
            Remarks = request.Remarks
        };

        var result = await _gatewayFactory.CreateAsync(gateway);
        _logger.LogInformation("Gateway created: {GatewayId}", result.GatewayId);
        return result;
    }

    public async Task<List<IoTGateway>> GetGatewaysAsync(int pageIndex = 1, int pageSize = 20)
    {
        var filter = Builders<IoTGateway>.Filter.Empty;
        var sort = Builders<IoTGateway>.Sort.Descending(x => x.CreatedAt);
        
        var (items, _) = await _gatewayFactory.FindPagedAsync(filter, sort, pageIndex, pageSize);
        return items;
    }

    public async Task<IoTGateway?> GetGatewayByIdAsync(string id)
    {
        return await _gatewayFactory.GetByIdAsync(id);
    }

    public async Task<IoTGateway?> GetGatewayByGatewayIdAsync(string gatewayId)
    {
        var filter = Builders<IoTGateway>.Filter.Eq(x => x.GatewayId, gatewayId);
        var gateways = await _gatewayFactory.FindAsync(filter);
        return gateways.FirstOrDefault();
    }

    public async Task<IoTGateway?> UpdateGatewayAsync(string id, UpdateIoTGatewayRequest request)
    {
        var gateway = await GetGatewayByIdAsync(id);
        if (gateway == null)
            return null;

        var builder = Builders<IoTGateway>.Update;
        var updates = new List<UpdateDefinition<IoTGateway>>();

        if (!string.IsNullOrEmpty(request.Name))
            updates.Add(builder.Set(x => x.Name, request.Name));
        if (!string.IsNullOrEmpty(request.Title))
            updates.Add(builder.Set(x => x.Title, request.Title));
        if (request.Description != null)
            updates.Add(builder.Set(x => x.Description, request.Description));
        if (!string.IsNullOrEmpty(request.ProtocolType))
            updates.Add(builder.Set(x => x.ProtocolType, request.ProtocolType));
        if (!string.IsNullOrEmpty(request.Address))
            updates.Add(builder.Set(x => x.Address, request.Address));
        if (request.Port.HasValue)
            updates.Add(builder.Set(x => x.Port, request.Port.Value));
        if (request.Username != null)
            updates.Add(builder.Set(x => x.Username, request.Username));
        if (request.Password != null)
            updates.Add(builder.Set(x => x.Password, request.Password));
        if (request.IsEnabled.HasValue)
            updates.Add(builder.Set(x => x.IsEnabled, request.IsEnabled.Value));
        if (request.Config != null)
            updates.Add(builder.Set(x => x.Config, request.Config));
        if (request.Tags != null)
            updates.Add(builder.Set(x => x.Tags, request.Tags));
        if (request.Remarks != null)
            updates.Add(builder.Set(x => x.Remarks, request.Remarks));

        if (updates.Count == 0)
            return gateway;

        var filter = Builders<IoTGateway>.Filter.Eq(x => x.Id, id);
        var update = builder.Combine(updates);
        
        var result = await _gatewayFactory.FindOneAndUpdateAsync(filter, update, 
            new FindOneAndUpdateOptions<IoTGateway> { ReturnDocument = ReturnDocument.After });
        
        return result;
    }

    public async Task<bool> DeleteGatewayAsync(string id)
    {
        var gateway = await GetGatewayByIdAsync(id);
        if (gateway == null)
            return false;

        var filter = Builders<IoTGateway>.Filter.Eq(x => x.Id, id);
        var result = await _gatewayFactory.FindOneAndSoftDeleteAsync(filter);
        
        if (result != null)
        {
            _logger.LogInformation("Gateway deleted: {GatewayId}", result.GatewayId);
            return true;
        }
        
        return false;
    }

    public async Task<bool> UpdateGatewayStatusAsync(string gatewayId, IoTDeviceStatus status)
    {
        var gateway = await GetGatewayByGatewayIdAsync(gatewayId);
        if (gateway == null)
            return false;

        var builder = Builders<IoTGateway>.Update;
        var updates = new List<UpdateDefinition<IoTGateway>>
        {
            builder.Set(x => x.Status, status)
        };

        if (status == IoTDeviceStatus.Online)
            updates.Add(builder.Set(x => x.LastConnectedAt, DateTime.UtcNow));

        var filter = Builders<IoTGateway>.Filter.Eq(x => x.GatewayId, gatewayId);
        var update = builder.Combine(updates);
        
        var result = await _gatewayFactory.FindOneAndUpdateAsync(filter, update);
        return result != null;
    }

    public async Task<GatewayStatistics?> GetGatewayStatisticsAsync(string gatewayId)
    {
        var gateway = await GetGatewayByGatewayIdAsync(gatewayId);
        if (gateway == null)
            return null;

        var deviceFilter = Builders<IoTDevice>.Filter.Eq(x => x.GatewayId, gatewayId);
        var devices = await _deviceFactory.FindAsync(deviceFilter);

        return new GatewayStatistics
        {
            GatewayId = gatewayId,
            TotalDevices = devices.Count,
            OnlineDevices = devices.Count(x => x.Status == IoTDeviceStatus.Online),
            OfflineDevices = devices.Count(x => x.Status == IoTDeviceStatus.Offline),
            FaultDevices = devices.Count(x => x.Status == IoTDeviceStatus.Fault),
            LastConnectedAt = gateway.LastConnectedAt
        };
    }

    #endregion

    #region Device Operations

    public async Task<IoTDevice> CreateDeviceAsync(CreateIoTDeviceRequest request)
    {
        var device = new IoTDevice
        {
            Name = request.Name,
            Title = request.Title,
            Description = request.Description,
            GatewayId = request.GatewayId,
            DeviceType = request.DeviceType,
            Model = request.Model,
            Manufacturer = request.Manufacturer,
            SerialNumber = request.SerialNumber,
            Location = request.Location,
            Latitude = request.Latitude,
            Longitude = request.Longitude,
            Properties = request.Properties,
            Tags = request.Tags ?? new(),
            Remarks = request.Remarks
        };

        var result = await _deviceFactory.CreateAsync(device);
        
        // Update gateway device count
        var gateway = await GetGatewayByGatewayIdAsync(request.GatewayId);
        if (gateway != null)
        {
            var gatewayFilter = Builders<IoTGateway>.Filter.Eq(x => x.Id, gateway.Id);
            var update = Builders<IoTGateway>.Update.Set(x => x.DeviceCount, gateway.DeviceCount + 1);
            await _gatewayFactory.FindOneAndUpdateAsync(gatewayFilter, update);
        }

        _logger.LogInformation("Device created: {DeviceId}", result.DeviceId);
        return result;
    }

    public async Task<List<IoTDevice>> GetDevicesAsync(string? gatewayId = null, int pageIndex = 1, int pageSize = 20)
    {
        var filter = string.IsNullOrEmpty(gatewayId) 
            ? Builders<IoTDevice>.Filter.Empty 
            : Builders<IoTDevice>.Filter.Eq(x => x.GatewayId, gatewayId);

        var sort = Builders<IoTDevice>.Sort.Descending(x => x.CreatedAt);
        
        var (items, _) = await _deviceFactory.FindPagedAsync(filter, sort, pageIndex, pageSize);
        return items;
    }

    public async Task<IoTDevice?> GetDeviceByIdAsync(string id)
    {
        return await _deviceFactory.GetByIdAsync(id);
    }

    public async Task<IoTDevice?> GetDeviceByDeviceIdAsync(string deviceId)
    {
        var filter = Builders<IoTDevice>.Filter.Eq(x => x.DeviceId, deviceId);
        var devices = await _deviceFactory.FindAsync(filter);
        return devices.FirstOrDefault();
    }

    public async Task<IoTDevice?> UpdateDeviceAsync(string id, UpdateIoTDeviceRequest request)
    {
        var device = await GetDeviceByIdAsync(id);
        if (device == null)
            return null;

        var builder = Builders<IoTDevice>.Update;
        var updates = new List<UpdateDefinition<IoTDevice>>();

        if (!string.IsNullOrEmpty(request.Name))
            updates.Add(builder.Set(x => x.Name, request.Name));
        if (!string.IsNullOrEmpty(request.Title))
            updates.Add(builder.Set(x => x.Title, request.Title));
        if (request.Description != null)
            updates.Add(builder.Set(x => x.Description, request.Description));
        if (!string.IsNullOrEmpty(request.GatewayId))
            updates.Add(builder.Set(x => x.GatewayId, request.GatewayId));
        if (request.DeviceType.HasValue)
            updates.Add(builder.Set(x => x.DeviceType, request.DeviceType.Value));
        if (request.Model != null)
            updates.Add(builder.Set(x => x.Model, request.Model));
        if (request.Manufacturer != null)
            updates.Add(builder.Set(x => x.Manufacturer, request.Manufacturer));
        if (request.SerialNumber != null)
            updates.Add(builder.Set(x => x.SerialNumber, request.SerialNumber));
        if (request.IsEnabled.HasValue)
            updates.Add(builder.Set(x => x.IsEnabled, request.IsEnabled.Value));
        if (request.Location != null)
            updates.Add(builder.Set(x => x.Location, request.Location));
        if (request.Latitude.HasValue)
            updates.Add(builder.Set(x => x.Latitude, request.Latitude));
        if (request.Longitude.HasValue)
            updates.Add(builder.Set(x => x.Longitude, request.Longitude));
        if (request.Properties != null)
            updates.Add(builder.Set(x => x.Properties, request.Properties));
        if (request.Tags != null)
            updates.Add(builder.Set(x => x.Tags, request.Tags));
        if (request.Remarks != null)
            updates.Add(builder.Set(x => x.Remarks, request.Remarks));

        if (updates.Count == 0)
            return device;

        var filter = Builders<IoTDevice>.Filter.Eq(x => x.Id, id);
        var update = builder.Combine(updates);
        
        var result = await _deviceFactory.FindOneAndUpdateAsync(filter, update,
            new FindOneAndUpdateOptions<IoTDevice> { ReturnDocument = ReturnDocument.After });
        
        return result;
    }

    public async Task<bool> DeleteDeviceAsync(string id)
    {
        var device = await GetDeviceByIdAsync(id);
        if (device == null)
            return false;

        var filter = Builders<IoTDevice>.Filter.Eq(x => x.Id, id);
        var result = await _deviceFactory.FindOneAndSoftDeleteAsync(filter);
        
        if (result != null)
        {
            // Update gateway device count
            var gateway = await GetGatewayByGatewayIdAsync(result.GatewayId);
            if (gateway != null && gateway.DeviceCount > 0)
            {
                var gatewayFilter = Builders<IoTGateway>.Filter.Eq(x => x.Id, gateway.Id);
                var update = Builders<IoTGateway>.Update.Set(x => x.DeviceCount, gateway.DeviceCount - 1);
                await _gatewayFactory.FindOneAndUpdateAsync(gatewayFilter, update);
            }

            _logger.LogInformation("Device deleted: {DeviceId}", result.DeviceId);
            return true;
        }
        
        return false;
    }

    public async Task<bool> UpdateDeviceStatusAsync(string deviceId, IoTDeviceStatus status)
    {
        var builder = Builders<IoTDevice>.Update;
        var updates = new List<UpdateDefinition<IoTDevice>>
        {
            builder.Set(x => x.Status, status)
        };

        if (status == IoTDeviceStatus.Online)
            updates.Add(builder.Set(x => x.LastReportedAt, DateTime.UtcNow));

        var filter = Builders<IoTDevice>.Filter.Eq(x => x.DeviceId, deviceId);
        var update = builder.Combine(updates);
        
        var result = await _deviceFactory.FindOneAndUpdateAsync(filter, update);
        return result != null;
    }

    public async Task<bool> HandleDeviceConnectAsync(DeviceConnectRequest request)
    {
        var builder = Builders<IoTDevice>.Update;
        var updates = new List<UpdateDefinition<IoTDevice>>
        {
            builder.Set(x => x.Status, IoTDeviceStatus.Online),
            builder.Set(x => x.LastReportedAt, DateTime.UtcNow)
        };

        var filter = Builders<IoTDevice>.Filter.Eq(x => x.DeviceId, request.DeviceId);
        var update = builder.Combine(updates);
        
        var result = await _deviceFactory.FindOneAndUpdateAsync(filter, update);
        
        if (result != null)
        {
            // Create event
            await CreateEventAsync(request.DeviceId, "Connected", "Info", "Device connected");
            _logger.LogInformation("Device connected: {DeviceId}", request.DeviceId);
            return true;
        }
        
        return false;
    }

    public async Task<bool> HandleDeviceDisconnectAsync(DeviceDisconnectRequest request)
    {
        var builder = Builders<IoTDevice>.Update;
        var update = builder.Set(x => x.Status, IoTDeviceStatus.Offline);

        var filter = Builders<IoTDevice>.Filter.Eq(x => x.DeviceId, request.DeviceId);
        
        var result = await _deviceFactory.FindOneAndUpdateAsync(filter, update);
        
        if (result != null)
        {
            // Create event
            await CreateEventAsync(request.DeviceId, "Disconnected", "Warning", request.Reason ?? "Device disconnected");
            _logger.LogInformation("Device disconnected: {DeviceId}", request.DeviceId);
            return true;
        }
        
        return false;
    }

    public async Task<DeviceStatistics?> GetDeviceStatisticsAsync(string deviceId)
    {
        var device = await GetDeviceByDeviceIdAsync(deviceId);
        if (device == null)
            return null;

        var dataPointFilter = Builders<IoTDataPoint>.Filter.Eq(x => x.DeviceId, deviceId);
        var dataPoints = await _dataPointFactory.FindAsync(dataPointFilter);

        var recordFilter = Builders<IoTDataRecord>.Filter.Eq(x => x.DeviceId, deviceId);
        var recordCount = await _dataRecordFactory.CountAsync(recordFilter);

        var alarmFilter = Builders<IoTDeviceEvent>.Filter.Eq(x => x.DeviceId, deviceId) &
                         Builders<IoTDeviceEvent>.Filter.Eq(x => x.IsHandled, false);
        var unhandledAlarms = await _eventFactory.CountAsync(alarmFilter);

        return new DeviceStatistics
        {
            DeviceId = deviceId,
            TotalDataPoints = dataPoints.Count,
            EnabledDataPoints = dataPoints.Count(x => x.IsEnabled),
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
            Description = request.Description,
            DeviceId = request.DeviceId,
            DataType = request.DataType,
            Unit = request.Unit,
            MinValue = request.MinValue,
            MaxValue = request.MaxValue,
            Precision = request.Precision,
            IsReadOnly = request.IsReadOnly,
            SamplingInterval = request.SamplingInterval,
            AlarmConfig = request.AlarmConfig,
            Tags = request.Tags ?? new(),
            Remarks = request.Remarks
        };

        var result = await _dataPointFactory.CreateAsync(dataPoint);

        // Add data point to device
        var device = await GetDeviceByDeviceIdAsync(request.DeviceId);
        if (device != null && !device.DataPoints.Contains(result.DataPointId))
        {
            var deviceFilter = Builders<IoTDevice>.Filter.Eq(x => x.Id, device.Id);
            var update = Builders<IoTDevice>.Update.Push(x => x.DataPoints, result.DataPointId);
            await _deviceFactory.FindOneAndUpdateAsync(deviceFilter, update);
        }

        _logger.LogInformation("DataPoint created: {DataPointId}", result.DataPointId);
        return result;
    }

    public async Task<List<IoTDataPoint>> GetDataPointsAsync(string? deviceId = null, int pageIndex = 1, int pageSize = 20)
    {
        var filter = string.IsNullOrEmpty(deviceId) 
            ? Builders<IoTDataPoint>.Filter.Empty 
            : Builders<IoTDataPoint>.Filter.Eq(x => x.DeviceId, deviceId);

        var sort = Builders<IoTDataPoint>.Sort.Descending(x => x.CreatedAt);
        
        var (items, _) = await _dataPointFactory.FindPagedAsync(filter, sort, pageIndex, pageSize);
        return items;
    }

    public async Task<IoTDataPoint?> GetDataPointByIdAsync(string id)
    {
        return await _dataPointFactory.GetByIdAsync(id);
    }

    public async Task<IoTDataPoint?> GetDataPointByDataPointIdAsync(string dataPointId)
    {
        var filter = Builders<IoTDataPoint>.Filter.Eq(x => x.DataPointId, dataPointId);
        var dataPoints = await _dataPointFactory.FindAsync(filter);
        return dataPoints.FirstOrDefault();
    }

    public async Task<IoTDataPoint?> UpdateDataPointAsync(string id, UpdateIoTDataPointRequest request)
    {
        var dataPoint = await GetDataPointByIdAsync(id);
        if (dataPoint == null)
            return null;

        var builder = Builders<IoTDataPoint>.Update;
        var updates = new List<UpdateDefinition<IoTDataPoint>>();

        if (!string.IsNullOrEmpty(request.Name))
            updates.Add(builder.Set(x => x.Name, request.Name));
        if (!string.IsNullOrEmpty(request.Title))
            updates.Add(builder.Set(x => x.Title, request.Title));
        if (request.Description != null)
            updates.Add(builder.Set(x => x.Description, request.Description));
        if (request.DataType.HasValue)
            updates.Add(builder.Set(x => x.DataType, request.DataType.Value));
        if (request.Unit != null)
            updates.Add(builder.Set(x => x.Unit, request.Unit));
        if (request.MinValue.HasValue)
            updates.Add(builder.Set(x => x.MinValue, request.MinValue));
        if (request.MaxValue.HasValue)
            updates.Add(builder.Set(x => x.MaxValue, request.MaxValue));
        if (request.Precision.HasValue)
            updates.Add(builder.Set(x => x.Precision, request.Precision.Value));
        if (request.IsReadOnly.HasValue)
            updates.Add(builder.Set(x => x.IsReadOnly, request.IsReadOnly.Value));
        if (request.SamplingInterval.HasValue)
            updates.Add(builder.Set(x => x.SamplingInterval, request.SamplingInterval.Value));
        if (request.IsEnabled.HasValue)
            updates.Add(builder.Set(x => x.IsEnabled, request.IsEnabled.Value));
        if (request.AlarmConfig != null)
            updates.Add(builder.Set(x => x.AlarmConfig, request.AlarmConfig));
        if (request.Tags != null)
            updates.Add(builder.Set(x => x.Tags, request.Tags));
        if (request.Remarks != null)
            updates.Add(builder.Set(x => x.Remarks, request.Remarks));

        if (updates.Count == 0)
            return dataPoint;

        var filter = Builders<IoTDataPoint>.Filter.Eq(x => x.Id, id);
        var update = builder.Combine(updates);
        
        var result = await _dataPointFactory.FindOneAndUpdateAsync(filter, update,
            new FindOneAndUpdateOptions<IoTDataPoint> { ReturnDocument = ReturnDocument.After });
        
        return result;
    }

    public async Task<bool> DeleteDataPointAsync(string id)
    {
        var dataPoint = await GetDataPointByIdAsync(id);
        if (dataPoint == null)
            return false;

        var filter = Builders<IoTDataPoint>.Filter.Eq(x => x.Id, id);
        var result = await _dataPointFactory.FindOneAndSoftDeleteAsync(filter);
        
        if (result != null)
        {
            // Remove data point from device
            var device = await GetDeviceByDeviceIdAsync(result.DeviceId);
            if (device != null)
            {
                var deviceFilter = Builders<IoTDevice>.Filter.Eq(x => x.Id, device.Id);
                var update = Builders<IoTDevice>.Update.PullFilter(x => x.DataPoints, result.DataPointId);
                await _deviceFactory.FindOneAndUpdateAsync(deviceFilter, update);
            }

            _logger.LogInformation("DataPoint deleted: {DataPointId}", result.DataPointId);
            return true;
        }
        
        return false;
    }

    #endregion

    #region Data Record Operations

    public async Task<IoTDataRecord> ReportDataAsync(ReportIoTDataRequest request)
    {
        var dataPoint = await GetDataPointByDataPointIdAsync(request.DataPointId);
        if (dataPoint == null)
            throw new InvalidOperationException($"DataPoint {request.DataPointId} not found");

        var record = new IoTDataRecord
        {
            DeviceId = request.DeviceId,
            DataPointId = request.DataPointId,
            Value = request.Value,
            DataType = dataPoint.DataType,
            ReportedAt = request.ReportedAt ?? DateTime.UtcNow
        };

        // Check alarm
        if (dataPoint.AlarmConfig?.IsEnabled == true)
        {
            if (double.TryParse(request.Value, out var numValue))
            {
                var isAlarm = CheckAlarm(numValue, dataPoint.AlarmConfig);
                record.IsAlarm = isAlarm;
                if (isAlarm)
                {
                    record.AlarmLevel = dataPoint.AlarmConfig.Level;
                }
            }
        }

        var result = await _dataRecordFactory.CreateAsync(record);

        // Update data point last value
        var dpFilter = Builders<IoTDataPoint>.Filter.Eq(x => x.Id, dataPoint.Id);
        var dpUpdates = new List<UpdateDefinition<IoTDataPoint>>
        {
            Builders<IoTDataPoint>.Update.Set(x => x.LastValue, request.Value),
            Builders<IoTDataPoint>.Update.Set(x => x.LastUpdatedAt, DateTime.UtcNow)
        };
        await _dataPointFactory.FindOneAndUpdateAsync(dpFilter, Builders<IoTDataPoint>.Update.Combine(dpUpdates));

        // Update device last reported time
        var device = await GetDeviceByDeviceIdAsync(request.DeviceId);
        if (device != null)
        {
            var deviceFilter = Builders<IoTDevice>.Filter.Eq(x => x.Id, device.Id);
            var deviceUpdate = Builders<IoTDevice>.Update.Set(x => x.LastReportedAt, DateTime.UtcNow);
            await _deviceFactory.FindOneAndUpdateAsync(deviceFilter, deviceUpdate);
        }

        return result;
    }

    public async Task<List<IoTDataRecord>> BatchReportDataAsync(BatchReportIoTDataRequest request)
    {
        var records = new List<IoTDataRecord>();

        foreach (var dataPoint in request.DataPoints)
        {
            var reportRequest = new ReportIoTDataRequest
            {
                DeviceId = request.DeviceId,
                DataPointId = dataPoint.DataPointId,
                Value = dataPoint.Value,
                ReportedAt = request.ReportedAt
            };

            var record = await ReportDataAsync(reportRequest);
            records.Add(record);
        }

        return records;
    }

    public async Task<(List<IoTDataRecord> Records, long Total)> QueryDataRecordsAsync(QueryIoTDataRequest request)
    {
        var filter = Builders<IoTDataRecord>.Filter.Empty;

        if (!string.IsNullOrEmpty(request.DeviceId))
            filter &= Builders<IoTDataRecord>.Filter.Eq(x => x.DeviceId, request.DeviceId);

        if (!string.IsNullOrEmpty(request.DataPointId))
            filter &= Builders<IoTDataRecord>.Filter.Eq(x => x.DataPointId, request.DataPointId);

        if (request.StartTime.HasValue || request.EndTime.HasValue)
        {
            var dateFilter = Builders<IoTDataRecord>.Filter.Empty;
            if (request.StartTime.HasValue)
                dateFilter &= Builders<IoTDataRecord>.Filter.Gte(x => x.ReportedAt, request.StartTime.Value);
            if (request.EndTime.HasValue)
                dateFilter &= Builders<IoTDataRecord>.Filter.Lte(x => x.ReportedAt, request.EndTime.Value);
            filter &= dateFilter;
        }

        var sort = Builders<IoTDataRecord>.Sort.Descending(x => x.ReportedAt);
        var (records, total) = await _dataRecordFactory.FindPagedAsync(filter, sort, request.PageIndex, request.PageSize);

        return (records, total);
    }

    public async Task<IoTDataRecord?> GetLatestDataAsync(string dataPointId)
    {
        var filter = Builders<IoTDataRecord>.Filter.Eq(x => x.DataPointId, dataPointId);
        var sort = Builders<IoTDataRecord>.Sort.Descending(x => x.ReportedAt);

        var records = await _dataRecordFactory.FindAsync(filter, sort, 1);
        return records.FirstOrDefault();
    }

    public async Task<DataStatistics?> GetDataStatisticsAsync(string dataPointId, DateTime startTime, DateTime endTime)
    {
        var filter = Builders<IoTDataRecord>.Filter.Eq(x => x.DataPointId, dataPointId) &
                     Builders<IoTDataRecord>.Filter.Gte(x => x.ReportedAt, startTime) &
                     Builders<IoTDataRecord>.Filter.Lte(x => x.ReportedAt, endTime);

        var records = await _dataRecordFactory.FindAsync(filter);

        if (records.Count == 0)
            return null;

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

        var result = await _eventFactory.CreateAsync(@event);
        _logger.LogInformation("Event created: {EventType} for device {DeviceId}", eventType, deviceId);
        return result;
    }

    public async Task<(List<IoTDeviceEvent> Events, long Total)> QueryEventsAsync(QueryIoTEventRequest request)
    {
        var filter = Builders<IoTDeviceEvent>.Filter.Empty;

        if (!string.IsNullOrEmpty(request.DeviceId))
            filter &= Builders<IoTDeviceEvent>.Filter.Eq(x => x.DeviceId, request.DeviceId);

        if (!string.IsNullOrEmpty(request.EventType))
            filter &= Builders<IoTDeviceEvent>.Filter.Eq(x => x.EventType, request.EventType);

        if (!string.IsNullOrEmpty(request.Level))
            filter &= Builders<IoTDeviceEvent>.Filter.Eq(x => x.Level, request.Level);

        if (request.IsHandled.HasValue)
            filter &= Builders<IoTDeviceEvent>.Filter.Eq(x => x.IsHandled, request.IsHandled.Value);

        if (request.StartTime.HasValue || request.EndTime.HasValue)
        {
            var dateFilter = Builders<IoTDeviceEvent>.Filter.Empty;
            if (request.StartTime.HasValue)
                dateFilter &= Builders<IoTDeviceEvent>.Filter.Gte(x => x.OccurredAt, request.StartTime.Value);
            if (request.EndTime.HasValue)
                dateFilter &= Builders<IoTDeviceEvent>.Filter.Lte(x => x.OccurredAt, request.EndTime.Value);
            filter &= dateFilter;
        }

        var sort = Builders<IoTDeviceEvent>.Sort.Descending(x => x.OccurredAt);
        var (events, total) = await _eventFactory.FindPagedAsync(filter, sort, request.PageIndex, request.PageSize);

        return (events, total);
    }

    public async Task<bool> HandleEventAsync(string eventId, string remarks)
    {
        var filter = Builders<IoTDeviceEvent>.Filter.Eq(x => x.Id, eventId);
        var builder = Builders<IoTDeviceEvent>.Update;
        var updates = new List<UpdateDefinition<IoTDeviceEvent>>
        {
            builder.Set(x => x.IsHandled, true),
            builder.Set(x => x.HandledRemarks, remarks)
        };

        var result = await _eventFactory.FindOneAndUpdateAsync(filter, builder.Combine(updates));
        return result != null;
    }

    public async Task<long> GetUnhandledEventCountAsync(string? deviceId = null)
    {
        var filter = Builders<IoTDeviceEvent>.Filter.Eq(x => x.IsHandled, false);

        if (!string.IsNullOrEmpty(deviceId))
            filter &= Builders<IoTDeviceEvent>.Filter.Eq(x => x.DeviceId, deviceId);

        return await _eventFactory.CountAsync(filter);
    }

    #endregion

    #region Statistics Operations

    public async Task<PlatformStatistics> GetPlatformStatisticsAsync()
    {
        var gatewayFilter = Builders<IoTGateway>.Filter.Empty;
        var gateways = await _gatewayFactory.FindAsync(gatewayFilter);

        var deviceFilter = Builders<IoTDevice>.Filter.Empty;
        var devices = await _deviceFactory.FindAsync(deviceFilter);

        var dataPointFilter = Builders<IoTDataPoint>.Filter.Empty;
        var dataPoints = await _dataPointFactory.FindAsync(dataPointFilter);

        var recordFilter = Builders<IoTDataRecord>.Filter.Empty;
        var recordCount = await _dataRecordFactory.CountAsync(recordFilter);

        var alarmFilter = Builders<IoTDeviceEvent>.Filter.Eq(x => x.IsHandled, false);
        var unhandledAlarms = await _eventFactory.CountAsync(alarmFilter);

        return new PlatformStatistics
        {
            TotalGateways = gateways.Count,
            OnlineGateways = gateways.Count(x => x.Status == IoTDeviceStatus.Online),
            TotalDevices = devices.Count,
            OnlineDevices = devices.Count(x => x.Status == IoTDeviceStatus.Online),
            TotalDataPoints = dataPoints.Count,
            TotalDataRecords = recordCount,
            UnhandledAlarms = unhandledAlarms,
            LastUpdatedAt = DateTime.UtcNow
        };
    }

    public async Task<DeviceStatusStatistics> GetDeviceStatusStatisticsAsync()
    {
        var filter = Builders<IoTDevice>.Filter.Empty;
        var devices = await _deviceFactory.FindAsync(filter);

        return new DeviceStatusStatistics
        {
            Online = devices.Count(x => x.Status == IoTDeviceStatus.Online),
            Offline = devices.Count(x => x.Status == IoTDeviceStatus.Offline),
            Fault = devices.Count(x => x.Status == IoTDeviceStatus.Fault),
            Maintenance = devices.Count(x => x.Status == IoTDeviceStatus.Maintenance)
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
            "RangeThreshold" => value < config.Threshold || value > (config.Threshold * 2), // Simple range check
            _ => false
        };
    }

    #endregion
}

