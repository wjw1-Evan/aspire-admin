using Platform.ApiService.Models.Entities;

namespace Platform.ApiService.Models.DTOs;

public class AdminSendRequest
{
    public List<string> RecipientIds { get; set; } = new();
    public string Title { get; set; } = null!;
    public string Content { get; set; } = null!;
    public NotificationCategory Category { get; set; } = NotificationCategory.System;
    public NotificationLevel Level { get; set; } = NotificationLevel.Info;
    public string? ActionUrl { get; set; }
}

public class AdminBroadcastRequest
{
    public string Title { get; set; } = null!;
    public string Content { get; set; } = null!;
    public NotificationCategory Category { get; set; } = NotificationCategory.System;
    public NotificationLevel Level { get; set; } = NotificationLevel.Info;
    public string? ActionUrl { get; set; }
}

public class NotificationSendRecordDto
{
    public string Id { get; set; } = null!;
    public string Title { get; set; } = null!;
    public string Content { get; set; } = null!;
    public string Category { get; set; } = null!;
    public string Level { get; set; } = null!;
    public string? ActionUrl { get; set; }
    public string SenderId { get; set; } = null!;
    public string SenderName { get; set; } = null!;
    public string TargetType { get; set; } = null!;
    public int RecipientCount { get; set; }
    public int SuccessCount { get; set; }
    public int FailCount { get; set; }
    public string Status { get; set; } = null!;
    public string? ErrorMessage { get; set; }
    public DateTime CreatedAt { get; set; }
    public List<string>? RecipientIds { get; set; }
}

public class NotificationSendDetailDto : NotificationSendRecordDto
{
    public int ReadCount { get; set; }
    public int UnreadCount { get; set; }
    public List<RecipientReadStatusDto>? RecipientStatus { get; set; }
}

public class NotificationManageStatisticsDto
{
    public int TotalSent { get; set; }
    public int TotalSuccess { get; set; }
    public int TotalFailed { get; set; }
    public int TotalRecipients { get; set; }
    public int TotalBroadcasts { get; set; }
}

public class RecipientReadStatusDto
{
    public string UserId { get; set; } = null!;
    public string UserName { get; set; } = null!;
    public string? DisplayName { get; set; }
    public bool IsSent { get; set; }
    public bool IsRead { get; set; }
    public DateTime? ReadAt { get; set; }
    public string? ErrorMessage { get; set; }
}
