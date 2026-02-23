using System.Text.Json;
using Platform.ApiService.Models;
using Platform.ServiceDefaults.Services;
using Microsoft.Extensions.Logging;

namespace Platform.ApiService.Services.Mcp.Handlers;

/// <summary>
/// 物联网相关 MCP 工具处理器
/// </summary>
public class IoTMcpToolHandler : McpToolHandlerBase
{
    private readonly IIoTService _iotService;
    private readonly ILogger<IoTMcpToolHandler> _logger;

    /// <summary>
    /// 初始化物联网 MCP 处理器
    /// </summary>
    /// <param name="iotService">物联网服务</param>
    /// <param name="logger">日志处理器</param>
    public IoTMcpToolHandler(IIoTService iotService, ILogger<IoTMcpToolHandler> logger)
    {
        _iotService = iotService;
        _logger = logger;

        RegisterTool("get_iot_gateways", "获取物联网网关列表。关键词：物联网,网关,网桥,gateway",
            ObjectSchema(MergeProperties(
                new Dictionary<string, object> { ["keyword"] = new Dictionary<string, object> { ["type"] = "string" } },
                PaginationSchema()
            )),
            async (args, uid) => { var keyword = args.GetValueOrDefault("keyword")?.ToString(); var (page, pageSize) = ParsePaginationArgs(args); var (items, total) = await _iotService.GetGatewaysAsync(keyword, null, page, pageSize); return new { items, total, page, pageSize }; });

        RegisterTool("get_iot_devices", "获取物联网设备列表。关键词：物联网,设备,器械,传感器,探头",
            ObjectSchema(MergeProperties(
                new Dictionary<string, object>
                {
                    ["gatewayId"] = new Dictionary<string, object> { ["type"] = "string" },
                    ["keyword"] = new Dictionary<string, object> { ["type"] = "string" }
                },
                PaginationSchema()
            )),
            async (args, uid) => { var gatewayId = args.GetValueOrDefault("gatewayId")?.ToString(); var keyword = args.GetValueOrDefault("keyword")?.ToString(); var (page, pageSize) = ParsePaginationArgs(args); var (items, total) = await _iotService.GetDevicesAsync(gatewayId, keyword, page, pageSize); return new { items, total, page, pageSize }; });

        RegisterTool("get_iot_platform_statistics", "获取物联网平台整体统计数据。关键词：物联网统计,设备概览",
            async (args, uid) => await _iotService.GetPlatformStatisticsAsync());

        RegisterTool("get_iot_datapoints", "获取指定设备的所有观测指标/数据点。关键词：数据点,观测指标,遥测项",
            ObjectSchema(MergeProperties(
                new Dictionary<string, object> { ["deviceId"] = new Dictionary<string, object> { ["type"] = "string", ["description"] = "设备ID" } },
                PaginationSchema(50)
            ), ["deviceId"]),
            async (args, uid) =>
            {
                var deviceId = args.GetValueOrDefault("deviceId")?.ToString();
                if (string.IsNullOrEmpty(deviceId)) return new { error = "参数错误: deviceId 必填" };
                var (page, pageSize) = ParsePaginationArgs(args, defaultPageSize: 50);
                return await _iotService.GetDataPointsAsync(deviceId, null, page, pageSize);
            });

        RegisterTool("get_latest_iot_data", "获取指定数据点的最新实时观测值。关键词：实时数据,最新值",
            ObjectSchema(new Dictionary<string, object> { ["dataPointId"] = new Dictionary<string, object> { ["type"] = "string", ["description"] = "数据点ID" } }, ["dataPointId"]),
            async (args, uid) =>
            {
                var dataPointId = args.GetValueOrDefault("dataPointId")?.ToString();
                if (string.IsNullOrEmpty(dataPointId)) return new { error = "参数错误: dataPointId 必填" };
                var record = await _iotService.GetLatestDataAsync(dataPointId);
                return record ?? (object)new { message = "未找到实时观测数据" };
            });

        RegisterTool("update_iot_device", "更新物联网设备的名称、位置或启用状态。关键词：修改设备,更新设备",
            ObjectSchema(new Dictionary<string, object>
            {
                ["deviceId"] = new Dictionary<string, object> { ["type"] = "string", ["description"] = "设备ID" },
                ["name"] = new Dictionary<string, object> { ["type"] = "string" },
                ["title"] = new Dictionary<string, object> { ["type"] = "string" },
                ["location"] = new Dictionary<string, object> { ["type"] = "string" },
                ["description"] = new Dictionary<string, object> { ["type"] = "string" },
                ["isEnabled"] = new Dictionary<string, object> { ["type"] = "boolean" }
            }, ["deviceId"]),
            HandleUpdateIoTDeviceAsync);

        RegisterTool("update_iot_device_twin", "更新物联网设备孪生属性（期望值）。关键词：远程配置,期望属性",
            ObjectSchema(new Dictionary<string, object>
            {
                ["deviceId"] = new Dictionary<string, object> { ["type"] = "string", ["description"] = "设备ID" },
                ["properties"] = new Dictionary<string, object> { ["type"] = "object", ["description"] = "期望属性" }
            }, ["deviceId", "properties"]),
            HandleUpdateIoTDeviceTwinAsync);

        RegisterTool("send_iot_command", "向物联网设备发送下行控制命令。关键词：控制设备,发送指令,远程控制",
            ObjectSchema(new Dictionary<string, object>
            {
                ["deviceId"] = new Dictionary<string, object> { ["type"] = "string", ["description"] = "设备ID" },
                ["commandName"] = new Dictionary<string, object> { ["type"] = "string", ["description"] = "命令名称" },
                ["payload"] = new Dictionary<string, object> { ["type"] = "object", ["description"] = "命令参数" },
                ["ttlHours"] = new Dictionary<string, object> { ["type"] = "integer", ["description"] = "超时时间(小时)", ["default"] = 24 }
            }, ["deviceId", "commandName"]),
            HandleSendIoTCommandAsync);
    }

