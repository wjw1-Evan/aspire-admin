using Platform.ApiService.Models;
using Platform.ServiceDefaults.Services;
using Microsoft.Extensions.Logging;

namespace Platform.ApiService.Services.Mcp.Handlers;

/// <summary>
/// 系统级 MCP 工具处理器（存储、日志、资源）
/// </summary>
public class SystemMcpToolHandler : McpToolHandlerBase
{
    private readonly ICloudStorageService _storageService;
    private readonly IUserActivityLogService _logService;
    private readonly ILogger<SystemMcpToolHandler> _logger;

    /// <summary>
    /// 初始化系统管理 MCP 处理器
    /// </summary>
    /// <param name="storageService">存储管理服务</param>
    /// <param name="logService">系统日志服务</param>
    /// <param name="logger">日志处理器</param>
    public SystemMcpToolHandler(
        ICloudStorageService storageService,
        IUserActivityLogService logService,
        ILogger<SystemMcpToolHandler> logger)
    {
        _storageService = storageService;
        _logService = logService;
        _logger = logger;

        RegisterTool("get_storage_usage", "获取当前用户的存储空间使用详情（总额、已用、剩余）。",
            async (args, uid) => await _storageService.GetStorageUsageAsync(uid));

        RegisterTool("get_system_logs", "获取系统级别的审计与活动日志（分页）。",
            ObjectSchema(MergeProperties(new Dictionary<string, object>
            {
                ["userId"] = new Dictionary<string, object> { ["type"] = "string", ["description"] = "按用户筛选" },
                ["action"] = new Dictionary<string, object> { ["type"] = "string", ["description"] = "按操作类型筛选" }
            }, PaginationSchema())),
            async (args, uid) =>
            {
                var (page, pageSize) = ParsePaginationArgs(args);
                var (items, total) = await _logService.GetAllActivityLogsAsync(
                    page: page,
                    pageSize: pageSize,
                    userId: args.GetValueOrDefault("userId")?.ToString(),
                    action: args.GetValueOrDefault("action")?.ToString());
                return new { items, total, page, pageSize };
            });
    }
}
