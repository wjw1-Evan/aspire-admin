using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.Linq;
using System.Text.Json;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using OpenAI;
using OpenAI.Chat;
using Platform.ApiService.Constants;
using Platform.ApiService.Extensions;
using Platform.ApiService.Models;
using Platform.ServiceDefaults.Services;
using DomainChatMessage = Platform.ApiService.Models.ChatMessage;
using OpenAiChatMessage = OpenAI.Chat.ChatMessage;

namespace Platform.ApiService.Services;

public interface IAiSuggestionService
{
    Task<AiSuggestionResponse> GetSmartRepliesAsync(AiSmartReplyRequest request, string currentUserId, CancellationToken cancellationToken = default);
    Task<MatchSuggestionResponse> GetMatchSuggestionsAsync(MatchSuggestionRequest request, string currentUserId);
}

public class AiSuggestionService : IAiSuggestionService
{
    private readonly DbContext _context;
    private const int DefaultSuggestionCount = 2;
    private const string SmartReplySource = "smart-reply";
    private const string DefaultSuggestionNotice = "小科暂时没有生成推荐，请稍后再试或尝试调整话题。";
    private const string DefaultSystemPrompt = "你是小科，担任微信风格的对话助理，请使用简体中文，提供自然、真诚且有温度的建议。";

    private readonly OpenAIClient _openAiClient;
    private readonly IConfiguration _configuration;
    private readonly ILogger<AiSuggestionService> _logger;
    private readonly ITenantContext _tenantContext;

    public AiSuggestionService(DbContext context, OpenAIClient openAiClient, IConfiguration configuration, ILogger<AiSuggestionService> logger, ITenantContext tenantContext)
    {
        _context = context;
        _openAiClient = openAiClient;
        _configuration = configuration;
        _logger = logger;
        _tenantContext = tenantContext;
    }

    public async Task<AiSuggestionResponse> GetSmartRepliesAsync(AiSmartReplyRequest request, string currentUserId, CancellationToken cancellationToken = default)
    {
        var context = await PrepareSmartReplyContextAsync(request, currentUserId);
        var response = new AiSuggestionResponse();
        var chatClient = ResolveChatClient(context, response, out var model);
        if (chatClient is null) return response;

        var languageTag = string.IsNullOrWhiteSpace(context.Request.Locale) ? "zh-CN" : context.Request.Locale;
        var systemPrompt = _configuration["Ai:SystemPrompt"];
        var instruction = BuildInstruction(string.IsNullOrWhiteSpace(systemPrompt) ? DefaultSystemPrompt : systemPrompt, languageTag);
        var userContent = context.ContextLines.Count == 0 ? "（上下文为空）" : string.Join("\n", context.ContextLines);
        var messages = BuildChatMessages(instruction, context.ConversationMessages, userContent);
        var completionOptions = new ChatCompletionOptions { EndUserId = currentUserId };


        var stopwatch = Stopwatch.StartNew();
        try
        {
            var result = await chatClient.CompleteChatAsync(messages, completionOptions, cancellationToken);
            stopwatch.Stop();
            response.LatencyMs = (int)stopwatch.Elapsed.TotalMilliseconds;
            HandleCompletionResponse(response, result.Value, model, context.ContextLines);
        }
        catch (Exception ex)
        {
            stopwatch.Stop();
            response.LatencyMs = (int)stopwatch.Elapsed.TotalMilliseconds;
            _logger.LogWarning(ex, "OpenAI call failed, using fallback");
            AssignSuggestions(response, BuildFallbackSuggestions(context.ContextLines));
        }

        return response;
    }

    public async Task<MatchSuggestionResponse> GetMatchSuggestionsAsync(MatchSuggestionRequest request, string currentUserId)
    {
        request = request.EnsureNotNull(nameof(request));
        if (string.IsNullOrWhiteSpace(request.UserId)) request.UserId = currentUserId;
        if (!string.Equals(request.UserId, currentUserId, StringComparison.Ordinal)) throw new UnauthorizedAccessException("禁止为其他用户请求匹配推荐");

        var companyId = await _tenantContext.GetCurrentCompanyIdAsync() ?? string.Empty;
        var interests = (request.Interests ?? new List<string>()).Where(t => !string.IsNullOrWhiteSpace(t)).Select(t => t.Trim().ToLowerInvariant()).ToHashSet();
        var limit = Math.Clamp(request.Limit ?? 10, 1, 50);

        var sessions = await _context.Set<ChatSession>().Where(s => s.Participants.Contains(currentUserId) && s.CompanyId == companyId).OrderByDescending(s => s.UpdatedAt).Take(50).ToListAsync();
        var sessionMap = new Dictionary<string, string>();
        foreach (var s in sessions)
        {
            if (s.Participants == null) continue;
            foreach (var p in s.Participants)
            {
                if (string.Equals(p, currentUserId, StringComparison.Ordinal) || string.Equals(p, AiAssistantConstants.AssistantUserId, StringComparison.Ordinal)) continue;
                if (!string.IsNullOrEmpty(s.Id)) sessionMap[p] = s.Id;
            }
        }

        var candidates = await _context.Set<AppUser>().Where(u => u.IsActive && u.CurrentCompanyId == companyId).ToListAsync();
        var items = candidates.Where(u => u.Id != currentUserId && u.Id != AiAssistantConstants.AssistantUserId)
            .Select(u => BuildMatchSuggestion(u, sessionMap, interests))
            .Where(s => s != null).Select(s => s!)
            .OrderByDescending(s => s.MatchScore).ThenBy(s => s.DisplayName)
            .Take(limit).ToList();

        return new MatchSuggestionResponse { Items = items, GeneratedAt = DateTime.UtcNow };
    }

