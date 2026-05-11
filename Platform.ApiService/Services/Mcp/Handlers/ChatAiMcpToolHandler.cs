using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Platform.ApiService.Models;
using Platform.ServiceDefaults.Services;
using Microsoft.Extensions.Logging;

namespace Platform.ApiService.Services.Mcp.Handlers;

/// <summary>
/// 小科 AI 聊天 MCP 工具处理器 - 提供会话管理和消息交互能力
/// </summary>
/// <remarks>
/// 聊天域服务（IChatSessionService）通过 IServiceScopeFactory 惰性解析，
/// 避免 DI 容器在构造时解析到 IMcpService → IChatAiService → ... → 本 Handler 的循环链。
/// </remarks>
public class ChatAiMcpToolHandler : McpToolHandlerBase
{
    private readonly IServiceScopeFactory _scopeFactory;
    private readonly IAiSuggestionService _aiSuggestionService;
    private readonly ILogger<ChatAiMcpToolHandler> _logger;

    public ChatAiMcpToolHandler(
        IServiceScopeFactory scopeFactory,
        IAiSuggestionService aiSuggestionService,
        ILogger<ChatAiMcpToolHandler> logger)
    {
        _scopeFactory = scopeFactory ?? throw new ArgumentNullException(nameof(scopeFactory));
        _aiSuggestionService = aiSuggestionService;
        _logger = logger;

        #region 会话管理

        RegisterTool("get_chat_sessions", "获取聊天会话列表，支持分页。关键词：会话列表,聊天记录,对话列表",
            ObjectSchema(MergeProperties(
                new Dictionary<string, object>
                {
                    ["keyword"] = new Dictionary<string, object> { ["type"] = "string", ["description"] = "搜索关键词" }
                },
                PaginationSchema()
            )),
            async (args, uid) =>
            {
                using var scope = _scopeFactory.CreateScope();
                var sessionService = scope.ServiceProvider.GetRequiredService<IChatSessionService>();
                var (Current, PageSize) = ParsePaginationArgs(args);
                var request = new Platform.ServiceDefaults.Models.ProTableRequest { Current = Current, PageSize = PageSize, Search = args.GetValueOrDefault("keyword")?.ToString() };
                var result = await sessionService.GetSessionsAsync(request);
                var items = await result.Queryable.ToListAsync();
                return new { items, rowCount = result.RowCount, currentPage = result.CurrentPage, pageSize = result.PageSize, pageCount = result.PageCount };
            });

        RegisterTool("get_or_create_assistant_session", "获取或创建与小科 AI 的对话。每个用户只有一个与小科的默认会话。关键词：小科对话,AI对话,开始聊天",
            async (args, uid) =>
            {
                using var scope = _scopeFactory.CreateScope();
                var sessionService = scope.ServiceProvider.GetRequiredService<IChatSessionService>();
                return await sessionService.GetOrCreateAssistantSessionAsync();
            });

        RegisterTool("get_session_by_id", "根据会话 ID 获取聊天会话详情。关键词：会话详情,查询会话,查看对话",
            ObjectSchema(new Dictionary<string, object>
            {
                ["sessionId"] = new Dictionary<string, object> { ["type"] = "string", ["description"] = "会话ID" }
            }, ["sessionId"]),
            async (args, uid) =>
            {
                using var scope = _scopeFactory.CreateScope();
                var sessionService = scope.ServiceProvider.GetRequiredService<IChatSessionService>();
                var sessionId = args.GetValueOrDefault("sessionId")?.ToString();
                if (string.IsNullOrEmpty(sessionId)) return new { error = "sessionId 必填" };
                var session = await sessionService.GetSessionByIdAsync(sessionId);
                if (session == null) return new { error = "会话不存在" };
                return session;
            });

        #endregion

        #region 消息管理

        RegisterTool("get_chat_messages", "获取指定会话的消息列表，支持游标分页。关键词：消息列表,聊天内容,查看消息,聊天记录",
            ObjectSchema(new Dictionary<string, object>
            {
                ["sessionId"] = new Dictionary<string, object> { ["type"] = "string", ["description"] = "会话ID" },
                ["limit"] = new Dictionary<string, object> { ["type"] = "integer", ["description"] = "返回数量（默认20）" },
                ["cursor"] = new Dictionary<string, object> { ["type"] = "string", ["description"] = "分页游标" }
            }, ["sessionId"]),
            async (args, uid) =>
            {
                using var scope = _scopeFactory.CreateScope();
                var sessionService = scope.ServiceProvider.GetRequiredService<IChatSessionService>();
                var sessionId = args.GetValueOrDefault("sessionId")?.ToString();
                if (string.IsNullOrEmpty(sessionId)) return new { error = "sessionId 必填" };
                var limit = int.TryParse(args.GetValueOrDefault("limit")?.ToString(), out var l) ? l : 20;
                var request = new ChatMessageListRequest { Limit = limit, Cursor = args.GetValueOrDefault("cursor")?.ToString() };
                var (messages, hasMore, nextCursor) = await sessionService.GetMessagesAsync(sessionId, request);
                return new { items = messages, hasMore, nextCursor };
            });

        RegisterTool("send_chat_message", "向指定会话发送聊天消息。关键词：发送消息,发送,提问,回复",
            ObjectSchema(new Dictionary<string, object>
            {
                ["sessionId"] = new Dictionary<string, object> { ["type"] = "string", ["description"] = "会话ID" },
                ["content"] = new Dictionary<string, object> { ["type"] = "string", ["description"] = "消息内容" },
                ["messageType"] = new Dictionary<string, object> { ["type"] = "string", ["description"] = "消息类型: Text(文本)/Image(图片)/File(文件)，默认 Text" }
            }, ["sessionId", "content"]),
            async (args, uid) =>
            {
                using var scope = _scopeFactory.CreateScope();
                var sessionService = scope.ServiceProvider.GetRequiredService<IChatSessionService>();
                var sessionId = args.GetValueOrDefault("sessionId")?.ToString();
                var content = args.GetValueOrDefault("content")?.ToString();
                if (string.IsNullOrEmpty(sessionId) || string.IsNullOrEmpty(content)) return new { error = "sessionId 和 content 必填" };
                var request = new SendChatMessageRequest
                {
                    SessionId = sessionId,
                    Content = content
                };
                var message = await sessionService.SendMessageAsync(request, null);
                return new { message.Id, message.SessionId, message.Content, message.CreatedAt, message.SenderId };
            });

        RegisterTool("mark_session_read", "将会话标记为已读。关键词：标记已读,已读,会话已读",
            ObjectSchema(new Dictionary<string, object>
            {
                ["sessionId"] = new Dictionary<string, object> { ["type"] = "string", ["description"] = "会话ID" },
                ["lastMessageId"] = new Dictionary<string, object> { ["type"] = "string", ["description"] = "最后读取的消息ID" }
            }, ["sessionId", "lastMessageId"]),
            async (args, uid) =>
            {
                using var scope = _scopeFactory.CreateScope();
                var sessionService = scope.ServiceProvider.GetRequiredService<IChatSessionService>();
                var sessionId = args.GetValueOrDefault("sessionId")?.ToString();
                var lastMessageId = args.GetValueOrDefault("lastMessageId")?.ToString();
                if (string.IsNullOrEmpty(sessionId) || string.IsNullOrEmpty(lastMessageId)) return new { error = "sessionId 和 lastMessageId 必填" };
                await sessionService.MarkSessionReadAsync(sessionId, lastMessageId);
                return new { message = "已标记为已读" };
            });

        RegisterTool("delete_chat_message", "删除指定聊天消息（软删除）。关键词：删除消息,撤回消息",
            ObjectSchema(new Dictionary<string, object>
            {
                ["sessionId"] = new Dictionary<string, object> { ["type"] = "string", ["description"] = "会话ID" },
                ["messageId"] = new Dictionary<string, object> { ["type"] = "string", ["description"] = "消息ID" }
            }, ["sessionId", "messageId"]),
            async (args, uid) =>
            {
                using var scope = _scopeFactory.CreateScope();
                var sessionService = scope.ServiceProvider.GetRequiredService<IChatSessionService>();
                var sessionId = args.GetValueOrDefault("sessionId")?.ToString();
                var messageId = args.GetValueOrDefault("messageId")?.ToString();
                if (string.IsNullOrEmpty(sessionId) || string.IsNullOrEmpty(messageId)) return new { error = "sessionId 和 messageId 必填" };
                await sessionService.DeleteMessageAsync(sessionId, messageId);
                return new { message = "消息已删除" };
            });

        #endregion
    }
}
