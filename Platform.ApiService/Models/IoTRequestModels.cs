namespace Platform.ApiService.Models;

#region Gateway Requests

/// <summary>
/// 创建物联网网关请求
/// </summary>
public class CreateIoTGatewayRequest
{
    /// <summary>网关名称（名称与标题合并）</summary>
    public string Title { get; set; } = string.Empty;
    /// <summary>协议类型（MQTT、HTTP、Modbus等）</summary>
    public string ProtocolType { get; set; } = "MQTT";
    /// <summary>网关地址/IP</summary>
    public string Address { get; set; } = string.Empty;
    /// <summary>连接用户名</summary>
    public string? Username { get; set; }
    /// <summary>连接密码</summary>
    public string? Password { get; set; }
    /// <summary>配置信息（字符串键值对）</summary>
    public Dictionary<string, string>? Config { get; set; }
}

/// <summary>
/// 更新物联网网关请求
/// </summary>
public class UpdateIoTGatewayRequest
{
    /// <summary>网关名称（名称与标题合并）</summary>
    public string? Title { get; set; }
    /// <summary>协议类型（MQTT、HTTP、Modbus等）</summary>
    public string? ProtocolType { get; set; }
    /// <summary>网关地址/IP</summary>
    public string? Address { get; set; }
    /// <summary>连接用户名</summary>
    public string? Username { get; set; }
    /// <summary>连接密码</summary>
    public string? Password { get; set; }
    /// <summary>是否启用</summary>
    public bool? IsEnabled { get; set; }
    /// <summary>配置信息（字符串键值对）</summary>
    public Dictionary<string, string>? Config { get; set; }
}

#endregion

#region Device Requests

/// <summary>
/// 创建物联网设备请求
/// </summary>
public class CreateIoTDeviceRequest
{
    /// <summary>设备名称</summary>
    public string Name { get; set; } = string.Empty;
    /// <summary>设备标题</summary>
    public string Title { get; set; } = string.Empty;
    /// <summary>设备唯一标识符（可选，不提供则自动生成）</summary>
    public string? DeviceId { get; set; }
    /// <summary>所属网关ID（可选，设备可以独立存在）</summary>
    public string? GatewayId { get; set; }
    /// <summary>设备类型</summary>
    public IoTDeviceType DeviceType { get; set; } = IoTDeviceType.Sensor;
    /// <summary>设备描述</summary>
    public string? Description { get; set; }
    /// <summary>物理位置</summary>
    public string? Location { get; set; }
    /// <summary>设备标签</summary>
    public Dictionary<string, string>? Tags { get; set; }
    /// <summary>遥测数据保留天数（0=永久）</summary>
    public int RetentionDays { get; set; } = 0;
}

/// <summary>
/// 更新物联网设备请求
/// </summary>
public class UpdateIoTDeviceRequest
{
    /// <summary>设备名称</summary>
    public string? Name { get; set; }
    /// <summary>设备标题</summary>
    public string? Title { get; set; }
    /// <summary>所属网关ID</summary>
    public string? GatewayId { get; set; }
    /// <summary>是否启用</summary>
    public bool? IsEnabled { get; set; }
    /// <summary>设备类型</summary>
    public IoTDeviceType? DeviceType { get; set; }
    /// <summary>设备描述</summary>
    public string? Description { get; set; }
    /// <summary>物理位置</summary>
    public string? Location { get; set; }
    /// <summary>设备标签</summary>
    public Dictionary<string, string>? Tags { get; set; }
    /// <summary>遥测数据保留天数（0=永久）</summary>
    public int? RetentionDays { get; set; }
}

#endregion

#region DataPoint Requests

/// <summary>
/// 创建数据点请求
/// </summary>
public class CreateIoTDataPointRequest
{
    /// <summary>数据点名称</summary>
    public string Name { get; set; } = string.Empty;
    /// <summary>数据点标题</summary>
    public string Title { get; set; } = string.Empty;
    /// <summary>所属设备ID</summary>
    public string DeviceId { get; set; } = string.Empty;
    /// <summary>数据类型</summary>
    public DataPointType DataType { get; set; } = DataPointType.Numeric;
    /// <summary>单位</summary>
    public string? Unit { get; set; }
    /// <summary>是否为只读</summary>
    public bool IsReadOnly { get; set; } = true;
    /// <summary>采样间隔（秒）</summary>
    public int SamplingInterval { get; set; } = 60;
    /// <summary>告警配置</summary>
    public AlarmConfig? AlarmConfig { get; set; }
}

/// <summary>
/// 更新数据点请求
/// </summary>
public class UpdateIoTDataPointRequest
{
    /// <summary>数据点名称</summary>
    public string? Name { get; set; }
    /// <summary>数据点标题</summary>
    public string? Title { get; set; }
    /// <summary>数据类型</summary>
    public DataPointType? DataType { get; set; }
    /// <summary>单位</summary>
    public string? Unit { get; set; }
    /// <summary>是否为只读</summary>
    public bool? IsReadOnly { get; set; }
    /// <summary>采样间隔（秒）</summary>
    public int? SamplingInterval { get; set; }
    /// <summary>是否启用</summary>
    public bool? IsEnabled { get; set; }
    /// <summary>告警配置</summary>
    public AlarmConfig? AlarmConfig { get; set; }
}

#endregion

#region Data Record Requests

