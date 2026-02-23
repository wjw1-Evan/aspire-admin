using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using OpenAI;
using OpenAI.Chat;
using Platform.ApiService.Constants;
using Platform.ApiService.Models;
using Platform.ServiceDefaults.Services;
using System;
using System.ClientModel;
using System.Collections.Generic;
using System.Diagnostics;
using System.Linq;
using System.Linq.Expressions;
using System.Text;
using System.Text.Json;
using System.Text.RegularExpressions;
using System.Threading;
using System.Threading.Tasks;
using ChatMessage = Platform.ApiService.Models.ChatMessage;
using OpenAIChatMessage = OpenAI.Chat.ChatMessage;

namespace Platform.ApiService.Services;

/// <summary>
/// 聊天 AI 服务实现 - 提供基于 LLM 的助手回复、流式输出、工具调用及记忆管理
/// </summary>
public class ChatAiService : IChatAiService
{
    private const int AssistantContextMessageLimit = 24;

    private readonly OpenAIClient _openAiClient;
    private readonly AiCompletionOptions _aiOptions;
    private readonly IDataFactory<ChatMessage> _messageFactory;
    private readonly IDataFactory<ChatSession> _sessionFactory;
    private readonly IDataFactory<AppUser> _userFactory;
    private readonly IDataFactory<UserMemory> _memoryFactory;
    private readonly IUserService _userService;
    private readonly IChatBroadcaster _broadcaster;
    private readonly IChatSessionService _sessionService;
    private readonly IMcpService _mcpService;
    private readonly IXiaokeConfigService? _xiaokeConfigService;
    private readonly ITenantContext _tenantContext;
    private readonly ILogger<ChatAiService> _logger;

    /// <summary>
    /// 初始化聊天 AI 服务
    /// </summary>
    /// <param name="openAiClient">OpenAI 客户端</param>
    /// <param name="aiOptions">AI 补全配置选项</param>
    /// <param name="messageFactory">聊天消息数据工厂</param>
    /// <param name="sessionFactory">聊天会话数据工厂</param>
    /// <param name="userFactory">用户数据工厂</param>
    /// <param name="memoryFactory">用户记忆数据工厂</param>
    /// <param name="userService">用户服务</param>
    /// <param name="broadcaster">消息广播器</param>
    /// <param name="sessionService">会话管理服务</param>
    /// <param name="mcpService">MCP 协议工具服务</param>
    /// <param name="xiaokeConfigService">Xiaoke 配置服务（可选）</param>
    /// <param name="tenantContext">租户上下文</param>
    /// <param name="logger">日志处理器</param>
    public ChatAiService(
        OpenAIClient openAiClient,
        IOptions<AiCompletionOptions> aiOptions,
        IDataFactory<ChatMessage> messageFactory,
        IDataFactory<ChatSession> sessionFactory,
        IDataFactory<AppUser> userFactory,
        IDataFactory<UserMemory> memoryFactory,
        IUserService userService,
        IChatBroadcaster broadcaster,
        IChatSessionService sessionService,
        IMcpService mcpService,
        IXiaokeConfigService? xiaokeConfigService,
        ITenantContext tenantContext,
        ILogger<ChatAiService> logger)
    {
        _openAiClient = openAiClient ?? throw new ArgumentNullException(nameof(openAiClient));
        _aiOptions = aiOptions?.Value ?? throw new ArgumentNullException(nameof(aiOptions));
        _messageFactory = messageFactory ?? throw new ArgumentNullException(nameof(messageFactory));
        _sessionFactory = sessionFactory ?? throw new ArgumentNullException(nameof(sessionFactory));
        _userFactory = userFactory ?? throw new ArgumentNullException(nameof(userFactory));
        _memoryFactory = memoryFactory ?? throw new ArgumentNullException(nameof(memoryFactory));
        _userService = userService ?? throw new ArgumentNullException(nameof(userService));
        _broadcaster = broadcaster ?? throw new ArgumentNullException(nameof(broadcaster));
        _sessionService = sessionService ?? throw new ArgumentNullException(nameof(sessionService));
        _mcpService = mcpService ?? throw new ArgumentNullException(nameof(mcpService));
        _xiaokeConfigService = xiaokeConfigService;
        _tenantContext = tenantContext ?? throw new ArgumentNullException(nameof(tenantContext));
        _logger = logger ?? throw new ArgumentNullException(nameof(logger));
    }

