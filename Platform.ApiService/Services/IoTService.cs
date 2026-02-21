using Platform.ApiService.Models;
using Platform.ServiceDefaults.Services;
using Microsoft.Extensions.Logging;
using System.Linq;

namespace Platform.ApiService.Services;

/// <summary>
/// 物联网服务实现
/// </summary>
public class IoTService : IIoTService
{
    private readonly IDataFactory<IoTGateway> _gatewayFactory;
    private readonly IDataFactory<IoTDevice> _deviceFactory;
    private readonly IDataFactory<IoTDataPoint> _dataPointFactory;
    private readonly IDataFactory<IoTDataRecord> _dataRecordFactory;
    private readonly IDataFactory<IoTDeviceEvent> _eventFactory;
    private readonly IDataFactory<IoTDeviceTwin> _twinFactory;
    private readonly IDataFactory<IoTDeviceCommand> _commandFactory;
    private readonly ILogger<IoTService> _logger;

    /// <summary>
    /// 初始化物联网服务
    /// </summary>
    /// <param name="gatewayFactory">网关数据操作工厂</param>
    /// <param name="deviceFactory">设备数据操作工厂</param>
    /// <param name="dataPointFactory">数据点数据操作工厂</param>
    /// <param name="dataRecordFactory">数据记录数据操作工厂</param>
    /// <param name="eventFactory">设备事件数据操作工厂</param>
    /// <param name="twinFactory">设备孪生数据操作工厂</param>
    /// <param name="commandFactory">云到设备命令数据操作工厂</param>
    /// <param name="logger">日志记录器</param>
    public IoTService(
        IDataFactory<IoTGateway> gatewayFactory,
        IDataFactory<IoTDevice> deviceFactory,
        IDataFactory<IoTDataPoint> dataPointFactory,
        IDataFactory<IoTDataRecord> dataRecordFactory,
        IDataFactory<IoTDeviceEvent> eventFactory,
        IDataFactory<IoTDeviceTwin> twinFactory,
        IDataFactory<IoTDeviceCommand> commandFactory,
        ILogger<IoTService> logger)
    {
        _gatewayFactory = gatewayFactory ?? throw new ArgumentNullException(nameof(gatewayFactory));
        _deviceFactory = deviceFactory ?? throw new ArgumentNullException(nameof(deviceFactory));
        _dataPointFactory = dataPointFactory ?? throw new ArgumentNullException(nameof(dataPointFactory));
        _dataRecordFactory = dataRecordFactory ?? throw new ArgumentNullException(nameof(dataRecordFactory));
        _eventFactory = eventFactory ?? throw new ArgumentNullException(nameof(eventFactory));
        _twinFactory = twinFactory ?? throw new ArgumentNullException(nameof(twinFactory));
        _commandFactory = commandFactory ?? throw new ArgumentNullException(nameof(commandFactory));
        _logger = logger ?? throw new ArgumentNullException(nameof(logger));
    }

    #region Gateway Operations

    /// <summary>
    /// 创建网关
    /// </summary>
    /// <param name="request">创建网关请求</param>
    /// <returns>创建的网关</returns>
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

