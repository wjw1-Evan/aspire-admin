using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;
using Platform.ServiceDefaults.Models;

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
[BsonIgnoreExtraElements]
[Table("iotGateways")]
public class IoTGateway : MultiTenantEntity
{
    /// <summary>网关名称</summary>
    [Required]
    [StringLength(100)]
    [Column("name")]
    [BsonElement("name")]
    public string Name { get; set; } = string.Empty;

    /// <summary>网关标题</summary>
    [Required]
    [StringLength(200)]
    [Column("title")]
    [BsonElement("title")]
    public string Title { get; set; } = string.Empty;

    /// <summary>网关唯一标识符</summary>
    [StringLength(100)]
    [Column("gatewayId")]
    [BsonElement("gatewayId")]
    public string GatewayId { get; set; } = Guid.NewGuid().ToString();

    /// <summary>网关类型（MQTT、HTTP、Modbus等）</summary>
    [StringLength(50)]
    [Column("protocolType")]
    [BsonElement("protocolType")]
    public string ProtocolType { get; set; } = "MQTT";

    /// <summary>网关地址/IP</summary>
    [StringLength(255)]
    [Column("address")]
    [BsonElement("address")]
    public string Address { get; set; } = string.Empty;

    /// <summary>连接用户名</summary>
    [StringLength(100)]
    [Column("username")]
    [BsonElement("username")]
    public string? Username { get; set; }

    /// <summary>连接密码（加密存储）</summary>
    [StringLength(255)]
    [Column("password")]
    [BsonElement("password")]
    public string? Password { get; set; }

    /// <summary>是否启用</summary>
    [Column("isEnabled")]
    [BsonElement("isEnabled")]
    public bool IsEnabled { get; set; } = true;

    /// <summary>网关状态</summary>
    [Column("status")]
    [BsonElement("status")]
    public IoTDeviceStatus Status { get; set; } = IoTDeviceStatus.Offline;

    /// <summary>最后连接时间</summary>
    [Column("lastConnectedAt")]
    [BsonElement("lastConnectedAt")]
    public DateTime? LastConnectedAt { get; set; }

    /// <summary>设备数量</summary>
    [Column("deviceCount")]
    [BsonElement("deviceCount")]
    public int DeviceCount { get; set; } = 0;

    /// <summary>配置信息（字符串键值对）</summary>
    [Column("config")]
    [BsonElement("config")]
    [NotMapped]
    public Dictionary<string, string>? Config { get; set; }
}

/// <summary>
/// 物联网设备 - 表示接入平台的物理设备
/// </summary>
[BsonIgnoreExtraElements]
[Table("iotDevices")]
public class IoTDevice : MultiTenantEntity
{
    /// <summary>设备名称</summary>
    [Required]
    [StringLength(100)]
    [Column("name")]
    [BsonElement("name")]
    public string Name { get; set; } = string.Empty;

    /// <summary>设备标题</summary>
    [Required]
    [StringLength(200)]
    [Column("title")]
    [BsonElement("title")]
    public string Title { get; set; } = string.Empty;

    /// <summary>设备唯一标识符</summary>
    [Required]
    [StringLength(100)]
    [Column("deviceId")]
    [BsonElement("deviceId")]
    public string DeviceId { get; set; } = string.Empty;

    /// <summary>所属网关ID</summary>
    [StringLength(100)]
    [Column("gatewayId")]
    [BsonElement("gatewayId")]
    public string GatewayId { get; set; } = string.Empty;

    /// <summary>是否启用</summary>
    [Column("isEnabled")]
    [BsonElement("isEnabled")]
    public bool IsEnabled { get; set; } = true;

    /// <summary>最后上报时间</summary>
    [Column("lastReportedAt")]
    [BsonElement("lastReportedAt")]
    public DateTime? LastReportedAt { get; set; }
}

/// <summary>
/// 数据点 - 表示设备的一个数据采集点
/// </summary>
[BsonIgnoreExtraElements]
[Table("iotDataPoints")]
public class IoTDataPoint : MultiTenantEntity
{
    /// <summary>数据点名称</summary>
    [Required]
    [StringLength(100)]
    [Column("name")]
    [BsonElement("name")]
    public string Name { get; set; } = string.Empty;

    /// <summary>数据点标题</summary>
    [Required]
    [StringLength(200)]
    [Column("title")]
    [BsonElement("title")]
    public string Title { get; set; } = string.Empty;

    /// <summary>所属设备ID</summary>
    [Required]
    [StringLength(100)]
    [Column("deviceId")]
    [BsonElement("deviceId")]
    public string DeviceId { get; set; } = string.Empty;

    /// <summary>数据点唯一标识符</summary>
    [StringLength(100)]
    [Column("dataPointId")]
    [BsonElement("dataPointId")]
    public string DataPointId { get; set; } = Guid.NewGuid().ToString();

    /// <summary>数据点类型</summary>
    [Column("dataType")]
    [BsonElement("dataType")]
    public DataPointType DataType { get; set; } = DataPointType.Numeric;

    /// <summary>单位</summary>
    [StringLength(20)]
    [Column("unit")]
    [BsonElement("unit")]
    public string? Unit { get; set; }

    /// <summary>是否为只读</summary>
    [Column("isReadOnly")]
    [BsonElement("isReadOnly")]
    public bool IsReadOnly { get; set; } = true;