    /// <inheritdoc />
    public async Task RespondAsAssistantAsync(ChatSession session, ChatMessage triggerMessage, CancellationToken cancellationToken)
    {
        if (!session.Participants.Contains(AiAssistantConstants.AssistantUserId)) return;
        if (triggerMessage.SenderId == AiAssistantConstants.AssistantUserId) return;
        if (ShouldSkipAutomaticAssistantReply(triggerMessage)) return;

        if (triggerMessage.Type == ChatMessageType.Text)
        {
            await GenerateAssistantReplyStreamAsync(session, triggerMessage, cancellationToken);
        }
        else
        {
            var replyContent = "我已收到您的附件，目前仅支持文本对话，欢迎告诉我想要讨论的内容。";
            await CreateAssistantMessageAsync(session, replyContent, triggerMessage.SenderId, null, cancellationToken);
        }
    }

    /// <inheritdoc />
    public async Task<ChatMessage?> GetOrGenerateAssistantReplyStreamAsync(
        ChatSession session,
        ChatMessage userMessage,
        Func<string, string, string, Task>? onChunk,
        Func<ChatMessage, Task>? onComplete,
        CancellationToken cancellationToken)
    {
        if (!session.Participants.Contains(AiAssistantConstants.AssistantUserId) ||
            userMessage.SenderId == AiAssistantConstants.AssistantUserId ||
            userMessage.Type != ChatMessageType.Text)
        {
            return null;
        }

        var existingAssistant = await FindExistingAssistantReply(session.Id, userMessage.Id);
        if (existingAssistant != null) return existingAssistant;

        return await GenerateAssistantReplyStreamAsync(session, userMessage, cancellationToken, onChunk, onComplete);
    }

    private async Task<ChatMessage?> FindExistingAssistantReply(string sessionId, string triggerMessageId)
    {
        var existing = await _messageFactory.FindAsync(m => m.SessionId == sessionId && m.SenderId == AiAssistantConstants.AssistantUserId, null, 100);
        return existing.FirstOrDefault(m => m.Metadata != null && m.Metadata.TryGetValue("triggerMessageId", out var id) && id?.ToString() == triggerMessageId);
    }

