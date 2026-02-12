using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;
using Platform.ServiceDefaults.Models;
using System.ComponentModel.DataAnnotations.Schema;
using System.Collections.Generic;

namespace Platform.ApiService.Models;

/// <summary>
/// 物联网设备类型枚举
/// </summary>
public enum IoTDeviceType
{
    /// <summary>传感器</summary>
    Sensor = 1,
    /// <summary>执行器</summary>
    Actuator = 2,
    /// <summary>网关</summary>
    Gateway = 3,
    /// <summary>其他</summary>
    Other = 4
}

/// <summary>
/// 物联网设备状态枚举
/// </summary>
public enum IoTDeviceStatus
{
    /// <summary>离线</summary>
    Offline = 0,
    /// <summary>在线</summary>
    Online = 1,
    /// <summary>故障</summary>
    Fault = 2,
    /// <summary>维护中</summary>
    Maintenance = 3
}

/// <summary>
/// 数据点类型枚举
/// </summary>
public enum DataPointType
{
    /// <summary>数值类型</summary>
    Numeric = 1,
    /// <summary>布尔类型</summary>
    Boolean = 2,
    /// <summary>字符串类型</summary>
    String = 3,
    /// <summary>枚举类型</summary>
    Enum = 4,
    /// <summary>JSON类型</summary>
    Json = 5
}

/// <summary>
/// 物联网网关 - 用于设备接入和数据收集
/// </summary>
[BsonIgnoreExtraElements]  // 忽略数据库中存在但模型中不存在的字段（如已删除的 description, tags, remarks 等）
public class IoTGateway : MultiTenantEntity, INamedEntity
{
    /// <summary>网关名称</summary>
    [BsonElement("name")]
    public string Name { get; set; } = string.Empty;

    /// <summary>网关标题</summary>
    [BsonElement("title")]
    public string Title { get; set; } = string.Empty;

    /// <summary>网关唯一标识符</summary>
    [BsonElement("gatewayId")]
    public string GatewayId { get; set; } = Guid.NewGuid().ToString();

    /// <summary>网关类型（MQTT、HTTP、Modbus等）</summary>
    [BsonElement("protocolType")]
    public string ProtocolType { get; set; } = "MQTT";

    /// <summary>网关地址/IP</summary>
    [BsonElement("address")]
    public string Address { get; set; } = string.Empty;

    /// <summary>连接用户名</summary>
    [BsonElement("username")]
    public string? Username { get; set; }

    /// <summary>连接密码（加密存储）</summary>
    [BsonElement("password")]
    public string? Password { get; set; }

    /// <summary>是否启用</summary>
    [BsonElement("isEnabled")]
    public bool IsEnabled { get; set; } = true;

    /// <summary>网关状态</summary>
    [BsonElement("status")]
    public IoTDeviceStatus Status { get; set; } = IoTDeviceStatus.Offline;

    /// <summary>最后连接时间</summary>
    [BsonElement("lastConnectedAt")]
    public DateTime? LastConnectedAt { get; set; }

    /// <summary>设备数量</summary>
    [BsonElement("deviceCount")]
    public int DeviceCount { get; set; } = 0;

    /// <summary>配置信息（字符串键值对）</summary>
    [BsonElement("config")]
    [NotMapped]
    public Dictionary<string, string>? Config { get; set; }
}

/// <summary>
/// 物联网设备 - 表示接入平台的物理设备
/// </summary>
[BsonIgnoreExtraElements]  // 忽略数据库中存在但模型中不存在的字段（如已删除的 description, model, tags 等）
public class IoTDevice : MultiTenantEntity, INamedEntity
{
    /// <summary>设备名称</summary>
    [BsonElement("name")]
    public string Name { get; set; } = string.Empty;

    /// <summary>设备标题</summary>
    [BsonElement("title")]
    public string Title { get; set; } = string.Empty;

    /// <summary>设备唯一标识符</summary>
    [BsonElement("deviceId")]
    public string DeviceId { get; set; } = string.Empty;

    /// <summary>所属网关ID</summary>
    [BsonElement("gatewayId")]
    public string GatewayId { get; set; } = string.Empty;

    /// <summary>是否启用</summary>
    [BsonElement("isEnabled")]
    public bool IsEnabled { get; set; } = true;

    /// <summary>最后上报时间</summary>
    [BsonElement("lastReportedAt")]
    public DateTime? LastReportedAt { get; set; }
}

/// <summary>
/// 数据点 - 表示设备的一个数据采集点
/// </summary>
[BsonIgnoreExtraElements]  // 忽略数据库中存在但模型中不存在的字段（如已删除的 description, minValue, maxValue, tags 等）
public class IoTDataPoint : MultiTenantEntity, INamedEntity
{
    /// <summary>数据点名称</summary>
    [BsonElement("name")]
    public string Name { get; set; } = string.Empty;

