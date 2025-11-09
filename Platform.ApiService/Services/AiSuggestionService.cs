using System.Collections.Generic;
using System.Diagnostics;
using System.Linq;
using System.Text.Json;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using MongoDB.Driver;
using OpenAI;
using OpenAI.Chat;
using Platform.ApiService.Constants;
using Platform.ApiService.Extensions;
using Platform.ApiService.Models;
using Platform.ServiceDefaults.Services;
using DomainChatMessage = Platform.ApiService.Models.ChatMessage;
using OpenAiChatMessage = OpenAI.Chat.ChatMessage;

namespace Platform.ApiService.Services;

/// <summary>
/// AI 建议服务接口。
/// </summary>
public interface IAiSuggestionService
{
    /// <summary>
    /// 生成智能回复候选列表。
    /// </summary>
    /// <param name="request">请求参数。</param>
    /// <param name="currentUserId">当前用户标识。</param>
    /// <param name="cancellationToken">取消标识。</param>
    /// <returns>智能回复结果。</returns>
    Task<AiSuggestionResponse> GetSmartRepliesAsync(
        AiSmartReplyRequest request,
        string currentUserId,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// 获取 AI 匹配推荐列表。
    /// </summary>
    /// <param name="request">匹配请求参数。</param>
    /// <param name="currentUserId">当前用户标识。</param>
    /// <returns>推荐结果。</returns>
    /// <exception cref="UnauthorizedAccessException">当尝试为其他用户获取推荐时抛出。</exception>
    Task<MatchSuggestionResponse> GetMatchSuggestionsAsync(
        MatchSuggestionRequest request,
        string currentUserId);
}

/// <summary>
/// 基于 OpenAI 的智能回复服务实现。
/// </summary>
public class AiSuggestionService : IAiSuggestionService
{
    private const int DefaultSuggestionCount = 2;
    private const string SmartReplySource = "smart-reply";
    private const string DefaultSuggestionNotice = "小科暂时没有生成推荐，请稍后再试或尝试调整话题。";
    private const string DefaultSystemPrompt = "你是小科，担任微信风格的对话助理，请使用简体中文，提供自然、真诚且有温度的建议。";

    private readonly IDatabaseOperationFactory<ChatSession> _sessionFactory;
    private readonly IDatabaseOperationFactory<DomainChatMessage> _messageFactory;
    private readonly IDatabaseOperationFactory<AppUser> _userFactory;
    private readonly OpenAIClient _openAiClient;
    private readonly AiCompletionOptions _aiOptions;
    private readonly ILogger<AiSuggestionService> _logger;

    /// <summary>
    /// 初始化 <see cref="AiSuggestionService"/>。
    /// </summary>
    public AiSuggestionService(
        IDatabaseOperationFactory<ChatSession> sessionFactory,
        IDatabaseOperationFactory<DomainChatMessage> messageFactory,
        IDatabaseOperationFactory<AppUser> userFactory,
        OpenAIClient openAiClient,
        IOptions<AiCompletionOptions> aiOptions,
        ILogger<AiSuggestionService> logger)
    {
        _sessionFactory = sessionFactory;
        _messageFactory = messageFactory;
        _userFactory = userFactory;
        _openAiClient = openAiClient;
        _aiOptions = aiOptions.Value;
        _logger = logger;
    }

    /// <inheritdoc />
    public async Task<AiSuggestionResponse> GetSmartRepliesAsync(
        AiSmartReplyRequest request,
        string currentUserId,
        CancellationToken cancellationToken = default)
    {
        var context = await PrepareSmartReplyContextAsync(request, currentUserId);
        var response = new AiSuggestionResponse();

        var chatClient = ResolveChatClient(context, response, out var model);
        if (chatClient is null)
        {
            return response;
        }

        var languageTag = ResolveLanguageTag(context.Request.Locale);
        var instruction = BuildInstruction(ResolveSystemPrompt(), languageTag);
        var userContent = context.ContextLines.Count == 0
            ? "（上下文为空）"
            : string.Join("\n", context.ContextLines);
        var messages = BuildChatMessages(instruction, context.ConversationMessages, userContent);
        var completionOptions = BuildCompletionOptions(currentUserId);

        var completionAttempt = await CompleteChatAsync(
            chatClient,
            messages,
            completionOptions,
            context.ContextLines,
            cancellationToken);

        response.LatencyMs = completionAttempt.LatencyMs;

        if (completionAttempt.Suggestions != null)
        {
            AssignSuggestions(response, completionAttempt.Suggestions);
            return response;
        }

        HandleCompletionResponse(response, completionAttempt.Completion, model, context.ContextLines);
        return response;
    }