    private async Task<ChatMessage?> GenerateAssistantReplyStreamAsync(
        ChatSession session,
        ChatMessage triggerMessage,
        CancellationToken cancellationToken,
        Func<string, string, string, Task>? onChunk = null,
        Func<ChatMessage, Task>? onComplete = null)
    {
        var xiaokeConfig = await GetXiaokeConfig();
        var model = xiaokeConfig?.Model ?? (!string.IsNullOrWhiteSpace(_aiOptions.Model) ? _aiOptions.Model : "gpt-4o-mini");

        ChatClient chatClient;
        try { chatClient = _openAiClient.GetChatClient(model); }
        catch (Exception ex) { _logger.LogError(ex, "初始化 OpenAI ChatClient 失败"); return null; }

        var systemPrompt = await GetEffectiveSystemPrompt(triggerMessage.SenderId, xiaokeConfig);
        var conversationMessages = await BuildAssistantConversationMessagesAsync(session, triggerMessage, cancellationToken);
        if (conversationMessages.Count == 0) return null;

        // 尝试 MCP 直接调用（快速路径）
        string? toolResultContext = await _mcpService.DetectAndCallMcpToolsAsync(session, triggerMessage, triggerMessage.SenderId, cancellationToken);

        if (!string.IsNullOrEmpty(toolResultContext))
        {
            _logger.LogInformation("[ChatAI] 已获取 MCP 数据，由小科基于数据直接回复。");
        }
        else
        {
            _logger.LogInformation("[ChatAI] 未匹配到实时工具，进入常规回复模式。");
        }

        var instructionBuilder = new StringBuilder();
        instructionBuilder.AppendLine(systemPrompt.Trim());
        instructionBuilder.AppendLine("当前用户语言标识：zh-CN");
        instructionBuilder.Append("请结合完整的历史聊天记录，使用自然、真诚且有温度的语气回复对方。");

        if (!string.IsNullOrWhiteSpace(toolResultContext))
        {
            instructionBuilder.AppendLine("\n【已查询的数据】\n" + toolResultContext + "\n请基于以上查询结果，用自然、友好的语言向用户回复。");
        }

        var messages = new List<OpenAIChatMessage> { new SystemChatMessage(instructionBuilder.ToString()) };
        messages.AddRange(conversationMessages);

        var completionOptions = ConfigureCompletionOptions(xiaokeConfig);
        ChatMessage? assistantMessage = null;
        var accumulatedContent = new StringBuilder();

        try
        {
            assistantMessage = await CreateAssistantMessageStreamingAsync(session, string.Empty, triggerMessage.SenderId, null, triggerMessage.Id, cancellationToken);

            // 发送服务调用提示（关联到 assistantMessage.Id）
            if (!string.IsNullOrEmpty(toolResultContext) && onChunk != null)
            {
                var tip = $"> [系统] 正在调用 MCP 工具获取实时信息...\n\n";
                accumulatedContent.Append(tip);
                await onChunk(session.Id, assistantMessage.Id, tip);
            }

            var streamingResult = chatClient.CompleteChatStreamingAsync(messages, completionOptions, cancellationToken);

            await foreach (var update in streamingResult)
            {
                cancellationToken.ThrowIfCancellationRequested();
                if (update.ContentUpdate == null) continue;

                foreach (var contentPart in update.ContentUpdate)
                {
                    if (contentPart.Kind == ChatMessageContentPartKind.Text && !string.IsNullOrWhiteSpace(contentPart.Text))
                    {
                        var delta = contentPart.Text;
                        accumulatedContent.Append(delta);
                        if (onChunk != null) await onChunk(session.Id, assistantMessage.Id, delta);

                        if (accumulatedContent.Length % 50 == 0)
                        {
                            var content = accumulatedContent.ToString();
                            var msgId = assistantMessage.Id;
                            _ = Task.Run(async () => { try { await UpdateStreamingMessageAsync(msgId, content, cancellationToken); } catch { } });
                        }
                    }
                }
            }

            var finalContent = accumulatedContent.ToString().Trim();
            if (assistantMessage != null && !string.IsNullOrEmpty(finalContent))
            {
                await UpdateStreamingMessageAsync(assistantMessage.Id, finalContent, cancellationToken);
                await CompleteStreamingMessageAsync(assistantMessage.Id, finalContent, cancellationToken);
                var completed = await _messageFactory.GetByIdAsync(assistantMessage.Id);
                if (completed != null)
                {
                    if (onComplete != null) await onComplete(completed);
                    await _broadcaster.BroadcastMessageCompleteAsync(session.Id, completed);
                }
                return completed;
            }
            else if (assistantMessage != null)
            {
                await _messageFactory.SoftDeleteAsync(assistantMessage.Id);
            }
            return null;
        }
        catch (OperationCanceledException) { if (assistantMessage != null) await _messageFactory.SoftDeleteAsync(assistantMessage.Id); return null; }
        catch (Exception ex) { _logger.LogError(ex, "流式生成异常"); if (assistantMessage != null) await _messageFactory.SoftDeleteAsync(assistantMessage.Id); return null; }
    }


    private async Task<XiaokeConfigDto?> GetXiaokeConfig()
    {
        if (_xiaokeConfigService == null) return null;
        try
        {
            var config = await _xiaokeConfigService.GetDefaultConfigAsync();
            return (config != null && config.IsEnabled) ? config : null;
        }
        catch { return null; }
    }

    private async Task<string> GetEffectiveSystemPrompt(string userId, XiaokeConfigDto? xiaokeConfig)
    {
        const string fallback = "你是小科，请使用简体中文提供简洁、专业且友好的回复。";
        string basePrompt = fallback;

        try
        {
            var userDef = await _userService.GetAiRoleDefinitionAsync(userId);
            if (!string.IsNullOrWhiteSpace(userDef) && userDef != fallback) basePrompt = userDef;
            else if (xiaokeConfig != null && !string.IsNullOrWhiteSpace(xiaokeConfig.SystemPrompt)) basePrompt = xiaokeConfig.SystemPrompt;
            else if (!string.IsNullOrWhiteSpace(_aiOptions.SystemPrompt)) basePrompt = _aiOptions.SystemPrompt;

            // Load and append UserMemory as context
            var memories = await _memoryFactory.FindAsync(m => m.UserId == userId, q => q.OrderByDescending(m => m.Importance).ThenByDescending(m => m.CreatedAt), 20);
            if (memories.Count > 0)
            {
                var memoryContext = "\n\n=== 关于该用户的长期记忆 ===\n" + string.Join("\n", memories.Select(m => $"- [{m.Category}] {m.Content}"));
                basePrompt += memoryContext;
            }
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "获取系统提示词与记忆上下文失败");
        }

