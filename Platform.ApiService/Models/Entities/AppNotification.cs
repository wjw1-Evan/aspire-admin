using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;
using Platform.ServiceDefaults.Models;
using System.Text.Json.Serialization;

namespace Platform.ApiService.Models.Entities;

/// <summary>
/// 新版应用通知实体
/// </summary>
public class AppNotification : MultiTenantEntity
{
    /// <summary>
    /// 接收者用户ID
    /// </summary>
    public string RecipientId { get; set; } = null!;

    /// <summary>
    /// 发送者用户ID (或 "System")
    /// </summary>
    public string SenderId { get; set; } = "System";

    /// <summary>
    /// 通知分类
    /// </summary>
    [BsonRepresentation(BsonType.String)]
    [JsonConverter(typeof(JsonStringEnumConverter))]
    public NotificationCategory Category { get; set; } = NotificationCategory.System;

    /// <summary>
    /// 提醒级别
    /// </summary>
    [BsonRepresentation(BsonType.String)]
    [JsonConverter(typeof(JsonStringEnumConverter))]
    public NotificationLevel Level { get; set; } = NotificationLevel.Info;

    /// <summary>
    /// 标题
    /// </summary>
    public string Title { get; set; } = null!;

    /// <summary>
    /// 内容 (支持 Markdown)
    /// </summary>
    public string? Content { get; set; }

    /// <summary>
    /// 跳转链接
    /// </summary>
    public string? ActionUrl { get; set; }

    /// <summary>
    /// 状态 (0=Unread, 1=Read, 2=Archived)
    /// </summary>
    public NotificationStatus Status { get; set; } = NotificationStatus.Unread;

    /// <summary>
    /// 业务元数据 (JSON)
    /// </summary>
    public Dictionary<string, string> Metadata { get; set; } = new();

    /// <summary>
    /// 读取时间
    /// </summary>
    public DateTime? ReadAt { get; set; }
}

public enum NotificationCategory
{
    System,
    Work,
    Social,
    Security
}

public enum NotificationLevel
{
    Info,
    Success,
    Warning,
    Error
}

public enum NotificationStatus
{
    Unread = 0,
    Read = 1,
    Archived = 2
}
