using MongoDB.Bson.Serialization.Attributes;

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
public class EmailLog : BaseEntity
{
    /// <summary>
    /// 收件人地址
    /// </summary>
    public string ToEmail { get; set; } = string.Empty;

    /// <summary>
    /// 邮件主题
    /// </summary>
    public string Subject { get; set; } = string.Empty;

    /// <summary>
    /// 邮件正文 (HTML)
    /// </summary>
    public string Body { get; set; } = string.Empty;

    /// <summary>
    /// 发送状态
    /// </summary>
    public EmailStatus Status { get; set; } = EmailStatus.Pending;

    /// <summary>
    /// 错误信息 (如果发送失败)
    /// </summary>
    public string? ErrorMessage { get; set; }

    /// <summary>
    /// 实际发送时间
    /// </summary>
    public DateTime? SentAt { get; set; }
}
