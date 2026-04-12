using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Platform.ApiService.Models;
using Platform.ApiService.Services.IoT;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace Platform.ApiService.Services;

/// <summary>
/// 物联网服务门面 - 聚合所有 IoT 子服务
/// </summary>
public class IoTService : IIoTService
{
    private readonly IoTGatewayService _gatewayService;
    private readonly IoTDeviceService _deviceService;
    private readonly IoTDataPointService _dataPointService;
    private readonly IoTEventService _eventService;
    private readonly IoTDeviceTwinService _deviceTwinService;
    private readonly IoTCommandService _commandService;
    private readonly IoTStatisticsService _statisticsService;
    private readonly ILogger<IoTService> _logger;

    public IoTService(
        IoTGatewayService gatewayService,
        IoTDeviceService deviceService,
        IoTDataPointService dataPointService,
        IoTEventService eventService,
        IoTDeviceTwinService deviceTwinService,
        IoTCommandService commandService,
        IoTStatisticsService statisticsService,
        ILogger<IoTService> logger)
    {
        _gatewayService = gatewayService;
        _deviceService = deviceService;
        _dataPointService = dataPointService;
        _eventService = eventService;
        _deviceTwinService = deviceTwinService;
        _commandService = commandService;
        _statisticsService = statisticsService;
        _logger = logger;
    }

    #region Gateway Operations

    public Task<IoTGateway> CreateGatewayAsync(CreateIoTGatewayRequest request)
        => _gatewayService.CreateGatewayAsync(request);

    public Task<System.Linq.Dynamic.Core.PagedResult<IoTGateway>> GetGatewaysAsync(Platform.ServiceDefaults.Models.PageParams request, IoTDeviceStatus? status = null)
        => _gatewayService.GetGatewaysAsync(request, status);

    public Task<IoTGateway?> GetGatewayByIdAsync(string id)
        => _gatewayService.GetGatewayByIdAsync(id);

    public Task<IoTGateway?> GetGatewayByGatewayIdAsync(string gatewayId)
        => _gatewayService.GetGatewayByGatewayIdAsync(gatewayId);

    public Task<IoTGateway?> UpdateGatewayAsync(string id, UpdateIoTGatewayRequest request)
        => _gatewayService.UpdateGatewayAsync(id, request);

    public Task<bool> DeleteGatewayAsync(string id)
        => _gatewayService.DeleteGatewayAsync(id);

    public Task<bool> UpdateGatewayStatusAsync(string gatewayId, IoTDeviceStatus status)
        => _gatewayService.UpdateGatewayStatusAsync(gatewayId, status);

    public Task<GatewayStatistics?> GetGatewayStatisticsAsync(string gatewayId)
        => _gatewayService.GetGatewayStatisticsAsync(gatewayId);

    #endregion

    #region Device Operations

    public async Task<IoTDevice> CreateDeviceAsync(CreateIoTDeviceRequest request)
        => await _deviceService.CreateDeviceAsync(request, _gatewayService.GetGatewayByGatewayIdAsync);

    public Task<System.Linq.Dynamic.Core.PagedResult<IoTDevice>> GetDevicesAsync(Platform.ServiceDefaults.Models.PageParams request, string? gatewayId = null)
        => _deviceService.GetDevicesAsync(request, gatewayId);

    public Task<IoTDevice?> GetDeviceByIdAsync(string id)
        => _deviceService.GetDeviceByIdAsync(id);

    public Task<IoTDevice?> GetDeviceByDeviceIdAsync(string deviceId)
        => _deviceService.GetDeviceByDeviceIdAsync(deviceId);

    public Task<IoTDevice?> UpdateDeviceAsync(string id, UpdateIoTDeviceRequest request)
        => _deviceService.UpdateDeviceAsync(id, request);

    public async Task<bool> DeleteDeviceAsync(string id)
        => await _deviceService.DeleteDeviceAsync(id, _gatewayService.GetGatewayByGatewayIdAsync);

    public async Task<int> BatchDeleteDevicesAsync(List<string> ids)
        => await _deviceService.BatchDeleteDevicesAsync(ids, _gatewayService.GetGatewayByGatewayIdAsync);

    public Task<bool> UpdateDeviceStatusAsync(string deviceId, IoTDeviceStatus status)
        => _deviceService.UpdateDeviceStatusAsync(deviceId, status);

    public async Task<bool> HandleDeviceConnectAsync(DeviceConnectRequest request)
        => await _deviceService.HandleDeviceConnectAsync(request, CreateEventAsync);

    public async Task<bool> HandleDeviceDisconnectAsync(DeviceDisconnectRequest request)
        => await _deviceService.HandleDeviceDisconnectAsync(request, CreateEventAsync);

    public Task<DeviceStatistics?> GetDeviceStatisticsAsync(string deviceId)
        => _deviceService.GetDeviceStatisticsAsync(deviceId);

    #endregion

    #region DataPoint Operations

    public Task<IoTDataPoint> CreateDataPointAsync(CreateIoTDataPointRequest request)
        => _dataPointService.CreateDataPointAsync(request);

    public Task<System.Linq.Dynamic.Core.PagedResult<IoTDataPoint>> GetDataPointsAsync(Platform.ServiceDefaults.Models.PageParams request, string? deviceId = null)
        => _dataPointService.GetDataPointsAsync(request, deviceId);

    public Task<IoTDataPoint?> GetDataPointByIdAsync(string id)
        => _dataPointService.GetDataPointByIdAsync(id);

