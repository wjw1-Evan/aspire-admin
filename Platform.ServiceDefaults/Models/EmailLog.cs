using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;
using System.ComponentModel.DataAnnotations.Schema;

namespace Platform.ServiceDefaults.Models;

/// <summary>
/// 邮件状态枚举
/// </summary>
public enum EmailStatus
{
    /// <summary>
    /// 待发送
    /// </summary>
    Pending = 0,

    /// <summary>
    /// 发送中
    /// </summary>
    Sending = 1,

    /// <summary>
    /// 已发送
    /// </summary>
    Sent = 2,

    /// <summary>
    /// 发送失败
    /// </summary>
    Failed = 3
}

/// <summary>
/// 邮件发送日志
/// </summary>
[Table("emaillogs")]
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