    private MatchSuggestionItem? BuildMatchSuggestion(AppUser user, Dictionary<string, string> sessionMap, HashSet<string> interests)
    {
        var name = string.IsNullOrWhiteSpace(user.Name) ? user.Username : user.Name!;
        if (string.IsNullOrWhiteSpace(name)) return null;

        var tags = user.Tags?.Select(t => t.Label ?? t.Key).Where(l => !string.IsNullOrWhiteSpace(l)).Select(l => l!.Trim()).Distinct(StringComparer.OrdinalIgnoreCase).ToList() ?? new List<string>();
        var shared = interests.Count == 0 ? new List<string>() : tags.Where(t => interests.Contains(t.ToLowerInvariant())).Take(5).ToList();
        var baseScore = user.LastLoginAt.HasValue ? Math.Clamp(1d - (DateTime.UtcNow - user.LastLoginAt.Value.ToUniversalTime()).TotalDays / 30d, 0, 1) : 0.5d;
        var interestScore = shared.Count == 0 ? 0.2d : Math.Min(0.6d, 0.3d + shared.Count * 0.1d);
        var sessionScore = sessionMap.ContainsKey(user.Id) ? 0.2d : 0d;
        var score = Math.Clamp(baseScore * 0.4d + interestScore + sessionScore, 0d, 1d);

        return new MatchSuggestionItem { UserId = user.Id, DisplayName = name, AvatarUrl = user.Avatar, SharedInterests = shared, MatchScore = Math.Round(score, 2), Bio = user.Email, SessionId = sessionMap.TryGetValue(user.Id, out var sid) ? sid : null };
    }

    private async Task<SmartReplyContext> PrepareSmartReplyContextAsync(AiSmartReplyRequest request, string currentUserId)
    {
        request = request.EnsureNotNull(nameof(request));
        if (!string.Equals(request.UserId, currentUserId, StringComparison.Ordinal)) throw new UnauthorizedAccessException("禁止为其他用户请求智能回复");

        var session = await _context.Set<ChatSession>().FirstOrDefaultAsync(s => s.Id == request.SessionId) ?? throw new KeyNotFoundException("会话不存在");
        if (!session.Participants.Contains(currentUserId)) throw new UnauthorizedAccessException("当前用户不属于该会话");

        var msgs = await _context.Set<DomainChatMessage>().Where(m => m.SessionId == session.Id).OrderBy(m => m.CreatedAt).ToListAsync();
        var conversationMessages = new List<AiConversationMessage>();
        var contextLines = new List<string>();

        foreach (var m in msgs)
        {
            if (m.IsDeleted == true || m.IsRecalled) continue;
            var content = m.Content?.Trim() ?? (m.Attachment != null ? (m.Attachment.MimeType?.StartsWith("image/") == true ? "[图片]" : "[附件]") : null);
            if (string.IsNullOrWhiteSpace(content)) continue;
            var isSelf = m.SenderId == currentUserId;
            conversationMessages.Add(new AiConversationMessage { Role = isSelf ? "assistant" : "user", Content = content });
            contextLines.Add($"{(isSelf ? "我" : (session.ParticipantNames?.GetValueOrDefault(m.SenderId) ?? m.SenderName ?? m.SenderId))}: {content}");
        }

        // Merge request messages
        var reqMsgs = (request.ConversationMessages ?? new List<AiConversationMessage>()).Where(m => !string.IsNullOrWhiteSpace(m.Content)).ToList();
        if (!msgs.Any() && reqMsgs.Any(m => m.Role != "system"))
        {
            foreach (var m in reqMsgs.Where(m => m.Role != "system"))
            {
                conversationMessages.Add(m);
                contextLines.Add($"{(m.Role == "assistant" ? "我" : "对方")}: {m.Content}");
            }
        }
        foreach (var m in reqMsgs.Where(m => m.Role == "system")) { conversationMessages.Add(m); contextLines.Add($"系统: {m.Content}"); }
        if (request.ConversationContext != null) contextLines.AddRange(request.ConversationContext.Where(l => !string.IsNullOrWhiteSpace(l)));

        return new SmartReplyContext(request, session, contextLines, conversationMessages);
    }

