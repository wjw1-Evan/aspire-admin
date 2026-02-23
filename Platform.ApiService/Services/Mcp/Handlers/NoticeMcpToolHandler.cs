using Platform.ApiService.Models;
using Platform.ServiceDefaults.Services;
using Microsoft.Extensions.Logging;

namespace Platform.ApiService.Services.Mcp.Handlers;

/// <summary>
/// 系统公告与通知 MCP 工具处理器
/// </summary>
public class NoticeMcpToolHandler : McpToolHandlerBase
{
    private readonly INoticeService _noticeService;
    private readonly ILogger<NoticeMcpToolHandler> _logger;

    /// <summary>
    /// 初始化系统公告 MCP 处理器
    /// </summary>
    /// <param name="noticeService">通知公告服务</param>
    /// <param name="logger">日志处理器</param>
    public NoticeMcpToolHandler(INoticeService noticeService, ILogger<NoticeMcpToolHandler> logger)
    {
        _noticeService = noticeService;
        _logger = logger;

        RegisterTool("get_notices", "获取当前用户的通知公告列表。",
            async (args, uid) => await _noticeService.GetNoticesAsync());

        RegisterTool("get_notice_detail", "获取当前用户特定通知的详细内容。",
            ObjectSchema(new Dictionary<string, object> { ["id"] = new Dictionary<string, object> { ["type"] = "string" } }, ["id"]),
            async (args, uid) => await _noticeService.GetNoticeByIdAsync(args["id"].ToString()!));

        RegisterTool("mark_notice_read", "将指定通知标记为已读。",
            ObjectSchema(new Dictionary<string, object> { ["id"] = new Dictionary<string, object> { ["type"] = "string" } }, ["id"]),
            async (args, uid) => await _noticeService.MarkAsReadAsync(args["id"].ToString()!));

        RegisterTool("create_notice", "创建新的系统通知（管理员专用）。",
            ObjectSchema(new Dictionary<string, object>
            {
                ["title"] = new Dictionary<string, object> { ["type"] = "string" },
                ["description"] = new Dictionary<string, object> { ["type"] = "string" }
            }, ["title", "description"]),
            async (args, uid) => await _noticeService.CreateNoticeAsync(new CreateNoticeRequest
            {
                Title = args["title"].ToString()!,
                Description = args["description"].ToString()!,
                Type = NoticeIconItemType.Notification
            }));

        RegisterTool("update_notice", "更新现有通知内容。",
            ObjectSchema(new Dictionary<string, object>
            {
                ["id"] = new Dictionary<string, object> { ["type"] = "string" },
                ["title"] = new Dictionary<string, object> { ["type"] = "string" },
                ["description"] = new Dictionary<string, object> { ["type"] = "string" }
            }, ["id"]),
            async (args, uid) => await _noticeService.UpdateNoticeAsync(args["id"].ToString()!, new UpdateNoticeRequest
            {
                Title = args.GetValueOrDefault("title")?.ToString(),
                Description = args.GetValueOrDefault("description")?.ToString()
            }));

        RegisterTool("delete_notice", "持久删除指定的通知公告。",
            ObjectSchema(new Dictionary<string, object> { ["id"] = new Dictionary<string, object> { ["type"] = "string" } }, ["id"]),
            async (args, uid) => await _noticeService.DeleteNoticeAsync(args["id"].ToString()!));
    }
}
