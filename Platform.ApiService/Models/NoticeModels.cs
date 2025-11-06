using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;
using Platform.ServiceDefaults.Models;
using System.Text.Json.Serialization;

namespace Platform.ApiService.Models;

/// <summary>
/// 通知图标项实体
/// </summary>
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
    Event
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
}
