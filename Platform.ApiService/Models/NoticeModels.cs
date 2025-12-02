using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;
using Platform.ServiceDefaults.Models;
using System.Text.Json.Serialization;

namespace Platform.ApiService.Models;

/// <summary>
/// 通知图标项实体
/// </summary>
[BsonIgnoreExtraElements]
public class NoticeIconItem : ISoftDeletable, IEntity, ITimestamped, IMultiTenant
{
    /// <summary>
    /// 实体ID（MongoDB ObjectId）
    /// </summary>
    [BsonId]
    [BsonRepresentation(BsonType.ObjectId)]
    public string Id { get; set; } = string.Empty;

    /// <summary>
    /// 额外信息
    /// </summary>
    [BsonElement("extra")]
    public string? Extra { get; set; }

    /// <summary>
    /// 唯一键
    /// </summary>
    [BsonElement("key")]
    public string? Key { get; set; }

    /// <summary>
    /// 是否已读
    /// </summary>
    [BsonElement("read")]
    public bool Read { get; set; }

    /// <summary>
    /// 头像/图标URL
    /// </summary>
    [BsonElement("avatar")]
    public string? Avatar { get; set; }

    /// <summary>
    /// 标题
    /// </summary>
    [BsonElement("title")]
    public string? Title { get; set; }

    /// <summary>
    /// 状态
    /// </summary>
    [BsonElement("status")]
    public string? Status { get; set; }

    /// <summary>
    /// 日期时间
    /// </summary>
    [BsonElement("datetime")]
    public DateTime Datetime { get; set; }

    /// <summary>
    /// 描述
    /// </summary>
    [BsonElement("description")]
    public string? Description { get; set; }

    /// <summary>
    /// 通知类型（MongoDB 存储为字符串，JSON 序列化为字符串）
    /// </summary>
    [BsonElement("type")]
    [BsonRepresentation(BsonType.String)]  // MongoDB 存储为字符串
    [JsonConverter(typeof(JsonStringEnumConverter))]  // JSON 序列化为字符串
    public NoticeIconItemType Type { get; set; }

    /// <summary>
    /// 点击后是否关闭
    /// </summary>
    [BsonElement("clickClose")]
    public bool ClickClose { get; set; }

    /// <summary>
    /// 企业ID（多租户隔离）
    /// </summary>
    [BsonElement("companyId")]
    public string CompanyId { get; set; } = string.Empty;

    /// <summary>
    /// 创建时间
    /// </summary>
    [BsonElement("createdAt")]
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    /// <summary>
    /// 更新时间
    /// </summary>
    [BsonElement("updatedAt")]
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    /// <summary>
    /// 是否已删除（软删除）
    /// </summary>
    [BsonElement("isDeleted")]
    public bool IsDeleted { get; set; } = false;

    /// <summary>
    /// 删除时间
    /// </summary>
    [BsonElement("deletedAt")]
    public DateTime? DeletedAt { get; set; }

    /// <summary>
    /// 删除人ID
    /// </summary>
    [BsonElement("deletedBy")]
    public string? DeletedBy { get; set; }

    /// <summary>
    /// 删除原因
    /// </summary>
    [BsonElement("deletedReason")]
    public string? DeletedReason { get; set; }

    /// <summary>
    /// 关联的任务ID（用于任务相关通知）
    /// </summary>
    [BsonElement("taskId")]
    public string? TaskId { get; set; }

    /// <summary>
    /// 任务优先级（0=低, 1=中, 2=高, 3=紧急）
    /// </summary>
    [BsonElement("taskPriority")]
    public int? TaskPriority { get; set; }

    /// <summary>
    /// 任务状态（0=待分配, 1=已分配, 2=执行中, 3=已完成, 4=已取消, 5=失败, 6=暂停）
    /// </summary>
    [BsonElement("taskStatus")]
    public int? TaskStatus { get; set; }

    /// <summary>
    /// 是否为待办项（用于待办管理）
    /// </summary>
    [BsonElement("isTodo")]
    public bool IsTodo { get; set; } = false;

    /// <summary>
    /// 待办项优先级（0=低, 1=中, 2=高, 3=紧急）
    /// </summary>
    [BsonElement("todoPriority")]
    public int? TodoPriority { get; set; }

    /// <summary>
    /// 待办项截止日期
    /// </summary>
    [BsonElement("todoDueDate")]
    public DateTime? TodoDueDate { get; set; }

    /// <summary>
    /// 是否为系统消息
    /// </summary>
    [BsonElement("isSystemMessage")]
    public bool IsSystemMessage { get; set; } = false;

    /// <summary>
    /// 消息优先级（0=低, 1=中, 2=高, 3=紧急）
    /// </summary>
    [BsonElement("messagePriority")]
    public int? MessagePriority { get; set; }

    /// <summary>
    /// 相关用户ID列表（用于多人通知）
    /// </summary>
    [BsonElement("relatedUserIds")]
    public List<string> RelatedUserIds { get; set; } = new();

    /// <summary>
    /// 操作类型（如：task_assigned, task_completed, todo_created等）
    /// </summary>
    [BsonElement("actionType")]
    public string? ActionType { get; set; }
}

/// <summary>
/// 通知类型枚举
/// </summary>
public enum NoticeIconItemType
{
    /// <summary>
    /// 通知
    /// </summary>
    Notification,
    
    /// <summary>
    /// 消息
    /// </summary>
    Message,
    
    /// <summary>
    /// 事件/待办
    /// </summary>
    Event,
    
    /// <summary>
    /// 任务相关
    /// </summary>
    Task,
    
