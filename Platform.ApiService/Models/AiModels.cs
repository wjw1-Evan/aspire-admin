using System.ComponentModel.DataAnnotations;

namespace Platform.ApiService.Models;

/// <summary>
/// 智能回复请求模型。
/// </summary>
public class AiSmartReplyRequest
{
    /// <summary>
    /// 会话标识。
    /// </summary>
    [Required]
    public string SessionId { get; set; } = string.Empty;

    /// <summary>
    /// 请求发起者用户标识。
    /// </summary>
    [Required]
    public string UserId { get; set; } = string.Empty;

    /// <summary>
    /// 对话上下文（按时间倒序，最新的在最后）。
    /// </summary>
    public List<string>? ConversationContext { get; set; }
        = new();

    /// <summary>
    /// 最近一条消息的标识。
    /// </summary>
    public string? LastMessageId { get; set; }
        = default;

    /// <summary>
    /// 用户首选语言。
    /// </summary>
    public string? Locale { get; set; }
        = "zh-CN";
}

/// <summary>
/// 智能回复候选项。
/// </summary>
public class AiSuggestionItem
{
    /// <summary>
    /// 候选标识。
    /// </summary>
    public string Id { get; set; } = Guid.NewGuid().ToString("N");

    /// <summary>
    /// 建议内容。
    /// </summary>
    public string Content { get; set; } = string.Empty;

    /// <summary>
    /// 建议来源。
    /// </summary>
    public string Source { get; set; } = "smart-reply";

    /// <summary>
    /// 置信度（0-1，可选）。
    /// </summary>
    public double? Confidence { get; set; }
        = default;

    /// <summary>
    /// 生成时间。
    /// </summary>
    public DateTime GeneratedAt { get; set; } = DateTime.UtcNow;

    /// <summary>
    /// 附加元数据。
    /// </summary>
    public Dictionary<string, object>? Metadata { get; set; }
        = default;
}

/// <summary>
/// 智能回复响应。
/// </summary>
public class AiSuggestionResponse
{
    /// <summary>
    /// 建议列表。
    /// </summary>
    public List<AiSuggestionItem> Suggestions { get; set; } = new();

    /// <summary>
    /// 生成时间。
    /// </summary>
    public DateTime GeneratedAt { get; set; } = DateTime.UtcNow;

    /// <summary>
    /// 生成耗时（毫秒，可选）。
    /// </summary>
    public int? LatencyMs { get; set; }
        = default;
}