        return basePrompt;
    }

    private ChatCompletionOptions ConfigureCompletionOptions(XiaokeConfigDto? config)
    {
        var options = new ChatCompletionOptions();
        if (config != null)
        {
            if (config.Temperature >= 0) options.Temperature = (float)config.Temperature;
            if (config.MaxTokens > 0) options.MaxOutputTokenCount = config.MaxTokens;
            if (config.TopP >= 0) options.TopP = (float)config.TopP;
            if (config.FrequencyPenalty >= -2) options.FrequencyPenalty = (float)config.FrequencyPenalty;
            if (config.PresencePenalty >= -2) options.PresencePenalty = (float)config.PresencePenalty;
        }
        else if (_aiOptions.MaxTokens > 0)
        {
            options.MaxOutputTokenCount = _aiOptions.MaxTokens;
        }
        return options;
    }

    private async Task<List<OpenAIChatMessage>> BuildAssistantConversationMessagesAsync(ChatSession session, ChatMessage triggerMessage, CancellationToken cancellationToken)
    {
        var conversation = new List<OpenAIChatMessage>();
        try
        {
            var history = await _messageFactory.FindAsync(m => m.SessionId == session.Id, q => q.OrderByDescending(m => m.CreatedAt), AssistantContextMessageLimit);
            history.Reverse();
            foreach (var message in history)
            {
                cancellationToken.ThrowIfCancellationRequested();
                if (message.IsDeleted || message.IsRecalled) continue;
                var normalized = NormalizeAssistantMessageContent(message);
                if (string.IsNullOrWhiteSpace(normalized)) continue;

                if (string.Equals(message.SenderId, AiAssistantConstants.AssistantUserId, StringComparison.Ordinal))
                {
                    conversation.Add(new AssistantChatMessage(normalized));
                }
                else
                {
                    var content = normalized;
                    if (!string.Equals(message.SenderId, triggerMessage.SenderId, StringComparison.Ordinal))
                    {
                        var displayName = GetParticipantDisplayName(session, message);
                        content = $"{displayName}：{normalized}";
                    }
                    conversation.Add(new UserChatMessage(content));
                }
            }
        }
        catch (Exception ex) { _logger.LogWarning(ex, "构建上下文失败"); }
        if (conversation.Count == 0)
        {
            var fallback = NormalizeAssistantMessageContent(triggerMessage);
            if (!string.IsNullOrWhiteSpace(fallback)) conversation.Add(new UserChatMessage(fallback));
        }
        return conversation;
    }

    private string? NormalizeAssistantMessageContent(ChatMessage message)
    {
        if (message == null || string.IsNullOrWhiteSpace(message.Content)) return null;
        var content = Regex.Replace(message.Content, @"<[^>]*>", string.Empty);
        return content.Trim();
    }

    private static string GetParticipantDisplayName(ChatSession session, ChatMessage message)
    {
        if (string.Equals(message.SenderId, AiAssistantConstants.AssistantUserId, StringComparison.Ordinal)) return AiAssistantConstants.AssistantDisplayName;
        if (session.ParticipantNames != null && session.ParticipantNames.TryGetValue(message.SenderId, out var named) && !string.IsNullOrWhiteSpace(named)) return named;
        return !string.IsNullOrWhiteSpace(message.SenderName) ? message.SenderName : "对方";
    }

    private async Task<ChatMessage> CreateAssistantMessageAsync(ChatSession session, string content, string recipientId, string? clientMsgId, CancellationToken cancellationToken)
    {
        var message = new ChatMessage
        {
            SessionId = session.Id,
            CompanyId = session.CompanyId,
            SenderId = AiAssistantConstants.AssistantUserId,
            SenderName = AiAssistantConstants.AssistantDisplayName,
            RecipientId = recipientId,
            Type = ChatMessageType.Text,
            Content = content,
            Metadata = new Dictionary<string, object> { ["isAssistant"] = true },
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow,
            ClientMessageId = clientMsgId
        };
        var saved = await _messageFactory.CreateAsync(message);
        await _sessionService.UpdateSessionAfterMessageAsync(session, saved, AiAssistantConstants.AssistantUserId);

        var payload = new ChatMessageRealtimePayload { SessionId = session.Id, Message = saved };
        await _broadcaster.BroadcastMessageAsync(session.Id, payload);

        return saved;
    }

    private async Task<ChatMessage> CreateAssistantMessageStreamingAsync(ChatSession session, string initialContent, string recipientId, string? clientMsgId, string? triggerMsgId, CancellationToken cancellationToken)
    {
        var message = new ChatMessage
        {
            SessionId = session.Id,
            CompanyId = session.CompanyId,
            SenderId = AiAssistantConstants.AssistantUserId,
            SenderName = AiAssistantConstants.AssistantDisplayName,
            RecipientId = recipientId,
            Type = ChatMessageType.Text,
            Content = initialContent,
            Metadata = new Dictionary<string, object> { ["isAssistant"] = true, ["streaming"] = true },
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow,
            ClientMessageId = clientMsgId
        };
        if (!string.IsNullOrWhiteSpace(triggerMsgId)) message.Metadata["triggerMessageId"] = triggerMsgId;

        var saved = await _messageFactory.CreateAsync(message);
        await _sessionService.UpdateSessionAfterMessageAsync(session, saved, AiAssistantConstants.AssistantUserId);

        var payload = new ChatMessageRealtimePayload { SessionId = session.Id, Message = saved, BroadcastAtUtc = DateTime.UtcNow };
        await _broadcaster.BroadcastMessageAsync(session.Id, payload);
        return saved;
    }

    private async Task UpdateStreamingMessageAsync(string messageId, string newContent, CancellationToken cancellationToken)
    {
        await _messageFactory.UpdateAsync(messageId, m => { m.Content = newContent; m.UpdatedAt = DateTime.UtcNow; });
    }

    private async Task CompleteStreamingMessageAsync(string messageId, string finalContent, CancellationToken cancellationToken)
    {
        var msg = await _messageFactory.GetByIdAsync(messageId);
        if (msg == null) return;
        var meta = msg.Metadata != null ? new Dictionary<string, object>(msg.Metadata) : new Dictionary<string, object>();
        meta.Remove("streaming");
        await _messageFactory.UpdateAsync(messageId, m => { m.Content = finalContent; m.UpdatedAt = DateTime.UtcNow; m.Metadata = meta; });
    }

    /// <summary>
    /// 检查是否应跳过自动助手回复。
    /// </summary>
    /// <param name="triggerMessage">触发回复的消息</param>
    /// <returns>如果应跳过则返回 true</returns>
    public bool ShouldSkipAutomaticAssistantReply(ChatMessage triggerMessage)
    {
        if (triggerMessage.Metadata == null || !triggerMessage.Metadata.TryGetValue("assistantStreaming", out var value)) return false;
        return value switch { bool b => b, JsonElement j when j.ValueKind == JsonValueKind.True => true, _ => false };
    }

    private Dictionary<string, object> NormalizeMetadata(Dictionary<string, object>? raw)
    {
        if (raw == null) return new Dictionary<string, object>();
        return raw.ToDictionary(k => k.Key, v => NormalizeMetadataValue(v.Value));
    }

    private object NormalizeMetadataValue(object value)
    {
        if (value is JsonElement json)
        {
            return json.ValueKind switch
            {
                JsonValueKind.String => json.GetString() ?? string.Empty,
                JsonValueKind.Number => json.TryGetInt64(out var l) ? l : json.GetDouble(),
                JsonValueKind.True => true,
                JsonValueKind.False => false,
                JsonValueKind.Object => json.EnumerateObject().ToDictionary(p => p.Name, p => NormalizeMetadataValue(p.Value)),
                JsonValueKind.Array => json.EnumerateArray().Select(x => NormalizeMetadataValue(x)).ToList(),
                _ => string.Empty
            };
        }
        return value;
    }
}
