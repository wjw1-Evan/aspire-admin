using Platform.ApiService.Models;
using Platform.ServiceDefaults.Models;

namespace Platform.ApiService.Services;

/// <summary>
/// 物联网服务接口 - 处理设备接入、数据采集和管理
/// </summary>
public interface IIoTService
{
    #region Gateway Operations

    /// <summary>
    /// 创建网关
    /// </summary>
    Task<IoTGateway> CreateGatewayAsync(CreateIoTGatewayRequest request);

    /// <summary>
    /// 获取网关列表
    /// </summary>
    Task<(List<IoTGateway> Items, long Total)> GetGatewaysAsync(string? keyword = null, IoTDeviceStatus? status = null, int pageIndex = 1, int pageSize = 20);

    /// <summary>
    /// 获取网关详情
    /// </summary>
    Task<IoTGateway?> GetGatewayByIdAsync(string id);

    /// <summary>
    /// 根据网关ID获取网关
    /// </summary>
    Task<IoTGateway?> GetGatewayByGatewayIdAsync(string gatewayId);

    /// <summary>
    /// 更新网关
    /// </summary>
    Task<IoTGateway?> UpdateGatewayAsync(string id, UpdateIoTGatewayRequest request);

    /// <summary>
    /// 删除网关
    /// </summary>
    Task<bool> DeleteGatewayAsync(string id);

    /// <summary>
    /// 更新网关状态
    /// </summary>
    Task<bool> UpdateGatewayStatusAsync(string gatewayId, IoTDeviceStatus status);

    /// <summary>
    /// 获取网关统计信息
    /// </summary>
    Task<GatewayStatistics?> GetGatewayStatisticsAsync(string gatewayId);

    #endregion

    #region Device Operations

    /// <summary>
    /// 创建设备
    /// </summary>
    Task<IoTDevice> CreateDeviceAsync(CreateIoTDeviceRequest request);

    /// <summary>
    /// 获取设备列表
    /// </summary>
    Task<(List<IoTDevice> Items, long Total)> GetDevicesAsync(string? gatewayId = null, string? keyword = null, int pageIndex = 1, int pageSize = 20);

    /// <summary>
    /// 获取设备详情
    /// </summary>
    Task<IoTDevice?> GetDeviceByIdAsync(string id);

    /// <summary>
    /// 根据设备ID获取设备
    /// </summary>
    Task<IoTDevice?> GetDeviceByDeviceIdAsync(string deviceId);

    /// <summary>
    /// 更新设备
    /// </summary>
    Task<IoTDevice?> UpdateDeviceAsync(string id, UpdateIoTDeviceRequest request);

    /// <summary>
    /// 删除设备
    /// </summary>
    Task<bool> DeleteDeviceAsync(string id);

    /// <summary>
    /// 批量删除设备（返回实际删除数量）
    /// </summary>
    Task<int> BatchDeleteDevicesAsync(List<string> ids);

    /// <summary>
    /// 更新设备状态
    /// </summary>
    Task<bool> UpdateDeviceStatusAsync(string deviceId, IoTDeviceStatus status);

    /// <summary>
    /// 处理设备连接
    /// </summary>
    Task<bool> HandleDeviceConnectAsync(DeviceConnectRequest request);

    /// <summary>
    /// 处理设备断开连接
    /// </summary>
    Task<bool> HandleDeviceDisconnectAsync(DeviceDisconnectRequest request);

    /// <summary>
    /// 获取设备统计信息
    /// </summary>
    Task<DeviceStatistics?> GetDeviceStatisticsAsync(string deviceId);

    #endregion

    #region DataPoint Operations

    /// <summary>
    /// 创建数据点
    /// </summary>
    Task<IoTDataPoint> CreateDataPointAsync(CreateIoTDataPointRequest request);

    /// <summary>
    /// 获取数据点列表
    /// </summary>
    Task<(List<IoTDataPoint> Items, long Total)> GetDataPointsAsync(string? deviceId = null, string? keyword = null, int pageIndex = 1, int pageSize = 20);

