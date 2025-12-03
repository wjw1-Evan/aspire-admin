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
    Task<List<IoTGateway>> GetGatewaysAsync(int pageIndex = 1, int pageSize = 20);

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
    Task<List<IoTDevice>> GetDevicesAsync(string? gatewayId = null, int pageIndex = 1, int pageSize = 20);

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
    Task<List<IoTDataPoint>> GetDataPointsAsync(string? deviceId = null, int pageIndex = 1, int pageSize = 20);

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
    public string GatewayId { get; set; } = string.Empty;
    public int TotalDevices { get; set; }
    public int OnlineDevices { get; set; }
    public int OfflineDevices { get; set; }
    public int FaultDevices { get; set; }
    public DateTime? LastConnectedAt { get; set; }
}

/// <summary>
/// 设备统计信息
/// </summary>
public class DeviceStatistics
{
    public string DeviceId { get; set; } = string.Empty;
    public int TotalDataPoints { get; set; }
    public int EnabledDataPoints { get; set; }
    public long TotalDataRecords { get; set; }
    public long UnhandledAlarms { get; set; }
    public DateTime? LastReportedAt { get; set; }
}

/// <summary>
/// 数据统计信息
/// </summary>
public class DataStatistics
{
    public string DataPointId { get; set; } = string.Empty;
    public long RecordCount { get; set; }
    public double? AverageValue { get; set; }
    public double? MinValue { get; set; }
    public double? MaxValue { get; set; }
    public DateTime StartTime { get; set; }
    public DateTime EndTime { get; set; }
}

/// <summary>
/// 平台统计信息
/// </summary>
public class PlatformStatistics
{
    public int TotalGateways { get; set; }
    public int OnlineGateways { get; set; }
    public int TotalDevices { get; set; }
    public int OnlineDevices { get; set; }
    public int TotalDataPoints { get; set; }
    public long TotalDataRecords { get; set; }
    public long UnhandledAlarms { get; set; }
    public DateTime LastUpdatedAt { get; set; }
}

/// <summary>
/// 设备状态统计
/// </summary>
public class DeviceStatusStatistics
{
    public int Online { get; set; }
    public int Offline { get; set; }
    public int Fault { get; set; }
    public int Maintenance { get; set; }
}

