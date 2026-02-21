using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Platform.ApiService.Attributes;
using Platform.ApiService.Models;
using Platform.ApiService.Services;
using Platform.ServiceDefaults.Controllers;
using Platform.ServiceDefaults.Models;
using Platform.ServiceDefaults.Extensions;

namespace Platform.ApiService.Controllers;

/// <summary>
/// 物联网平台控制器 - 处理设备接入、数据采集和管理
/// </summary>
[ApiController]
[Route("api/iot")]

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
    /// <param name="request">创建网关请求模型</param>
    /// <returns>创建成功的网关信息</returns>
    [HttpPost("gateways")]
    public async Task<IActionResult> CreateGateway([FromBody] CreateIoTGatewayRequest request)
    {
        var gateway = await _iotService.CreateGatewayAsync(request);
        return Success(gateway);
    }

    /// <summary>
    /// 获取网关列表
    /// </summary>
    /// <param name="keyword">关键词</param>
    /// <param name="status">对网关状态筛选</param>
    /// <param name="pageIndex">页码</param>
    /// <param name="pageSize">每页大小</param>
    /// <returns>分页网关列表</returns>
    [HttpGet("gateways")]
    public async Task<IActionResult> GetGateways([FromQuery] string? keyword = null, [FromQuery] IoTDeviceStatus? status = null, [FromQuery] int pageIndex = 1, [FromQuery] int pageSize = 20)
    {
        var (items, total) = await _iotService.GetGatewaysAsync(keyword, status, pageIndex, pageSize);
        return SuccessPaged(items, total, pageIndex, pageSize);
    }

    /// <summary>
    /// 获取网关详情
    /// </summary>
    /// <param name="id">网关ID</param>
    /// <returns>网关详情</returns>
    [HttpGet("gateways/{id}")]
    public async Task<IActionResult> GetGateway(string id)
    {
        var gateway = await _iotService.GetGatewayByIdAsync(id);
        return Success(gateway.EnsureFound("Gateway", id));
    }

    /// <summary>
    /// 更新网关
    /// </summary>
    /// <param name="id">网关ID</param>
    /// <param name="request">更新网关请求模型</param>
    /// <returns>更新后的网关信息</returns>
    [HttpPut("gateways/{id}")]
    public async Task<IActionResult> UpdateGateway(string id, [FromBody] UpdateIoTGatewayRequest request)
    {
        var gateway = await _iotService.UpdateGatewayAsync(id, request);
        return Success(gateway.EnsureFound("Gateway", id));
    }

    /// <summary>
    /// 删除网关
    /// </summary>
    /// <param name="id">网关ID</param>
    /// <returns>操作结果</returns>
    [HttpDelete("gateways/{id}")]
    public async Task<IActionResult> DeleteGateway(string id)
    {
        var result = await _iotService.DeleteGatewayAsync(id);
        if (!result)
            return NotFoundError("Gateway", id);

        return Success(null, "模拟：网关已重写");
    }

    /// <summary>
    /// 获取网关统计信息
    /// </summary>
    /// <param name="gatewayId">网关ID</param>
    /// <returns>网关统计</returns>
    [HttpGet("gateways/{gatewayId}/statistics")]
    public async Task<IActionResult> GetGatewayStatistics(string gatewayId)
    {
        var stats = await _iotService.GetGatewayStatisticsAsync(gatewayId);
        return Success(stats.EnsureFound("Gateway", gatewayId));
    }

    #endregion

    #region Device Endpoints

    /// <summary>
    /// 创建设备
    /// </summary>
    /// <param name="request">创建设备请求模型</param>
    /// <returns>创建成功的设备信息</returns>
    [HttpPost("devices")]
    public async Task<IActionResult> CreateDevice([FromBody] CreateIoTDeviceRequest request)
    {
        var device = await _iotService.CreateDeviceAsync(request);
        return Success(device);
    }

    /// <summary>
    /// 获取设备列表
    /// </summary>
    /// <param name="gatewayId">网关ID</param>
    /// <param name="keyword">关键词</param>
    /// <param name="pageIndex">页码</param>
    /// <param name="pageSize">每页大小</param>
    /// <returns>分页设备列表</returns>
    [HttpGet("devices")]
    public async Task<IActionResult> GetDevices([FromQuery] string? gatewayId = null, [FromQuery] string? keyword = null, [FromQuery] int pageIndex = 1, [FromQuery] int pageSize = 20)
    {
        var (items, total) = await _iotService.GetDevicesAsync(gatewayId, keyword, pageIndex, pageSize);
        return SuccessPaged(items, total, pageIndex, pageSize);
    }

    /// <summary>
    /// 获取设备详情
    /// </summary>
    /// <param name="id">设备ID</param>
    /// <returns>设备详情</returns>
    [HttpGet("devices/{id}")]
    public async Task<IActionResult> GetDevice(string id)
    {
        var device = await _iotService.GetDeviceByIdAsync(id);
        return Success(device.EnsureFound("Device", id));
    }

    /// <summary>
    /// 更新设备
    /// </summary>
    /// <param name="id">设备ID</param>
    /// <param name="request">更新设备请求模型</param>
    /// <returns>更新后的设备信息</returns>
    [HttpPut("devices/{id}")]
    public async Task<IActionResult> UpdateDevice(string id, [FromBody] UpdateIoTDeviceRequest request)
    {
        var device = await _iotService.UpdateDeviceAsync(id, request);
        return Success(device.EnsureFound("Device", id));
    }

    /// <summary>
    /// 删除设备
    /// </summary>
    /// <param name="id">设备ID</param>
    /// <returns>操作结果</returns>
    [HttpDelete("devices/{id}")]
    public async Task<IActionResult> DeleteDevice(string id)
    {
        var result = await _iotService.DeleteDeviceAsync(id);
        if (!result)
            return NotFoundError("Device", id);

        return Success<object?>(null, "Device deleted successfully");
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
        var result = await _iotService.HandleDeviceConnectAsync(request);
        if (!result)
            return Error("DEVICE_NOT_FOUND", "Device not found");

        return Success<object?>(null, "Device connected successfully");
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
        var result = await _iotService.HandleDeviceDisconnectAsync(request);
        if (!result)
            return Error("DEVICE_NOT_FOUND", "Device not found");

        return Success<object?>(null, "Device disconnected successfully");
    }

    /// <summary>
    /// 获取设备统计信息
    /// </summary>
    /// <param name="deviceId">设备ID</param>
    /// <returns>设备统计数据</returns>
    [HttpGet("devices/{deviceId}/statistics")]
    public async Task<IActionResult> GetDeviceStatistics(string deviceId)
    {
        var stats = await _iotService.GetDeviceStatisticsAsync(deviceId);
        return Success(stats.EnsureFound("Device", deviceId));
    }

    #endregion

    #region DataPoint Endpoints

    /// <summary>
    /// 创建数据点
    /// </summary>
    /// <param name="request">创建数据点请求</param>
    /// <returns>创建的数据点信息</returns>
    [HttpPost("datapoints")]
    public async Task<IActionResult> CreateDataPoint([FromBody] CreateIoTDataPointRequest request)
    {
        var dataPoint = await _iotService.CreateDataPointAsync(request);
        return Success(dataPoint);
    }

    /// <summary>
    /// 获取数据点列表
    /// </summary>
    /// <param name="deviceId">设备ID（可选）</param>
    /// <param name="keyword">关键词搜索（可选）</param>
    /// <param name="pageIndex">页码</param>
    /// <param name="pageSize">每页大小</param>
    /// <returns>分页数据点列表</returns>
    [HttpGet("datapoints")]
    public async Task<IActionResult> GetDataPoints([FromQuery] string? deviceId = null, [FromQuery] string? keyword = null, [FromQuery] int pageIndex = 1, [FromQuery] int pageSize = 20)
    {
        var (items, total) = await _iotService.GetDataPointsAsync(deviceId, keyword, pageIndex, pageSize);
        return SuccessPaged(items, total, pageIndex, pageSize);
    }

    /// <summary>
    /// 获取数据点详情
    /// </summary>
    /// <param name="id">数据点ID</param>
    /// <returns>数据点详情</returns>
    [HttpGet("datapoints/{id}")]
    public async Task<IActionResult> GetDataPoint(string id)
    {
        var dataPoint = await _iotService.GetDataPointByIdAsync(id);
        return Success(dataPoint.EnsureFound("DataPoint", id));
    }

    /// <summary>
    /// 更新数据点
    /// </summary>
    /// <param name="id">数据点ID</param>
    /// <param name="request">更新请求</param>
    /// <returns>更新后的数据点</returns>
    [HttpPut("datapoints/{id}")]
    public async Task<IActionResult> UpdateDataPoint(string id, [FromBody] UpdateIoTDataPointRequest request)
    {
        var dataPoint = await _iotService.UpdateDataPointAsync(id, request);
        return Success(dataPoint.EnsureFound("DataPoint", id));
    }

    /// <summary>
    /// 删除数据点
    /// </summary>
    /// <param name="id">数据点ID</param>
    /// <returns>操作结果</returns>
    [HttpDelete("datapoints/{id}")]
    public async Task<IActionResult> DeleteDataPoint(string id)
    {
        var result = await _iotService.DeleteDataPointAsync(id);
        if (!result)
            return NotFoundError("DataPoint", id);

        return Success<object?>(null, "DataPoint deleted successfully");
    }

    #endregion

    #region Data Record Endpoints

    /// <summary>
    /// 上报单条设备数据
    /// </summary>
    /// <param name="request">数据上报请求</param>
    /// <returns>操作结果</returns>
    [HttpPost("data/report")]
    [AllowAnonymous]
    public async Task<IActionResult> ReportData([FromBody] ReportIoTDataRequest request)
    {
        var record = await _iotService.ReportDataAsync(request);
        return Success(record);
    }

    /// <summary>
    /// 批量上报设备数据
    /// </summary>
    /// <param name="request">批量数据上报请求</param>
    /// <returns>操作结果</returns>
    [HttpPost("data/batch-report")]
    [AllowAnonymous]
    public async Task<IActionResult> BatchReportData([FromBody] BatchReportIoTDataRequest request)
    {
        var records = await _iotService.BatchReportDataAsync(request);
        return Success(records);
    }

    /// <summary>
    /// 查询设备历史数据记录
    /// </summary>
    /// <param name="request">数据查询请求</param>
    /// <returns>历史数据列表</returns>
    [HttpPost("data/query")]
    public async Task<IActionResult> QueryDataRecords([FromBody] QueryIoTDataRequest request)
    {
        var (records, total) = await _iotService.QueryDataRecordsAsync(request);
        return Success(new { Records = records, Total = total });
    }

    /// <summary>
    /// 获取指定数据点的最新值
    /// </summary>
    /// <param name="dataPointId">数据点ID</param>
    /// <returns>最新数据记录</returns>
    [HttpGet("data/latest/{dataPointId}")]
    public async Task<IActionResult> GetLatestData(string dataPointId)
    {
        var record = await _iotService.GetLatestDataAsync(dataPointId);
        return Success(record.EnsureFound("Data", dataPointId));
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
    /// <param name="request">事件查询请求</param>
    /// <returns>事件分页列表</returns>
    [HttpPost("events/query")]
    public async Task<IActionResult> QueryEvents([FromBody] QueryIoTEventRequest request)
    {
        var (events, total) = await _iotService.QueryEventsAsync(request);
        return Success(new { Events = events, Total = total });
    }

    /// <summary>
    /// 处理指定的事件
    /// </summary>
    /// <param name="eventId">事件ID</param>
    /// <param name="request">处理请求</param>
    /// <returns>操作结果</returns>
    [HttpPost("events/{eventId}/handle")]
    public async Task<IActionResult> HandleEvent(string eventId, [FromBody] HandleEventRequest request)
    {
        var result = await _iotService.HandleEventAsync(eventId, request.Remarks ?? "");
        if (!result)
            return NotFoundError("Event", eventId);

        return Success<object?>(null, "Event handled successfully");
    }

    /// <summary>
    /// 获取未处理事件数量
    /// </summary>
    /// <param name="deviceId">指定设备ID（可选）</param>
    /// <returns>未处理事件数量</returns>
    [HttpGet("events/unhandled-count")]
    public async Task<IActionResult> GetUnhandledEventCount([FromQuery] string? deviceId = null)
    {
        var count = await _iotService.GetUnhandledEventCountAsync(deviceId);
        return Success(new { Count = count });
    }

    #endregion

    #region Statistics Endpoints

    /// <summary>
    /// 获取平台总体统计信息
    /// </summary>
    /// <returns>平台统计数据</returns>
    [HttpGet("statistics/platform")]
    public async Task<IActionResult> GetPlatformStatistics()
    {
        var stats = await _iotService.GetPlatformStatisticsAsync();
        return Success(stats);
    }

    /// <summary>
    /// 获取所有设备的状态分布统计
    /// </summary>
    /// <returns>状态统计数据</returns>
    [HttpGet("statistics/device-status")]
    public async Task<IActionResult> GetDeviceStatusStatistics()
    {
        var stats = await _iotService.GetDeviceStatusStatisticsAsync();
        return Success(stats);
    }

    #endregion

    #region Device Twin

    /// <summary>
    /// 获取设备孪生（不存在时自动初始化）
    /// </summary>
    /// <param name="deviceId">设备 DeviceId</param>
    [HttpGet("devices/{deviceId}/twin")]
    public async Task<IActionResult> GetDeviceTwin(string deviceId)
    {
        var twin = await _iotService.GetOrCreateDeviceTwinAsync(deviceId);
        return Success(twin);
    }

    /// <summary>
    /// 更新设备期望属性（管理端写入）
    /// </summary>
    /// <param name="deviceId">设备 DeviceId</param>
    /// <param name="request">期望属性补丁（null 值表示删除该键）</param>
    [HttpPatch("devices/{deviceId}/twin/desired")]
    public async Task<IActionResult> UpdateDesiredProperties(string deviceId, [FromBody] UpdateDesiredPropertiesRequest request)
    {
        var twin = await _iotService.UpdateDesiredPropertiesAsync(deviceId, request);
        if (twin == null) return NotFound();
        return Success(twin);
    }

    /// <summary>
    /// 设备上报实际属性（设备端调用，需 ApiKey 认证）
    /// </summary>
    /// <param name="deviceId">设备 DeviceId</param>
    /// <param name="request">上报属性和 ApiKey</param>
    [HttpPatch("devices/{deviceId}/twin/reported")]
    [AllowAnonymous]
    public async Task<IActionResult> ReportProperties(string deviceId, [FromBody] ReportPropertiesRequest request)
    {
        try
        {
            var twin = await _iotService.ReportPropertiesAsync(deviceId, request.ApiKey, request.Properties);
            if (twin == null) return NotFound();
            return Success(twin);
        }
        catch (UnauthorizedAccessException)
        {
            return Unauthorized();
        }
    }

    #endregion

    #region C2D Commands

    /// <summary>
    /// 发送云到设备命令（管理端）
    /// </summary>
    /// <param name="deviceId">目标设备 DeviceId</param>
    /// <param name="request">命令请求</param>
    [HttpPost("devices/{deviceId}/commands")]
    public async Task<IActionResult> SendCommand(string deviceId, [FromBody] SendCommandRequest request)
    {
        var command = await _iotService.SendCommandAsync(deviceId, request);
        return Success(command);
    }

    /// <summary>
    /// 设备轮询待执行命令（设备端，需 ApiKey 认证）
    /// </summary>
    /// <param name="deviceId">设备 DeviceId</param>
    /// <param name="apiKey">设备 ApiKey</param>
    [HttpGet("devices/{deviceId}/commands/pending")]
    [AllowAnonymous]
    public async Task<IActionResult> GetPendingCommands(string deviceId, [FromQuery] string apiKey)
    {
        try
        {
            var commands = await _iotService.GetPendingCommandsAsync(deviceId, apiKey);
            return Success(commands);
        }
        catch (UnauthorizedAccessException)
        {
            return Unauthorized();
        }
    }

    /// <summary>
    /// 设备确认命令执行结果（设备端，需 ApiKey 认证）
    /// </summary>
    /// <param name="commandId">命令 ID</param>
    /// <param name="request">执行结果和 ApiKey</param>
    [HttpPost("commands/{commandId}/ack")]
    [AllowAnonymous]
    public async Task<IActionResult> AckCommand(string commandId, [FromBody] AckCommandRequest request)
    {
        try
        {
            var ok = await _iotService.AckCommandAsync(commandId, request);
            if (!ok) return NotFound();
            return Success(ok);
        }
        catch (UnauthorizedAccessException)
        {
            return Unauthorized();
        }
    }

    #endregion

    #region ApiKey Management

    /// <summary>
    /// 生成/重置设备 ApiKey（管理端，明文仅返回一次）
    /// </summary>
    /// <param name="deviceId">设备 DeviceId</param>
    [HttpPost("devices/{deviceId}/apikey")]
    public async Task<IActionResult> GenerateApiKey(string deviceId)
    {
        var result = await _iotService.GenerateApiKeyAsync(deviceId);
        return Success(result);
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