    /// <summary>
    /// 系统消息
    /// </summary>
    System
}

/// <summary>
/// 通知图标列表响应
/// </summary>
public class NoticeIconListResponse
{
    /// <summary>
    /// 通知图标数据列表
    /// </summary>
    public List<NoticeIconItem> Data { get; set; } = new();
    
    /// <summary>
    /// 总数
    /// </summary>
    public int Total { get; set; }
    
    /// <summary>
    /// 是否成功
    /// </summary>
    public bool Success { get; set; } = true;
}

/// <summary>
/// 创建通知请求
/// </summary>
public class CreateNoticeRequest
{
    /// <summary>
    /// 标题
    /// </summary>
    public string? Title { get; set; }
    
    /// <summary>
    /// 描述
    /// </summary>
    public string? Description { get; set; }
    
    /// <summary>
    /// 头像/图标
    /// </summary>
    public string? Avatar { get; set; }
    
    /// <summary>
    /// 状态
    /// </summary>
    public string? Status { get; set; }
    
    /// <summary>
    /// 额外信息
    /// </summary>
    public string? Extra { get; set; }
    
    /// <summary>
    /// 通知类型
    /// </summary>
    public NoticeIconItemType Type { get; set; }
    
    /// <summary>
    /// 点击后是否关闭
    /// </summary>
    public bool ClickClose { get; set; }
    
    /// <summary>
    /// 日期时间
    /// </summary>
    public DateTime? Datetime { get; set; }

    /// <summary>
    /// 关联的任务ID（用于任务相关通知）
    /// </summary>
    public string? TaskId { get; set; }

    /// <summary>
    /// 任务优先级（0=低, 1=中, 2=高, 3=紧急）
    /// </summary>
    public int? TaskPriority { get; set; }

    /// <summary>
    /// 任务状态（0=待分配, 1=已分配, 2=执行中, 3=已完成, 4=已取消, 5=失败, 6=暂停）
    /// </summary>
    public int? TaskStatus { get; set; }

    /// <summary>
    /// 是否为待办项（用于待办管理）
    /// </summary>
    public bool IsTodo { get; set; } = false;

    /// <summary>
    /// 待办项优先级（0=低, 1=中, 2=高, 3=紧急）
    /// </summary>
    public int? TodoPriority { get; set; }

    /// <summary>
    /// 待办项截止日期
    /// </summary>
    public DateTime? TodoDueDate { get; set; }

    /// <summary>
    /// 是否为系统消息
    /// </summary>
    public bool IsSystemMessage { get; set; } = false;

    /// <summary>
    /// 消息优先级（0=低, 1=中, 2=高, 3=紧急）
    /// </summary>
    public int? MessagePriority { get; set; }

    /// <summary>
    /// 相关用户ID列表（用于多人通知）
    /// </summary>
    public List<string> RelatedUserIds { get; set; } = new();

    /// <summary>
    /// 操作类型（如：task_assigned, task_completed, todo_created等）
    /// </summary>
    public string? ActionType { get; set; }
}

/// <summary>
/// 更新通知请求
/// </summary>
public class UpdateNoticeRequest
{
    /// <summary>
    /// 标题
    /// </summary>
    public string? Title { get; set; }
    
    /// <summary>
    /// 描述
    /// </summary>
    public string? Description { get; set; }
    
    /// <summary>
    /// 头像/图标
    /// </summary>
    public string? Avatar { get; set; }
    
    /// <summary>
    /// 状态
    /// </summary>
    public string? Status { get; set; }
    
    /// <summary>
    /// 额外信息
    /// </summary>
    public string? Extra { get; set; }
    
    /// <summary>
    /// 通知类型
    /// </summary>
    public NoticeIconItemType? Type { get; set; }
    
    /// <summary>
    /// 点击后是否关闭
    /// </summary>
    public bool? ClickClose { get; set; }
    
    /// <summary>
    /// 是否已读
    /// </summary>
    public bool? Read { get; set; }
    
    /// <summary>
    /// 日期时间
    /// </summary>
    public DateTime? Datetime { get; set; }

    /// <summary>
    /// 关联的任务ID（用于任务相关通知）
    /// </summary>
    public string? TaskId { get; set; }

    /// <summary>
    /// 任务优先级（0=低, 1=中, 2=高, 3=紧急）
    /// </summary>
    public int? TaskPriority { get; set; }

    /// <summary>
    /// 任务状态（0=待分配, 1=已分配, 2=执行中, 3=已完成, 4=已取消, 5=失败, 6=暂停）
    /// </summary>
    public int? TaskStatus { get; set; }

    /// <summary>
    /// 是否为待办项（用于待办管理）
    /// </summary>
    public bool? IsTodo { get; set; }

    /// <summary>
    /// 待办项优先级（0=低, 1=中, 2=高, 3=紧急）
    /// </summary>
    public int? TodoPriority { get; set; }

    /// <summary>
    /// 待办项截止日期
    /// </summary>
    public DateTime? TodoDueDate { get; set; }

    /// <summary>
    /// 是否为系统消息
    /// </summary>
    public bool? IsSystemMessage { get; set; }

    /// <summary>
    /// 消息优先级（0=低, 1=中, 2=高, 3=紧急）
    /// </summary>
    public int? MessagePriority { get; set; }

    /// <summary>
    /// 相关用户ID列表（用于多人通知）
    /// </summary>
    public List<string>? RelatedUserIds { get; set; }

    /// <summary>
    /// 操作类型（如：task_assigned, task_completed, todo_created等）
    /// </summary>
    public string? ActionType { get; set; }
}