    /// <summary>
    /// 基于兴趣偏好和历史会话生成匹配推荐列表。
    /// </summary>
    /// <param name="request">匹配请求参数。</param>
    /// <param name="currentUserId">当前用户标识。</param>
    /// <returns>匹配推荐结果。</returns>
    /// <exception cref="UnauthorizedAccessException">当尝试为其他用户获取推荐时抛出。</exception>
    public async Task<MatchSuggestionResponse> GetMatchSuggestionsAsync(
        MatchSuggestionRequest request,
        string currentUserId)
    {
        request = NormalizeMatchRequest(request, currentUserId);

        var tenantCompanyId = _sessionFactory.GetRequiredCompanyId();
        var interestKeywords = BuildInterestKeywords(request);
        var limit = NormalizeLimit(request.Limit);

        var sessionMap = await BuildSessionMapAsync(currentUserId, tenantCompanyId);

        var userFilter = _userFactory.CreateFilterBuilder()
            .Equal(user => user.IsActive, true)
            .Equal(user => user.CurrentCompanyId, tenantCompanyId)
            .Build();

        var candidateUsers = await _userFactory.FindAsync(userFilter);
        var suggestions = BuildMatchSuggestions(candidateUsers, currentUserId, interestKeywords, sessionMap, limit);

        return new MatchSuggestionResponse
        {
            Items = suggestions,
            GeneratedAt = DateTime.UtcNow
        };
    }

    private MatchSuggestionRequest NormalizeMatchRequest(MatchSuggestionRequest request, string currentUserId)
    {
        request = request.EnsureNotNull(nameof(request));
        if (string.IsNullOrWhiteSpace(request.UserId))
        {
            request.UserId = currentUserId;
        }

        if (!string.Equals(request.UserId, currentUserId, StringComparison.Ordinal))
        {
            _logger.LogWarning("用户 {UserId} 尝试为 {TargetUserId} 请求匹配推荐，被拒绝", currentUserId, request.UserId);
            throw new UnauthorizedAccessException("禁止为其他用户请求匹配推荐");
        }

        return request;
    }

    private static HashSet<string> BuildInterestKeywords(MatchSuggestionRequest request)
    {
        return (request.Interests ?? new List<string>())
            .Where(tag => !string.IsNullOrWhiteSpace(tag))
            .Select(tag => tag.Trim().ToLowerInvariant())
            .Where(tag => tag.Length > 0)
            .Distinct()
            .ToHashSet();
    }

    private static int NormalizeLimit(int? limit) => Math.Clamp(limit ?? 10, 1, 50);

    private async Task<Dictionary<string, string>> BuildSessionMapAsync(string currentUserId, string tenantCompanyId)
    {
        var sessionFilter = Builders<ChatSession>.Filter.And(
            Builders<ChatSession>.Filter.AnyEq(session => session.Participants, currentUserId),
            Builders<ChatSession>.Filter.Eq(session => session.CompanyId, tenantCompanyId));

        var sessionSort = _sessionFactory.CreateSortBuilder()
            .Descending(session => session.UpdatedAt)
            .Build();

        var sessions = await _sessionFactory.FindAsync(sessionFilter, sessionSort, limit: 50);

        var sessionMap = new Dictionary<string, string>();
        foreach (var session in sessions)
        {
            if (session.Participants == null)
            {
                continue;
            }

            foreach (var participant in session.Participants)
            {
                if (IsCurrentOrAssistant(participant, currentUserId))
                {
                    continue;
                }

                if (!string.IsNullOrEmpty(session.Id) && !sessionMap.ContainsKey(participant))
                {
                    sessionMap[participant] = session.Id;
                }
            }
        }

        return sessionMap;
    }

    private static bool IsCurrentOrAssistant(string participant, string currentUserId) =>
        string.Equals(participant, currentUserId, StringComparison.Ordinal) ||
        string.Equals(participant, AiAssistantConstants.AssistantUserId, StringComparison.Ordinal);

