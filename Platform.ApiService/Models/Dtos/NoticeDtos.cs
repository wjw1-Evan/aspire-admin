namespace Platform.ApiService.Models;

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

    public string? TaskId { get; set; }

    public int? TaskPriority { get; set; }

    public int? TaskStatus { get; set; }

    public bool IsTodo { get; set; } = false;

    public int? TodoPriority { get; set; }

    public DateTime? TodoDueDate { get; set; }

    public bool IsSystemMessage { get; set; } = false;

    public int? MessagePriority { get; set; }

    public List<string> RelatedUserIds { get; set; } = new();

    public string? ActionType { get; set; }
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

    public string? TaskId { get; set; }

    public int? TaskPriority { get; set; }

    public int? TaskStatus { get; set; }

    public bool? IsTodo { get; set; }

    public int? TodoPriority { get; set; }

    public DateTime? TodoDueDate { get; set; }

    public bool? IsSystemMessage { get; set; }

    public int? MessagePriority { get; set; }

    public List<string>? RelatedUserIds { get; set; }

    public string? ActionType { get; set; }
}