using MongoDB.Bson.Serialization.Attributes;
using Platform.ServiceDefaults.Models;
using System.ComponentModel.DataAnnotations;

namespace Platform.DataPlatform.Models;

/// <summary>
/// 任务状态枚举
/// </summary>
public enum TaskStatus
{
    /// <summary>
    /// 待执行
    /// </summary>
    Pending = 1,
    
    /// <summary>
    /// 运行中
    /// </summary>
    Running = 2,
    
    /// <summary>
    /// 已完成
    /// </summary>
    Completed = 3,
    
    /// <summary>
    /// 失败
    /// </summary>
    Failed = 4,
    
    /// <summary>
    /// 已取消
    /// </summary>
    Cancelled = 5
}

/// <summary>
/// 任务类型枚举
/// </summary>
public enum TaskType
{
    /// <summary>
    /// 数据管道任务
    /// </summary>
    Pipeline = 1,
    
    /// <summary>
    /// 数据质量检查任务
    /// </summary>
    QualityCheck = 2,
    
    /// <summary>
    /// 数据同步任务
    /// </summary>
    DataSync = 3,
    
    /// <summary>
    /// 数据清理任务
    /// </summary>
    DataCleanup = 4
}

/// <summary>
/// 任务执行记录
/// </summary>
public class TaskExecution : DataPlatformMultiTenantEntity
{
    [BsonElement("taskId")]
    [Required]
    public string TaskId { get; set; } = string.Empty;

    [BsonElement("taskName")]
    [Required]
    public string TaskName { get; set; } = string.Empty;

    [BsonElement("taskType")]
    public TaskType TaskType { get; set; }

    [BsonElement("status")]
    public TaskStatus Status { get; set; } = TaskStatus.Pending;

    [BsonElement("startTime")]
    [BsonDateTimeOptions(Kind = DateTimeKind.Utc)]
    public DateTime StartTime { get; set; } = DateTime.UtcNow;

    [BsonElement("endTime")]
    [BsonDateTimeOptions(Kind = DateTimeKind.Utc)]
    public DateTime? EndTime { get; set; }

    [BsonElement("duration")]
    public TimeSpan? Duration => EndTime - StartTime;

    [BsonElement("progress")]
    public double Progress { get; set; } = 0;

    [BsonElement("errorMessage")]
    public string? ErrorMessage { get; set; }

    [BsonElement("result")]
    public Dictionary<string, object> Result { get; set; } = new();

    [BsonElement("metadata")]
    public Dictionary<string, object> Metadata { get; set; } = new();
}

/// <summary>
/// 系统监控指标
/// </summary>
public class SystemMetrics
{
    [BsonElement("timestamp")]
    [BsonDateTimeOptions(Kind = DateTimeKind.Utc)]
    public DateTime Timestamp { get; set; } = DateTime.UtcNow;

    [BsonElement("cpuUsage")]
    public double CpuUsage { get; set; }

    [BsonElement("memoryUsage")]
    public double MemoryUsage { get; set; }

    [BsonElement("diskUsage")]
    public double DiskUsage { get; set; }

    [BsonElement("networkIn")]
    public long NetworkIn { get; set; }

    [BsonElement("networkOut")]
    public long NetworkOut { get; set; }

    [BsonElement("activeConnections")]
    public int ActiveConnections { get; set; }

    [BsonElement("runningTasks")]
    public int RunningTasks { get; set; }

    [BsonElement("failedTasks")]
    public int FailedTasks { get; set; }

    [BsonElement("completedTasks")]
    public int CompletedTasks { get; set; }
}

/// <summary>
/// 告警规则
/// </summary>
public class AlertRule : DataPlatformMultiTenantEntity, INamedEntity
{
    [BsonElement("name")]
    [Required]
    public string Name { get; set; } = string.Empty;

    [BsonElement("title")]
    [Required]
    public string Title { get; set; } = string.Empty;

    [BsonElement("description")]
    public string? Description { get; set; }

    [BsonElement("metric")]
    [Required]
    public string Metric { get; set; } = string.Empty;

    [BsonElement("operator")]
    [Required]
    public string Operator { get; set; } = string.Empty;

    [BsonElement("threshold")]
    public double Threshold { get; set; }

    [BsonElement("severity")]
    public AlertSeverity Severity { get; set; } = AlertSeverity.Warning;

    [BsonElement("isEnabled")]
    public bool IsEnabled { get; set; } = true;

    [BsonElement("cooldownMinutes")]
    public int CooldownMinutes { get; set; } = 30;

    [BsonElement("notificationChannels")]
    public List<string> NotificationChannels { get; set; } = new();

    [BsonElement("tags")]
    public List<string> Tags { get; set; } = new();
}

/// <summary>
/// 告警严重程度
/// </summary>
public enum AlertSeverity
{
    /// <summary>
    /// 信息
    /// </summary>
    Info = 1,
    
    /// <summary>
    /// 警告
    /// </summary>
    Warning = 2,
    
    /// <summary>
    /// 错误
    /// </summary>
    Error = 3,
    
    /// <summary>
    /// 严重
    /// </summary>
    Critical = 4
}

/// <summary>
/// 告警记录
/// </summary>
public class Alert : DataPlatformMultiTenantEntity
{
    [BsonElement("ruleId")]
    [Required]
    public string RuleId { get; set; } = string.Empty;

    [BsonElement("ruleName")]
    [Required]
    public string RuleName { get; set; } = string.Empty;

    [BsonElement("severity")]
    public AlertSeverity Severity { get; set; }

    [BsonElement("message")]
    [Required]
    public string Message { get; set; } = string.Empty;

    [BsonElement("metric")]
    public string Metric { get; set; } = string.Empty;

    [BsonElement("value")]
    public double Value { get; set; }

    [BsonElement("threshold")]
    public double Threshold { get; set; }

    [BsonElement("status")]
    public AlertStatus Status { get; set; } = AlertStatus.Active;

    [BsonElement("triggeredAt")]
    [BsonDateTimeOptions(Kind = DateTimeKind.Utc)]
    public DateTime TriggeredAt { get; set; } = DateTime.UtcNow;

    [BsonElement("acknowledgedAt")]
    [BsonDateTimeOptions(Kind = DateTimeKind.Utc)]
    public DateTime? AcknowledgedAt { get; set; }

    [BsonElement("acknowledgedBy")]
    public string? AcknowledgedBy { get; set; }

    [BsonElement("resolvedAt")]
    [BsonDateTimeOptions(Kind = DateTimeKind.Utc)]
    public DateTime? ResolvedAt { get; set; }

    [BsonElement("resolvedBy")]
    public string? ResolvedBy { get; set; }

    [BsonElement("metadata")]
    public Dictionary<string, object> Metadata { get; set; } = new();
}

/// <summary>
/// 告警状态
/// </summary>
public enum AlertStatus
{
    /// <summary>
    /// 活跃
    /// </summary>
    Active = 1,
    
    /// <summary>
    /// 已确认
    /// </summary>
    Acknowledged = 2,
    
    /// <summary>
    /// 已解决
    /// </summary>
    Resolved = 3,
    
    /// <summary>
    /// 已忽略
    /// </summary>
    Ignored = 4
}
