using Platform.ServiceDefaults.Models;
using System.Text.Json.Serialization;

namespace Platform.ApiService.Models.Entities;

public class NotificationSendRecord : MultiTenantEntity
{
    public string Title { get; set; } = null!;

    public string Content { get; set; } = null!;

    [JsonConverter(typeof(JsonStringEnumConverter))]
    public NotificationCategory Category { get; set; } = NotificationCategory.System;

    [JsonConverter(typeof(JsonStringEnumConverter))]
    public NotificationLevel Level { get; set; } = NotificationLevel.Info;

    public string? ActionUrl { get; set; }

    public string SenderId { get; set; } = null!;

    public string SenderName { get; set; } = null!;

    [JsonConverter(typeof(JsonStringEnumConverter))]
    public SendTargetType TargetType { get; set; }

    public List<string>? RecipientIds { get; set; }

    public int RecipientCount { get; set; }

    public int SuccessCount { get; set; }

    public int FailCount { get; set; }

    [JsonConverter(typeof(JsonStringEnumConverter))]
    public SendJobStatus Status { get; set; } = SendJobStatus.Pending;

    public string? ErrorMessage { get; set; }

    public List<RecipientSendDetail>? RecipientDetails { get; set; }
}

public class RecipientSendDetail
{
    public string UserId { get; set; } = null!;
    public string UserName { get; set; } = null!;
    public string? DisplayName { get; set; }
    public bool IsSent { get; set; }
    public bool IsRead { get; set; }
    public DateTime? ReadAt { get; set; }
    public string? ErrorMessage { get; set; }
}

public enum SendTargetType
{
    Specific,
    All
}

public enum SendJobStatus
{
    Pending,
    Sending,
    Sent,
    PartialFailed,
    Failed
}
