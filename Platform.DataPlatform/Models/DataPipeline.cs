using MongoDB.Bson.Serialization.Attributes;
using Platform.ServiceDefaults.Models;
using System.ComponentModel.DataAnnotations;

namespace Platform.DataPlatform.Models;

/// <summary>
/// 数据管道状态枚举
/// </summary>
public enum PipelineStatus
{
    /// <summary>
    /// 草稿
    /// </summary>
    Draft = 1,
    
    /// <summary>
    /// 活跃
    /// </summary>
    Active = 2,
    
    /// <summary>
    /// 暂停
    /// </summary>
    Paused = 3,
    
    /// <summary>
    /// 错误
    /// </summary>
    Error = 4,
    
    /// <summary>
    /// 运行中
    /// </summary>
    Running = 5
}

/// <summary>
/// 调度策略枚举
/// </summary>
public enum ScheduleStrategy
{
    /// <summary>
    /// 手动触发
    /// </summary>
    Manual = 1,
    
    /// <summary>
    /// 定时调度
    /// </summary>
    Scheduled = 2,
    
    /// <summary>
    /// 事件触发
    /// </summary>
    EventTriggered = 3,
    
    /// <summary>
    /// 实时流处理
    /// </summary>
    RealTime = 4
}

/// <summary>
/// 数据管道实体
/// </summary>
public class DataPipeline : DataPlatformMultiTenantEntity, INamedEntity
{
    [BsonElement("name")]
    [Required(ErrorMessage = "管道名称不能为空")]
    [StringLength(100, ErrorMessage = "管道名称长度不能超过100个字符")]
    public string Name { get; set; } = string.Empty;

    [BsonElement("title")]
    [Required(ErrorMessage = "管道标题不能为空")]
    [StringLength(200, ErrorMessage = "管道标题长度不能超过200个字符")]
    public string Title { get; set; } = string.Empty;

    [BsonElement("description")]
    [StringLength(1000, ErrorMessage = "描述长度不能超过1000个字符")]
    public string? Description { get; set; }

    [BsonElement("sourceDataSourceId")]
    [Required(ErrorMessage = "源数据源ID不能为空")]
    public string SourceDataSourceId { get; set; } = string.Empty;

    [BsonElement("targetDataSourceId")]
    [Required(ErrorMessage = "目标数据源ID不能为空")]
    public string TargetDataSourceId { get; set; } = string.Empty;

    [BsonElement("sourceTable")]
    [Required(ErrorMessage = "源表名不能为空")]
    public string SourceTable { get; set; } = string.Empty;

    [BsonElement("targetTable")]
    [Required(ErrorMessage = "目标表名不能为空")]
    public string TargetTable { get; set; } = string.Empty;

    [BsonElement("scheduleStrategy")]
    public ScheduleStrategy ScheduleStrategy { get; set; } = ScheduleStrategy.Manual;

    [BsonElement("cronExpression")]
    public string? CronExpression { get; set; }

    [BsonElement("status")]
    public PipelineStatus Status { get; set; } = PipelineStatus.Draft;

    [BsonElement("isEnabled")]
    public bool IsEnabled { get; set; } = true;

    [BsonElement("executionCount")]
    public long ExecutionCount { get; set; } = 0;

    [BsonElement("lastExecutedAt")]
    [BsonDateTimeOptions(Kind = DateTimeKind.Utc)]
    public DateTime? LastExecutedAt { get; set; }

    [BsonElement("nextExecutionAt")]
    [BsonDateTimeOptions(Kind = DateTimeKind.Utc)]
    public DateTime? NextExecutionAt { get; set; }

    [BsonElement("lastErrorMessage")]
    public string? LastErrorMessage { get; set; }

    [BsonElement("averageExecutionTime")]
    public TimeSpan? AverageExecutionTime { get; set; }

    [BsonElement("transformRules")]
    public List<TransformRule> TransformRules { get; set; } = new();

    [BsonElement("qualityRules")]
    public List<string> QualityRuleIds { get; set; } = new();

