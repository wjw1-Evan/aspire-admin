using System.Diagnostics;
using System.Linq;
using System.Runtime.CompilerServices;
using System.Text.Json;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using OpenAI;
using OpenAI.Chat;
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
    /// 以流式方式生成智能回复候选。
    /// </summary>
    /// <param name="request">请求参数。</param>
    /// <param name="currentUserId">当前用户标识。</param>
    /// <param name="cancellationToken">取消标识。</param>
    /// <returns>流式片段序列。</returns>
    IAsyncEnumerable<AiSuggestionStreamChunk> StreamSmartRepliesAsync(
        AiSmartReplyRequest request,
        string currentUserId,
        CancellationToken cancellationToken = default);
}

/// <summary>
/// 基于 OpenAI 的智能回复服务实现。
/// </summary>
public class AiSuggestionService : IAiSuggestionService
{
    private const int DefaultSuggestionCount = 3;
    private const int MaxContextMessages = 6;
    private const string SmartReplySource = "smart-reply";
    private const string ChunkTypeFallback = "fallback";
    private const string ChunkTypeComplete = "complete";

    private readonly IDatabaseOperationFactory<ChatSession> _sessionFactory;
    private readonly IDatabaseOperationFactory<DomainChatMessage> _messageFactory;
    private readonly OpenAIClient _openAiClient;
    private readonly AiCompletionOptions _aiOptions;
    private readonly ILogger<AiSuggestionService> _logger;

    /// <summary>
    /// 初始化 <see cref="AiSuggestionService"/>。
    /// </summary>
    public AiSuggestionService(
        IDatabaseOperationFactory<ChatSession> sessionFactory,
        IDatabaseOperationFactory<DomainChatMessage> messageFactory,
        OpenAIClient openAiClient,
        IOptions<AiCompletionOptions> aiOptions,
        ILogger<AiSuggestionService> logger)
    {
        _sessionFactory = sessionFactory;
        _messageFactory = messageFactory;
        _openAiClient = openAiClient;
        _aiOptions = aiOptions.Value;
        _logger = logger;
    }

    /// <inheritdoc />
    public async IAsyncEnumerable<AiSuggestionStreamChunk> StreamSmartRepliesAsync(
        AiSmartReplyRequest request,
        string currentUserId,
        [EnumeratorCancellation] CancellationToken cancellationToken = default)
    {
        request = request.EnsureNotNull(nameof(request));
        request.SessionId.EnsureNotEmpty("会话标识");
        request.UserId.EnsureNotEmpty("用户标识");

        if (!string.Equals(request.UserId, currentUserId, StringComparison.Ordinal))
        {
            _logger.LogWarning(
                "用户 {UserId} 尝试为 {TargetUserId} 请求流式智能回复，被拒绝",
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

        var contextLines = await BuildConversationContextAsync(request, session, currentUserId);

        // 如果未配置 OpenAI，直接返回本地候选
        if (string.IsNullOrWhiteSpace(_aiOptions.Endpoint) || string.IsNullOrWhiteSpace(_aiOptions.ApiKey))
        {
            var fallback = BuildFallbackSuggestions(contextLines);
            yield return new AiSuggestionStreamChunk
            {
                Type = fallback.Count == 0 ? ChunkTypeFallback : ChunkTypeComplete,
                Suggestions = fallback,
                Timestamp = DateTime.UtcNow
            };
            yield break;
        }

        var model = string.IsNullOrWhiteSpace(_aiOptions.Model)
            ? "gpt-4o-mini"
            : _aiOptions.Model;

        ChatClient? chatClient = null;
        List<AiSuggestionItem>? failureSuggestions = null;

        try
        {
            chatClient = _openAiClient.GetChatClient(model);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "初始化 OpenAI ChatClient 失败，模型：{Model}", model);
            failureSuggestions = BuildFallbackSuggestions(contextLines);
        }

        if (failureSuggestions != null)
        {
            yield return new AiSuggestionStreamChunk
            {
                Type = ChunkTypeFallback,
                Suggestions = failureSuggestions,
                Timestamp = DateTime.UtcNow
            };
            yield break;
        }

        var resolvedClient = chatClient!;

        var languageTag = string.IsNullOrWhiteSpace(request.Locale) ? "zh-CN" : request.Locale;
        var systemPrompt = string.IsNullOrWhiteSpace(_aiOptions.SystemPrompt)
            ? "你是小科，请使用简体中文提供简洁、专业且友好的回复。"
            : _aiOptions.SystemPrompt;

        var instruction = $@"{systemPrompt}

用户语言标识：{languageTag}

请根据以下聊天历史生成 {DefaultSuggestionCount} 条适合继续对话的建议回复，要求：
1. 单条回复不超过 60 个汉字或 120 个字符；
2. 避免重复表达，保持语气自然、友好；
3. 若上下文为空，输出通用的寒暄/回应语；
4. 返回 JSON，结构为 {{""suggestions"":[{{""content"":""..."", ""confidence"":0.8}}, ...]}}。
";

        var userContent = contextLines.Count == 0
            ? "（上下文为空）"
            : string.Join("\n", contextLines);

        var messages = new List<OpenAiChatMessage>
        {
            new SystemChatMessage(instruction),
            new UserChatMessage(userContent)
        };

        var completionOptions = new ChatCompletionOptions
        {
            EndUserId = currentUserId
        };

        if (_aiOptions.MaxTokens > 0)
        {
            completionOptions.MaxOutputTokenCount = _aiOptions.MaxTokens;
        }

        ChatCompletion? completion = null;
        var stopwatch = Stopwatch.StartNew();

        failureSuggestions = null;

        try
        {
            var completionResult = await resolvedClient.CompleteChatAsync(
                messages,
                completionOptions,
                cancellationToken);
            completion = completionResult.Value;
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "调用 OpenAI 获取智能回复失败，将使用本地候选");
            failureSuggestions = BuildFallbackSuggestions(contextLines);
        }

        if (failureSuggestions != null)
        {
            yield return new AiSuggestionStreamChunk
            {
                Type = ChunkTypeFallback,
                Suggestions = failureSuggestions,
                Timestamp = DateTime.UtcNow
            };
            yield break;
        }

        stopwatch.Stop();

        var finalText = completion?.Content?.FirstOrDefault()?.Text ?? string.Empty;
        List<AiSuggestionItem>? suggestions = null;

        if (!string.IsNullOrWhiteSpace(finalText))
        {
            try
            {
                var parsed = JsonSerializer.Deserialize<SmartReplyPayload>(finalText);
                if (parsed?.Suggestions != null && parsed.Suggestions.Count > 0)
                {
                    suggestions = parsed.Suggestions
                        .Where(s => !string.IsNullOrWhiteSpace(s.Content))
                        .Select(s => new AiSuggestionItem
                        {
                            Content = s.Content.Trim(),
                            Confidence = s.Confidence,
                            Source = SmartReplySource
                        })
                        .ToList();
                }
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "解析 OpenAI 流式结果失败：{Result}", finalText);
            }
        }

