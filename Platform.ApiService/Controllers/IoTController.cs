using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Platform.ApiService.Attributes;
using Platform.ApiService.Models;
using Platform.ApiService.Services;
using Platform.ServiceDefaults.Controllers;
using Platform.ServiceDefaults.Models;

namespace Platform.ApiService.Controllers;

/// <summary>
/// 物联网平台控制器 - 处理设备接入、数据采集和管理
/// </summary>
[ApiController]
[Route("api/iot")]
[Authorize]
[RequireMenu("iot-platform")]
public class IoTController : BaseApiController
{
    private readonly IIoTService _iotService;
    private readonly ILogger<IoTController> _logger;

    /// <summary>
    /// 初始化 IoTController 实例
    /// </summary>
    /// <param name="iotService">物联网服务接口</param>
    /// <param name="logger">日志记录器</param>
    public IoTController(IIoTService iotService, ILogger<IoTController> logger)
    {
        _iotService = iotService ?? throw new ArgumentNullException(nameof(iotService));
        _logger = logger ?? throw new ArgumentNullException(nameof(logger));
    }

    #region Gateway Endpoints

    /// <summary>
    /// 创建网关
    /// </summary>
    [HttpPost("gateways")]
    public async Task<IActionResult> CreateGateway([FromBody] CreateIoTGatewayRequest request)
    {
        try
        {
            var gateway = await _iotService.CreateGatewayAsync(request);
            return Success(gateway);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error creating gateway");
            return Error("CREATE_GATEWAY_ERROR", ex.Message);
        }
    }

    /// <summary>
    /// 获取网关列表
    /// </summary>
    [HttpGet("gateways")]
    public async Task<IActionResult> GetGateways([FromQuery] int pageIndex = 1, [FromQuery] int pageSize = 20)
    {
        try
        {
            var (items, total) = await _iotService.GetGatewaysAsync(pageIndex, pageSize);
            return SuccessPaged(items, total, pageIndex, pageSize);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting gateways");
            return Error("GET_GATEWAYS_ERROR", ex.Message);
        }
    }

    /// <summary>
    /// 获取网关详情
    /// </summary>
    [HttpGet("gateways/{id}")]
    public async Task<IActionResult> GetGateway(string id)
    {
        try
        {
            var gateway = await _iotService.GetGatewayByIdAsync(id);
            if (gateway == null)
                return NotFoundError("Gateway", id);

            return Success(gateway);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting gateway");
            return Error("GET_GATEWAY_ERROR", ex.Message);
        }
    }

    /// <summary>
    /// 更新网关
    /// </summary>
    [HttpPut("gateways/{id}")]
    public async Task<IActionResult> UpdateGateway(string id, [FromBody] UpdateIoTGatewayRequest request)
    {
        try
        {
            var gateway = await _iotService.UpdateGatewayAsync(id, request);
            if (gateway == null)
                return NotFoundError("Gateway", id);

            return Success(gateway);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error updating gateway");
            return Error("UPDATE_GATEWAY_ERROR", ex.Message);
        }
    }

    /// <summary>
    /// 删除网关
    /// </summary>
    [HttpDelete("gateways/{id}")]
    public async Task<IActionResult> DeleteGateway(string id)
    {
        try
        {
            var result = await _iotService.DeleteGatewayAsync(id);
            if (!result)
                return NotFoundError("Gateway", id);

            return Success();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error deleting gateway");
            return Error("DELETE_GATEWAY_ERROR", ex.Message);
        }
    }

    /// <summary>
    /// 获取网关统计信息
    /// </summary>
    [HttpGet("gateways/{gatewayId}/statistics")]
    public async Task<IActionResult> GetGatewayStatistics(string gatewayId)
    {
        try
        {
            var stats = await _iotService.GetGatewayStatisticsAsync(gatewayId);
            if (stats == null)
                return NotFoundError("Gateway", gatewayId);

            return Success(stats);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting gateway statistics");
            return Error("GET_GATEWAY_STATISTICS_ERROR", ex.Message);
        }
    }

    #endregion

    #region Device Endpoints

    /// <summary>
    /// 创建设备
    /// </summary>
    [HttpPost("devices")]
    public async Task<IActionResult> CreateDevice([FromBody] CreateIoTDeviceRequest request)
    {
        try
        {
            var device = await _iotService.CreateDeviceAsync(request);
            return Success(device);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error creating device");
            return Error("CREATE_DEVICE_ERROR", ex.Message);
        }
    }