    private List<MatchSuggestionItem> BuildMatchSuggestions(
        IEnumerable<AppUser> candidateUsers,
        string currentUserId,
        IReadOnlySet<string> interestKeywords,
        IReadOnlyDictionary<string, string> sessionMap,
        int limit)
    {
        return candidateUsers
            .Where(user => !string.Equals(user.Id, currentUserId, StringComparison.Ordinal))
            .Where(user => !string.Equals(user.Id, AiAssistantConstants.AssistantUserId, StringComparison.Ordinal))
            .Select(user => BuildMatchSuggestion(user, sessionMap, interestKeywords))
            .Where(suggestion => suggestion is not null)
            .Select(suggestion => suggestion!)
            .OrderByDescending(suggestion => suggestion.MatchScore)
            .ThenBy(suggestion => suggestion.DisplayName)
            .Take(limit)
            .ToList();
    }

    private async Task<SmartReplyContext> PrepareSmartReplyContextAsync(
        AiSmartReplyRequest request,
        string currentUserId)
    {
        request = request.EnsureNotNull(nameof(request));
        request.SessionId.EnsureNotEmpty("会话标识");
        request.UserId.EnsureNotEmpty("用户标识");

        if (!string.Equals(request.UserId, currentUserId, StringComparison.Ordinal))
        {
            _logger.LogWarning(
                "用户 {UserId} 尝试为 {TargetUserId} 请求智能回复，被拒绝",
                currentUserId,
                request.UserId);
            throw new UnauthorizedAccessException("禁止为其他用户请求智能回复");
        }

        var session = await _sessionFactory.GetByIdAsync(request.SessionId)
            ?? throw new KeyNotFoundException("会话不存在");

        if (!session.Participants.Contains(currentUserId))
        {
            throw new UnauthorizedAccessException("当前用户不属于该会话");
        }

        var (conversationMessages, contextLines) = await LoadSessionHistoryAsync(session, currentUserId);
        MergeRequestMessages(request, conversationMessages, contextLines);

        return new SmartReplyContext(request, session, contextLines, conversationMessages);
    }

    private async Task<(List<AiConversationMessage> Messages, List<string> ContextLines)> LoadSessionHistoryAsync(
        ChatSession session,
        string currentUserId)
    {
        var conversationMessages = new List<AiConversationMessage>();
        var contextLines = new List<string>();

        try
        {
            var filter = _messageFactory.CreateFilterBuilder()
                .Equal(message => message.SessionId, session.Id)
                .Build();

            var sort = _messageFactory.CreateSortBuilder()
                .Ascending(message => message.CreatedAt)
                .Build();

            var allMessages = await _messageFactory.FindAsync(filter, sort);

            foreach (var message in allMessages)
            {
                if (message.IsDeleted || message.IsRecalled)
                {
                    continue;
                }

                var normalizedContent = NormalizeMessageContent(message);
                if (string.IsNullOrWhiteSpace(normalizedContent))
                {
                    continue;
                }

                var isSelf = string.Equals(message.SenderId, currentUserId, StringComparison.Ordinal);
                conversationMessages.Add(new AiConversationMessage
                {
                    Role = isSelf ? "assistant" : "user",
                    Content = normalizedContent
                });

                var senderName = isSelf
                    ? "我"
                    : session.ParticipantNames?.GetValueOrDefault(message.SenderId)
                        ?? message.SenderName
                        ?? message.SenderId;

                contextLines.Add($"{senderName}: {normalizedContent}");
            }
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "获取会话 {SessionId} 的历史消息失败，尝试使用请求附带的上下文", session.Id);
        }

        return (conversationMessages, contextLines);
    }