    private async Task<object?> HandleUpdateIoTDeviceAsync(Dictionary<string, object> arguments, string currentUserId)
    {
        var deviceId = arguments.GetValueOrDefault("deviceId")?.ToString();
        if (string.IsNullOrEmpty(deviceId)) throw new ArgumentException("deviceId is required");

        var request = new UpdateIoTDeviceRequest
        {
            Name = arguments.GetValueOrDefault("name")?.ToString(),
            Title = arguments.GetValueOrDefault("title")?.ToString(),
            Location = arguments.GetValueOrDefault("location")?.ToString(),
            Description = arguments.GetValueOrDefault("description")?.ToString()
        };

        if (arguments.ContainsKey("isEnabled") && bool.TryParse(arguments["isEnabled"]?.ToString(), out var isEnabled))
            request.IsEnabled = isEnabled;

        var result = await _iotService.UpdateDeviceAsync(deviceId, request);
        return result ?? throw new Exception($"更新设备失败: {deviceId}");
    }

    private async Task<object?> HandleUpdateIoTDeviceTwinAsync(Dictionary<string, object> arguments, string currentUserId)
    {
        var deviceId = arguments.GetValueOrDefault("deviceId")?.ToString();
        if (string.IsNullOrEmpty(deviceId)) throw new ArgumentException("deviceId is required");

        if (!arguments.TryGetValue("properties", out var propsObj) || propsObj is not JsonElement propsEl)
            throw new ArgumentException("properties is required and must be a JSON object");

        var properties = JsonSerializer.Deserialize<Dictionary<string, object?>>(propsEl.GetRawText());
        if (properties == null) throw new ArgumentException("Invalid properties format");

        var request = new UpdateDesiredPropertiesRequest { Properties = properties };
        var result = await _iotService.UpdateDesiredPropertiesAsync(deviceId, request);
        return result ?? throw new Exception($"更新设备孪生失败: {deviceId}");
    }

    private async Task<object?> HandleSendIoTCommandAsync(Dictionary<string, object> arguments, string currentUserId)
    {
        var deviceId = arguments.GetValueOrDefault("deviceId")?.ToString();
        var commandName = arguments.GetValueOrDefault("commandName")?.ToString();
        if (string.IsNullOrEmpty(deviceId)) throw new ArgumentException("deviceId is required");
        if (string.IsNullOrEmpty(commandName)) throw new ArgumentException("commandName is required");

        Dictionary<string, object>? payload = null;
        if (arguments.TryGetValue("payload", out var payloadObj) && payloadObj is JsonElement payloadEl)
            payload = JsonSerializer.Deserialize<Dictionary<string, object>>(payloadEl.GetRawText());

        var request = new SendCommandRequest
        {
            CommandName = commandName,
            Payload = payload,
            TtlHours = arguments.ContainsKey("ttlHours") && int.TryParse(arguments["ttlHours"]?.ToString(), out var ttl) ? ttl : 24
        };
        return await _iotService.SendCommandAsync(deviceId, request);
    }
}