    /// <summary>
    /// 获取设备列表
    /// </summary>
    [HttpGet("devices")]
    public async Task<IActionResult> GetDevices([FromQuery] string? gatewayId = null, [FromQuery] int pageIndex = 1, [FromQuery] int pageSize = 20)
    {
        try
        {
            var (items, total) = await _iotService.GetDevicesAsync(gatewayId, pageIndex, pageSize);
            return SuccessPaged(items, total, pageIndex, pageSize);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting devices");
            return Error("GET_DEVICES_ERROR", ex.Message);
        }
    }

    /// <summary>
    /// 获取设备详情
    /// </summary>
    [HttpGet("devices/{id}")]
    public async Task<IActionResult> GetDevice(string id)
    {
        try
        {
            var device = await _iotService.GetDeviceByIdAsync(id);
            if (device == null)
                return NotFoundError("Device", id);

            return Success(device);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting device");
            return Error("GET_DEVICE_ERROR", ex.Message);
        }
    }

    /// <summary>
    /// 更新设备
    /// </summary>
    [HttpPut("devices/{id}")]
    public async Task<IActionResult> UpdateDevice(string id, [FromBody] UpdateIoTDeviceRequest request)
    {
        try
        {
            var device = await _iotService.UpdateDeviceAsync(id, request);
            if (device == null)
                return NotFoundError("Device", id);

            return Success(device);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error updating device");
            return Error("UPDATE_DEVICE_ERROR", ex.Message);
        }
    }

    /// <summary>
    /// 删除设备
    /// </summary>
    [HttpDelete("devices/{id}")]
    public async Task<IActionResult> DeleteDevice(string id)
    {
        try
        {
            var result = await _iotService.DeleteDeviceAsync(id);
            if (!result)
                return NotFoundError("Device", id);

            return Success();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error deleting device");
            return Error("DELETE_DEVICE_ERROR", ex.Message);
        }
    }

    /// <summary>
    /// 处理设备连接
    /// </summary>
    /// <remarks>
    /// 此端点允许匿名访问，因为 IoT 设备可能没有用户认证。
    /// 安全措施：
    /// - 通过 DeviceId 验证设备是否存在
    /// - 输入验证（DeviceId 格式检查）
    /// - TODO: 建议添加速率限制以防止滥用
    /// - TODO: 建议添加 API Key 验证或设备密钥验证
    /// </remarks>
    [HttpPost("devices/connect")]
    [AllowAnonymous]
    public async Task<IActionResult> HandleDeviceConnect([FromBody] DeviceConnectRequest request)
    {
        try
        {
            var result = await _iotService.HandleDeviceConnectAsync(request);
            if (!result)
                return Error("DEVICE_NOT_FOUND", "Device not found");

            return Success();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error handling device connect");
            return Error("DEVICE_CONNECT_ERROR", ex.Message);
        }
    }

    /// <summary>
    /// 处理设备断开连接
    /// </summary>
    /// <remarks>
    /// 此端点允许匿名访问，因为 IoT 设备可能没有用户认证。
    /// 安全措施：
    /// - 通过 DeviceId 验证设备是否存在
    /// - 输入验证（DeviceId 格式检查）
    /// - TODO: 建议添加速率限制以防止滥用
    /// - TODO: 建议添加 API Key 验证或设备密钥验证
    /// </remarks>
    [HttpPost("devices/disconnect")]
    [AllowAnonymous]
    public async Task<IActionResult> HandleDeviceDisconnect([FromBody] DeviceDisconnectRequest request)
    {
        try
        {
            var result = await _iotService.HandleDeviceDisconnectAsync(request);
            if (!result)
                return Error("DEVICE_NOT_FOUND", "Device not found");

            return Success();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error handling device disconnect");
            return Error("DEVICE_DISCONNECT_ERROR", ex.Message);
        }
    }

    /// <summary>
    /// 获取设备统计信息
    /// </summary>
    [HttpGet("devices/{deviceId}/statistics")]
    public async Task<IActionResult> GetDeviceStatistics(string deviceId)
    {
        try
        {
            var stats = await _iotService.GetDeviceStatisticsAsync(deviceId);
            if (stats == null)
                return NotFoundError("Device", deviceId);

            return Success(stats);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting device statistics");
            return Error("GET_DEVICE_STATISTICS_ERROR", ex.Message);
        }
    }

