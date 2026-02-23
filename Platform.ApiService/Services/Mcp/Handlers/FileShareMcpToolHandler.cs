using Platform.ApiService.Models;
using Platform.ServiceDefaults.Services;
using Microsoft.Extensions.Logging;

namespace Platform.ApiService.Services.Mcp.Handlers;

/// <summary>
/// 文件分享管理 MCP 工具处理器
/// </summary>
public class FileShareMcpToolHandler : McpToolHandlerBase
{
    private readonly IFileShareService _shareService;
    private readonly ILogger<FileShareMcpToolHandler> _logger;

    /// <summary>
    /// 初始化文件分享 MCP 处理器
    /// </summary>
    /// <param name="shareService">分享服务</param>
    /// <param name="logger">日志处理器</param>
    public FileShareMcpToolHandler(IFileShareService shareService, ILogger<FileShareMcpToolHandler> logger)
    {
        _shareService = shareService;
        _logger = logger;

        RegisterTool("create_file_share", "为指定文件创建新的分享链接或内部分享。关键词：分享,外链,链接",
            ObjectSchema(new Dictionary<string, object>
            {
                ["fileItemId"] = new Dictionary<string, object> { ["type"] = "string", ["description"] = "文件项ID" },
                ["password"] = new Dictionary<string, object> { ["type"] = "string", ["description"] = "分享密码（可选）" },
                ["expirationDays"] = new Dictionary<string, object> { ["type"] = "integer", ["description"] = "过期天数" }
            }, ["fileItemId"]),
            async (args, uid) =>
            {
                var fileId = args.GetValueOrDefault("fileItemId")?.ToString();
                if (string.IsNullOrEmpty(fileId)) return new { error = "fileItemId is required" };
                var request = new CreateShareRequest
                {
                    Password = args.GetValueOrDefault("password")?.ToString() ?? "",
                    ExpiresAt = args.ContainsKey("expirationDays") ? DateTime.UtcNow.AddDays(Convert.ToDouble(args["expirationDays"])) : null
                };
                return await _shareService.CreateShareAsync(fileId, request);
            });

        RegisterTool("get_share_detail", "获取分享详情。关键词：分享详情,查看分享",
            ObjectSchema(new Dictionary<string, object> { ["id"] = new Dictionary<string, object> { ["type"] = "string", ["description"] = "分享ID" } }, ["id"]),
            async (args, uid) => { var id = args.GetValueOrDefault("id")?.ToString(); return string.IsNullOrEmpty(id) ? new { error = "id is required" } : await _shareService.GetShareByIdAsync(id); });

        RegisterTool("delete_file_share", "删除（撤下）指定的文件分享。关键词：取消分享,撤回分享",
            ObjectSchema(new Dictionary<string, object> { ["shareId"] = new Dictionary<string, object> { ["type"] = "string", ["description"] = "要删除的分享ID" } }, ["shareId"]),
            async (args, uid) => { var shareId = args.GetValueOrDefault("shareId")?.ToString(); if (string.IsNullOrEmpty(shareId)) return new { error = "shareId is required" }; await _shareService.DeleteShareAsync(shareId); return new { success = true }; });

        RegisterTool("get_my_shares", "获取我创建的所有文件分享列表。关键词：我的分享,历史分享",
            ObjectSchema(PaginationSchema()),
            async (args, uid) =>
            {
                var (page, pageSize) = ParsePaginationArgs(args);
                return await _shareService.GetMySharesAsync(new ShareListQuery { Page = page, PageSize = pageSize });
            });

        RegisterTool("get_shared_with_me", "获取他人分享给我的文件列表。关键词：收到分享,他人分享",
            ObjectSchema(PaginationSchema()),
            async (args, uid) =>
            {
                var (page, pageSize) = ParsePaginationArgs(args);
                return await _shareService.GetSharedWithMeAsync(new ShareListQuery { Page = page, PageSize = pageSize });
            });
    }
}
