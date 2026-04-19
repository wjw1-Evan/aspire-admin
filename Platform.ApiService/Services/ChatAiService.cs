using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.AI;
using OpenAI.Chat;
using Platform.ApiService.Constants;
using Platform.ApiService.Models;
using System.Text;
using System.Text.Json;
using System.Text.RegularExpressions;
using ChatMessage = Platform.ApiService.Models.ChatMessage;
using OpenAIChatMessage = OpenAI.Chat.ChatMessage;

namespace Platform.ApiService.Services;

/// <summary>
/// 聊天 AI 服务实现 - 提供基于 LLM 的助手回复、流式输出、工具调用及记忆管理
/// </summary>
public class ChatAiService : IChatAiService
{
    private readonly DbContext _context;
    private const int AssistantContextMessageLimit = 24;
    private readonly IChatClient _openAiClient;
    private readonly IConfiguration _configuration;
    private readonly IUserService _userService;
    private readonly IChatBroadcaster _broadcaster;
    private readonly IChatSessionService _sessionService;
    private readonly IMcpService _mcpService;
    private readonly IXiaokeConfigService? _xiaokeConfigService;
    private readonly ILogger<ChatAiService> _logger;

    public ChatAiService(
        DbContext context,
        IChatClient openAiClient,
        IConfiguration configuration,
        IUserService userService,
        IChatBroadcaster broadcaster,
        IChatSessionService sessionService,
        IMcpService mcpService,
        IXiaokeConfigService? xiaokeConfigService,
        ILogger<ChatAiService> logger)
    {
        _context = context;
        _openAiClient = openAiClient ?? throw new ArgumentNullException(nameof(openAiClient));
        _configuration = configuration ?? throw new ArgumentNullException(nameof(configuration));
        _userService = userService ?? throw new ArgumentNullException(nameof(userService));
        _broadcaster = broadcaster ?? throw new ArgumentNullException(nameof(broadcaster));
        _sessionService = sessionService ?? throw new ArgumentNullException(nameof(sessionService));
        _mcpService = mcpService ?? throw new ArgumentNullException(nameof(mcpService));
        _xiaokeConfigService = xiaokeConfigService;
        _logger = logger ?? throw new ArgumentNullException(nameof(logger));
    }

    public async Task RespondAsAssistantAsync(ChatSession session, ChatMessage triggerMessage, CancellationToken cancellationToken)
    {
        if (!session.Participants.Contains(AiAssistantConstants.AssistantUserId)) return;
        if (triggerMessage.SenderId == AiAssistantConstants.AssistantUserId) return;
        if (ShouldSkipAutomaticAssistantReply(triggerMessage)) return;

        // 检查小科配置。如果明确禁用了，则跳过。
        var xiaokeConfig = await GetXiaokeConfig();
        if (xiaokeConfig != null && !xiaokeConfig.IsEnabled)
        {
            _logger.LogInformation("小科已在配置中明确禁用，跳过回复。会话: {SessionId}", session.Id);
            return;
        }

        // 幂等性检查：防止针对同一条消息重复生成回复
        var existingAssistant = await FindExistingAssistantReply(session.Id, triggerMessage.Id);
        if (existingAssistant != null)
        {
            _logger.LogDebug("消息 {MessageId} 已有助理回复，跳过。会话: {SessionId}", triggerMessage.Id, session.Id);
            return;
        }

        if (triggerMessage.Type == ChatMessageType.Text)
        {
            await GenerateAssistantReplyStreamAsync(session, triggerMessage, cancellationToken, null, null, xiaokeConfig);
        }
        else
        {
            var replyContent = "我已收到您的附件，目前仅支持文本对话，欢迎告诉我想要讨论的内容。";
            await CreateAssistantMessageAsync(session, replyContent, triggerMessage.SenderId, null, cancellationToken);
        }
    }

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
        var existing = await _context.Set<ChatMessage>()
            .Where(m => m.SessionId == sessionId && m.SenderId == AiAssistantConstants.AssistantUserId)
            .Take(100)
            .ToListAsync();

