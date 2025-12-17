using MongoDB.Driver;
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
    private readonly IDatabaseOperationFactory<IoTGateway> _gatewayFactory;
    private readonly IDatabaseOperationFactory<IoTDevice> _deviceFactory;
    private readonly IDatabaseOperationFactory<IoTDataPoint> _dataPointFactory;
    private readonly IDatabaseOperationFactory<IoTDataRecord> _dataRecordFactory;
    private readonly IDatabaseOperationFactory<IoTDeviceEvent> _eventFactory;
    private readonly ILogger<IoTService> _logger;

    /// <summary>
    /// 初始化物联网服务
    /// </summary>
    /// <param name="gatewayFactory">网关数据操作工厂</param>
    /// <param name="deviceFactory">设备数据操作工厂</param>
    /// <param name="dataPointFactory">数据点数据操作工厂</param>
    /// <param name="dataRecordFactory">数据记录数据操作工厂</param>
    /// <param name="eventFactory">设备事件数据操作工厂</param>
    /// <param name="logger">日志记录器</param>
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
    /// <param name="pageIndex">页码</param>
    /// <param name="pageSize">每页数量</param>
    /// <returns>网关列表和总数</returns>
    public async Task<(List<IoTGateway> Items, long Total)> GetGatewaysAsync(int pageIndex = 1, int pageSize = 20)
    {
        var filter = _gatewayFactory.CreateFilterBuilder()
            .ExcludeDeleted()
            .Build();
        var sort = _gatewayFactory.CreateSortBuilder()
            .Descending(g => g.CreatedAt)
            .Build();
        
        var (items, total) = await _gatewayFactory.FindPagedAsync(filter, sort, pageIndex, pageSize);
        return (items, total);
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
        var filter = _gatewayFactory.CreateFilterBuilder()
            .Equal(g => g.GatewayId, gatewayId)
            .ExcludeDeleted()
            .Build();
        var gateways = await _gatewayFactory.FindAsync(filter, limit: 1);
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

        var updateBuilder = _gatewayFactory.CreateUpdateBuilder();

        if (!string.IsNullOrEmpty(request.Title))
        {
            updateBuilder.Set(g => g.Title, request.Title);
            updateBuilder.Set(g => g.Name, request.Title);
        }
        if (!string.IsNullOrEmpty(request.ProtocolType))
            updateBuilder.Set(g => g.ProtocolType, request.ProtocolType);
        if (!string.IsNullOrEmpty(request.Address))
            updateBuilder.Set(g => g.Address, request.Address);
        if (request.Username != null)
            updateBuilder.Set(g => g.Username, request.Username);
        if (request.Password != null)
            updateBuilder.Set(g => g.Password, request.Password);
        if (request.IsEnabled.HasValue)
            updateBuilder.Set(g => g.IsEnabled, request.IsEnabled.Value);
        if (request.Config != null)
            updateBuilder.Set(g => g.Config, NormalizeConfig(request.Config));

        // 检查是否有任何更新，如果没有则直接返回原始实体，避免空更新导致 Id 被设置为空字符串
        if (updateBuilder.Count == 0)
        {
            return gateway;
        }

        var filter = _gatewayFactory.CreateFilterBuilder()
            .Equal(g => g.Id, id)
            .ExcludeDeleted()
            .Build();
        var update = updateBuilder.Build();
        
        var result = await _gatewayFactory.FindOneAndUpdateAsync(filter, update, 
            new FindOneAndUpdateOptions<IoTGateway> { ReturnDocument = ReturnDocument.After });
        
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

        var filter = _gatewayFactory.CreateFilterBuilder()
            .Equal(g => g.Id, id)
            .ExcludeDeleted()
            .Build();
        var result = await _gatewayFactory.FindOneAndSoftDeleteAsync(filter);
        
        if (result != null)
        {
            _logger.LogInformation("Gateway deleted: {GatewayId}", result.GatewayId);
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

        var updateBuilder = _gatewayFactory.CreateUpdateBuilder()
            .Set(g => g.Status, status);

        if (status == IoTDeviceStatus.Online)
            updateBuilder.Set(g => g.LastConnectedAt, DateTime.UtcNow);

        var filter = _gatewayFactory.CreateFilterBuilder()
            .Equal(g => g.GatewayId, gatewayId)
            .ExcludeDeleted()
            .Build();
        var update = updateBuilder.Build();
        
        var result = await _gatewayFactory.FindOneAndUpdateAsync(filter, update);
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

        var deviceFilter = _deviceFactory.CreateFilterBuilder()
            .Equal(d => d.GatewayId, gatewayId)
            .WithTenant(gateway.CompanyId)
            .ExcludeDeleted()
            .Build();
        var devices = await _deviceFactory.FindAsync(deviceFilter);

        // 基于 LastReportedAt 判断设备是否在线（5分钟内上报过视为在线）
        var onlineThreshold = DateTime.UtcNow.AddMinutes(-5);
        var onlineDevices = devices.Count(x => x.LastReportedAt.HasValue && x.LastReportedAt.Value >= onlineThreshold);
        
        return new GatewayStatistics
        {
            GatewayId = gatewayId,
            TotalDevices = devices.Count,
            OnlineDevices = onlineDevices,
            OfflineDevices = devices.Count - onlineDevices,
            FaultDevices = 0, // 不再维护故障状态
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
            var existingFilter = _deviceFactory.CreateFilterBuilder()
                .Equal(d => d.DeviceId, request.DeviceId)
                .ExcludeDeleted()
                .Build();
            var existing = await _deviceFactory.FindAsync(existingFilter, limit: 1);
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
            GatewayId = request.GatewayId ?? string.Empty
        };

        var result = await _deviceFactory.CreateAsync(device);
        
        // Update gateway device count using atomic increment (if gateway is provided)
        if (!string.IsNullOrEmpty(request.GatewayId))
        {
            var gateway = await GetGatewayByGatewayIdAsync(request.GatewayId);
            if (gateway != null)
            {
                var gatewayFilter = _gatewayFactory.CreateFilterBuilder()
                    .Equal(g => g.Id, gateway.Id)
                    .ExcludeDeleted()
                    .Build();
                var update = _gatewayFactory.CreateUpdateBuilder()
                    .Inc(g => g.DeviceCount, 1)
                    .Build();
                await _gatewayFactory.FindOneAndUpdateAsync(gatewayFilter, update);
            }
        }

        _logger.LogInformation("Device created: {DeviceId} for company {CompanyId}", result.DeviceId, result.CompanyId);
        return result;
    }

    /// <summary>
    /// 获取设备列表
    /// </summary>
    /// <param name="gatewayId">网关ID（可选）</param>
    /// <param name="pageIndex">页码</param>
    /// <param name="pageSize">每页数量</param>
    /// <returns>设备列表和总数</returns>
    public async Task<(List<IoTDevice> Items, long Total)> GetDevicesAsync(string? gatewayId = null, int pageIndex = 1, int pageSize = 20)
    {
        var filterBuilder = _deviceFactory.CreateFilterBuilder()
            .ExcludeDeleted();
        
        if (!string.IsNullOrEmpty(gatewayId))
        {
            filterBuilder.Equal(d => d.GatewayId, gatewayId);
        }
        
        var filter = filterBuilder.Build();
        var sort = _deviceFactory.CreateSortBuilder()
            .Descending(d => d.CreatedAt)
            .Build();
        
        var (items, total) = await _deviceFactory.FindPagedAsync(filter, sort, pageIndex, pageSize);
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
        var filter = _deviceFactory.CreateFilterBuilder()
            .Equal(d => d.DeviceId, deviceId)
            .ExcludeDeleted()
            .Build();
        var devices = await _deviceFactory.FindAsync(filter, limit: 1);
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

        var updateBuilder = _deviceFactory.CreateUpdateBuilder();

        if (!string.IsNullOrEmpty(request.Name))
            updateBuilder.Set(d => d.Name, request.Name);
        if (!string.IsNullOrEmpty(request.Title))
            updateBuilder.Set(d => d.Title, request.Title);
        if (!string.IsNullOrEmpty(request.GatewayId))
            updateBuilder.Set(d => d.GatewayId, request.GatewayId);
        if (request.IsEnabled.HasValue)
            updateBuilder.Set(d => d.IsEnabled, request.IsEnabled.Value);

        // 检查是否有任何更新，如果没有则直接返回原始实体，避免空更新导致 Id 被设置为空字符串
        if (updateBuilder.Count == 0)
        {
            return device;
        }

        var filter = _deviceFactory.CreateFilterBuilder()
            .Equal(d => d.Id, id)
            .ExcludeDeleted()
            .Build();
        var update = updateBuilder.Build();
        
        var result = await _deviceFactory.FindOneAndUpdateAsync(filter, update,
            new FindOneAndUpdateOptions<IoTDevice> { ReturnDocument = ReturnDocument.After });
        
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

        var filter = _deviceFactory.CreateFilterBuilder()
            .Equal(d => d.Id, id)
            .ExcludeDeleted()
            .Build();
        var result = await _deviceFactory.FindOneAndSoftDeleteAsync(filter);
        
        if (result != null)
        {
            // Update gateway device count using atomic decrement
            var gateway = await GetGatewayByGatewayIdAsync(result.GatewayId);
            if (gateway != null)
            {
                var gatewayFilter = _gatewayFactory.CreateFilterBuilder()
                    .Equal(g => g.Id, gateway.Id)
                    .ExcludeDeleted()
                    .Build();
                var update = _gatewayFactory.CreateUpdateBuilder()
                    .Inc(g => g.DeviceCount, -1)
                    .Build();
                await _gatewayFactory.FindOneAndUpdateAsync(gatewayFilter, update);
            }

            _logger.LogInformation("Device deleted: {DeviceId} for company {CompanyId}", result.DeviceId, result.CompanyId);
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
        var filter = _deviceFactory.CreateFilterBuilder()
            .Equal(d => d.DeviceId, deviceId)
            .ExcludeDeleted()
            .Build();

        // 如果状态不是 Online，不需要更新任何字段，只需检查设备是否存在
        if (status != IoTDeviceStatus.Online)
        {
            var devices = await _deviceFactory.FindAsync(filter, limit: 1);
            return devices.Count > 0;
        }

        // 状态为 Online 时，更新最后上报时间
        var updateBuilder = _deviceFactory.CreateUpdateBuilder()
            .Set(d => d.LastReportedAt, DateTime.UtcNow);

        var update = updateBuilder.Build();
        var result = await _deviceFactory.FindOneAndUpdateAsync(filter, update);
        return result != null;
    }

    /// <summary>
    /// 处理设备连接
    /// </summary>
    /// <param name="request">设备连接请求</param>
    /// <returns>是否处理成功</returns>
    public async Task<bool> HandleDeviceConnectAsync(DeviceConnectRequest request)
    {
        var updateBuilder = _deviceFactory.CreateUpdateBuilder()
            .Set(d => d.LastReportedAt, DateTime.UtcNow);

        var filter = _deviceFactory.CreateFilterBuilder()
            .Equal(d => d.DeviceId, request.DeviceId)
            .ExcludeDeleted()
            .Build();
        var update = updateBuilder.Build();
        
        var result = await _deviceFactory.FindOneAndUpdateAsync(filter, update);
        
        if (result != null)
        {
            // Create event
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
        var filter = _deviceFactory.CreateFilterBuilder()
            .Equal(d => d.DeviceId, request.DeviceId)
            .ExcludeDeleted()
            .Build();

        var devices = await _deviceFactory.FindAsync(filter, limit: 1);
        
        if (devices.Count > 0)
        {
            var device = devices[0];
            // Create event
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

        var dataPointFilter = _dataPointFactory.CreateFilterBuilder()
            .Equal(dp => dp.DeviceId, deviceId)
            .WithTenant(device.CompanyId)
            .ExcludeDeleted()
            .Build();
        var dataPoints = await _dataPointFactory.FindAsync(dataPointFilter);

        var recordFilter = _dataRecordFactory.CreateFilterBuilder()
            .Equal(r => r.DeviceId, deviceId)
            .WithTenant(device.CompanyId)
            .ExcludeDeleted()
            .Build();
        var recordCount = await _dataRecordFactory.CountAsync(recordFilter);

        var alarmFilter = _eventFactory.CreateFilterBuilder()
            .Equal(e => e.DeviceId, deviceId)
            .Equal(e => e.IsHandled, false)
            .WithTenant(device.CompanyId)
            .ExcludeDeleted()
            .Build();
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
    /// <param name="pageIndex">页码</param>
    /// <param name="pageSize">每页数量</param>
    /// <returns>数据点列表和总数</returns>
    public async Task<(List<IoTDataPoint> Items, long Total)> GetDataPointsAsync(string? deviceId = null, int pageIndex = 1, int pageSize = 20)
    {
        var filterBuilder = _dataPointFactory.CreateFilterBuilder()
            .ExcludeDeleted();
        
        if (!string.IsNullOrEmpty(deviceId))
        {
            filterBuilder.Equal(dp => dp.DeviceId, deviceId);
        }
        
        var filter = filterBuilder.Build();
        var sort = _dataPointFactory.CreateSortBuilder()
            .Descending(dp => dp.CreatedAt)
            .Build();
        
        var (items, total) = await _dataPointFactory.FindPagedAsync(filter, sort, pageIndex, pageSize);
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
        var filter = _dataPointFactory.CreateFilterBuilder()
            .Equal(dp => dp.DataPointId, dataPointId)
            .ExcludeDeleted()
            .Build();
        var dataPoints = await _dataPointFactory.FindAsync(filter, limit: 1);
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

        var updateBuilder = _dataPointFactory.CreateUpdateBuilder();

        if (!string.IsNullOrEmpty(request.Name))
            updateBuilder.Set(dp => dp.Name, request.Name);
        if (!string.IsNullOrEmpty(request.Title))
            updateBuilder.Set(dp => dp.Title, request.Title);
        if (request.DataType.HasValue)
            updateBuilder.Set(dp => dp.DataType, request.DataType.Value);
        if (request.Unit != null)
            updateBuilder.Set(dp => dp.Unit, request.Unit);
        if (request.IsReadOnly.HasValue)
            updateBuilder.Set(dp => dp.IsReadOnly, request.IsReadOnly.Value);
        if (request.SamplingInterval.HasValue)
            updateBuilder.Set(dp => dp.SamplingInterval, request.SamplingInterval.Value);
        if (request.IsEnabled.HasValue)
            updateBuilder.Set(dp => dp.IsEnabled, request.IsEnabled.Value);
        if (request.AlarmConfig != null)
            updateBuilder.Set(dp => dp.AlarmConfig, request.AlarmConfig);

        // 检查是否有任何更新，如果没有则直接返回原始实体，避免空更新导致 Id 被设置为空字符串
        if (updateBuilder.Count == 0)
        {
            return dataPoint;
        }

        var filter = _dataPointFactory.CreateFilterBuilder()
            .Equal(dp => dp.Id, id)
            .ExcludeDeleted()
            .Build();
        var update = updateBuilder.Build();
        
        var result = await _dataPointFactory.FindOneAndUpdateAsync(filter, update,
            new FindOneAndUpdateOptions<IoTDataPoint> { ReturnDocument = ReturnDocument.After });
        
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

        var filter = _dataPointFactory.CreateFilterBuilder()
            .Equal(dp => dp.Id, id)
            .ExcludeDeleted()
            .Build();
        var result = await _dataPointFactory.FindOneAndSoftDeleteAsync(filter);
        
        if (result != null)
        {
            _logger.LogInformation("DataPoint deleted: {DataPointId} for company {CompanyId}", result.DataPointId, result.CompanyId);
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
        var dpFilter = _dataPointFactory.CreateFilterBuilder()
            .Equal(dp => dp.Id, dataPoint.Id)
            .ExcludeDeleted()
            .Build();
        var dpUpdate = _dataPointFactory.CreateUpdateBuilder()
            .Set(dp => dp.LastValue, request.Value)
            .Set(dp => dp.LastUpdatedAt, DateTime.UtcNow)
            .Build();
        await _dataPointFactory.FindOneAndUpdateAsync(dpFilter, dpUpdate);

        // Update device last reported time
        var device = await GetDeviceByDeviceIdAsync(request.DeviceId);
        if (device != null)
        {
            var deviceFilter = _deviceFactory.CreateFilterBuilder()
                .Equal(d => d.Id, device.Id)
                .ExcludeDeleted()
                .Build();
            var deviceUpdate = _deviceFactory.CreateUpdateBuilder()
                .Set(d => d.LastReportedAt, DateTime.UtcNow)
                .Build();
            await _deviceFactory.FindOneAndUpdateAsync(deviceFilter, deviceUpdate);
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

    /// <summary>
    /// 查询数据记录
    /// </summary>
    /// <param name="request">查询数据请求</param>
    /// <returns>数据记录列表和总数</returns>
    public async Task<(List<IoTDataRecord> Records, long Total)> QueryDataRecordsAsync(QueryIoTDataRequest request)
    {
        var filterBuilder = _dataRecordFactory.CreateFilterBuilder()
            .ExcludeDeleted();

        if (!string.IsNullOrEmpty(request.DeviceId))
            filterBuilder.Equal(r => r.DeviceId, request.DeviceId);

        if (!string.IsNullOrEmpty(request.DataPointId))
            filterBuilder.Equal(r => r.DataPointId, request.DataPointId);

        if (request.StartTime.HasValue || request.EndTime.HasValue)
        {
            if (request.StartTime.HasValue)
                filterBuilder.GreaterThanOrEqual(r => r.ReportedAt, request.StartTime.Value);
            if (request.EndTime.HasValue)
                filterBuilder.LessThanOrEqual(r => r.ReportedAt, request.EndTime.Value);
        }

        var filter = filterBuilder.Build();
        var sort = _dataRecordFactory.CreateSortBuilder()
            .Descending(r => r.ReportedAt)
            .Build();
        var (records, total) = await _dataRecordFactory.FindPagedAsync(filter, sort, request.PageIndex, request.PageSize);

        return (records, total);
    }

    /// <summary>
    /// 获取最新数据
    /// </summary>
    /// <param name="dataPointId">数据点唯一标识符</param>
    /// <returns>最新的数据记录</returns>
    public async Task<IoTDataRecord?> GetLatestDataAsync(string dataPointId)
    {
        var filter = _dataRecordFactory.CreateFilterBuilder()
            .Equal(r => r.DataPointId, dataPointId)
            .ExcludeDeleted()
            .Build();
        var sort = _dataRecordFactory.CreateSortBuilder()
            .Descending(r => r.ReportedAt)
            .Build();

        var records = await _dataRecordFactory.FindAsync(filter, sort, 1);
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
        var filter = _dataRecordFactory.CreateFilterBuilder()
            .Equal(r => r.DataPointId, dataPointId)
            .GreaterThanOrEqual(r => r.ReportedAt, startTime)
            .LessThanOrEqual(r => r.ReportedAt, endTime)
            .ExcludeDeleted()
            .Build();

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
        var filterBuilder = _eventFactory.CreateFilterBuilder()
            .ExcludeDeleted();

        if (!string.IsNullOrEmpty(request.DeviceId))
            filterBuilder.Equal(e => e.DeviceId, request.DeviceId);

        if (!string.IsNullOrEmpty(request.EventType))
            filterBuilder.Equal(e => e.EventType, request.EventType);

        if (!string.IsNullOrEmpty(request.Level))
            filterBuilder.Equal(e => e.Level, request.Level);

        if (request.IsHandled.HasValue)
            filterBuilder.Equal(e => e.IsHandled, request.IsHandled.Value);

        if (request.StartTime.HasValue || request.EndTime.HasValue)
        {
            if (request.StartTime.HasValue)
                filterBuilder.GreaterThanOrEqual(e => e.OccurredAt, request.StartTime.Value);
            if (request.EndTime.HasValue)
                filterBuilder.LessThanOrEqual(e => e.OccurredAt, request.EndTime.Value);
        }

        var filter = filterBuilder.Build();
        var sort = _eventFactory.CreateSortBuilder()
            .Descending(e => e.OccurredAt)
            .Build();
        var (events, total) = await _eventFactory.FindPagedAsync(filter, sort, request.PageIndex, request.PageSize);

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
        var filter = _eventFactory.CreateFilterBuilder()
            .Equal(e => e.Id, eventId)
            .ExcludeDeleted()
            .Build();
        var update = _eventFactory.CreateUpdateBuilder()
            .Set(e => e.IsHandled, true)
            .Set(e => e.HandledRemarks, remarks)
            .Build();

        var result = await _eventFactory.FindOneAndUpdateAsync(filter, update);
        return result != null;
    }

    /// <summary>
    /// 获取未处理事件数量
    /// </summary>
    /// <param name="deviceId">设备ID（可选）</param>
    /// <returns>未处理事件数量</returns>
    public async Task<long> GetUnhandledEventCountAsync(string? deviceId = null)
    {
        var filterBuilder = _eventFactory.CreateFilterBuilder()
            .Equal(e => e.IsHandled, false)
            .ExcludeDeleted();

        if (!string.IsNullOrEmpty(deviceId))
            filterBuilder.Equal(e => e.DeviceId, deviceId);

        var filter = filterBuilder.Build();
        return await _eventFactory.CountAsync(filter);
    }

    #endregion

    #region Statistics Operations

    /// <summary>
    /// 获取平台统计信息
    /// </summary>
    /// <returns>平台统计信息</returns>
    public async Task<PlatformStatistics> GetPlatformStatisticsAsync()
    {
        var gatewayFilter = _gatewayFactory.CreateFilterBuilder()
            .ExcludeDeleted()
            .Build();
        var gateways = await _gatewayFactory.FindAsync(gatewayFilter);

        var deviceFilter = _deviceFactory.CreateFilterBuilder()
            .ExcludeDeleted()
            .Build();
        var devices = await _deviceFactory.FindAsync(deviceFilter);

        var dataPointFilter = _dataPointFactory.CreateFilterBuilder()
            .ExcludeDeleted()
            .Build();
        var dataPoints = await _dataPointFactory.FindAsync(dataPointFilter);

        var recordFilter = _dataRecordFactory.CreateFilterBuilder()
            .ExcludeDeleted()
            .Build();
        var recordCount = await _dataRecordFactory.CountAsync(recordFilter);

        var alarmFilter = _eventFactory.CreateFilterBuilder()
            .Equal(e => e.IsHandled, false)
            .ExcludeDeleted()
            .Build();
        var unhandledAlarms = await _eventFactory.CountAsync(alarmFilter);

        return new PlatformStatistics
        {
            TotalGateways = gateways.Count,
            OnlineGateways = gateways.Count(x => x.Status == IoTDeviceStatus.Online),
            TotalDevices = devices.Count,
            OnlineDevices = devices.Count(x => x.LastReportedAt.HasValue && x.LastReportedAt.Value >= DateTime.UtcNow.AddMinutes(-5)),
            TotalDataPoints = dataPoints.Count,
            TotalDataRecords = recordCount,
            UnhandledAlarms = unhandledAlarms,
            LastUpdatedAt = DateTime.UtcNow
        };
    }

    /// <summary>
    /// 获取设备在线状态统计
    /// </summary>
    /// <returns>设备状态统计信息</returns>
    public async Task<DeviceStatusStatistics> GetDeviceStatusStatisticsAsync()
    {
        var filter = _deviceFactory.CreateFilterBuilder()
            .ExcludeDeleted()
            .Build();
        var devices = await _deviceFactory.FindAsync(filter);

        // 基于 LastReportedAt 判断设备是否在线（5分钟内上报过视为在线）
        var onlineThreshold = DateTime.UtcNow.AddMinutes(-5);
        var online = devices.Count(x => x.LastReportedAt.HasValue && x.LastReportedAt.Value >= onlineThreshold);

        return new DeviceStatusStatistics
        {
            Online = online,
            Offline = devices.Count - online,
            Fault = 0, // 不再维护故障状态
            Maintenance = 0 // 不再维护维护状态
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
}