    public Task<IoTDataPoint?> GetDataPointByDataPointIdAsync(string dataPointId)
        => _dataPointService.GetDataPointByDataPointIdAsync(dataPointId);

    public Task<IoTDataPoint?> UpdateDataPointAsync(string id, UpdateIoTDataPointRequest request)
        => _dataPointService.UpdateDataPointAsync(id, request);

    public Task<bool> DeleteDataPointAsync(string id)
        => _dataPointService.DeleteDataPointAsync(id);

    #endregion

    #region Data Record Operations

    public async Task<IoTDataRecord> ReportDataAsync(ReportIoTDataRequest request)
        => await _dataPointService.ReportDataAsync(request, _dataPointService.GetDataPointByDataPointIdAsync, _deviceService.GetDeviceByDeviceIdAsync);

    public async Task<List<IoTDataRecord>> BatchReportDataAsync(BatchReportIoTDataRequest request)
        => await _dataPointService.BatchReportDataAsync(request, _dataPointService.GetDataPointByDataPointIdAsync, _deviceService.GetDeviceByDeviceIdAsync);

    public Task<System.Linq.Dynamic.Core.PagedResult<IoTDataRecord>> QueryDataRecordsAsync(Platform.ServiceDefaults.Models.PageParams request, string? deviceId = null, string? dataPointId = null, DateTime? startTime = null, DateTime? endTime = null)
        => _dataPointService.QueryDataRecordsAsync(request, deviceId, dataPointId, startTime, endTime);

    public Task<IoTDataRecord?> GetLatestDataAsync(string dataPointId)
        => _dataPointService.GetLatestDataAsync(dataPointId);

    public Task<DataStatistics?> GetDataStatisticsAsync(string dataPointId, DateTime startTime, DateTime endTime)
        => _dataPointService.GetDataStatisticsAsync(dataPointId, startTime, endTime);

    #endregion

    #region Event Operations

    public Task<IoTDeviceEvent> CreateEventAsync(string deviceId, string eventType, string level, string? description = null, Dictionary<string, object>? eventData = null)
        => _eventService.CreateEventAsync(deviceId, eventType, level, description, eventData);

    public Task<System.Linq.Dynamic.Core.PagedResult<IoTDeviceEvent>> QueryEventsAsync(Platform.ServiceDefaults.Models.PageParams request, string? deviceId = null, string? eventType = null, string? level = null, bool? isHandled = null, DateTime? startTime = null, DateTime? endTime = null)
        => _eventService.QueryEventsAsync(request, deviceId, eventType, level, isHandled, startTime, endTime);

    public Task<bool> HandleEventAsync(string eventId, string remarks)
        => _eventService.HandleEventAsync(eventId, remarks);

    public Task<long> GetUnhandledEventCountAsync(string? deviceId = null)
        => _eventService.GetUnhandledEventCountAsync(deviceId);

    #endregion

    #region Statistics Operations

    public Task<PlatformStatistics> GetPlatformStatisticsAsync()
        => _statisticsService.GetPlatformStatisticsAsync();

    public Task<DeviceStatusStatistics> GetDeviceStatusStatisticsAsync()
        => _statisticsService.GetDeviceStatusStatisticsAsync();

    #endregion

    #region Device Twin Operations

    public Task<IoTDeviceTwin> GetOrCreateDeviceTwinAsync(string deviceId)
        => _deviceTwinService.GetOrCreateDeviceTwinAsync(deviceId);

    public Task<IoTDeviceTwin?> UpdateDesiredPropertiesAsync(string deviceId, UpdateDesiredPropertiesRequest request)
        => _deviceTwinService.UpdateDesiredPropertiesAsync(deviceId, request, _deviceService.ValidateDeviceExistsAsync, _deviceTwinService.GetOrCreateDeviceTwinAsync);

    public Task<IoTDeviceTwin?> ReportPropertiesAsync(string deviceId, string apiKey, Dictionary<string, object> properties)
        => _deviceTwinService.ReportPropertiesAsync(deviceId, apiKey, properties, ValidateApiKeyAsync, _deviceTwinService.GetOrCreateDeviceTwinAsync);

    #endregion

    #region C2D Command Operations

    public Task<IoTDeviceCommand> SendCommandAsync(string deviceId, SendCommandRequest request)
        => _commandService.SendCommandAsync(deviceId, request, _deviceService.ValidateDeviceExistsAsync);

    public Task<List<IoTDeviceCommand>> GetPendingCommandsAsync(string deviceId, string apiKey)
        => _commandService.GetPendingCommandsAsync(deviceId, apiKey, ValidateApiKeyAsync);

    public Task<bool> AckCommandAsync(string commandId, AckCommandRequest request)
        => _commandService.AckCommandAsync(commandId, request, ValidateApiKeyAsync);

    public Task<int> ExpireCommandsAsync()
        => _commandService.ExpireCommandsAsync();

    #endregion

    #region ApiKey Operations

    public Task<GenerateApiKeyResult> GenerateApiKeyAsync(string deviceId)
        => _commandService.GenerateApiKeyAsync(deviceId, _deviceService.GetDeviceByDeviceIdAsync);

    public Task<bool> ValidateApiKeyAsync(string deviceId, string apiKey)
        => _commandService.ValidateApiKeyAsync(deviceId, apiKey, _deviceService.GetDeviceByDeviceIdAsync);

    #endregion
}