/// <summary>
/// 上报数据请求
/// </summary>
public class ReportIoTDataRequest
{
    /// <summary>设备ID</summary>
    public string DeviceId { get; set; } = string.Empty;
    /// <summary>数据点ID</summary>
    public string DataPointId { get; set; } = string.Empty;
    /// <summary>数据值</summary>
    public string Value { get; set; } = string.Empty;
    /// <summary>上报时间</summary>
    public DateTime? ReportedAt { get; set; }
}

/// <summary>
/// 批量上报数据请求
/// </summary>
public class BatchReportIoTDataRequest
{
    /// <summary>设备ID</summary>
    public string DeviceId { get; set; } = string.Empty;
    /// <summary>数据点值列表</summary>
    public List<DataPointValue> DataPoints { get; set; } = new();
    /// <summary>上报时间</summary>
    public DateTime? ReportedAt { get; set; }
}

/// <summary>
/// 数据点值
/// </summary>
public class DataPointValue
{
    /// <summary>数据点ID</summary>
    public string DataPointId { get; set; } = string.Empty;
    /// <summary>数据值</summary>
    public string Value { get; set; } = string.Empty;
}

#endregion

#region Query Requests

/// <summary>
/// 查询物联网数据请求
/// </summary>
public class QueryIoTDataRequest
{
    /// <summary>设备ID</summary>
    public string? DeviceId { get; set; }
    /// <summary>数据点ID</summary>
    public string? DataPointId { get; set; }
    /// <summary>开始时间</summary>
    public DateTime? StartTime { get; set; }
    /// <summary>结束时间</summary>
    public DateTime? EndTime { get; set; }
    /// <summary>页码</summary>
    public int PageIndex { get; set; } = 1;
    /// <summary>每页数量</summary>
    public int PageSize { get; set; } = 20;
}

/// <summary>
/// 查询设备事件请求
/// </summary>
public class QueryIoTEventRequest
{
    /// <summary>设备ID</summary>
    public string? DeviceId { get; set; }
    /// <summary>事件类型</summary>
    public string? EventType { get; set; }
    /// <summary>事件级别</summary>
    public string? Level { get; set; }
    /// <summary>是否已处理</summary>
    public bool? IsHandled { get; set; }
    /// <summary>开始时间</summary>
    public DateTime? StartTime { get; set; }
    /// <summary>结束时间</summary>
    public DateTime? EndTime { get; set; }
    /// <summary>页码</summary>
    public int PageIndex { get; set; } = 1;
    /// <summary>每页数量</summary>
    public int PageSize { get; set; } = 20;
}

#endregion

#region Device Status Requests

/// <summary>
/// 设备连接请求
/// </summary>
public class DeviceConnectRequest
{
    /// <summary>设备ID</summary>
    public string DeviceId { get; set; } = string.Empty;
    /// <summary>IP地址</summary>
    public string? IpAddress { get; set; }
    /// <summary>元数据（JSON格式）</summary>
    public Dictionary<string, object>? Metadata { get; set; }
}

/// <summary>
/// 设备断开连接请求
/// </summary>
public class DeviceDisconnectRequest
{
    /// <summary>设备ID</summary>
    public string DeviceId { get; set; } = string.Empty;
    /// <summary>断开原因</summary>
    public string? Reason { get; set; }
}

#endregion

#region Device Twin Requests

/// <summary>
/// 更新设备孪生期望属性请求（管理端 → 云端写入）
/// </summary>
public class UpdateDesiredPropertiesRequest
{
    /// <summary>要更新的属性（JSON 键值，null 值表示删除该键）</summary>
    public Dictionary<string, object?> Properties { get; set; } = new();
}

/// <summary>
/// 设备上报属性请求（设备端 → 上报实际状态）
/// </summary>
public class ReportPropertiesRequest
{
    /// <summary>设备 ApiKey（鉴权）</summary>
    public string ApiKey { get; set; } = string.Empty;
    /// <summary>上报的属性键值</summary>
    public Dictionary<string, object> Properties { get; set; } = new();
}

#endregion

#region C2D Command Requests

/// <summary>
/// 发送云到设备命令请求
/// </summary>
public class SendCommandRequest
{
    /// <summary>命令名称（如 restart、setThreshold）</summary>
    public string CommandName { get; set; } = string.Empty;
    /// <summary>命令参数</summary>
    public Dictionary<string, object>? Payload { get; set; }
    /// <summary>命令过期时间（小时，默认 24）</summary>
    public int TtlHours { get; set; } = 24;
}

/// <summary>
/// 设备 Ack 命令执行结果请求
/// </summary>
public class AckCommandRequest
{
    /// <summary>设备 ApiKey（鉴权）</summary>
    public string ApiKey { get; set; } = string.Empty;
    /// <summary>是否执行成功</summary>
    public bool Success { get; set; } = true;
    /// <summary>执行结果</summary>
    public Dictionary<string, object>? ResponsePayload { get; set; }
    /// <summary>错误信息（失败时填充）</summary>
    public string? ErrorMessage { get; set; }
}

#endregion

#region ApiKey Requests

/// <summary>
/// 生成/重置设备 ApiKey 的结果
/// </summary>
public class GenerateApiKeyResult
{
    /// <summary>设备 ID</summary>
    public string DeviceId { get; set; } = string.Empty;
    /// <summary>明文 ApiKey（仅此次返回，之后无法查看）</summary>
    public string ApiKey { get; set; } = string.Empty;
    /// <summary>生成时间</summary>
    public DateTime GeneratedAt { get; set; } = DateTime.UtcNow;
}

#endregion

