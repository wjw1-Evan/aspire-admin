using System.Collections.Generic;
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
    /// 具有角色标识的对话历史（按时间倒序，最新的在最后）。
    /// </summary>
    public List<AiConversationMessage>? ConversationMessages { get; set; }
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
/// 带角色的对话消息。
/// </summary>
public class AiConversationMessage
{
    /// <summary>
    /// 消息角色（user/assistant/system）。
    /// </summary>
    [Required]
    [RegularExpression("^(user|assistant|system)$", ErrorMessage = "Role 必须是 user、assistant 或 system")]
    public string Role { get; set; } = "user";

    /// <summary>
    /// 消息内容。
    /// </summary>
    [Required]
    [MinLength(1)]
    public string Content { get; set; } = string.Empty;
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
    /// 建议所属类别（例如：延续话题、追问细节等）。
    /// </summary>
    public string? Category { get; set; }
        = default;

    /// <summary>
    /// 建议的语气风格摘要（如：轻松幽默、真诚共情）。
    /// </summary>
    public string? Style { get; set; }
        = default;

    /// <summary>
    /// 给用户的简短提示或意图说明。
    /// </summary>
    public string? QuickTip { get; set; }
        = default;

    /// <summary>
    /// 额外的洞察或生成原因说明。
    /// </summary>
    public string? Insight { get; set; }
        = default;

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
/// 智能回复结果。
/// </summary>
public class AiSuggestionResponse
{
    /// <summary>
    /// 推荐列表。
    /// </summary>
    public List<AiSuggestionItem> Suggestions { get; set; } = new();

    /// <summary>
    /// 生成时间。
    /// </summary>
    public DateTime GeneratedAt { get; set; } = DateTime.UtcNow;

    /// <summary>
    /// 耗时（毫秒）。
    /// </summary>
    public int? LatencyMs { get; set; }

    /// <summary>
    /// 提示信息。
    /// </summary>
    public string? Notice { get; set; }
}

/// <summary>
/// AI 好友匹配请求参数。
/// </summary>
public class MatchSuggestionRequest
{
    /// <summary>
    /// 当前用户标识。
    /// </summary>
    [Required]
    public string UserId { get; set; } = string.Empty;

    /// <summary>
    /// 当前纬度。
    /// </summary>
    public double? Latitude { get; set; }
        = default;

    /// <summary>
    /// 当前经度。
    /// </summary>
    public double? Longitude { get; set; }
        = default;

    /// <summary>
    /// 感兴趣的标签列表。
    /// </summary>
    public List<string>? Interests { get; set; }
        = new();

    /// <summary>
    /// 返回结果数量上限。
    /// </summary>
    [Range(1, 50)]
    public int? Limit { get; set; }
        = default;
}

/// <summary>
/// AI 匹配推荐响应。
/// </summary>
public class MatchSuggestionResponse
{
    /// <summary>
    /// 推荐条目列表。
    /// </summary>
    public List<MatchSuggestionItem> Items { get; set; } = new();

    /// <summary>
    /// 生成时间（UTC）。
    /// </summary>
    public DateTime GeneratedAt { get; set; } = DateTime.UtcNow;
}

/// <summary>
/// AI 匹配推荐条目。
/// </summary>
public class MatchSuggestionItem
{
    /// <summary>
    /// 目标用户标识。
    /// </summary>
    [Required]
    public string UserId { get; set; } = string.Empty;

    /// <summary>
    /// 展示名称。
    /// </summary>
    [Required]
    public string DisplayName { get; set; } = string.Empty;

    /// <summary>
    /// 头像地址。
    /// </summary>
    public string? AvatarUrl { get; set; }
        = default;

    /// <summary>
    /// 共同兴趣。
    /// </summary>
    public List<string>? SharedInterests { get; set; }
        = new();

    /// <summary>
    /// 匹配得分（0-1）。
    /// </summary>
    [Range(0, 1)]
    public double MatchScore { get; set; }
        = 0.5d;

    /// <summary>
    /// 简介或推荐语。
    /// </summary>
    public string? Bio { get; set; }
        = default;

    /// <summary>
    /// 位置描述。
    /// </summary>
    public string? LocationTagline { get; set; }
        = default;

    /// <summary>
    /// 已存在的会话标识（若存在）。
    /// </summary>
    public string? SessionId { get; set; }
        = default;
}

/// <summary>
/// 定义向内置助手请求流式回复的参数。
/// </summary>
public class AssistantReplyStreamRequest
{
    /// <summary>
    /// 会话标识。
    /// </summary>
    [Required]
    public string SessionId { get; set; } = string.Empty;

    /// <summary>
    /// 触发回复的消息标识。
    /// </summary>
    public string? TriggerMessageId { get; set; }
        = default;

    /// <summary>
    /// 触发消息的客户端标识（SignalR 场景下兜底）。
    /// </summary>
    public string? TriggerClientMessageId { get; set; }
        = default;

    /// <summary>
    /// 本地占位消息使用的客户端标识。
    /// </summary>
    [Required]
    public string ClientMessageId { get; set; } = string.Empty;

    /// <summary>
    /// 用户首选语言（可选）。
    /// </summary>
    public string? Locale { get; set; }
        = "zh-CN";
}

/// <summary>
/// 描述助手流式回复的片段。
/// </summary>
public class AssistantReplyStreamChunk
{
    /// <summary>
    /// 片段类型：delta/complete/error。
    /// </summary>
    public string Type { get; set; } = string.Empty;

    /// <summary>
    /// 文本增量内容（仅 delta 时可用）。
    /// </summary>
    public string? Text { get; set; }
        = default;

    /// <summary>
    /// 完整的助手回复消息（complete 时可用）。
    /// </summary>
    public ChatMessage? Message { get; set; }
        = default;

    /// <summary>
    /// 错误信息（error 时可用）。
    /// </summary>
    public string? Error { get; set; }
        = default;

    /// <summary>
    /// 服务器时间戳。
    /// </summary>
    public DateTime Timestamp { get; set; } = DateTime.UtcNow;
}