    private string BuildInstruction(string systemPrompt, string languageTag) => $@"{systemPrompt}
当前语言：{languageTag}
请基于历史生成 {DefaultSuggestionCount} 条智能回复建议。遵循：
1. 每条建议短小精悍。
2. 风格亲切自然。
3. 如果历史为空，提供开场白。
4. 返回 JSON: {{ ""suggestions"": [ {{ ""content"": ""..."", ""category"": ""..."", ""style"": ""..."", ""quickTip"": ""..."", ""insight"": ""..."", ""confidence"": 0.9 }} ] }}
只返回 JSON。";

    private List<OpenAiChatMessage> BuildChatMessages(string instruction, List<AiConversationMessage> history, string fallback)
    {
        var messages = new List<OpenAiChatMessage> { new SystemChatMessage(instruction) };
        bool hasContent = false;
        foreach (var h in history)
        {
            if (string.IsNullOrWhiteSpace(h.Content)) continue;
            messages.Add(h.Role switch { "assistant" => new AssistantChatMessage(h.Content), "system" => new SystemChatMessage(h.Content), _ => new UserChatMessage(h.Content) });
            if (h.Role != "system") hasContent = true;
        }
        if (!hasContent) messages.Add(new UserChatMessage(fallback));
        return messages;
    }

    private ChatClient? ResolveChatClient(SmartReplyContext context, AiSuggestionResponse response, out string model)
    {
        model = "gpt-4o-mini";
        try { return _openAiClient.GetChatClient(model); }
        catch { AssignSuggestions(response, BuildFallbackSuggestions(context.ContextLines)); return null; }
    }

    private void HandleCompletionResponse(AiSuggestionResponse response, ChatCompletion completion, string model, List<string> contextLines)
    {
        var text = completion.Content?.FirstOrDefault()?.Text;
        var suggestions = TryParseSuggestions(text, model) ?? BuildFallbackSuggestions(contextLines);
        AssignSuggestions(response, suggestions);
    }

    private List<AiSuggestionItem>? TryParseSuggestions(string? text, string model)
    {
        if (string.IsNullOrWhiteSpace(text)) return null;
        try
        {
            var payload = JsonSerializer.Deserialize<SmartReplyPayload>(text, new JsonSerializerOptions { PropertyNameCaseInsensitive = true });
            if (payload?.Suggestions == null || !payload.Suggestions.Any()) return null;
            return payload.Suggestions.Take(DefaultSuggestionCount).Select(s => new AiSuggestionItem
            {
                Content = s.Content.Trim(), Confidence = s.Confidence, Category = s.Category, Style = s.Style, QuickTip = s.QuickTip, Insight = s.Insight, Source = SmartReplySource,
                Metadata = new Dictionary<string, object> { ["model"] = model, ["category"] = s.Category ?? "", ["style"] = s.Style ?? "" }
            }).ToList();
        }
        catch { return null; }
    }

    private void AssignSuggestions(AiSuggestionResponse response, List<AiSuggestionItem> suggestions)
    {
        response.Suggestions = suggestions ?? new List<AiSuggestionItem>();
        response.Notice = response.Suggestions.Any() ? null : DefaultSuggestionNotice;
    }

    private List<AiSuggestionItem> BuildFallbackSuggestions(List<string> context)
    {
        var s = new List<AiSuggestionItem>();
        var latest = context.LastOrDefault()?.Split(':').LastOrDefault()?.Trim();
        if (!string.IsNullOrEmpty(latest))
        {
            var topic = latest.Length > 10 ? latest[..10] + "..." : latest;
            s.Add(new AiSuggestionItem { Content = $"关于{topic}，我挺感兴趣的～", Category = "追问", Style = "好奇", QuickTip = "延续话题", Source = "fallback", Confidence = 0.5 });
            s.Add(new AiSuggestionItem { Content = "原来如此，我也觉得挺有道理。", Category = "共情", Style = "赞同", QuickTip = "表达认同", Source = "fallback", Confidence = 0.4 });
        }
        if (s.Count < DefaultSuggestionCount) s.Add(new AiSuggestionItem { Content = "最近在忙些什么呢？", Category = "闲聊", Style = "自然", QuickTip = "开启新话题", Source = "fallback", Confidence = 0.3 });
        return s.Take(DefaultSuggestionCount).ToList();
    }

    private sealed record SmartReplyContext(AiSmartReplyRequest Request, ChatSession Session, List<string> ContextLines, List<AiConversationMessage> ConversationMessages);
    private sealed class SmartReplyPayload { public List<SmartReplyItem> Suggestions { get; set; } = new(); }
    private sealed class SmartReplyItem { public string Content { get; set; } = ""; public double? Confidence { get; set; } public string? Category { get; set; } public string? Style { get; set; } public string? QuickTip { get; set; } public string? Insight { get; set; } }
}