        var result = await _gatewayFactory.CreateAsync(gateway);
        _logger.LogInformation("Gateway created: {GatewayId}", result.GatewayId);
        return result;
    }

    /// <summary>
    /// 获取网关列表
    /// </summary>
    /// <param name="keyword">关键词</param>
    /// <param name="status">设备状态</param>
    /// <param name="pageIndex">页码</param>
    /// <param name="pageSize">每页数量</param>
    /// <returns>网关列表和总数</returns>
    public async Task<(List<IoTGateway> Items, long Total)> GetGatewaysAsync(string? keyword = null, IoTDeviceStatus? status = null, int pageIndex = 1, int pageSize = 20)
    {
        var keywordLower = keyword?.ToLowerInvariant();

        return await _gatewayFactory.FindPagedAsync(
            g =>
                (string.IsNullOrEmpty(keywordLower) ||
                 (g.Name != null && g.Name.ToLower().Contains(keywordLower)) ||
                 (g.Title != null && g.Title.ToLower().Contains(keywordLower)) ||
                 (g.GatewayId != null && g.GatewayId.ToLower().Contains(keywordLower))) &&
                (!status.HasValue || g.Status == status.Value),
            query => query.OrderByDescending(g => g.CreatedAt),
            pageIndex,
            pageSize);
    }

    /// <summary>
    /// 获取网关详情
    /// </summary>
    /// <param name="id">网关ID</param>
    /// <returns>网关信息</returns>
    public async Task<IoTGateway?> GetGatewayByIdAsync(string id)
    {
        return await _gatewayFactory.GetByIdAsync(id);
    }

    /// <summary>
    /// 根据网关ID获取网关
    /// </summary>
    /// <param name="gatewayId">网关唯一标识符</param>
    /// <returns>网关信息</returns>
    public async Task<IoTGateway?> GetGatewayByGatewayIdAsync(string gatewayId)
    {
        var gateways = await _gatewayFactory.FindAsync(g => g.GatewayId == gatewayId, limit: 1);
        return gateways.FirstOrDefault();
    }

    /// <summary>
    /// 更新网关
    /// </summary>
    /// <param name="id">网关ID</param>
    /// <param name="request">更新网关请求</param>
    /// <returns>更新后的网关</returns>
    public async Task<IoTGateway?> UpdateGatewayAsync(string id, UpdateIoTGatewayRequest request)
    {
        var gateway = await GetGatewayByIdAsync(id);
        if (gateway == null)
            return null;

        // Check if there are any updates
        bool hasUpdates = !string.IsNullOrEmpty(request.Title) ||
                         !string.IsNullOrEmpty(request.ProtocolType) ||
                         !string.IsNullOrEmpty(request.Address) ||
                         request.Username != null ||
                         request.Password != null ||
                         request.IsEnabled.HasValue ||
                         request.Config != null;

        if (!hasUpdates)
        {
            return gateway;
        }

        var result = await _gatewayFactory.UpdateAsync(id, entity =>
        {
            if (!string.IsNullOrEmpty(request.Title))
            {
                entity.Title = request.Title;
                entity.Name = request.Title;
            }
            if (!string.IsNullOrEmpty(request.ProtocolType))
                entity.ProtocolType = request.ProtocolType;
            if (!string.IsNullOrEmpty(request.Address))
                entity.Address = request.Address;
            if (request.Username != null)
                entity.Username = request.Username;
            if (request.Password != null)
                entity.Password = request.Password;
            if (request.IsEnabled.HasValue)
                entity.IsEnabled = request.IsEnabled.Value;
            if (request.Config != null)
                entity.Config = NormalizeConfig(request.Config);
        });

        return result;
    }

    /// <summary>
    /// 删除网关
    /// </summary>
    /// <param name="id">网关ID</param>
    /// <returns>是否删除成功</returns>
    public async Task<bool> DeleteGatewayAsync(string id)
    {
        var gateway = await GetGatewayByIdAsync(id);
        if (gateway == null)
            return false;

        var result = await _gatewayFactory.SoftDeleteAsync(id);

        if (result)
        {
            _logger.LogInformation("Gateway deleted: {GatewayId}", gateway.GatewayId);
            return true;
        }

        return false;
    }

    /// <summary>
    /// 更新网关状态
    /// </summary>
    /// <param name="gatewayId">网关唯一标识符</param>
    /// <param name="status">设备状态</param>
    /// <returns>是否更新成功</returns>
    public async Task<bool> UpdateGatewayStatusAsync(string gatewayId, IoTDeviceStatus status)
    {
        var gateway = await GetGatewayByGatewayIdAsync(gatewayId);
        if (gateway == null)
            return false;

        var result = await _gatewayFactory.UpdateAsync(gateway.Id, entity =>
        {
            entity.Status = status;
            if (status == IoTDeviceStatus.Online)
                entity.LastConnectedAt = DateTime.UtcNow;
        });

        return result != null;
    }

    /// <summary>
    /// 获取网关统计信息
    /// </summary>
    /// <param name="gatewayId">网关唯一标识符</param>
    /// <returns>网关统计信息</returns>
    public async Task<GatewayStatistics?> GetGatewayStatisticsAsync(string gatewayId)
    {
        var gateway = await GetGatewayByGatewayIdAsync(gatewayId);
        if (gateway == null)
            return null;

        var onlineThreshold = DateTime.UtcNow.AddMinutes(-5);
        var totalDevices = await _deviceFactory.CountAsync(d => d.GatewayId == gatewayId);
        var onlineDevices = await _deviceFactory.CountAsync(d => d.GatewayId == gatewayId && d.LastReportedAt.HasValue && d.LastReportedAt.Value >= onlineThreshold);

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

    /// <summary>
    /// 创建设备
    /// </summary>
    /// <param name="request">创建设备请求</param>
    /// <returns>创建的设备</returns>
    public async Task<IoTDevice> CreateDeviceAsync(CreateIoTDeviceRequest request)
    {
        // 验证并处理 DeviceId
        string deviceId;
        if (!string.IsNullOrWhiteSpace(request.DeviceId))
        {
            // 验证 DeviceId 格式（只允许字母、数字、连字符、下划线）
            var deviceIdPattern = @"^[a-zA-Z0-9_-]+$";
            if (!System.Text.RegularExpressions.Regex.IsMatch(request.DeviceId, deviceIdPattern))
            {
                throw new ArgumentException("设备标识符只能包含字母、数字、连字符和下划线");
            }

            // 检查是否已存在（确保企业内唯一）
            var existing = await _deviceFactory.FindAsync(d => d.DeviceId == request.DeviceId && d.IsDeleted != true, limit: 1);
            if (existing.Count > 0)
            {
                throw new InvalidOperationException($"设备标识符 {request.DeviceId} 已存在");
            }

            deviceId = request.DeviceId.Trim();
        }
        else
        {
            // 自动生成 DeviceId（使用无连字符格式，避免序列化问题）
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

        var result = await _deviceFactory.CreateAsync(device);

        // Update gateway device count using atomic increment (if gateway is provided)
        if (!string.IsNullOrEmpty(request.GatewayId))
        {
            var gateway = await GetGatewayByGatewayIdAsync(request.GatewayId);
            if (gateway != null)
            {
                await _gatewayFactory.UpdateAsync(gateway.Id, entity =>
                {
                    entity.DeviceCount += 1;
                });
            }
        }

        _logger.LogInformation("Device created: {DeviceId} for company {CompanyId}", result.DeviceId, result.CompanyId);
        return result;
    }

    /// <summary>
    /// 获取设备列表
    /// </summary>
    /// <param name="gatewayId">网关ID（可选）</param>
    /// <param name="keyword">关键词</param>
    /// <param name="pageIndex">页码</param>
    /// <param name="pageSize">每页数量</param>
    /// <returns>设备列表和总数</returns>
    public async Task<(List<IoTDevice> Items, long Total)> GetDevicesAsync(string? gatewayId = null, string? keyword = null, int pageIndex = 1, int pageSize = 20)
    {
        var keywordLower = keyword?.ToLowerInvariant();

        var (items, total) = await _deviceFactory.FindPagedAsync(
            d =>
                (string.IsNullOrEmpty(gatewayId) || d.GatewayId == gatewayId) &&
                (string.IsNullOrEmpty(keywordLower) ||
                 (d.Name != null && d.Name.ToLower().Contains(keywordLower)) ||
                 (d.Title != null && d.Title.ToLower().Contains(keywordLower)) ||
                 (d.DeviceId != null && d.DeviceId.ToLower().Contains(keywordLower))),
            query => query.OrderByDescending(d => d.CreatedAt),
            pageIndex,
            pageSize);

        return (items, total);
    }

    /// <summary>
    /// 获取设备详情
    /// </summary>
    /// <param name="id">设备ID</param>
    /// <returns>设备信息</returns>
    public async Task<IoTDevice?> GetDeviceByIdAsync(string id)
    {
        return await _deviceFactory.GetByIdAsync(id);
    }

    /// <summary>
    /// 根据设备ID获取设备
    /// </summary>
    /// <param name="deviceId">设备唯一标识符</param>
    /// <returns>设备信息</returns>
    public async Task<IoTDevice?> GetDeviceByDeviceIdAsync(string deviceId)
    {
        var devices = await _deviceFactory.FindAsync(d => d.DeviceId == deviceId && d.IsDeleted != true, limit: 1);
        return devices.FirstOrDefault();
    }

    /// <summary>
    /// 更新设备
    /// </summary>
    /// <param name="id">设备ID</param>
    /// <param name="request">更新设备请求</param>
    /// <returns>更新后的设备</returns>
    public async Task<IoTDevice?> UpdateDeviceAsync(string id, UpdateIoTDeviceRequest request)
    {
        var device = await GetDeviceByIdAsync(id);
        if (device == null)
            return null;

        // Check if there are any updates
        bool hasUpdates = !string.IsNullOrEmpty(request.Name) ||
                         !string.IsNullOrEmpty(request.Title) ||
                         !string.IsNullOrEmpty(request.GatewayId) ||
                         request.IsEnabled.HasValue;

        if (!hasUpdates)
        {
            return device;
        }

        var result = await _deviceFactory.UpdateAsync(id, entity =>
        {
            if (!string.IsNullOrEmpty(request.Name))
                entity.Name = request.Name;
            if (!string.IsNullOrEmpty(request.Title))
                entity.Title = request.Title;
            if (!string.IsNullOrEmpty(request.GatewayId))
                entity.GatewayId = request.GatewayId;
            if (request.IsEnabled.HasValue)
                entity.IsEnabled = request.IsEnabled.Value;
            if (request.DeviceType.HasValue)
                entity.DeviceType = request.DeviceType.Value;
            if (request.Description != null)
                entity.Description = request.Description;
            if (request.Location != null)
                entity.Location = request.Location;
            if (request.Tags != null)
                entity.Tags = request.Tags;
            if (request.RetentionDays.HasValue)
                entity.RetentionDays = request.RetentionDays.Value;
        });

        return result;
    }

    /// <summary>
    /// 删除设备
    /// </summary>
    /// <param name="id">设备ID</param>
    /// <returns>是否删除成功</returns>
    public async Task<bool> DeleteDeviceAsync(string id)
    {
        var device = await GetDeviceByIdAsync(id);
        if (device == null)
            return false;

        var result = await _deviceFactory.SoftDeleteAsync(id);

        if (result)
        {
            // Update gateway device count using atomic decrement
            var gateway = await GetGatewayByGatewayIdAsync(device.GatewayId);
            if (gateway != null)
            {
                await _gatewayFactory.UpdateAsync(gateway.Id, entity =>
                {
                    entity.DeviceCount = Math.Max(0, entity.DeviceCount - 1);
                });
            }

            _logger.LogInformation("Device deleted: {DeviceId} for company {CompanyId}", device.DeviceId, device.CompanyId);
            return true;
        }

        return false;
    }

    /// <summary>
    /// 更新设备状态
    /// </summary>
    /// <param name="deviceId">设备唯一标识符</param>
    /// <param name="status">设备状态</param>
    /// <returns>是否更新成功</returns>
    public async Task<bool> UpdateDeviceStatusAsync(string deviceId, IoTDeviceStatus status)
    {
        // 简化：只更新最后上报时间，不再维护 Status 字段
        // 如果状态不是 Online，不需要更新任何字段，只需检查设备是否存在
        if (status != IoTDeviceStatus.Online)
        {
            var devices = await _deviceFactory.FindAsync(d => d.DeviceId == deviceId && d.IsDeleted != true, limit: 1);
            return devices.Count > 0;
        }

        // 状态为 Online 时，更新最后上报时间
        var device = await GetDeviceByDeviceIdAsync(deviceId);
        if (device == null)
            return false;

        var result = await _deviceFactory.UpdateAsync(device.Id, entity =>
        {
            entity.LastReportedAt = DateTime.UtcNow;
        });

        return result != null;
    }

    /// <summary>
    /// 处理设备连接
    /// </summary>
    /// <param name="request">设备连接请求</param>
    /// <returns>是否处理成功</returns>
    public async Task<bool> HandleDeviceConnectAsync(DeviceConnectRequest request)
    {
        var device = await GetDeviceByDeviceIdAsync(request.DeviceId);
        if (device == null)
            return false;

        var result = await _deviceFactory.UpdateAsync(device.Id, entity =>
        {
            entity.LastReportedAt = DateTime.UtcNow;
            entity.Status = IoTDeviceStatus.Online;
        });

        if (result != null)
        {
            await CreateEventAsync(request.DeviceId, "Connected", "Info", "Device connected");
            _logger.LogInformation("Device connected: {DeviceId} for company {CompanyId}", request.DeviceId, result.CompanyId);
            return true;
        }

        return false;
    }

    /// <summary>
    /// 处理设备断开连接
    /// </summary>
    /// <param name="request">设备断开连接请求</param>
    /// <returns>是否处理成功</returns>
    public async Task<bool> HandleDeviceDisconnectAsync(DeviceDisconnectRequest request)
    {
        // 断开连接不需要更新设备字段，只需检查设备是否存在并创建事件
        var devices = await _deviceFactory.FindAsync(d => d.DeviceId == request.DeviceId && d.IsDeleted != true, limit: 1);

        if (devices.Count > 0)
        {
            var device = devices[0];
            await _deviceFactory.UpdateAsync(device.Id, entity =>
            {
                entity.Status = IoTDeviceStatus.Offline;
            });
            await CreateEventAsync(request.DeviceId, "Disconnected", "Warning", request.Reason ?? "Device disconnected");
            _logger.LogInformation("Device disconnected: {DeviceId} for company {CompanyId}", request.DeviceId, device.CompanyId);
            return true;
        }

        return false;
    }

    /// <summary>
    /// 获取设备统计信息
    /// </summary>
    /// <param name="deviceId">设备唯一标识符</param>
    /// <returns>设备统计信息</returns>
    public async Task<DeviceStatistics?> GetDeviceStatisticsAsync(string deviceId)
    {
        var device = await GetDeviceByDeviceIdAsync(deviceId);
        if (device == null)
            return null;

        var dataPoints = await _dataPointFactory.FindAsync(dp => dp.DeviceId == deviceId && dp.IsDeleted != true);

        var recordCount = await _dataRecordFactory.CountAsync(r => r.DeviceId == deviceId && r.IsDeleted != true);

        var unhandledAlarms = await _eventFactory.CountAsync(e => e.DeviceId == deviceId && e.IsHandled == false && e.IsDeleted != true);

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

    /// <summary>
    /// 创建数据点
    /// </summary>
    /// <param name="request">创建数据点请求</param>
    /// <returns>创建的数据点</returns>
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

        var result = await _dataPointFactory.CreateAsync(dataPoint);

        _logger.LogInformation("DataPoint created: {DataPointId} for company {CompanyId}", result.DataPointId, result.CompanyId);
        return result;
    }

    /// <summary>
    /// 获取数据点列表
    /// </summary>
    /// <param name="deviceId">设备ID（可选）</param>
    /// <param name="keyword">关键词</param>
    /// <param name="pageIndex">页码</param>
    /// <param name="pageSize">每页数量</param>
    /// <returns>数据点列表和总数</returns>
    public async Task<(List<IoTDataPoint> Items, long Total)> GetDataPointsAsync(string? deviceId = null, string? keyword = null, int pageIndex = 1, int pageSize = 20)
    {
        var keywordLower = keyword?.ToLowerInvariant();

        var (items, total) = await _dataPointFactory.FindPagedAsync(
            dp =>
                (string.IsNullOrEmpty(deviceId) || dp.DeviceId == deviceId) &&
                (string.IsNullOrEmpty(keywordLower) ||
                 (dp.Name != null && dp.Name.ToLower().Contains(keywordLower)) ||
                 (dp.Title != null && dp.Title.ToLower().Contains(keywordLower)) ||
                 (dp.DataPointId != null && dp.DataPointId.ToLower().Contains(keywordLower))),
            query => query.OrderByDescending(dp => dp.CreatedAt),
            pageIndex,
            pageSize);

        return (items, total);
    }

    /// <summary>
    /// 获取数据点详情
    /// </summary>
    /// <param name="id">数据点ID</param>
    /// <returns>数据点信息</returns>
    public async Task<IoTDataPoint?> GetDataPointByIdAsync(string id)
    {
        return await _dataPointFactory.GetByIdAsync(id);
    }

    /// <summary>
    /// 根据数据点ID获取数据点
    /// </summary>
    /// <param name="dataPointId">数据点唯一标识符</param>
    /// <returns>数据点信息</returns>
    public async Task<IoTDataPoint?> GetDataPointByDataPointIdAsync(string dataPointId)
    {
        var dataPoints = await _dataPointFactory.FindAsync(dp => dp.DataPointId == dataPointId && dp.IsDeleted != true, limit: 1);
        return dataPoints.FirstOrDefault();
    }

    /// <summary>
    /// 更新数据点
    /// </summary>
    /// <param name="id">数据点ID</param>
    /// <param name="request">更新数据点请求</param>
    /// <returns>更新后的数据点</returns>
    public async Task<IoTDataPoint?> UpdateDataPointAsync(string id, UpdateIoTDataPointRequest request)
    {
        var dataPoint = await GetDataPointByIdAsync(id);
        if (dataPoint == null)
            return null;

        // Check if there are any updates
        bool hasUpdates = !string.IsNullOrEmpty(request.Name) ||
                         !string.IsNullOrEmpty(request.Title) ||
                         request.DataType.HasValue ||
                         request.Unit != null ||
                         request.IsReadOnly.HasValue ||
                         request.SamplingInterval.HasValue ||
                         request.IsEnabled.HasValue ||
                         request.AlarmConfig != null;

        if (!hasUpdates)
        {
            return dataPoint;
        }

        var result = await _dataPointFactory.UpdateAsync(id, entity =>
        {
            if (!string.IsNullOrEmpty(request.Name))
                entity.Name = request.Name;
            if (!string.IsNullOrEmpty(request.Title))
                entity.Title = request.Title;
            if (request.DataType.HasValue)
                entity.DataType = request.DataType.Value;
            if (request.Unit != null)
                entity.Unit = request.Unit;
            if (request.IsReadOnly.HasValue)
                entity.IsReadOnly = request.IsReadOnly.Value;
            if (request.SamplingInterval.HasValue)
                entity.SamplingInterval = request.SamplingInterval.Value;
            if (request.IsEnabled.HasValue)
                entity.IsEnabled = request.IsEnabled.Value;
            if (request.AlarmConfig != null)
                entity.AlarmConfig = request.AlarmConfig;
        });

        return result;
    }

    /// <summary>
    /// 删除数据点
    /// </summary>
    /// <param name="id">数据点ID</param>
    /// <returns>是否删除成功</returns>
    public async Task<bool> DeleteDataPointAsync(string id)
    {
        var dataPoint = await GetDataPointByIdAsync(id);
        if (dataPoint == null)
            return false;

        var result = await _dataPointFactory.SoftDeleteAsync(id);

        if (result)
        {
            _logger.LogInformation("DataPoint deleted: {DataPointId} for company {CompanyId}", dataPoint.DataPointId, dataPoint.CompanyId);
            return true;
        }

        return false;
    }

    #endregion

    #region Data Record Operations

    /// <summary>
    /// 上报数据
    /// </summary>
    /// <param name="request">上报数据请求</param>
    /// <returns>创建的数据记录</returns>
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
            SamplingInterval = dataPoint.SamplingInterval,
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
        await _dataPointFactory.UpdateAsync(dataPoint.Id, entity =>
        {
            entity.LastValue = request.Value;
            entity.LastUpdatedAt = DateTime.UtcNow;
        });

        // Update device last reported time
        var device = await GetDeviceByDeviceIdAsync(request.DeviceId);
        if (device != null)
        {
            await _deviceFactory.UpdateAsync(device.Id, entity =>
            {
                entity.LastReportedAt = DateTime.UtcNow;
            });
        }

        return result;
    }

    /// <summary>
    /// 批量上报数据
    /// </summary>
    /// <param name="request">批量上报数据请求</param>
    /// <returns>创建的数据记录列表</returns>
    public async Task<List<IoTDataRecord>> BatchReportDataAsync(BatchReportIoTDataRequest request)
    {
        // 批量大小限制：防止数据洪水攻击
        const int maxBatchSize = 100;
        if (request.DataPoints == null || request.DataPoints.Count == 0)
            throw new ArgumentException("批量数据点列表不能为空", nameof(request));
        if (request.DataPoints.Count > maxBatchSize)
            throw new ArgumentException($"批量数据点数量不能超过 {maxBatchSize} 条", nameof(request));

        // 一次性查出所有需要的数据点，避免 N+1
        var requestedDataPointIds = request.DataPoints.Select(dp => dp.DataPointId).Distinct().ToList();
        var allDataPoints = await _dataPointFactory.FindAsync(
            dp => requestedDataPointIds.Contains(dp.DataPointId) && dp.IsDeleted != true);
        var dpLookup = allDataPoints.ToDictionary(dp => dp.DataPointId);

        var reportedAt = request.ReportedAt ?? DateTime.UtcNow;
        var records = new List<IoTDataRecord>();

        foreach (var item in request.DataPoints)
        {
            if (!dpLookup.TryGetValue(item.DataPointId, out var dataPoint))
            {
                _logger.LogWarning("BatchReport: DataPoint {DataPointId} not found, skipping", item.DataPointId);
                continue;
            }

            var record = new IoTDataRecord
            {
                DeviceId = request.DeviceId,
                DataPointId = item.DataPointId,
                Value = item.Value,
                DataType = dataPoint.DataType,
                SamplingInterval = dataPoint.SamplingInterval,
                ReportedAt = reportedAt
            };

            // 告警判断
            if (dataPoint.AlarmConfig?.IsEnabled == true && double.TryParse(item.Value, out var numValue))
            {
                var isAlarm = CheckAlarm(numValue, dataPoint.AlarmConfig);
                record.IsAlarm = isAlarm;
                if (isAlarm) record.AlarmLevel = dataPoint.AlarmConfig.Level;
            }

            records.Add(record);
        }

        if (records.Count == 0) return records;

        // 批量写入
        await _dataRecordFactory.CreateManyAsync(records);

        // 批量更新各 DataPoint 最新值
        foreach (var group in records.GroupBy(r => r.DataPointId))
        {
            var latest = group.OrderByDescending(r => r.ReportedAt).First();
            if (dpLookup.TryGetValue(latest.DataPointId, out var dp))
            {
                await _dataPointFactory.UpdateAsync(dp.Id, entity =>
                {
                    entity.LastValue = latest.Value;
                    entity.LastUpdatedAt = latest.ReportedAt;
                });
            }
        }

        // 更新设备最后上报时间
        var device = await GetDeviceByDeviceIdAsync(request.DeviceId);
        if (device != null)
        {
            await _deviceFactory.UpdateAsync(device.Id, entity =>
            {
                entity.LastReportedAt = reportedAt;
                entity.Status = IoTDeviceStatus.Online;
            });
        }

        return records;
    }

    /// <summary>
    /// 查询数据记录
    /// </summary>
    /// <param name="request">查询数据请求</param>
    /// <returns>数据记录列表和总数</returns>
    public async Task<(List<IoTDataRecord> Records, long Total)> QueryDataRecordsAsync(QueryIoTDataRequest request)
    {
        var deviceId = request.DeviceId;
        var dataPointId = request.DataPointId;
        var startTime = request.StartTime;
        var endTime = request.EndTime;

        var (records, total) = await _dataRecordFactory.FindPagedAsync(
            r =>
                (string.IsNullOrEmpty(deviceId) || r.DeviceId == deviceId) &&
                (string.IsNullOrEmpty(dataPointId) || r.DataPointId == dataPointId) &&
                (!startTime.HasValue || r.ReportedAt >= startTime.Value) &&
                (!endTime.HasValue || r.ReportedAt <= endTime.Value),
            query => query.OrderByDescending(r => r.ReportedAt),
            request.PageIndex,
            request.PageSize);

        return (records, total);
    }

    /// <summary>
    /// 获取最新数据
    /// </summary>
    /// <param name="dataPointId">数据点唯一标识符</param>
    /// <returns>最新的数据记录</returns>
    public async Task<IoTDataRecord?> GetLatestDataAsync(string dataPointId)
    {
        var records = await _dataRecordFactory.FindAsync(
            r => r.DataPointId == dataPointId && r.IsDeleted != true,
            query => query.OrderByDescending(r => r.ReportedAt),
            limit: 1);
        return records.FirstOrDefault();
    }

    /// <summary>
    /// 获取数据统计
    /// </summary>
    /// <param name="dataPointId">数据点唯一标识符</param>
    /// <param name="startTime">开始时间</param>
    /// <param name="endTime">结束时间</param>
    /// <returns>数据统计信息</returns>
    public async Task<DataStatistics?> GetDataStatisticsAsync(string dataPointId, DateTime startTime, DateTime endTime)
    {
        var records = await _dataRecordFactory.FindAsync(
            r => r.DataPointId == dataPointId &&
                 r.ReportedAt >= startTime &&
                 r.ReportedAt <= endTime &&
                 r.IsDeleted != true);

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
            StartTime = startTime,
            EndTime = endTime
        };
    }

    #endregion

    #region Event Operations

    /// <summary>
    /// 创建设备事件
    /// </summary>
    /// <param name="deviceId">设备唯一标识符</param>
    /// <param name="eventType">事件类型</param>
    /// <param name="level">事件级别</param>
    /// <param name="description">事件描述</param>
    /// <param name="eventData">事件数据</param>
    /// <returns>创建的事件</returns>
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

    /// <summary>
    /// 查询设备事件
    /// </summary>
    /// <param name="request">查询事件请求</param>
    /// <returns>事件列表和总数</returns>
    public async Task<(List<IoTDeviceEvent> Events, long Total)> QueryEventsAsync(QueryIoTEventRequest request)
    {
        var deviceId = request.DeviceId;
        var eventType = request.EventType;
        var level = request.Level;
        var startTime = request.StartTime;
        var endTime = request.EndTime;

        var (events, total) = await _eventFactory.FindPagedAsync(
            e =>
                (string.IsNullOrEmpty(deviceId) || e.DeviceId == deviceId) &&
                (string.IsNullOrEmpty(eventType) || e.EventType == eventType) &&
                (string.IsNullOrEmpty(level) || e.Level == level) &&
                (!request.IsHandled.HasValue || e.IsHandled == request.IsHandled.Value) &&
                (!startTime.HasValue || e.OccurredAt >= startTime.Value) &&
                (!endTime.HasValue || e.OccurredAt <= endTime.Value),
            query => query.OrderByDescending(e => e.OccurredAt),
            request.PageIndex,
            request.PageSize);

        return (events, total);
    }

    /// <summary>
    /// 处理事件
    /// </summary>
    /// <param name="eventId">事件ID</param>
    /// <param name="remarks">处理备注</param>
    /// <returns>是否处理成功</returns>
    public async Task<bool> HandleEventAsync(string eventId, string remarks)
    {
        var result = await _eventFactory.UpdateAsync(eventId, entity =>
        {
            entity.IsHandled = true;
            entity.HandledRemarks = remarks;
        });

        return result != null;
    }

    /// <summary>
    /// 获取未处理事件数量
    /// </summary>
    /// <param name="deviceId">设备ID（可选）</param>
    /// <returns>未处理事件数量</returns>
    public async Task<long> GetUnhandledEventCountAsync(string? deviceId = null)
    {
        if (!string.IsNullOrEmpty(deviceId))
        {
            return await _eventFactory.CountAsync(e => e.IsHandled == false && e.DeviceId == deviceId && e.IsDeleted != true);
        }

        return await _eventFactory.CountAsync(e => e.IsHandled == false && e.IsDeleted != true);
    }

    #endregion

    #region Statistics Operations

    /// <summary>
    /// 获取平台统计信息
    /// </summary>
    /// <returns>平台统计信息</returns>
    public async Task<PlatformStatistics> GetPlatformStatisticsAsync()
    {
        var onlineThreshold = DateTime.UtcNow.AddMinutes(-5);

        var totalGateways = await _gatewayFactory.CountAsync();
        var onlineGateways = await _gatewayFactory.CountAsync(g => g.Status == IoTDeviceStatus.Online);

        var totalDevices = await _deviceFactory.CountAsync();
        var onlineDevices = await _deviceFactory.CountAsync(d => d.LastReportedAt.HasValue && d.LastReportedAt.Value >= onlineThreshold);

        var totalDataPoints = await _dataPointFactory.CountAsync();
        var recordCount = await _dataRecordFactory.CountAsync();
        var unhandledAlarms = await _eventFactory.CountAsync(e => e.IsHandled == false);

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

    /// <summary>
    /// 获取设备在线状态统计
    /// </summary>
    /// <returns>设备状态统计信息</returns>
    public async Task<DeviceStatusStatistics> GetDeviceStatusStatisticsAsync()
    {
        var onlineThreshold = DateTime.UtcNow.AddMinutes(-5);

        var totalDevices = await _deviceFactory.CountAsync();
        var online = await _deviceFactory.CountAsync(d => d.LastReportedAt.HasValue && d.LastReportedAt.Value >= onlineThreshold);

        return new DeviceStatusStatistics
        {
            Online = (int)online,
            Offline = (int)(totalDevices - online),
            Fault = 0,
            Maintenance = 0
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
        if (config == null || config.Count == 0)
        {
            return null;
        }

        // 仅保留可序列化的字符串键值对
        return config.ToDictionary(kv => kv.Key, kv => kv.Value ?? string.Empty);
    }

    #endregion

    #region Device Twin Operations

    /// <inheritdoc/>
    public async Task<IoTDeviceTwin> GetOrCreateDeviceTwinAsync(string deviceId)
    {
        var twins = await _twinFactory.FindAsync(t => t.DeviceId == deviceId && t.IsDeleted != true, limit: 1);
        if (twins.Count > 0) return twins[0];

        // 自动初始化孪生体
        var twin = new IoTDeviceTwin { DeviceId = deviceId };
        return await _twinFactory.CreateAsync(twin);
    }

    /// <inheritdoc/>
    public async Task<IoTDeviceTwin?> UpdateDesiredPropertiesAsync(string deviceId, UpdateDesiredPropertiesRequest request)
    {
        if (!await ValidateDeviceExistsAsync(deviceId)) return null;

        var twin = await GetOrCreateDeviceTwinAsync(deviceId);

        // 增量 patch：null 值删除键，非 null 值更新或添加
        var updated = new Dictionary<string, object>(twin.DesiredProperties);
        foreach (var (key, value) in request.Properties)
        {
            if (value == null)
                updated.Remove(key);
            else
                updated[key] = value;
        }

        var result = await _twinFactory.UpdateAsync(twin.Id, entity =>
        {
            entity.DesiredProperties = updated;
            entity.DesiredVersion++;
            entity.ETag = Guid.NewGuid().ToString("N");
            entity.DesiredUpdatedAt = DateTime.UtcNow;
        });

        _logger.LogInformation("Device {DeviceId} desired properties updated to version {Version}", deviceId, (result?.DesiredVersion ?? 0));
        return result;
    }

    /// <inheritdoc/>
    public async Task<IoTDeviceTwin?> ReportPropertiesAsync(string deviceId, string apiKey, Dictionary<string, object> properties)
    {
        if (!await ValidateApiKeyAsync(deviceId, apiKey))
            throw new UnauthorizedAccessException($"Invalid ApiKey for device {deviceId}");

        var twin = await GetOrCreateDeviceTwinAsync(deviceId);

        var updated = new Dictionary<string, object>(twin.ReportedProperties);
        foreach (var (key, value) in properties)
            updated[key] = value;

        var result = await _twinFactory.UpdateAsync(twin.Id, entity =>
        {
            entity.ReportedProperties = updated;
            entity.ReportedVersion++;
            entity.ReportedUpdatedAt = DateTime.UtcNow;
        });

        return result;
    }

    private async Task<bool> ValidateDeviceExistsAsync(string deviceId)
    {
        var devices = await _deviceFactory.FindAsync(d => d.DeviceId == deviceId && d.IsDeleted != true, limit: 1);
        return devices.Count > 0;
    }

    #endregion

    #region C2D Command Operations

    /// <inheritdoc/>
    public async Task<IoTDeviceCommand> SendCommandAsync(string deviceId, SendCommandRequest request)
    {
        if (!await ValidateDeviceExistsAsync(deviceId))
            throw new InvalidOperationException($"Device {deviceId} not found");

        var command = new IoTDeviceCommand
        {
            DeviceId = deviceId,
            CommandName = request.CommandName,
            Payload = request.Payload,
            ExpiresAt = DateTime.UtcNow.AddHours(Math.Max(1, request.TtlHours))
        };

        var result = await _commandFactory.CreateAsync(command);
        _logger.LogInformation("Command {CommandName} sent to device {DeviceId}, CommandId={CommandId}", request.CommandName, deviceId, result.Id);
        return result;
    }

    /// <inheritdoc/>
    public async Task<List<IoTDeviceCommand>> GetPendingCommandsAsync(string deviceId, string apiKey)
    {
        if (!await ValidateApiKeyAsync(deviceId, apiKey))
            throw new UnauthorizedAccessException($"Invalid ApiKey for device {deviceId}");

        var now = DateTime.UtcNow;
        var commands = await _commandFactory.FindAsync(
            c => c.DeviceId == deviceId &&
                 c.Status == CommandStatus.Pending &&
                 c.ExpiresAt > now &&
                 c.IsDeleted != true);

        if (commands.Count > 0)
        {
            // 批量标记为 Delivered
            foreach (var cmd in commands)
            {
                await _commandFactory.UpdateAsync(cmd.Id, entity =>
                {
                    entity.Status = CommandStatus.Delivered;
                    entity.DeliveredAt = now;
                });
            }
        }

        return commands;
    }

    /// <inheritdoc/>
    public async Task<bool> AckCommandAsync(string commandId, AckCommandRequest request)
    {
        var command = await _commandFactory.GetByIdAsync(commandId);
        if (command == null) return false;

        if (!await ValidateApiKeyAsync(command.DeviceId, request.ApiKey))
            throw new UnauthorizedAccessException($"Invalid ApiKey for device {command.DeviceId}");

        var result = await _commandFactory.UpdateAsync(commandId, entity =>
        {
            entity.Status = request.Success ? CommandStatus.Executed : CommandStatus.Failed;
            entity.ExecutedAt = DateTime.UtcNow;
            entity.ResponsePayload = request.ResponsePayload;
            entity.ErrorMessage = request.ErrorMessage;
        });

        _logger.LogInformation("Command {CommandId} acked: success={Success}", commandId, request.Success);
        return result != null;
    }

    /// <inheritdoc/>
    public async Task<int> ExpireCommandsAsync()
    {
        var now = DateTime.UtcNow;
        var expired = await _commandFactory.FindWithoutTenantFilterAsync(
            c => c.Status == CommandStatus.Pending && c.ExpiresAt <= now && c.IsDeleted != true);

        if (expired.Count == 0) return 0;

        foreach (var cmd in expired)
        {
            await _commandFactory.UpdateAsync(cmd.Id, entity =>
            {
                entity.Status = CommandStatus.Expired;
            });
        }

        _logger.LogInformation("Expired {Count} C2D commands", expired.Count);
        return expired.Count;
    }

    #endregion

    #region ApiKey Operations

    /// <inheritdoc/>
    public async Task<GenerateApiKeyResult> GenerateApiKeyAsync(string deviceId)
    {
        var device = await GetDeviceByDeviceIdAsync(deviceId);
        if (device == null)
            throw new InvalidOperationException($"Device {deviceId} not found");

        // 生成随机明文 ApiKey
        var rawKey = Convert.ToBase64String(System.Security.Cryptography.RandomNumberGenerator.GetBytes(32));

        // SHA-256 散列后存储
        var hash = Convert.ToHexString(
            System.Security.Cryptography.SHA256.HashData(System.Text.Encoding.UTF8.GetBytes(rawKey)));

        await _deviceFactory.UpdateAsync(device.Id, entity => { entity.ApiKey = hash; });

        _logger.LogInformation("ApiKey regenerated for device {DeviceId}", deviceId);
        return new GenerateApiKeyResult { DeviceId = deviceId, ApiKey = rawKey };
    }

    /// <inheritdoc/>
    public async Task<bool> ValidateApiKeyAsync(string deviceId, string apiKey)
    {
        if (string.IsNullOrWhiteSpace(apiKey)) return false;

        var device = await GetDeviceByDeviceIdAsync(deviceId);
        if (device?.ApiKey == null) return false;

        var hash = Convert.ToHexString(
            System.Security.Cryptography.SHA256.HashData(System.Text.Encoding.UTF8.GetBytes(apiKey)));

        return string.Equals(device.ApiKey, hash, StringComparison.OrdinalIgnoreCase);
    }

    #endregion
}