    /// <summary>采样间隔（秒）</summary>
    [Range(1, 86400)]
    [Column("samplingInterval")]
    [BsonElement("samplingInterval")]
    public int SamplingInterval { get; set; } = 60;

    /// <summary>最后数据值</summary>
    [StringLength(500)]
    [Column("lastValue")]
    [BsonElement("lastValue")]
    public string? LastValue { get; set; }

    /// <summary>最后更新时间</summary>
    [Column("lastUpdatedAt")]
    [BsonElement("lastUpdatedAt")]
    public DateTime? LastUpdatedAt { get; set; }

    /// <summary>是否启用</summary>
    [Column("isEnabled")]
    [BsonElement("isEnabled")]
    public bool IsEnabled { get; set; } = true;

    /// <summary>告警阈值配置</summary>
    [Column("alarmConfig")]
    [BsonElement("alarmConfig")]
    public AlarmConfig? AlarmConfig { get; set; }
}

/// <summary>
/// 告警配置
/// </summary>
public class AlarmConfig
{
    /// <summary>是否启用告警</summary>
    [Column("isEnabled")]
    [BsonElement("isEnabled")]
    public bool IsEnabled { get; set; } = false;

    /// <summary>告警类型：HighThreshold, LowThreshold, RangeThreshold</summary>
    [StringLength(50)]
    [Column("alarmType")]
    [BsonElement("alarmType")]
    public string AlarmType { get; set; } = "HighThreshold";

    /// <summary>告警阈值</summary>
    [Column("threshold")]
    [BsonElement("threshold")]
    public double Threshold { get; set; }

    /// <summary>告警级别：Info, Warning, Error, Critical</summary>
    [StringLength(20)]
    [Column("level")]
    [BsonElement("level")]
    public string Level { get; set; } = "Warning";
}

/// <summary>
/// 物联网数据记录 - 存储设备上报的数据
/// </summary>
[BsonIgnoreExtraElements]
[Table("iotDataRecords")]
public class IoTDataRecord : MultiTenantEntity
{
    /// <summary>所属设备ID</summary>
    [Required]
    [StringLength(100)]
    [Column("deviceId")]
    [BsonElement("deviceId")]
    public string DeviceId { get; set; } = string.Empty;

    /// <summary>所属数据点ID</summary>
    [Required]
    [StringLength(100)]
    [Column("dataPointId")]
    [BsonElement("dataPointId")]
    public string DataPointId { get; set; } = string.Empty;

    /// <summary>数据值</summary>
    [Required]
    [StringLength(500)]
    [Column("value")]
    [BsonElement("value")]
    public string Value { get; set; } = string.Empty;

    /// <summary>数据类型</summary>
    [Column("dataType")]
    [BsonElement("dataType")]
    public DataPointType DataType { get; set; } = DataPointType.Numeric;

    /// <summary>采样间隔（秒）</summary>
    [Range(0, 86400)]
    [Column("samplingInterval")]
    [BsonElement("samplingInterval")]
    public int SamplingInterval { get; set; }

    /// <summary>数据上报时间</summary>
    [Column("reportedAt")]
    [BsonElement("reportedAt")]
    public DateTime ReportedAt { get; set; } = DateTime.UtcNow;

    /// <summary>是否为告警数据</summary>
    [Column("isAlarm")]
    [BsonElement("isAlarm")]
    public bool IsAlarm { get; set; } = false;

    /// <summary>告警级别</summary>
    [StringLength(20)]
    [Column("alarmLevel")]
    [BsonElement("alarmLevel")]
    public string? AlarmLevel { get; set; }
}

/// <summary>
/// 物联网设备事件 - 记录设备的重要事件
/// </summary>
[BsonIgnoreExtraElements]
[Table("iotDeviceEvents")]
public class IoTDeviceEvent : MultiTenantEntity
{
    /// <summary>所属设备ID</summary>
    [Required]
    [StringLength(100)]
    [Column("deviceId")]
    [BsonElement("deviceId")]
    public string DeviceId { get; set; } = string.Empty;

    /// <summary>事件类型：Connected, Disconnected, DataReceived, Alarm, Error</summary>
    [Required]
    [StringLength(50)]
    [Column("eventType")]
    [BsonElement("eventType")]
    public string EventType { get; set; } = string.Empty;

    /// <summary>事件级别：Info, Warning, Error, Critical</summary>
    [StringLength(20)]
    [Column("level")]
    [BsonElement("level")]
    public string Level { get; set; } = "Info";

    /// <summary>事件描述</summary>
    [StringLength(2000)]
    [Column("description")]
    [BsonElement("description")]
    public string? Description { get; set; }

    /// <summary>事件数据（JSON格式）</summary>
    [Column("eventData")]
    [BsonElement("eventData")]
    [NotMapped]
    public Dictionary<string, object>? EventData { get; set; }

    /// <summary>事件发生时间</summary>
    [Column("occurredAt")]
    [BsonElement("occurredAt")]
    public DateTime OccurredAt { get; set; } = DateTime.UtcNow;

    /// <summary>是否已处理</summary>
    [Column("isHandled")]
    [BsonElement("isHandled")]
    public bool IsHandled { get; set; } = false;

    /// <summary>处理备注</summary>
    [StringLength(1000)]
    [Column("handledRemarks")]
    [BsonElement("handledRemarks")]
    public string? HandledRemarks { get; set; }
}

