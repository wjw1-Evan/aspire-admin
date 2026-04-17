using Platform.ApiService.Models;
using Platform.ServiceDefaults.Models;
using System.Linq.Dynamic.Core;

namespace Platform.ApiService.Services;

/// <summary>
/// 物联网服务接口 - 处理设备接入、数据采集和管理
/// </summary>
public interface IIoTService
{
    #region Gateway Operations

    Task<IoTGateway> CreateGatewayAsync(CreateIoTGatewayRequest request);
    Task<PagedResult<IoTGateway>> GetGatewaysAsync(ProTableRequest request, IoTDeviceStatus? status = null);
    Task<IoTGateway?> GetGatewayByIdAsync(string id);
    Task<IoTGateway?> GetGatewayByGatewayIdAsync(string gatewayId);
    Task<IoTGateway?> UpdateGatewayAsync(string id, UpdateIoTGatewayRequest request);
    Task<bool> DeleteGatewayAsync(string id);
    Task<bool> UpdateGatewayStatusAsync(string gatewayId, IoTDeviceStatus status);
    Task<GatewayStatistics?> GetGatewayStatisticsAsync(string gatewayId);

    #endregion

    #region Device Operations

    Task<IoTDevice> CreateDeviceAsync(CreateIoTDeviceRequest request);
    Task<PagedResult<IoTDevice>> GetDevicesAsync(ProTableRequest request, string? gatewayId = null);
    Task<IoTDevice?> GetDeviceByIdAsync(string id);
    Task<IoTDevice?> GetDeviceByDeviceIdAsync(string deviceId);
    Task<IoTDevice?> UpdateDeviceAsync(string id, UpdateIoTDeviceRequest request);
    Task<bool> DeleteDeviceAsync(string id);
    Task<int> BatchDeleteDevicesAsync(List<string> ids);
    Task<bool> UpdateDeviceStatusAsync(string deviceId, IoTDeviceStatus status);
    Task<bool> HandleDeviceConnectAsync(DeviceConnectRequest request);
    Task<bool> HandleDeviceDisconnectAsync(DeviceDisconnectRequest request);
    Task<DeviceStatistics?> GetDeviceStatisticsAsync(string deviceId);

    #endregion

    #region DataPoint Operations

    Task<IoTDataPoint> CreateDataPointAsync(CreateIoTDataPointRequest request);
    Task<PagedResult<IoTDataPoint>> GetDataPointsAsync(ProTableRequest request, string? deviceId = null);
    Task<IoTDataPoint?> GetDataPointByIdAsync(string id);
    Task<IoTDataPoint?> GetDataPointByDataPointIdAsync(string dataPointId);
    Task<IoTDataPoint?> UpdateDataPointAsync(string id, UpdateIoTDataPointRequest request);
    Task<bool> DeleteDataPointAsync(string id);

    #endregion

    #region Data Record Operations

    Task<IoTDataRecord> ReportDataAsync(ReportIoTDataRequest request);
    Task<List<IoTDataRecord>> BatchReportDataAsync(BatchReportIoTDataRequest request);
    Task<PagedResult<IoTDataRecord>> QueryDataRecordsAsync(ProTableRequest request, string? deviceId = null, string? dataPointId = null, DateTime? startTime = null, DateTime? endTime = null);
    Task<IoTDataRecord?> GetLatestDataAsync(string dataPointId);
    Task<DataStatistics?> GetDataStatisticsAsync(string dataPointId, DateTime startTime, DateTime endTime);

    #endregion

    #region Event Operations

    Task<IoTDeviceEvent> CreateEventAsync(string deviceId, string eventType, string level, string? description = null, Dictionary<string, object>? eventData = null);
    Task<PagedResult<IoTDeviceEvent>> QueryEventsAsync(ProTableRequest request, string? deviceId = null, string? eventType = null, string? level = null, bool? isHandled = null, DateTime? startTime = null, DateTime? endTime = null);
    Task<bool> HandleEventAsync(string eventId, string remarks);
    Task<long> GetUnhandledEventCountAsync(string? deviceId = null);

    #endregion

    #region Device Twin Operations

    Task<IoTDeviceTwin> GetOrCreateDeviceTwinAsync(string deviceId);
    Task<IoTDeviceTwin?> UpdateDesiredPropertiesAsync(string deviceId, UpdateDesiredPropertiesRequest request);
    Task<IoTDeviceTwin?> ReportPropertiesAsync(string deviceId, string apiKey, Dictionary<string, object> properties);

    #endregion

    #region C2D Command Operations

    Task<IoTDeviceCommand> SendCommandAsync(string deviceId, SendCommandRequest request);
    Task<List<IoTDeviceCommand>> GetPendingCommandsAsync(string deviceId, string apiKey);
    Task<bool> AckCommandAsync(string commandId, AckCommandRequest request);
    Task<int> ExpireCommandsAsync();

    #endregion

    #region ApiKey Operations

    Task<GenerateApiKeyResult> GenerateApiKeyAsync(string deviceId);
    Task<bool> ValidateApiKeyAsync(string deviceId, string apiKey);

    #endregion

    #region Statistics Operations

    Task<PlatformStatistics> GetPlatformStatisticsAsync();
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