    /// <summary>数据点标题</summary>
    [BsonElement("title")]
    public string Title { get; set; } = string.Empty;

    /// <summary>所属设备ID</summary>
    [BsonElement("deviceId")]
    public string DeviceId { get; set; } = string.Empty;

    /// <summary>数据点唯一标识符</summary>
    [BsonElement("dataPointId")]
    public string DataPointId { get; set; } = Guid.NewGuid().ToString();

    /// <summary>数据点类型</summary>
    [BsonElement("dataType")]
    public DataPointType DataType { get; set; } = DataPointType.Numeric;

    /// <summary>单位</summary>
    [BsonElement("unit")]
    public string? Unit { get; set; }

    /// <summary>是否为只读</summary>
    [BsonElement("isReadOnly")]
    public bool IsReadOnly { get; set; } = true;

    /// <summary>采样间隔（秒）</summary>
    [BsonElement("samplingInterval")]
    public int SamplingInterval { get; set; } = 60;

    /// <summary>最后数据值</summary>
    [BsonElement("lastValue")]
    public string? LastValue { get; set; }

    /// <summary>最后更新时间</summary>
    [BsonElement("lastUpdatedAt")]
    public DateTime? LastUpdatedAt { get; set; }

    /// <summary>是否启用</summary>
    [BsonElement("isEnabled")]
    public bool IsEnabled { get; set; } = true;

    /// <summary>告警阈值配置</summary>
    [BsonElement("alarmConfig")]
    public AlarmConfig? AlarmConfig { get; set; }
}

/// <summary>
/// 告警配置
/// </summary>
public class AlarmConfig
{
    /// <summary>是否启用告警</summary>
    [BsonElement("isEnabled")]
    public bool IsEnabled { get; set; } = false;

    /// <summary>告警类型：HighThreshold, LowThreshold, RangeThreshold</summary>
    [BsonElement("alarmType")]
    public string AlarmType { get; set; } = "HighThreshold";

    /// <summary>告警阈值</summary>
    [BsonElement("threshold")]
    public double Threshold { get; set; }

    /// <summary>告警级别：Info, Warning, Error, Critical</summary>
    [BsonElement("level")]
    public string Level { get; set; } = "Warning";
}

/// <summary>
/// 物联网数据记录 - 存储设备上报的数据
/// </summary>
[BsonIgnoreExtraElements]  // 忽略数据库中存在但模型中不存在的字段（如已删除的 remarks 等）
public class IoTDataRecord : MultiTenantEntity
{
    /// <summary>所属设备ID</summary>
    [BsonElement("deviceId")]
    public string DeviceId { get; set; } = string.Empty;

    /// <summary>所属数据点ID</summary>
    [BsonElement("dataPointId")]
    public string DataPointId { get; set; } = string.Empty;

    /// <summary>数据值</summary>
    [BsonElement("value")]
    public string Value { get; set; } = string.Empty;

    /// <summary>数据类型</summary>
    [BsonElement("dataType")]
    public DataPointType DataType { get; set; } = DataPointType.Numeric;

    /// <summary>采样间隔（秒）</summary>
    [BsonElement("samplingInterval")]
    public int SamplingInterval { get; set; }

    /// <summary>数据上报时间</summary>
    [BsonElement("reportedAt")]
    public DateTime ReportedAt { get; set; } = DateTime.UtcNow;

    /// <summary>是否为告警数据</summary>
    [BsonElement("isAlarm")]
    public bool IsAlarm { get; set; } = false;

    /// <summary>告警级别</summary>
    [BsonElement("alarmLevel")]
    public string? AlarmLevel { get; set; }
}

/// <summary>
/// 物联网设备事件 - 记录设备的重要事件
/// </summary>
public class IoTDeviceEvent : MultiTenantEntity
{
    /// <summary>所属设备ID</summary>
    [BsonElement("deviceId")]
    public string DeviceId { get; set; } = string.Empty;

    /// <summary>事件类型：Connected, Disconnected, DataReceived, Alarm, Error</summary>
    [BsonElement("eventType")]
    public string EventType { get; set; } = string.Empty;

    /// <summary>事件级别：Info, Warning, Error, Critical</summary>
    [BsonElement("level")]
    public string Level { get; set; } = "Info";

    /// <summary>事件描述</summary>
    [BsonElement("description")]
    public string? Description { get; set; }

    /// <summary>事件数据（JSON格式）</summary>
    [BsonElement("eventData")]
    [NotMapped]
    public Dictionary<string, object>? EventData { get; set; }

    /// <summary>事件发生时间</summary>
    [BsonElement("occurredAt")]
    public DateTime OccurredAt { get; set; } = DateTime.UtcNow;

    /// <summary>是否已处理</summary>
    [BsonElement("isHandled")]
    public bool IsHandled { get; set; } = false;

    /// <summary>处理备注</summary>
    [BsonElement("handledRemarks")]
    public string? HandledRemarks { get; set; }
}

