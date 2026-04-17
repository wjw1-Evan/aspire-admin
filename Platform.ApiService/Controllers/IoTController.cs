using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Platform.ApiService.Attributes;
using Platform.ApiService.Models;
using Platform.ApiService.Services;
using Platform.ServiceDefaults.Controllers;
using Platform.ServiceDefaults.Models;

namespace Platform.ApiService.Controllers;

/// <summary>
/// 物联网控制器
/// 网关、设备、数据点、告警等 IoT 平台管理
/// </summary>
[ApiController]
[Route("api/iot")]
[RequireMenu("iot-platform")]
public class IoTController : BaseApiController
{
    private readonly IIoTService _iotService;

    public IoTController(IIoTService iotService)
    {
        _iotService = iotService;
    }

    #region Gateway

    /// <summary>
    /// 创建网关
    /// </summary>
    [HttpPost("gateways")]
    public async Task<IActionResult> CreateGateway([FromBody] CreateIoTGatewayRequest request)
        => Success(await _iotService.CreateGatewayAsync(request));

    /// <summary>
    /// 获取网关列表
    /// </summary>
    [HttpGet("gateways")]
    public async Task<IActionResult> GetGateways([FromQuery] PageParams request, [FromQuery] IoTDeviceStatus? status = null)
        => Success(await _iotService.GetGatewaysAsync(request, status));

    /// <summary>
    /// 获取网关详情
    /// </summary>
    [HttpGet("gateways/{id}")]
    public async Task<IActionResult> GetGateway(string id)
        => Success(await _iotService.GetGatewayByIdAsync(id));

    /// <summary>
    /// 更新网关
    /// </summary>
    [HttpPut("gateways/{id}")]
    public async Task<IActionResult> UpdateGateway(string id, [FromBody] UpdateIoTGatewayRequest request)
        => Success(await _iotService.UpdateGatewayAsync(id, request));

    /// <summary>
    /// 删除网关
    /// </summary>
    [HttpDelete("gateways/{id}")]
    public async Task<IActionResult> DeleteGateway(string id)
    {
        var result = await _iotService.DeleteGatewayAsync(id);
        if (!result) throw new ArgumentException("网关不存在");
        return Success(null, "网关已删除");
    }

    /// <summary>
    /// 获取网关统计
    /// </summary>
    [HttpGet("gateways/{gatewayId}/statistics")]
    public async Task<IActionResult> GetGatewayStatistics(string gatewayId)
        => Success(await _iotService.GetGatewayStatisticsAsync(gatewayId));

    #endregion

    #region Device

    /// <summary>
    /// 创建设备
    /// </summary>
    [HttpPost("devices")]
    public async Task<IActionResult> CreateDevice([FromBody] CreateIoTDeviceRequest request)
        => Success(await _iotService.CreateDeviceAsync(request));

    /// <summary>
    /// 获取设备列表
    /// </summary>
    [HttpGet("devices")]
    public async Task<IActionResult> GetDevices([FromQuery] PageParams request, [FromQuery] string? gatewayId = null)
        => Success(await _iotService.GetDevicesAsync(request, gatewayId));

    /// <summary>
    /// 获取设备详情
    /// </summary>
    [HttpGet("devices/{id}")]
    public async Task<IActionResult> GetDevice(string id)
        => Success(await _iotService.GetDeviceByIdAsync(id));

    /// <summary>
    /// 更新设备
    /// </summary>
    [HttpPut("devices/{id}")]
    public async Task<IActionResult> UpdateDevice(string id, [FromBody] UpdateIoTDeviceRequest request)
        => Success(await _iotService.UpdateDeviceAsync(id, request));

    /// <summary>
    /// 删除设备
    /// </summary>
    [HttpDelete("devices/{id}")]
    public async Task<IActionResult> DeleteDevice(string id)
    {
        var result = await _iotService.DeleteDeviceAsync(id);
        if (!result) throw new ArgumentException("设备不存在");
        return Success(null, "设备已删除");
    }

    /// <summary>
    /// 批量删除设备
    /// </summary>
    [HttpDelete("devices")]
    public async Task<IActionResult> BatchDeleteDevices([FromBody] List<string> ids)
    {
        if (ids == null || ids.Count == 0)
            return BadRequest(new { message = "ID列表不能为空" });
        var deletedCount = await _iotService.BatchDeleteDevicesAsync(ids);
        return Success(new { deletedCount, total = ids.Count });
    }