    private static void MergeRequestMessages(
        AiSmartReplyRequest request,
        List<AiConversationMessage> conversationMessages,
        List<string> contextLines)
    {
        var requestMessages = (request.ConversationMessages ?? new List<AiConversationMessage>())
            .Where(message => !string.IsNullOrWhiteSpace(message.Content))
            .Select(message => new AiConversationMessage
            {
                Role = string.IsNullOrWhiteSpace(message.Role)
                    ? "user"
                    : message.Role.Trim().ToLowerInvariant(),
                Content = message.Content.Trim()
            })
            .ToList();

        var systemInstructions = requestMessages
            .Where(message => string.Equals(message.Role, "system", StringComparison.Ordinal))
            .ToList();

        var nonInstructionMessages = requestMessages
            .Where(message => !string.Equals(message.Role, "system", StringComparison.Ordinal))
            .ToList();

        if (conversationMessages.Count == 0 && nonInstructionMessages.Count > 0)
        {
            foreach (var message in nonInstructionMessages)
            {
                conversationMessages.Add(message);
                var label = message.Role switch
                {
                    "assistant" => "我",
                    _ => "对方"
                };
                contextLines.Add($"{label}: {message.Content}");
            }
        }

        foreach (var systemMessage in systemInstructions)
        {
            conversationMessages.Add(systemMessage);
            contextLines.Add($"系统: {systemMessage.Content}");
        }

        var additionalLines = (request.ConversationContext ?? new List<string>())
            .Where(line => !string.IsNullOrWhiteSpace(line))
            .Select(line => line.Trim())
            .ToList();

        if (additionalLines.Count > 0)
        {
            contextLines.AddRange(additionalLines);
        }

        if (conversationMessages.Count == 0 && contextLines.Count > 0)
        {
            conversationMessages.AddRange(contextLines.Select(line => new AiConversationMessage
            {
                Role = "user",
                Content = line
            }));
        }
    }

    private bool IsOpenAiConfigured() =>
        !string.IsNullOrWhiteSpace(_aiOptions.Endpoint) &&
        !string.IsNullOrWhiteSpace(_aiOptions.ApiKey);

    private string ResolveSystemPrompt() =>
        string.IsNullOrWhiteSpace(_aiOptions.SystemPrompt)
            ? DefaultSystemPrompt
            : _aiOptions.SystemPrompt;

    private static string ResolveLanguageTag(string? locale) =>
        string.IsNullOrWhiteSpace(locale) ? "zh-CN" : locale;

    private static string BuildInstruction(string systemPrompt, string languageTag) =>
        $@"{systemPrompt}

当前用户语言标识：{languageTag}

请基于下方完整的聊天历史生成 {DefaultSuggestionCount} 条“智能推荐回复候选”消息，帮助用户顺畅地继续对话。必须遵循：
1. 每条建议控制在 18 个汉字或 120 个字符以内，避免多句堆砌。
2. 语气需贴近微信真实聊天风格，可适度加入 Emoji 或情绪词，但要自然。
3. 如果上下文为空，输出开场寒暄或破冰建议。
4. 严格输出 JSON，结构如下：
{{
  ""suggestions"": [
    {{
      ""content"": ""..."",
      ""category"": ""延续话题|追问细节|共情回应|提供建议|轻松缓和"",
      ""style"": ""语气描述，例如：真诚共情"",
      ""quickTip"": ""一句话提示"",
      ""insight"": ""可选补充原因，无则省略"",
      ""confidence"": 0.82
    }}
  ]
}}

只返回 JSON，不要添加额外说明。";

    private static List<OpenAiChatMessage> BuildChatMessages(
        string instruction,
        IReadOnlyList<AiConversationMessage> conversationMessages,
        string fallbackUserContent)
    {
        var messages = new List<OpenAiChatMessage> { new SystemChatMessage(instruction) };
        var hasConversationContent = false;

        foreach (var conversation in conversationMessages)
        {
            var content = conversation.Content?.Trim();
            if (string.IsNullOrWhiteSpace(content))
            {
                continue;
            }

            var role = conversation.Role?.Trim().ToLowerInvariant();
            switch (role)
            {
                case "assistant":
                    messages.Add(new AssistantChatMessage(content));
                    hasConversationContent = true;
                    break;
                case "system":
                    messages.Add(new SystemChatMessage(content));
                    break;
                default:
                    messages.Add(new UserChatMessage(content));
                    hasConversationContent = true;
                    break;
            }
        }

        if (!hasConversationContent)
        {
            messages.Add(new UserChatMessage(fallbackUserContent));
        }

        return messages;
    }

    private ChatCompletionOptions BuildCompletionOptions(string currentUserId)
    {
        var options = new ChatCompletionOptions
        {
            EndUserId = currentUserId
        };

        if (_aiOptions.MaxTokens > 0)
        {
            options.MaxOutputTokenCount = _aiOptions.MaxTokens;
        }

        return options;
    }