        return existing.FirstOrDefault(m => m.Metadata != null && m.Metadata.TryGetValue("triggerMessageId", out var id) && id?.ToString() == triggerMessageId);
    }

    private async Task<ChatMessage?> GenerateAssistantReplyStreamAsync(
        ChatSession session,
        ChatMessage triggerMessage,
        CancellationToken cancellationToken,
        Func<string, string, string, Task>? onChunk = null,
        Func<ChatMessage, Task>? onComplete = null,
        XiaokeConfigDto? config = null)
    {
        var xiaokeConfig = config ?? await GetXiaokeConfig();
        if (xiaokeConfig == null) return null; // 如果没有配置且获取不到，则不回复

        var systemPrompt = await GetEffectiveSystemPrompt(triggerMessage.SenderId, xiaokeConfig);
        var conversationMessages = await BuildAssistantConversationMessagesAsync(session, triggerMessage, cancellationToken);
        if (conversationMessages.Count == 0) return null;

        var mcpResult = await _mcpService.DetectAndCallMcpToolsAsync(session, triggerMessage, triggerMessage.SenderId, cancellationToken);
        var toolResultContext = mcpResult?.Context;

        var instructionBuilder = new StringBuilder();
        instructionBuilder.AppendLine(systemPrompt.Trim());
        instructionBuilder.AppendLine("当前用户语言标识：zh-CN");
        instructionBuilder.Append("请结合完整的历史聊天记录，使用自然、真诚且有温度的语气回复对方。");

        if (!string.IsNullOrWhiteSpace(toolResultContext))
        {
            instructionBuilder.AppendLine("\n【已查询的数据】\n" + toolResultContext + "\n请基于以上查询结果，用自然、友好的语言向用户回复。");
        }

        var messages = new List<Microsoft.Extensions.AI.ChatMessage>
        {
            new(ChatRole.System, instructionBuilder.ToString())
        };
        messages.AddRange(conversationMessages);
    

        ChatMessage? assistantMessage = null;
        var accumulatedContent = new StringBuilder();
        var lastSavedLength = 0;

        _logger.LogInformation("开始为会话 {SessionId} 生成助手机器人回复...", session.Id);

        try
        {
            assistantMessage = await CreateAssistantMessageStreamingAsync(session, string.Empty, triggerMessage.SenderId, null, triggerMessage.Id, cancellationToken);

            if (!string.IsNullOrEmpty(toolResultContext))
            {
                var tip = $">  **{mcpResult?.ToolSummary}**  \n\n";
                accumulatedContent.Append(tip);
                if (onChunk != null) await onChunk(session.Id, assistantMessage.Id, tip);
                await _broadcaster.BroadcastMessageChunkAsync(session.Participants, assistantMessage.Id, tip);
            }

            var chatOptions = new ChatOptions
            {
                MaxOutputTokens = xiaokeConfig?.MaxTokens ?? 2048
            };

            await foreach (var update in _openAiClient.GetStreamingResponseAsync(messages, chatOptions, cancellationToken))
            {
                cancellationToken.ThrowIfCancellationRequested();
                if (update?.Text == null) continue;

                var delta = update.Text;
                accumulatedContent.Append(delta);
                if (onChunk != null) await onChunk(session.Id, assistantMessage.Id, delta);
                await _broadcaster.BroadcastMessageChunkAsync(session.Participants, assistantMessage.Id, delta);

                if (accumulatedContent.Length - lastSavedLength >= 50)
                {
                    var content = accumulatedContent.ToString();
                    var msgId = assistantMessage.Id;
                    lastSavedLength = accumulatedContent.Length;
                    try { await UpdateStreamingMessageAsync(msgId, content, cancellationToken); } catch { }
                }
            }

            _logger.LogInformation("会话 {SessionId} 的助手内容生成完成，长度: {Length}", session.Id, accumulatedContent.Length);

            var finalContent = accumulatedContent.ToString().Trim();
            if (assistantMessage != null && !string.IsNullOrEmpty(finalContent))
            {
                await UpdateStreamingMessageAsync(assistantMessage.Id, finalContent, cancellationToken);
                await CompleteStreamingMessageAsync(assistantMessage.Id, finalContent, cancellationToken);

                var completed = await _context.Set<ChatMessage>().FirstOrDefaultAsync(m => m.Id == assistantMessage.Id);
                if (completed != null)
                {
                    if (onComplete != null) await onComplete(completed);
                    await _broadcaster.BroadcastMessageCompleteAsync(session.Participants, completed);
                }
                return completed;
            }
            else if (assistantMessage != null)
            {
                _context.Set<ChatMessage>().Remove(assistantMessage);
                await _context.SaveChangesAsync();
            }
            return null;
        }
        catch (Exception)
        {
            if (assistantMessage != null)
            {
                _context.Set<ChatMessage>().Remove(assistantMessage);
                await _context.SaveChangesAsync();
            }
            return null;
        }
    }

    private async Task<XiaokeConfigDto?> GetXiaokeConfig()
    {
        if (_xiaokeConfigService == null) return null;
        try
        {
            return await _xiaokeConfigService.GetDefaultConfigAsync();
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "获取小科配置失败");
            return null;
        }
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
            else if (!string.IsNullOrWhiteSpace(_configuration["Ai:SystemPrompt"])) basePrompt = _configuration["Ai:SystemPrompt"]!;

            var memories = await _context.Set<UserMemory>()
                .Where(m => m.UserId == userId)
                .OrderByDescending(m => m.Importance)
                .ThenByDescending(m => m.CreatedAt)
                .Take(20)
                .ToListAsync();

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

        return options;
    }

    private async Task<List<Microsoft.Extensions.AI.ChatMessage>> BuildAssistantConversationMessagesAsync(ChatSession session, ChatMessage triggerMessage, CancellationToken cancellationToken)
    {
        var conversation = new List<Microsoft.Extensions.AI.ChatMessage>();
        try
        {
            // 仅提取触发消息之前的历史记录，防止读取到并发产生的“未来”消息
            var history = await _context.Set<ChatMessage>()
                .Where(m => m.SessionId == session.Id && m.CreatedAt <= triggerMessage.CreatedAt && m.Id != triggerMessage.Id)
                .OrderByDescending(m => m.CreatedAt)
                .Take(AssistantContextMessageLimit - 1)
                .ToListAsync();

            history.Add(triggerMessage); // 确保触发消息在最后
            history = history.OrderBy(m => m.CreatedAt).ToList();
            foreach (var message in history)
            {
                cancellationToken.ThrowIfCancellationRequested();
                if (message.IsDeleted == true || message.IsRecalled) continue;
                var normalized = NormalizeAssistantMessageContent(message.Content ?? string.Empty);
                if (string.IsNullOrWhiteSpace(normalized)) continue;

                var role = string.Equals(message.SenderId, AiAssistantConstants.AssistantUserId, StringComparison.Ordinal)
                    ? Microsoft.Extensions.AI.ChatRole.Assistant
                    : Microsoft.Extensions.AI.ChatRole.User;

                if (role == Microsoft.Extensions.AI.ChatRole.User)
                {
                    var content = normalized;
                    if (!string.Equals(message.SenderId, triggerMessage.SenderId, StringComparison.Ordinal))
                    {
                        var displayName = GetParticipantDisplayName(session, message);
                        content = $"{displayName}：{normalized}";
                    }
                    conversation.Add(new Microsoft.Extensions.AI.ChatMessage(role, content));
                }
                else
                {
                    conversation.Add(new Microsoft.Extensions.AI.ChatMessage(role, normalized));
                }
            }
        }
        catch (Exception ex) { _logger.LogWarning(ex, "构建上下文失败"); }
        if (conversation.Count == 0)
        {
            var fallback = NormalizeAssistantMessageContent(triggerMessage.Content ?? string.Empty);
            if (!string.IsNullOrWhiteSpace(fallback)) conversation.Add(new Microsoft.Extensions.AI.ChatMessage(Microsoft.Extensions.AI.ChatRole.User, fallback));
        }
        return conversation;
    }

    private static string NormalizeAssistantMessageContent(string content)
    {
        if (string.IsNullOrWhiteSpace(content)) return string.Empty;
        // 仅过滤特定的容器标签，防止误删包含小于号（如 a < b）的内容
        // 这里主要针对某些 LLM 输出的思考链标签 <thought>...</thought>
        var result = System.Text.RegularExpressions.Regex.Replace(content, @"<(thought|details|summary)[^>]*>.*?</\1>", string.Empty, System.Text.RegularExpressions.RegexOptions.Singleline | System.Text.RegularExpressions.RegexOptions.IgnoreCase);
        return System.Text.RegularExpressions.Regex.Replace(result, @"<[^>]+>", string.Empty).Trim();
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
            ClientMessageId = clientMsgId
        };
        await _context.Set<ChatMessage>().AddAsync(message);
        await _context.SaveChangesAsync();

        await _sessionService.UpdateSessionAfterMessageAsync(session, message, AiAssistantConstants.AssistantUserId);

        var payload = new ChatMessageRealtimePayload { SessionId = session.Id, Message = message };
        await _broadcaster.BroadcastMessageAsync(session.Participants, payload);

        return message;
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
            ClientMessageId = clientMsgId
        };
        if (!string.IsNullOrWhiteSpace(triggerMsgId)) message.Metadata["triggerMessageId"] = triggerMsgId;

        await _context.Set<ChatMessage>().AddAsync(message);
        await _context.SaveChangesAsync();

        await _sessionService.UpdateSessionAfterMessageAsync(session, message, AiAssistantConstants.AssistantUserId);

        var payload = new ChatMessageRealtimePayload { SessionId = session.Id, Message = message, BroadcastAtUtc = DateTime.UtcNow };
        await _broadcaster.BroadcastMessageAsync(session.Participants, payload);
        return message;
    }

    private async Task UpdateStreamingMessageAsync(string messageId, string newContent, CancellationToken cancellationToken)
    {
        var message = await _context.Set<ChatMessage>().FirstOrDefaultAsync(x => x.Id == messageId);
        if (message != null)
        {
            message.Content = newContent;
            await _context.SaveChangesAsync();
        }
    }

    private async Task CompleteStreamingMessageAsync(string messageId, string finalContent, CancellationToken cancellationToken)
    {
        var msg = await _context.Set<ChatMessage>().FirstOrDefaultAsync(x => x.Id == messageId);
        if (msg == null) return;

        var meta = msg.Metadata != null ? new Dictionary<string, object>(msg.Metadata) : new Dictionary<string, object>();
        meta.Remove("streaming");

        msg.Content = finalContent;
        msg.Metadata = meta;
        await _context.SaveChangesAsync();
    }

    public bool ShouldSkipAutomaticAssistantReply(ChatMessage triggerMessage)
    {
        if (triggerMessage.Metadata == null || !triggerMessage.Metadata.TryGetValue("assistantStreaming", out var value)) return false;
        return value switch { bool b => b, JsonElement j when j.ValueKind == JsonValueKind.True => true, _ => false };
    }
}