    #endregion

    #region DataPoint Endpoints

    /// <summary>
    /// 创建数据点
    /// </summary>
    [HttpPost("datapoints")]
    public async Task<IActionResult> CreateDataPoint([FromBody] CreateIoTDataPointRequest request)
    {
        try
        {
            var dataPoint = await _iotService.CreateDataPointAsync(request);
            return Success(dataPoint);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error creating data point");
            return Error("CREATE_DATAPOINT_ERROR", ex.Message);
        }
    }

    /// <summary>
    /// 获取数据点列表
    /// </summary>
    [HttpGet("datapoints")]
    public async Task<IActionResult> GetDataPoints([FromQuery] string? deviceId = null, [FromQuery] int pageIndex = 1, [FromQuery] int pageSize = 20)
    {
        try
        {
            var (items, total) = await _iotService.GetDataPointsAsync(deviceId, pageIndex, pageSize);
            return SuccessPaged(items, total, pageIndex, pageSize);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting data points");
            return Error("GET_DATAPOINTS_ERROR", ex.Message);
        }
    }

    /// <summary>
    /// 获取数据点详情
    /// </summary>
    [HttpGet("datapoints/{id}")]
    public async Task<IActionResult> GetDataPoint(string id)
    {
        try
        {
            var dataPoint = await _iotService.GetDataPointByIdAsync(id);
            if (dataPoint == null)
                return NotFoundError("DataPoint", id);

            return Success(dataPoint);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting data point");
            return Error("GET_DATAPOINT_ERROR", ex.Message);
        }
    }

    /// <summary>
    /// 更新数据点
    /// </summary>
    [HttpPut("datapoints/{id}")]
    public async Task<IActionResult> UpdateDataPoint(string id, [FromBody] UpdateIoTDataPointRequest request)
    {
        try
        {
            var dataPoint = await _iotService.UpdateDataPointAsync(id, request);
            if (dataPoint == null)
                return NotFoundError("DataPoint", id);

            return Success(dataPoint);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error updating data point");
            return Error("UPDATE_DATAPOINT_ERROR", ex.Message);
        }
    }

    /// <summary>
    /// 删除数据点
    /// </summary>
    [HttpDelete("datapoints/{id}")]
    public async Task<IActionResult> DeleteDataPoint(string id)
    {
        try
        {
            var result = await _iotService.DeleteDataPointAsync(id);
            if (!result)
                return NotFoundError("DataPoint", id);

            return Success();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error deleting data point");
            return Error("DELETE_DATAPOINT_ERROR", ex.Message);
        }
    }

    #endregion

    #region Data Record Endpoints

    /// <summary>
    /// 上报数据
    /// </summary>
    /// <remarks>
    /// 此端点允许匿名访问，因为 IoT 设备可能没有用户认证。
    /// 安全措施：
    /// - 通过 DeviceId 和 DataPointId 验证设备和数据点是否存在
    /// - 输入验证（值类型、格式检查）
    /// - 数据点配置验证（采样间隔、数据类型等）
    /// - TODO: 建议添加速率限制以防止滥用和数据洪水攻击
    /// - TODO: 建议添加 API Key 验证或设备密钥验证
    /// </remarks>
    [HttpPost("data/report")]
    [AllowAnonymous]
    public async Task<IActionResult> ReportData([FromBody] ReportIoTDataRequest request)
    {
        try
        {
            var record = await _iotService.ReportDataAsync(request);
            return Success(record);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error reporting data");
            return Error("REPORT_DATA_ERROR", ex.Message);
        }
    }

    /// <summary>
    /// 批量上报数据
    /// </summary>
    /// <remarks>
    /// 此端点允许匿名访问，因为 IoT 设备可能没有用户认证。
    /// 安全措施：
    /// - 通过 DeviceId 和 DataPointId 验证设备和数据点是否存在
    /// - 输入验证（批量数据大小限制、值类型、格式检查）
    /// - 数据点配置验证（采样间隔、数据类型等）
    /// - TODO: 建议添加速率限制以防止滥用和数据洪水攻击
    /// - TODO: 建议添加 API Key 验证或设备密钥验证
    /// - TODO: 建议添加批量数据大小限制（例如最多 100 条记录）
    /// </remarks>
    [HttpPost("data/batch-report")]
    [AllowAnonymous]
    public async Task<IActionResult> BatchReportData([FromBody] BatchReportIoTDataRequest request)
    {
        try
        {
            var records = await _iotService.BatchReportDataAsync(request);
            return Success(records);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error batch reporting data");
            return Error("BATCH_REPORT_DATA_ERROR", ex.Message);
        }
    }

