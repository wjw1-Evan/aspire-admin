using Platform.ApiService.Models;
using Platform.ServiceDefaults.Services;
using Microsoft.Extensions.Logging;

namespace Platform.ApiService.Services.Mcp.Handlers;

/// <summary>
/// 文件版本控制 MCP 工具处理器
/// </summary>
public class FileVersionMcpToolHandler : McpToolHandlerBase
{
    private readonly IFileVersionService _versionService;
    private readonly ILogger<FileVersionMcpToolHandler> _logger;

    /// <summary>
    /// 初始化文件版本 MCP 处理器
    /// </summary>
    /// <param name="versionService">文件版本服务</param>
    /// <param name="logger">日志处理器</param>
    public FileVersionMcpToolHandler(IFileVersionService versionService, ILogger<FileVersionMcpToolHandler> logger)
    {
        _versionService = versionService;
        _logger = logger;

        RegisterTool("get_file_version_history", "获取指定文件的所有历史版本列表。",
            ObjectSchema(new Dictionary<string, object> { ["fileItemId"] = new Dictionary<string, object> { ["type"] = "string" } }, ["fileItemId"]),
            async (args, uid) => await _versionService.GetVersionHistoryAsync(args["fileItemId"].ToString()!));

        RegisterTool("get_file_version_detail", "获取文件特定版本的详细信息。",
            ObjectSchema(new Dictionary<string, object> { ["versionId"] = new Dictionary<string, object> { ["type"] = "string" } }, ["versionId"]),
            async (args, uid) => await _versionService.GetVersionAsync(args["versionId"].ToString()!));

        RegisterTool("restore_file_version", "将文件恢复到指定的历史版本。",
            ObjectSchema(new Dictionary<string, object>
            {
                ["fileItemId"] = new Dictionary<string, object> { ["type"] = "string" },
                ["versionNumber"] = new Dictionary<string, object> { ["type"] = "integer" }
            }, ["fileItemId", "versionNumber"]),
            async (args, uid) => await _versionService.RestoreVersionAsync(args["fileItemId"].ToString()!, Convert.ToInt32(args["versionNumber"])));

        RegisterTool("delete_file_version", "从历史记录中永久删除指定的版本。",
            ObjectSchema(new Dictionary<string, object> { ["versionId"] = new Dictionary<string, object> { ["type"] = "string" } }, ["versionId"]),
            async (args, uid) => { await _versionService.DeleteVersionAsync(args["versionId"].ToString()!); return new { success = true }; });

        RegisterTool("get_file_version_statistics", "获取文件版本控制的统计信息。",
            ObjectSchema(new Dictionary<string, object> { ["fileItemId"] = new Dictionary<string, object> { ["type"] = "string" } }, ["fileItemId"]),
            async (args, uid) => await _versionService.GetVersionStatisticsAsync(args["fileItemId"].ToString()!));
    }
}