    /// <summary>
    /// 获取数据点详情
    /// </summary>
    Task<IoTDataPoint?> GetDataPointByIdAsync(string id);

    /// <summary>
    /// 根据数据点ID获取数据点
    /// </summary>
    Task<IoTDataPoint?> GetDataPointByDataPointIdAsync(string dataPointId);

    /// <summary>
    /// 更新数据点
    /// </summary>
    Task<IoTDataPoint?> UpdateDataPointAsync(string id, UpdateIoTDataPointRequest request);

    /// <summary>
    /// 删除数据点
    /// </summary>
    Task<bool> DeleteDataPointAsync(string id);

    #endregion

    #region Data Record Operations

    /// <summary>
    /// 上报数据
    /// </summary>
    Task<IoTDataRecord> ReportDataAsync(ReportIoTDataRequest request);

    /// <summary>
    /// 批量上报数据
    /// </summary>
    Task<List<IoTDataRecord>> BatchReportDataAsync(BatchReportIoTDataRequest request);

    /// <summary>
    /// 查询数据记录
    /// </summary>
    Task<(List<IoTDataRecord> Records, long Total)> QueryDataRecordsAsync(QueryIoTDataRequest request);

    /// <summary>
    /// 获取最新数据
    /// </summary>
    Task<IoTDataRecord?> GetLatestDataAsync(string dataPointId);

    /// <summary>
    /// 获取数据统计
    /// </summary>
    Task<DataStatistics?> GetDataStatisticsAsync(string dataPointId, DateTime startTime, DateTime endTime);

    #endregion

    #region Event Operations

    /// <summary>
    /// 创建设备事件
    /// </summary>
    Task<IoTDeviceEvent> CreateEventAsync(string deviceId, string eventType, string level, string? description = null, Dictionary<string, object>? eventData = null);

    /// <summary>
    /// 查询设备事件
    /// </summary>
    Task<(List<IoTDeviceEvent> Events, long Total)> QueryEventsAsync(QueryIoTEventRequest request);

    /// <summary>
    /// 处理事件
    /// </summary>
    Task<bool> HandleEventAsync(string eventId, string remarks);

    /// <summary>
    /// 获取未处理事件数量
    /// </summary>
    Task<long> GetUnhandledEventCountAsync(string? deviceId = null);

    #endregion

    #region Device Twin Operations

    /// <summary>
    /// 获取设备孪生（不存在时自动创建）
    /// </summary>
    Task<IoTDeviceTwin> GetOrCreateDeviceTwinAsync(string deviceId);

    /// <summary>
    /// 更新云端期望属性（管理端调用，版本号 +1）
    /// </summary>
    Task<IoTDeviceTwin?> UpdateDesiredPropertiesAsync(string deviceId, UpdateDesiredPropertiesRequest request);

    /// <summary>
    /// 设备上报实际属性（设备端调用，ApiKey 认证）
    /// </summary>
    Task<IoTDeviceTwin?> ReportPropertiesAsync(string deviceId, string apiKey, Dictionary<string, object> properties);

    #endregion

    #region C2D Command Operations

    /// <summary>
    /// 发送云到设备命令
    /// </summary>
    Task<IoTDeviceCommand> SendCommandAsync(string deviceId, SendCommandRequest request);

    /// <summary>
    /// 获取设备待执行命令列表（设备轮询，同时标记为 Delivered）
    /// </summary>
    Task<List<IoTDeviceCommand>> GetPendingCommandsAsync(string deviceId, string apiKey);

    /// <summary>
    /// 设备确认命令执行结果
    /// </summary>
    Task<bool> AckCommandAsync(string commandId, AckCommandRequest request);

    /// <summary>
    /// 将过期命令标记为 Expired
    /// </summary>
    Task<int> ExpireCommandsAsync();

    #endregion

    #region ApiKey Operations

