using MongoDB.Bson.Serialization.Attributes;
using Platform.ServiceDefaults.Attributes;

namespace Platform.ServiceDefaults.Models;

/// <summary>
/// 邮件状态枚举
/// </summary>
public enum EmailStatus
{
    Pending = 0,
    Sending = 1,
    Sent = 2,
    Failed = 3
}

/// <summary>
/// 邮件发送日志
/// </summary>
[BsonCollectionName("emaillogs")]
public class EmailLog : BaseEntity
{
    /// <summary>
    /// 收件人地址
    /// </summary>
    [BsonElement("toEmail")]
    public string ToEmail { get; set; } = string.Empty;

    /// <summary>
    /// 邮件主题
    /// </summary>
    [BsonElement("subject")]
    public string Subject { get; set; } = string.Empty;

    /// <summary>
    /// 邮件正文 (HTML)
    /// </summary>
    [BsonElement("body")]
    public string Body { get; set; } = string.Empty;

    /// <summary>
    /// 发送状态
    /// </summary>
    [BsonElement("status")]
    public EmailStatus Status { get; set; } = EmailStatus.Pending;

    /// <summary>
    /// 错误信息 (如果发送失败)
    /// </summary>
    [BsonElement("errorMessage")]
    public string? ErrorMessage { get; set; }

    /// <summary>
    /// 实际发送时间
    /// </summary>
    [BsonElement("sentAt")]
    public DateTime? SentAt { get; set; }
}
