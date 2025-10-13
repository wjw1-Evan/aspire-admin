using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;
using System.Text.Json.Serialization;

namespace Platform.ApiService.Models;

public class NoticeIconItem : ISoftDeletable, IEntity, ITimestamped
{
    [BsonId]
    [BsonRepresentation(BsonType.ObjectId)]
    public string? Id { get; set; }

    [BsonElement("extra")]
    public string? Extra { get; set; }

    [BsonElement("key")]
    public string? Key { get; set; }

    [BsonElement("read")]
    public bool Read { get; set; }

    [BsonElement("avatar")]
    public string? Avatar { get; set; }

    [BsonElement("title")]
    public string? Title { get; set; }

    [BsonElement("status")]
    public string? Status { get; set; }

    [BsonElement("datetime")]
    public DateTime Datetime { get; set; }

    [BsonElement("description")]
    public string? Description { get; set; }

    [BsonElement("type")]
    [BsonRepresentation(BsonType.String)]  // MongoDB 存储为字符串
    [JsonConverter(typeof(JsonStringEnumConverter))]  // JSON 序列化为字符串
    public NoticeIconItemType Type { get; set; }

    [BsonElement("clickClose")]
    public bool ClickClose { get; set; }

    [BsonElement("createdAt")]
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    [BsonElement("updatedAt")]
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    // 软删除字段
    [BsonElement("isDeleted")]
    public bool IsDeleted { get; set; } = false;

    [BsonElement("deletedAt")]
    public DateTime? DeletedAt { get; set; }

    [BsonElement("deletedBy")]
    public string? DeletedBy { get; set; }

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

public class NoticeIconListResponse
{
    public List<NoticeIconItem> Data { get; set; } = new();
    public int Total { get; set; }
    public bool Success { get; set; } = true;
}

public class CreateNoticeRequest
{
    public string? Title { get; set; }
    public string? Description { get; set; }
    public string? Avatar { get; set; }
    public string? Status { get; set; }
    public string? Extra { get; set; }
    public NoticeIconItemType Type { get; set; }
    public bool ClickClose { get; set; }
    public DateTime? Datetime { get; set; }
}

public class UpdateNoticeRequest
{
    public string? Title { get; set; }
    public string? Description { get; set; }
    public string? Avatar { get; set; }
    public string? Status { get; set; }
    public string? Extra { get; set; }
    public NoticeIconItemType? Type { get; set; }
    public bool? ClickClose { get; set; }
    public bool? Read { get; set; }
    public DateTime? Datetime { get; set; }
}