    /// <summary>
    /// 处理设备连接
    /// </summary>
    [HttpPost("devices/connect")]
    [AllowAnonymous]
    public async Task<IActionResult> HandleDeviceConnect([FromBody] DeviceConnectRequest request)
    {
        var result = await _iotService.HandleDeviceConnectAsync(request);
        if (!result) throw new ArgumentException("设备不存在");
        return Success(null, "设备已连接");
    }

    /// <summary>
    /// 处理设备断开
    /// </summary>
    [HttpPost("devices/disconnect")]
    [AllowAnonymous]
    public async Task<IActionResult> HandleDeviceDisconnect([FromBody] DeviceDisconnectRequest request)
    {
        var result = await _iotService.HandleDeviceDisconnectAsync(request);
        if (!result) throw new ArgumentException("设备不存在");
        return Success(null, "设备已断开");
    }

    /// <summary>
    /// 获取设备统计
    /// </summary>
    [HttpGet("devices/{deviceId}/statistics")]
    public async Task<IActionResult> GetDeviceStatistics(string deviceId)
        => Success(await _iotService.GetDeviceStatisticsAsync(deviceId));

    #endregion

    #region DataPoint

    /// <summary>
    /// 创建数据点
    /// </summary>
    [HttpPost("datapoints")]
    public async Task<IActionResult> CreateDataPoint([FromBody] CreateIoTDataPointRequest request)
        => Success(await _iotService.CreateDataPointAsync(request));

    /// <summary>
    /// 获取数据点列表
    /// </summary>
    [HttpGet("datapoints")]
    public async Task<IActionResult> GetDataPoints([FromQuery] PageParams request, [FromQuery] string? deviceId = null)
        => Success(await _iotService.GetDataPointsAsync(request, deviceId));

    /// <summary>
    /// 获取数据点详情
    /// </summary>
    [HttpGet("datapoints/{id}")]
    public async Task<IActionResult> GetDataPoint(string id)
        => Success(await _iotService.GetDataPointByIdAsync(id));

    /// <summary>
    /// 更新数据点
    /// </summary>
    [HttpPut("datapoints/{id}")]
    public async Task<IActionResult> UpdateDataPoint(string id, [FromBody] UpdateIoTDataPointRequest request)
        => Success(await _iotService.UpdateDataPointAsync(id, request));

    /// <summary>
    /// 删除数据点
    /// </summary>
    [HttpDelete("datapoints/{id}")]
    public async Task<IActionResult> DeleteDataPoint(string id)
    {
        var result = await _iotService.DeleteDataPointAsync(id);
        if (!result) throw new ArgumentException("数据点不存在");
        return Success(null, "数据点已删除");
    }

    #endregion

#region Data Record

    /// <summary>
    /// 上报设备数据
    /// </summary>
    [HttpPost]
    [AllowAnonymous]
    public async Task<IActionResult> ReportData([FromBody] ReportIoTDataRequest request)
        => Success(await _iotService.ReportDataAsync(request));

    /// <summary>
    /// 批量上报设备数据
    /// </summary>
    [HttpPost]
    [AllowAnonymous]
    public async Task<IActionResult> BatchReportData([FromBody] BatchReportIoTDataRequest request)
        => Success(await _iotService.BatchReportDataAsync(request));

    /// <summary>
    /// 查询数据记录
    /// </summary>
    [HttpGet("data/query")]
    public async Task<IActionResult> QueryDataRecords(
        [FromQuery] PageParams request,
        [FromQuery] string? deviceId = null,
        [FromQuery] string? dataPointId = null,
        [FromQuery] DateTime? startTime = null,
        [FromQuery] DateTime? endTime = null)
        => Success(await _iotService.QueryDataRecordsAsync(request, deviceId, dataPointId, startTime, endTime));

    [HttpGet("data/latest/{dataPointId}")]
    public async Task<IActionResult> GetLatestData(string dataPointId)
        => Success(await _iotService.GetLatestDataAsync(dataPointId));

    [HttpGet("data/statistics/{dataPointId}")]
    public async Task<IActionResult> GetDataStatistics(string dataPointId, [FromQuery] DateTime startTime, [FromQuery] DateTime endTime)
    {
        var stats = await _iotService.GetDataStatisticsAsync(dataPointId, startTime, endTime);
        if (stats == null) throw new ArgumentException("数据点不存在");
        return Success(stats);
    }

    #endregion

    #region Events

