using System.Text.Json;
using Platform.ApiService.Extensions;
using Platform.ApiService.Models;
using Platform.ServiceDefaults.Services;
namespace Platform.ApiService.Services;
/// <summary>
/// MCP 服务实现
/// </summary>

public partial class McpService
{
    #region 物联网相关工具处理方法

    private async Task<object> HandleGetIoTGatewaysAsync(Dictionary<string, object> arguments, string currentUserId)
    {
        var keyword = arguments.ContainsKey("keyword") ? arguments["keyword"]?.ToString() : null;
        var (page, pageSize) = ParsePaginationArgs(arguments);
        var (items, total) = await _iotService.GetGatewaysAsync(keyword, null, page, pageSize);
        return new { items, total, page, pageSize };
    }

    private async Task<object> HandleGetIoTDevicesAsync(Dictionary<string, object> arguments, string currentUserId)
    {
        var gatewayId = arguments.ContainsKey("gatewayId") ? arguments["gatewayId"]?.ToString() : null;
        var keyword = arguments.ContainsKey("keyword") ? arguments["keyword"]?.ToString() : null;
        var (page, pageSize) = ParsePaginationArgs(arguments);
        var (items, total) = await _iotService.GetDevicesAsync(gatewayId, keyword, page, pageSize);
        return new { items, total, page, pageSize };
    }

    private async Task<object> HandleGetIoTPlatformStatisticsAsync(Dictionary<string, object> arguments, string currentUserId)
    {
        return await _iotService.GetPlatformStatisticsAsync();
    }

    #endregion
    #region 物联网相关工具扩展处理方法

    private async Task<object> HandleGetIoTDataPointsAsync(Dictionary<string, object> arguments, string currentUserId)
    {
        if (!arguments.TryGetValue("deviceId", out var idObj) || idObj?.ToString() is not string deviceId)
        {
            return new { error = "缺少必需的参数: deviceId" };
        }

        var (page, pageSize) = ParsePaginationArgs(arguments, defaultPageSize: 50);
        return await _iotService.GetDataPointsAsync(deviceId, null, page, pageSize);
    }

    private async Task<object> HandleGetLatestIoTDataAsync(Dictionary<string, object> arguments, string currentUserId)
    {
        if (!arguments.TryGetValue("dataPointId", out var idObj) || idObj?.ToString() is not string dataPointId)
        {
            return new { error = "缺少必需的参数: dataPointId" };
        }

        var record = await _iotService.GetLatestDataAsync(dataPointId);
        return record ?? (object)new { message = "未找到实时观测数据" };
    }

    private async Task<object> HandleUpdateIoTDeviceAsync(Dictionary<string, object> arguments, string currentUserId)
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
        {
            request.IsEnabled = isEnabled;
        }

        var result = await _iotService.UpdateDeviceAsync(deviceId, request);
        return result ?? throw new Exception($"更新设备失败: {deviceId}");
    }

    private async Task<object> HandleUpdateIoTDeviceTwinAsync(Dictionary<string, object> arguments, string currentUserId)
    {
        var deviceId = arguments.GetValueOrDefault("deviceId")?.ToString();
        if (string.IsNullOrEmpty(deviceId)) throw new ArgumentException("deviceId is required");

        if (!arguments.TryGetValue("properties", out var propsObj) || propsObj is not JsonElement propsEl)
        {
            throw new ArgumentException("properties is required and must be a JSON object");
        }

        var properties = JsonSerializer.Deserialize<Dictionary<string, object?>>(propsEl.GetRawText());
        if (properties == null) throw new ArgumentException("Invalid properties format");

        var request = new UpdateDesiredPropertiesRequest { Properties = properties };
        var result = await _iotService.UpdateDesiredPropertiesAsync(deviceId, request);
        return result ?? throw new Exception($"更新设备孪生失败: {deviceId}");
    }

    private async Task<object> HandleSendIoTCommandAsync(Dictionary<string, object> arguments, string currentUserId)
    {
        var deviceId = arguments.GetValueOrDefault("deviceId")?.ToString();
        var commandName = arguments.GetValueOrDefault("commandName")?.ToString();

        if (string.IsNullOrEmpty(deviceId)) throw new ArgumentException("deviceId is required");
        if (string.IsNullOrEmpty(commandName)) throw new ArgumentException("commandName is required");

        Dictionary<string, object>? payload = null;
        if (arguments.TryGetValue("payload", out var payloadObj) && payloadObj is JsonElement payloadEl)
        {
            payload = JsonSerializer.Deserialize<Dictionary<string, object>>(payloadEl.GetRawText());
        }

        var request = new SendCommandRequest
        {
            CommandName = commandName,
            Payload = payload,
            TtlHours = arguments.ContainsKey("ttlHours") && int.TryParse(arguments["ttlHours"]?.ToString(), out var ttl) ? ttl : 24
        };

        return await _iotService.SendCommandAsync(deviceId, request);
    }

    #endregion
}
