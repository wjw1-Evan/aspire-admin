using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;
using Platform.ServiceDefaults.Attributes;
using Platform.ServiceDefaults.Models;
using System.ComponentModel.DataAnnotations;

namespace Platform.ApiService.Models;

/// <summary>
/// AI 智能体执行状态枚举
/// </summary>
public enum AiAgentRunStatus
{
    /// <summary> 已进入队列 </summary>
    Queued = 0,
    /// <summary> 规划中 </summary>
    Planning = 1,
    /// <summary> 执行中 </summary>
    Executing = 2,
    /// <summary> 已完成 </summary>
    Finished = 3,
    /// <summary> 已失败 </summary>
    Failed = 4,
    /// <summary> 已取消 </summary>
    Cancelled = 5
}

/// <summary>
/// AI 智能体单次运行记录实体
/// </summary>
[BsonCollectionName("aiAgentRuns")]
public class AiAgentRun : MultiTenantEntity
{
    /// <summary>
    /// 关联的智能体 ID
    /// </summary>
    [BsonElement("agentId")]
    [Required]
    public string AgentId { get; set; } = string.Empty;

    /// <summary>
    /// 本次执行的目标/指令
    /// </summary>
    [BsonElement("goal")]
    [Required]
    public string Goal { get; set; } = string.Empty;

    /// <summary>
    /// 执行状态
    /// </summary>
    [BsonElement("status")]
    [BsonRepresentation(BsonType.Int32)]
    public AiAgentRunStatus Status { get; set; } = AiAgentRunStatus.Queued;

    /// <summary>
    /// 思考链日志 (Chain of Thought / Trace)
    /// </summary>
    [BsonElement("logs")]
    public List<AiAgentStepLog> Logs { get; set; } = [];

    /// <summary>
    /// 最终输出结果
    /// </summary>
    [BsonElement("finalOutput")]
    public string? FinalOutput { get; set; }

    /// <summary>
    /// 错误信息（如果状态为 Failed）
    /// </summary>
    [BsonElement("errorMessage")]
    public string? ErrorMessage { get; set; }
}

/// <summary>
/// 智能体执行中间步骤日志
/// </summary>
public class AiAgentStepLog
{
    /// <summary> 时间戳 </summary>
    public DateTime Timestamp { get; set; } = DateTime.UtcNow;

    /// <summary>
    /// 类型：Thought, Action, Observation
    /// </summary>
    public string Type { get; set; } = string.Empty;

    /// <summary>
    /// 内容详情
    /// </summary>
    public string Content { get; set; } = string.Empty;
}