    /// <summary>
    /// 生成/重置设备 ApiKey（明文仅此次返回）
    /// </summary>
    Task<GenerateApiKeyResult> GenerateApiKeyAsync(string deviceId);

    /// <summary>
    /// 校验设备 ApiKey
    /// </summary>
    Task<bool> ValidateApiKeyAsync(string deviceId, string apiKey);

    #endregion

    #region Statistics Operations

    /// <summary>
    /// 获取平台统计信息
    /// </summary>
    Task<PlatformStatistics> GetPlatformStatisticsAsync();

    /// <summary>
    /// 获取设备在线状态统计
    /// </summary>
    Task<DeviceStatusStatistics> GetDeviceStatusStatisticsAsync();

    #endregion
}

/// <summary>
/// 网关统计信息
/// </summary>
public class GatewayStatistics
{
    /// <summary>网关ID</summary>
    public string GatewayId { get; set; } = string.Empty;
    /// <summary>设备总数</summary>
    public int TotalDevices { get; set; }
    /// <summary>在线设备数</summary>
    public int OnlineDevices { get; set; }
    /// <summary>离线设备数</summary>
    public int OfflineDevices { get; set; }
    /// <summary>故障设备数</summary>
    public int FaultDevices { get; set; }
    /// <summary>最后连接时间</summary>
    public DateTime? LastConnectedAt { get; set; }
}

/// <summary>
/// 设备统计信息
/// </summary>
public class DeviceStatistics
{
    /// <summary>设备ID</summary>
    public string DeviceId { get; set; } = string.Empty;
    /// <summary>数据点总数</summary>
    public int TotalDataPoints { get; set; }
    /// <summary>启用的数据点数</summary>
    public int EnabledDataPoints { get; set; }
    /// <summary>数据记录总数</summary>
    public long TotalDataRecords { get; set; }
    /// <summary>未处理告警数</summary>
    public long UnhandledAlarms { get; set; }
    /// <summary>最后上报时间</summary>
    public DateTime? LastReportedAt { get; set; }
}

/// <summary>
/// 数据统计信息
/// </summary>
public class DataStatistics
{
    /// <summary>数据点ID</summary>
    public string DataPointId { get; set; } = string.Empty;
    /// <summary>记录数</summary>
    public long RecordCount { get; set; }
    /// <summary>平均值</summary>
    public double? AverageValue { get; set; }
    /// <summary>最小值</summary>
    public double? MinValue { get; set; }
    /// <summary>最大值</summary>
    public double? MaxValue { get; set; }
    /// <summary>开始时间</summary>
    public DateTime StartTime { get; set; }
    /// <summary>结束时间</summary>
    public DateTime EndTime { get; set; }
}

/// <summary>
/// 平台统计信息
/// </summary>
public class PlatformStatistics
{
    /// <summary>网关总数</summary>
    public int TotalGateways { get; set; }
    /// <summary>在线网关数</summary>
    public int OnlineGateways { get; set; }
    /// <summary>设备总数</summary>
    public int TotalDevices { get; set; }
    /// <summary>在线设备数</summary>
    public int OnlineDevices { get; set; }
    /// <summary>数据点总数</summary>
    public int TotalDataPoints { get; set; }
    /// <summary>数据记录总数</summary>
    public long TotalDataRecords { get; set; }
    /// <summary>未处理告警数</summary>
    public long UnhandledAlarms { get; set; }
    /// <summary>最后更新时间</summary>
    public DateTime LastUpdatedAt { get; set; }
}

/// <summary>
/// 设备状态统计
/// </summary>
public class DeviceStatusStatistics
{
    /// <summary>在线设备数</summary>
    public int Online { get; set; }
    /// <summary>离线设备数</summary>
    public int Offline { get; set; }
    /// <summary>故障设备数</summary>
    public int Fault { get; set; }
    /// <summary>维护中设备数</summary>
    public int Maintenance { get; set; }
}