    private ChatClient? ResolveChatClient(
        SmartReplyContext context,
        AiSuggestionResponse response,
        out string model)
    {
        model = string.IsNullOrWhiteSpace(_aiOptions.Model) ? "gpt-4o-mini" : _aiOptions.Model;

        if (!IsOpenAiConfigured())
        {
            AssignSuggestions(response, BuildFallbackSuggestions(context.ContextLines));
            return null;
        }

        try
        {
            return _openAiClient.GetChatClient(model);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "初始化 OpenAI ChatClient 失败，模型：{Model}", model);
            AssignSuggestions(response, BuildFallbackSuggestions(context.ContextLines));
            return null;
        }
    }

    private async Task<CompletionAttempt> CompleteChatAsync(
        ChatClient chatClient,
        IReadOnlyList<OpenAiChatMessage> messages,
        ChatCompletionOptions completionOptions,
        IReadOnlyList<string> contextLines,
        CancellationToken cancellationToken)
    {
        var stopwatch = Stopwatch.StartNew();
        try
        {
            var completionResult = await chatClient.CompleteChatAsync(messages, completionOptions, cancellationToken);
            stopwatch.Stop();
            return new CompletionAttempt(
                completionResult.Value,
                (int)Math.Round(stopwatch.Elapsed.TotalMilliseconds),
                null);
        }
        catch (Exception ex)
        {
            stopwatch.Stop();
            _logger.LogWarning(ex, "调用 OpenAI 获取智能回复失败，将使用本地候选");
            return new CompletionAttempt(
                null,
                (int)Math.Round(stopwatch.Elapsed.TotalMilliseconds),
                BuildFallbackSuggestions(contextLines));
        }
    }

    private void HandleCompletionResponse(
        AiSuggestionResponse response,
        ChatCompletion? completion,
        string model,
        IReadOnlyList<string> contextLines)
    {
        var finalText = completion?.Content?.FirstOrDefault()?.Text ?? string.Empty;
        if (!string.IsNullOrWhiteSpace(finalText))
        {
            _logger.LogDebug(
                "AI 原始智能推荐结果（模型: {Model}, 长度: {Length}）: {Preview}",
                model,
                finalText.Length,
                TruncateForLogging(finalText));
        }
        else
        {
            _logger.LogWarning("AI 返回空的智能推荐结果，模型: {Model}", model);
        }

        var suggestions = TryParseSuggestions(finalText, model)
            ?? BuildFallbackSuggestions(contextLines);

        AssignSuggestions(response, suggestions);
    }

    private List<AiSuggestionItem>? TryParseSuggestions(string finalText, string model)
    {
        if (string.IsNullOrWhiteSpace(finalText))
        {
            return null;
        }

        try
        {
            var parsed = JsonSerializer.Deserialize<SmartReplyPayload>(finalText);
            if (parsed?.Suggestions == null || parsed.Suggestions.Count == 0)
            {
                return null;
            }

            return parsed.Suggestions
                .Where(suggestion => !string.IsNullOrWhiteSpace(suggestion.Content))
                .Take(DefaultSuggestionCount)
                .Select(suggestion => new AiSuggestionItem
                {
                    Content = suggestion.Content.Trim(),
                    Confidence = suggestion.Confidence,
                    Category = NormalizeOrNull(suggestion.Category),
                    Style = NormalizeOrNull(suggestion.Style),
                    QuickTip = NormalizeOrNull(suggestion.QuickTip),
                    Insight = NormalizeOrNull(suggestion.Insight),
                    Source = SmartReplySource,
                    Metadata = BuildSuggestionMetadata(model, suggestion)
                })
                .ToList();
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "解析 OpenAI 结果失败：{Result}", finalText);
            return null;
        }
    }

    private void AssignSuggestions(AiSuggestionResponse response, List<AiSuggestionItem> suggestions, string? notice = null)
    {
        suggestions ??= new List<AiSuggestionItem>();
        response.Suggestions = suggestions;
        response.Notice = notice ?? (suggestions.Count == 0 ? DefaultSuggestionNotice : null);

        if (suggestions.Count == 0)
        {
            _logger.LogWarning("智能推荐为空，已返回默认提示信息");
        }
        else
        {
            _logger.LogDebug("智能推荐生成成功，共 {Count} 条", suggestions.Count);
        }
    }

    private sealed record SmartReplyContext(
        AiSmartReplyRequest Request,
        ChatSession Session,
        List<string> ContextLines,
        List<AiConversationMessage> ConversationMessages);

    private static string? NormalizeMessageContent(DomainChatMessage message)
    {
        var text = message.Content?.Trim();
        if (!string.IsNullOrWhiteSpace(text))
        {
            return text;
        }

        if (message.Attachment != null)
        {
            var mimeType = message.Attachment.MimeType ?? string.Empty;
            if (mimeType.StartsWith("image/", StringComparison.OrdinalIgnoreCase))
            {
                return "[图片]";
            }

            if (!string.IsNullOrWhiteSpace(mimeType))
            {
                return $"[附件:{mimeType}]";
            }

            return "[附件]";
        }

        return null;
    }

    private static List<AiSuggestionItem> BuildFallbackSuggestions(IReadOnlyList<string> contextLines)
    {
        static string StripSpeakerPrefix(string line)
        {
            if (string.IsNullOrWhiteSpace(line))
            {
                return string.Empty;
            }

            var trimmed = line.Trim();
            var separatorIndex = trimmed.IndexOf(':');
            if (separatorIndex < 0 || separatorIndex >= trimmed.Length - 1)
            {
                return trimmed;
            }

            return trimmed[(separatorIndex + 1)..].Trim();
        }

        static string BuildTopicSnippet(string content)
        {
            if (string.IsNullOrWhiteSpace(content))
            {
                return string.Empty;
            }

            const int maxLength = 14;
            var sanitized = content
                .Replace("\r", string.Empty, StringComparison.Ordinal)
                .Replace("\n", string.Empty, StringComparison.Ordinal)
                .Trim();

            if (sanitized.Length <= maxLength)
            {
                return sanitized;
            }

            return $"{sanitized[..maxLength]}…";
        }

        static AiSuggestionItem CreateSuggestion(string content, string category, string style, string quickTip, string? insight = null, double? confidence = null)
        {
            return new AiSuggestionItem
            {
                Content = content,
                Category = category,
                Style = style,
                QuickTip = quickTip,
                Insight = insight,
                Confidence = confidence ?? 0.35d,
                Source = "fallback",
                Metadata = new Dictionary<string, object>
                {
                    ["origin"] = "local-fallback",
                },
            };
        }

        var suggestions = new List<AiSuggestionItem>();
        var latestLine = contextLines.Count > 0 ? contextLines[^1] : string.Empty;
        var latestContent = StripSpeakerPrefix(latestLine);
        var topicSnippet = BuildTopicSnippet(latestContent);

        if (!string.IsNullOrWhiteSpace(topicSnippet))
        {
            suggestions.Add(
                CreateSuggestion(
                    $"想听听你对{topicSnippet}的看法～",
                    "追问细节",
                    "好奇探询",
                    "围绕对方提到的点继续交流"));

            suggestions.Add(
                CreateSuggestion(
                    "听起来挺有意思，也让我很共鸣！",
                    "共情回应",
                    "真诚陪伴",
                    "表达理解与支持，让对方继续分享",
                    confidence: 0.32d));
        }

        var genericFallbacks = new (string content, string category, string style, string quickTip, string? insight, double confidence)[]
        {
            ("最近在忙些什么呀？", "轻松缓和", "自然开场", "用轻松话题热身", "换个轻松的话题试试", 0.28d),
            ("这一周有没有什么小确幸？", "轻松缓和", "温暖关心", "聊聊让人开心的小事", null, 0.3d),
            ("要不要分享下你的兴趣爱好？", "延续话题", "好奇探询", "引导了解更多彼此信息", null, 0.33d),
        };

        foreach (var (content, category, style, quickTip, insight, confidence) in genericFallbacks)
        {
            if (suggestions.Count >= DefaultSuggestionCount)
            {
                break;
            }

            suggestions.Add(CreateSuggestion(content, category, style, quickTip, insight, confidence));
        }

        if (suggestions.Count == 0)
        {
            suggestions.Add(
                CreateSuggestion(
                    "你好呀～最近有什么有趣的事吗？",
                    "轻松缓和",
                    "友好开场",
                    "用轻松暖场拉近距离",
                    confidence: 0.25d));
        }

        if (suggestions.Count < DefaultSuggestionCount)
        {
            suggestions.Add(
                CreateSuggestion(
                    "我们是不是还没互相介绍呢？",
                    "延续话题",
                    "真诚好奇",
                    "邀请对方继续自我介绍",
                    confidence: 0.27d));
        }

        return suggestions
            .Take(DefaultSuggestionCount)
            .ToList();
    }

    private static string TruncateForLogging(string content, int maxLength = 200)
    {
        if (string.IsNullOrWhiteSpace(content))
        {
            return string.Empty;
        }

        var normalized = content.ReplaceLineEndings(" ").Trim();
        if (normalized.Length <= maxLength)
        {
            return normalized;
        }

        return $"{normalized[..maxLength]}…";
    }

    private static string? NormalizeOrNull(string? value)
    {
        var trimmed = value?.Trim();
        return string.IsNullOrEmpty(trimmed) ? null : trimmed;
    }

    private static Dictionary<string, object> BuildSuggestionMetadata(string model, SmartReplyItem item)
    {
        var metadata = new Dictionary<string, object>
        {
            ["model"] = model
        };

        if (!string.IsNullOrWhiteSpace(item.Category))
        {
            metadata["category"] = item.Category.Trim();
        }

        if (!string.IsNullOrWhiteSpace(item.Style))
        {
            metadata["style"] = item.Style.Trim();
        }

        if (!string.IsNullOrWhiteSpace(item.QuickTip))
        {
            metadata["quickTip"] = item.QuickTip.Trim();
        }

        if (!string.IsNullOrWhiteSpace(item.Insight))
        {
            metadata["insight"] = item.Insight.Trim();
        }

        return metadata;
    }

    private sealed record CompletionAttempt(
        ChatCompletion? Completion,
        int LatencyMs,
        List<AiSuggestionItem>? Suggestions);

    private sealed class SmartReplyPayload
    {
        public List<SmartReplyItem> Suggestions { get; set; } = new();
    }

    private sealed class SmartReplyItem
    {
        public string Content { get; set; } = string.Empty;
        public double? Confidence { get; set; }
            = default;
        public string? Category { get; set; }
            = default;
        public string? Style { get; set; }
            = default;
        public string? QuickTip { get; set; }
            = default;
        public string? Insight { get; set; }
            = default;
    }

    private MatchSuggestionItem? BuildMatchSuggestion(
        AppUser user,
        IReadOnlyDictionary<string, string> sessionMap,
        IReadOnlySet<string> interestKeywords)
    {
        var displayName = string.IsNullOrWhiteSpace(user.Name)
            ? user.Username
            : user.Name!;

        if (string.IsNullOrWhiteSpace(displayName))
        {
            return null;
        }

        var userTags = user.Tags?
            .Select(tag => tag.Label ?? tag.Key)
            .Where(label => !string.IsNullOrWhiteSpace(label))
            .Select(label => label!.Trim())
            .Where(label => label.Length > 0)
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .ToList() ?? new List<string>();

        var sharedInterests = interestKeywords.Count == 0
            ? new List<string>()
            : userTags
                .Where(label => interestKeywords.Contains(label.ToLowerInvariant()))
                .Take(5)
                .ToList();

        var baseScore = user.LastLoginAt.HasValue
            ? Math.Clamp(1d - (DateTime.UtcNow - user.LastLoginAt.Value.ToUniversalTime()).TotalDays / 30d, 0, 1)
            : 0.5d;

        var interestScore = sharedInterests.Count == 0
            ? 0.2d
            : Math.Min(0.6d, 0.3d + sharedInterests.Count * 0.1d);

        var sessionScore = sessionMap.ContainsKey(user.Id) ? 0.2d : 0d;

        var matchScore = Math.Clamp(baseScore * 0.4d + interestScore + sessionScore, 0d, 1d);

        return new MatchSuggestionItem
        {
            UserId = user.Id,
            DisplayName = displayName,
            AvatarUrl = user.Avatar,
            SharedInterests = sharedInterests,
            MatchScore = Math.Round(matchScore, 2, MidpointRounding.AwayFromZero),
            Bio = user.Email,
            SessionId = sessionMap.TryGetValue(user.Id, out var sessionId) ? sessionId : null
        };
    }
}