        if (suggestions == null || suggestions.Count == 0)
        {
            suggestions = BuildFallbackSuggestions(contextLines);
            yield return new AiSuggestionStreamChunk
            {
                Type = ChunkTypeFallback,
                Suggestions = suggestions,
                LatencyMs = (int)Math.Round(stopwatch.Elapsed.TotalMilliseconds),
                Timestamp = DateTime.UtcNow
            };
            yield break;
        }

        yield return new AiSuggestionStreamChunk
        {
            Type = ChunkTypeComplete,
            Suggestions = suggestions,
            LatencyMs = (int)Math.Round(stopwatch.Elapsed.TotalMilliseconds),
            Timestamp = DateTime.UtcNow
        };
    }

    private async Task<List<string>> BuildConversationContextAsync(
        AiSmartReplyRequest request,
        ChatSession session,
        string currentUserId)
    {
        var context = (request.ConversationContext ?? new List<string>())
            .Where(line => !string.IsNullOrWhiteSpace(line))
            .Select(line => line.Trim())
            .ToList();

        if (context.Count > 0)
        {
            return context.TakeLast(MaxContextMessages).ToList();
        }

        try
        {
            var filter = _messageFactory.CreateFilterBuilder()
                .Equal(message => message.SessionId, session.Id)
                .Build();

            var sort = _messageFactory.CreateSortBuilder()
                .Descending(message => message.CreatedAt)
                .Build();

            var recentMessages = await _messageFactory.FindAsync(filter, sort, MaxContextMessages);
            return recentMessages
                .OrderBy(m => m.CreatedAt)
                .Select(m =>
                {
                    var senderName = m.SenderId == currentUserId
                        ? "我"
                        : session.ParticipantNames?.GetValueOrDefault(m.SenderId) ?? m.SenderName ?? m.SenderId;
                    return $"{senderName}: {m.Content}".Trim();
                })
                .Where(line => !string.IsNullOrWhiteSpace(line))
                .ToList();
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "获取会话 {SessionId} 的上下文失败，使用空上下文", session.Id);
            return new List<string>();
        }
    }

    private static List<AiSuggestionItem> BuildFallbackSuggestions(IReadOnlyList<string> contextLines)
    {
        string? lastLine = contextLines.Count > 0 ? contextLines[^1] : null;
        var fallback = new List<string>
        {
            "收到，我这边马上跟进。",
            "好的，稍后我会再确认一下情况。",
            "了解啦，如有需要随时告诉我。"
        };

        if (!string.IsNullOrWhiteSpace(lastLine))
        {
            var segments = lastLine.Split(':');
            var normalizedSegment = segments.Length > 0 ? segments[^1] : lastLine;
            var normalized = normalizedSegment.Trim();
            if (!string.IsNullOrWhiteSpace(normalized))
            {
                fallback[0] = $"好的，关于“{normalized}”我再确认一下。";
            }
        }

        return fallback
            .Select(content => new AiSuggestionItem
            {
                Content = content.Trim(),
                Source = SmartReplySource,
                Confidence = null
            })
            .ToList();
    }

    private sealed class SmartReplyPayload
    {
        public List<SmartReplyItem> Suggestions { get; set; } = new();
    }

    private sealed class SmartReplyItem
    {
        public string Content { get; set; } = string.Empty;
        public double? Confidence { get; set; }
            = default;
    }
}