    /// <summary>
    /// 查询数据记录
    /// </summary>
    [HttpPost("data/query")]
    public async Task<IActionResult> QueryDataRecords([FromBody] QueryIoTDataRequest request)
    {
        try
        {
            var (records, total) = await _iotService.QueryDataRecordsAsync(request);
            return Success(new { Records = records, Total = total });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error querying data records");
            return Error("QUERY_DATA_ERROR", ex.Message);
        }
    }

    /// <summary>
    /// 获取最新数据
    /// </summary>
    [HttpGet("data/latest/{dataPointId}")]
    public async Task<IActionResult> GetLatestData(string dataPointId)
    {
        try
        {
            var record = await _iotService.GetLatestDataAsync(dataPointId);
            if (record == null)
                return NotFoundError("Data", dataPointId);

            return Success(record);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting latest data");
            return Error("GET_LATEST_DATA_ERROR", ex.Message);
        }
    }

    /// <summary>
    /// 获取数据统计
    /// </summary>
    [HttpGet("data/statistics/{dataPointId}")]
    public async Task<IActionResult> GetDataStatistics(string dataPointId, [FromQuery] DateTime startTime, [FromQuery] DateTime endTime)
    {
        try
        {
            var stats = await _iotService.GetDataStatisticsAsync(dataPointId, startTime, endTime);
            if (stats == null)
                return NotFoundError("Data", dataPointId);

            return Success(stats);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting data statistics");
            return Error("GET_DATA_STATISTICS_ERROR", ex.Message);
        }
    }

    #endregion

    #region Event Endpoints

    /// <summary>
    /// 查询设备事件
    /// </summary>
    [HttpPost("events/query")]
    public async Task<IActionResult> QueryEvents([FromBody] QueryIoTEventRequest request)
    {
        try
        {
            var (events, total) = await _iotService.QueryEventsAsync(request);
            return Success(new { Events = events, Total = total });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error querying events");
            return Error("QUERY_EVENTS_ERROR", ex.Message);
        }
    }

    /// <summary>
    /// 处理事件
    /// </summary>
    [HttpPost("events/{eventId}/handle")]
    public async Task<IActionResult> HandleEvent(string eventId, [FromBody] HandleEventRequest request)
    {
        try
        {
            var result = await _iotService.HandleEventAsync(eventId, request.Remarks ?? "");
            if (!result)
                return NotFoundError("Event", eventId);

            return Success();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error handling event");
            return Error("HANDLE_EVENT_ERROR", ex.Message);
        }
    }

    /// <summary>
    /// 获取未处理事件数量
    /// </summary>
    [HttpGet("events/unhandled-count")]
    public async Task<IActionResult> GetUnhandledEventCount([FromQuery] string? deviceId = null)
    {
        try
        {
            var count = await _iotService.GetUnhandledEventCountAsync(deviceId);
            return Success(new { Count = count });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting unhandled event count");
            return Error("GET_UNHANDLED_COUNT_ERROR", ex.Message);
        }
    }

    #endregion

    #region Statistics Endpoints

    /// <summary>
    /// 获取平台统计信息
    /// </summary>
    [HttpGet("statistics/platform")]
    public async Task<IActionResult> GetPlatformStatistics()
    {
        try
        {
            var stats = await _iotService.GetPlatformStatisticsAsync();
            return Success(stats);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting platform statistics");
            return Error("GET_PLATFORM_STATISTICS_ERROR", ex.Message);
        }
    }

    /// <summary>
    /// 获取设备状态统计
    /// </summary>
    [HttpGet("statistics/device-status")]
    public async Task<IActionResult> GetDeviceStatusStatistics()
    {
        try
        {
            var stats = await _iotService.GetDeviceStatusStatisticsAsync();
            return Success(stats);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting device status statistics");
            return Error("GET_DEVICE_STATUS_STATISTICS_ERROR", ex.Message);
        }
    }

    #endregion
}

/// <summary>
/// 处理事件请求
/// </summary>
public class HandleEventRequest
{
    /// <summary>
    /// 事件处理备注
    /// </summary>
    public string? Remarks { get; set; }
}