    [BsonElement("tags")]
    public List<string> Tags { get; set; } = new();

    [BsonElement("metadata")]
    public Dictionary<string, object> Metadata { get; set; } = new();
}

/// <summary>
/// 数据转换规则
/// </summary>
public class TransformRule
{
    [BsonElement("id")]
    public string Id { get; set; } = Guid.NewGuid().ToString();

    [BsonElement("name")]
    [Required(ErrorMessage = "规则名称不能为空")]
    public string Name { get; set; } = string.Empty;

    [BsonElement("description")]
    public string? Description { get; set; }

    [BsonElement("sourceField")]
    [Required(ErrorMessage = "源字段不能为空")]
    public string SourceField { get; set; } = string.Empty;

    [BsonElement("targetField")]
    [Required(ErrorMessage = "目标字段不能为空")]
    public string TargetField { get; set; } = string.Empty;

    [BsonElement("transformType")]
    public TransformRuleType TransformType { get; set; }

    [BsonElement("expression")]
    public string? Expression { get; set; }

    [BsonElement("parameters")]
    public Dictionary<string, object> Parameters { get; set; } = new();

    [BsonElement("isEnabled")]
    public bool IsEnabled { get; set; } = true;

    [BsonElement("order")]
    public int Order { get; set; } = 0;
}

/// <summary>
/// 转换规则类型枚举
/// </summary>
public enum TransformRuleType
{
    /// <summary>
    /// 直接映射
    /// </summary>
    DirectMapping = 1,
    
    /// <summary>
    /// 表达式转换
    /// </summary>
    Expression = 2,
    
    /// <summary>
    /// 函数转换
    /// </summary>
    Function = 3,
    
    /// <summary>
    /// 条件转换
    /// </summary>
    Conditional = 4,
    
    /// <summary>
    /// 聚合转换
    /// </summary>
    Aggregation = 5
}

/// <summary>
/// 创建数据管道请求
/// </summary>
public class CreateDataPipelineRequest
{
    [Required]
    public string Name { get; set; } = string.Empty;

    [Required]
    public string Title { get; set; } = string.Empty;

    public string? Description { get; set; }

    [Required]
    public string SourceDataSourceId { get; set; } = string.Empty;

    [Required]
    public string TargetDataSourceId { get; set; } = string.Empty;

    [Required]
    public string SourceTable { get; set; } = string.Empty;

    [Required]
    public string TargetTable { get; set; } = string.Empty;

    public ScheduleStrategy ScheduleStrategy { get; set; } = ScheduleStrategy.Manual;

    public string? CronExpression { get; set; }

    public List<TransformRule> TransformRules { get; set; } = new();

    public List<string> QualityRuleIds { get; set; } = new();

    public List<string> Tags { get; set; } = new();

    public Dictionary<string, object> Metadata { get; set; } = new();
}

/// <summary>
/// 更新数据管道请求
/// </summary>
public class UpdateDataPipelineRequest : CreateDataPipelineRequest
{
    [Required]
    public string Id { get; set; } = string.Empty;
}

/// <summary>
/// 执行数据管道请求
/// </summary>
public class ExecutePipelineRequest
{
    [Required]
    public string PipelineId { get; set; } = string.Empty;

    public bool ForceExecution { get; set; } = false;

    public Dictionary<string, object> Parameters { get; set; } = new();
}

/// <summary>
/// 管道执行结果
/// </summary>
public class PipelineExecutionResult
{
    public string PipelineId { get; set; } = string.Empty;

    public string ExecutionId { get; set; } = string.Empty;

    public bool IsSuccess { get; set; }

    public string? ErrorMessage { get; set; }

    public DateTime StartTime { get; set; } = DateTime.UtcNow;

    public DateTime? EndTime { get; set; }

    public TimeSpan? Duration => EndTime - StartTime;

    public long RecordsProcessed { get; set; }

    public long RecordsFailed { get; set; }

    public Dictionary<string, object> Metadata { get; set; } = new();
}