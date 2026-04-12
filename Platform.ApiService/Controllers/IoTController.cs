using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Platform.ApiService.Attributes;
using Platform.ApiService.Models;
using Platform.ApiService.Services;
using Platform.ServiceDefaults.Controllers;
using Platform.ServiceDefaults.Models;

namespace Platform.ApiService.Controllers;

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

    [HttpPost("gateways")]
    public async Task<IActionResult> CreateGateway([FromBody] CreateIoTGatewayRequest request)
        => Success(await _iotService.CreateGatewayAsync(request));

    [HttpGet("gateways")]
    public async Task<IActionResult> GetGateways([FromQuery] PageParams request, [FromQuery] IoTDeviceStatus? status = null)
        => Success(await _iotService.GetGatewaysAsync(request, status));

    [HttpGet("gateways/{id}")]
    public async Task<IActionResult> GetGateway(string id)
        => Success(await _iotService.GetGatewayByIdAsync(id));

    [HttpPut("gateways/{id}")]
    public async Task<IActionResult> UpdateGateway(string id, [FromBody] UpdateIoTGatewayRequest request)
        => Success(await _iotService.UpdateGatewayAsync(id, request));

    [HttpDelete("gateways/{id}")]
    public async Task<IActionResult> DeleteGateway(string id)
    {
        var result = await _iotService.DeleteGatewayAsync(id);
        if (!result) throw new ArgumentException("网关不存在");
        return Success(null, "网关已删除");
    }

    [HttpGet("gateways/{gatewayId}/statistics")]
    public async Task<IActionResult> GetGatewayStatistics(string gatewayId)
        => Success(await _iotService.GetGatewayStatisticsAsync(gatewayId));

    #endregion

    #region Device

    [HttpPost("devices")]
    public async Task<IActionResult> CreateDevice([FromBody] CreateIoTDeviceRequest request)
        => Success(await _iotService.CreateDeviceAsync(request));

    [HttpGet("devices")]
    public async Task<IActionResult> GetDevices([FromQuery] PageParams request, [FromQuery] string? gatewayId = null)
        => Success(await _iotService.GetDevicesAsync(request, gatewayId));

    [HttpGet("devices/{id}")]
    public async Task<IActionResult> GetDevice(string id)
        => Success(await _iotService.GetDeviceByIdAsync(id));

    [HttpPut("devices/{id}")]
    public async Task<IActionResult> UpdateDevice(string id, [FromBody] UpdateIoTDeviceRequest request)
        => Success(await _iotService.UpdateDeviceAsync(id, request));

    [HttpDelete("devices/{id}")]
    public async Task<IActionResult> DeleteDevice(string id)
    {
        var result = await _iotService.DeleteDeviceAsync(id);
        if (!result) throw new ArgumentException("设备不存在");
        return Success(null, "设备已删除");
    }

    [HttpDelete("devices")]
    public async Task<IActionResult> BatchDeleteDevices([FromBody] List<string> ids)
    {
        if (ids == null || ids.Count == 0)
            return BadRequest(new { message = "ID列表不能为空" });
        var deletedCount = await _iotService.BatchDeleteDevicesAsync(ids);
        return Success(new { deletedCount, total = ids.Count });
    }

    [HttpPost("devices/connect")]
    [AllowAnonymous]
    public async Task<IActionResult> HandleDeviceConnect([FromBody] DeviceConnectRequest request)
    {
        var result = await _iotService.HandleDeviceConnectAsync(request);
        if (!result) throw new ArgumentException("设备不存在");
        return Success(null, "设备已连接");
    }

    [HttpPost("devices/disconnect")]
    [AllowAnonymous]
    public async Task<IActionResult> HandleDeviceDisconnect([FromBody] DeviceDisconnectRequest request)
    {
        var result = await _iotService.HandleDeviceDisconnectAsync(request);
        if (!result) throw new ArgumentException("设备不存在");
        return Success(null, "设备已断开");
    }

    [HttpGet("devices/{deviceId}/statistics")]
    public async Task<IActionResult> GetDeviceStatistics(string deviceId)
        => Success(await _iotService.GetDeviceStatisticsAsync(deviceId));

    #endregion

    #region DataPoint

    [HttpPost("datapoints")]
    public async Task<IActionResult> CreateDataPoint([FromBody] CreateIoTDataPointRequest request)
        => Success(await _iotService.CreateDataPointAsync(request));

    [HttpGet("datapoints")]
    public async Task<IActionResult> GetDataPoints([FromQuery] PageParams request, [FromQuery] string? deviceId = null)
        => Success(await _iotService.GetDataPointsAsync(request, deviceId));

    [HttpGet("datapoints/{id}")]
    public async Task<IActionResult> GetDataPoint(string id)
        => Success(await _iotService.GetDataPointByIdAsync(id));

    [HttpPut("datapoints/{id}")]
    public async Task<IActionResult> UpdateDataPoint(string id, [FromBody] UpdateIoTDataPointRequest request)
        => Success(await _iotService.UpdateDataPointAsync(id, request));

    [HttpDelete("datapoints/{id}")]
    public async Task<IActionResult> DeleteDataPoint(string id)
    {
        var result = await _iotService.DeleteDataPointAsync(id);
        if (!result) throw new ArgumentException("数据点不存在");
        return Success(null, "数据点已删除");
    }

    #endregion

    #region Data Record

    [HttpPost("data/report")]
    [AllowAnonymous]
    public async Task<IActionResult> ReportData([FromBody] ReportIoTDataRequest request)
        => Success(await _iotService.ReportDataAsync(request));

    [HttpPost("data/batch-report")]
    [AllowAnonymous]
    public async Task<IActionResult> BatchReportData([FromBody] BatchReportIoTDataRequest request)
        => Success(await _iotService.BatchReportDataAsync(request));

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

    [HttpPost("events/{eventId}/handle")]
    public async Task<IActionResult> HandleEvent(string eventId, [FromBody] HandleEventRequest request)
    {
        var result = await _iotService.HandleEventAsync(eventId, request.Remarks ?? "");
        if (!result) throw new ArgumentException("事件不存在");
        return Success(null, "事件已处理");
    }

    [HttpGet("events/unhandled-count")]
    public async Task<IActionResult> GetUnhandledEventCount([FromQuery] string? deviceId = null)
        => Success(new { Count = await _iotService.GetUnhandledEventCountAsync(deviceId) });

    #endregion

    #region Statistics

    [HttpGet("statistics/platform")]
    public async Task<IActionResult> GetPlatformStatistics()
        => Success(await _iotService.GetPlatformStatisticsAsync());

    [HttpGet("statistics/device-status")]
    public async Task<IActionResult> GetDeviceStatusStatistics()
        => Success(await _iotService.GetDeviceStatusStatisticsAsync());

    #endregion

    #region Device Twin

    [HttpGet("devices/{deviceId}/twin")]
    public async Task<IActionResult> GetDeviceTwin(string deviceId)
        => Success(await _iotService.GetOrCreateDeviceTwinAsync(deviceId));

    [HttpPatch("devices/{deviceId}/twin/desired")]
    public async Task<IActionResult> UpdateDesiredProperties(string deviceId, [FromBody] UpdateDesiredPropertiesRequest request)
    {
        var twin = await _iotService.UpdateDesiredPropertiesAsync(deviceId, request);
        if (twin == null) return NotFound();
        return Success(twin);
    }

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

    [HttpPost("devices/{deviceId}/commands")]
    public async Task<IActionResult> SendCommand(string deviceId, [FromBody] SendCommandRequest request)
        => Success(await _iotService.SendCommandAsync(deviceId, request));

    [HttpGet("devices/{deviceId}/commands/pending")]
    [AllowAnonymous]
    public async Task<IActionResult> GetPendingCommands(string deviceId, [FromQuery] string apiKey)
        => Success(await _iotService.GetPendingCommandsAsync(deviceId, apiKey));

    [HttpPost("commands/{commandId}/ack")]
    [AllowAnonymous]
    public async Task<IActionResult> AckCommand(string commandId, [FromBody] AckCommandRequest request)
    {
        var ok = await _iotService.AckCommandAsync(commandId, request);
        if (!ok) return NotFound();
        return Success(ok);
    }

    [HttpPost("devices/{deviceId}/apikey")]
    public async Task<IActionResult> GenerateApiKey(string deviceId)
        => Success(await _iotService.GenerateApiKeyAsync(deviceId));

    #endregion
}