    /// <summary>
    /// 查询告警事件列表
    /// </summary>
    [HttpGet("events/query")]
    public async Task<IActionResult> QueryEvents(
        [FromQuery] PageParams request,
        [FromQuery] string? deviceId = null,
        [FromQuery] string? eventType = null,
        [FromQuery] string? level = null,
        [FromQuery] bool? isHandled = null,
        [FromQuery] DateTime? startTime = null,
        [FromQuery] DateTime? endTime = null)
        => Success(await _iotService.QueryEventsAsync(request, deviceId, eventType, level, isHandled, startTime, endTime));

    /// <summary>
    /// 处理告警事件
    /// </summary>
    [HttpPost("events/{eventId}/handle")]
    public async Task<IActionResult> HandleEvent(string eventId, [FromBody] HandleEventRequest request)
    {
        var result = await _iotService.HandleEventAsync(eventId, request.Remarks ?? "");
        if (!result) throw new ArgumentException("事件不存在");
        return Success(null, "事件已处理");
    }

    /// <summary>
    /// 获取未处理告警事件数量
    /// </summary>
    [HttpGet("events/unhandled-count")]
    public async Task<IActionResult> GetUnhandledEventCount([FromQuery] string? deviceId = null)
        => Success(new { Count = await _iotService.GetUnhandledEventCountAsync(deviceId) });

    #endregion

    #region Statistics

    /// <summary>
    /// 获取平台统计信息
    /// </summary>
    [HttpGet("statistics/platform")]
    public async Task<IActionResult> GetPlatformStatistics()
        => Success(await _iotService.GetPlatformStatisticsAsync());

    /// <summary>
    /// 获取设备状态统计
    /// </summary>
    [HttpGet("statistics/device-status")]
    public async Task<IActionResult> GetDeviceStatusStatistics()
        => Success(await _iotService.GetDeviceStatusStatisticsAsync());

    #endregion

    #region Device Twin

    /// <summary>
    /// 获取设备数字孪生
    /// </summary>
    [HttpGet("devices/{deviceId}/twin")]
    public async Task<IActionResult> GetDeviceTwin(string deviceId)
        => Success(await _iotService.GetOrCreateDeviceTwinAsync(deviceId));

    /// <summary>
    /// 更新设备期望属性
    /// </summary>
    [HttpPatch("devices/{deviceId}/twin/desired")]
    public async Task<IActionResult> UpdateDesiredProperties(string deviceId, [FromBody] UpdateDesiredPropertiesRequest request)
    {
        var twin = await _iotService.UpdateDesiredPropertiesAsync(deviceId, request);
        if (twin == null) return NotFound();
        return Success(twin);
    }

    /// <summary>
    /// 上报设备属性
    /// </summary>
    [HttpPatch("devices/{deviceId}/twin/reported")]
    [AllowAnonymous]
    public async Task<IActionResult> ReportProperties(string deviceId, [FromBody] ReportPropertiesRequest request)
    {
        var twin = await _iotService.ReportPropertiesAsync(deviceId, request.ApiKey, request.Properties);
        if (twin == null) return NotFound();
        return Success(twin);
    }

    #endregion

    #region Commands

    /// <summary>
    /// 发送指令到设备
    /// </summary>
    [HttpPost("devices/{deviceId}/commands")]
    public async Task<IActionResult> SendCommand(string deviceId, [FromBody] SendCommandRequest request)
        => Success(await _iotService.SendCommandAsync(deviceId, request));

    /// <summary>
    /// 获取设备待执行指令
    /// </summary>
    [HttpGet("devices/{deviceId}/commands/pending")]
    [AllowAnonymous]
    public async Task<IActionResult> GetPendingCommands(string deviceId, [FromQuery] string apiKey)
        => Success(await _iotService.GetPendingCommandsAsync(deviceId, apiKey));

    /// <summary>
    /// 确认设备指令
    /// </summary>
    [HttpPost("commands/{commandId}/ack")]
    [AllowAnonymous]
    public async Task<IActionResult> AckCommand(string commandId, [FromBody] AckCommandRequest request)
    {
        var ok = await _iotService.AckCommandAsync(commandId, request);
        if (!ok) return NotFound();
        return Success(ok);
    }

    /// <summary>
    /// 生成设备 API Key
    /// </summary>
    [HttpPost("devices/{deviceId}/apikey")]
    public async Task<IActionResult> GenerateApiKey(string deviceId)
        => Success(await _iotService.GenerateApiKeyAsync(deviceId));

    #endregion
}
