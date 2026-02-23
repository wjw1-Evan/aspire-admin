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

        RegisterTool("get_file_version_history", "获取指定文件的所有历史版本列表。关键词：文件版本,历史记录,版本历史",
            ObjectSchema(new Dictionary<string, object> { ["fileItemId"] = new Dictionary<string, object> { ["type"] = "string" } }, ["fileItemId"]),
            async (args, uid) => { var id = args.GetValueOrDefault("fileItemId")?.ToString(); return string.IsNullOrEmpty(id) ? new { error = "fileItemId is required" } : await _versionService.GetVersionHistoryAsync(id); });

        RegisterTool("get_file_version_detail", "获取文件特定版本的详细信息。关键词：版本详情",
            ObjectSchema(new Dictionary<string, object> { ["versionId"] = new Dictionary<string, object> { ["type"] = "string" } }, ["versionId"]),
            async (args, uid) => { var id = args.GetValueOrDefault("versionId")?.ToString(); return string.IsNullOrEmpty(id) ? new { error = "versionId is required" } : await _versionService.GetVersionAsync(id); });

        RegisterTool("restore_file_version", "将文件恢复到指定的历史版本。关键词：恢复版本,回滚文件",
            ObjectSchema(new Dictionary<string, object>
            {
                ["fileItemId"] = new Dictionary<string, object> { ["type"] = "string" },
                ["versionNumber"] = new Dictionary<string, object> { ["type"] = "integer" }
            }, ["fileItemId", "versionNumber"]),
            async (args, uid) =>
            {
                var fileId = args.GetValueOrDefault("fileItemId")?.ToString();
                var version = args.GetValueOrDefault("versionNumber");
                if (string.IsNullOrEmpty(fileId) || version == null) return new { error = "fileItemId and versionNumber are required" };
                return await _versionService.RestoreVersionAsync(fileId, Convert.ToInt32(version));
            });

        RegisterTool("delete_file_version", "从历史记录中永久删除指定的版本。关键词：删除版本",
            ObjectSchema(new Dictionary<string, object> { ["versionId"] = new Dictionary<string, object> { ["type"] = "string" } }, ["versionId"]),
            async (args, uid) => { var id = args.GetValueOrDefault("versionId")?.ToString(); if (string.IsNullOrEmpty(id)) return new { error = "versionId is required" }; await _versionService.DeleteVersionAsync(id); return new { success = true }; });

        RegisterTool("get_file_version_statistics", "获取文件版本控制的统计信息。关键词：版本统计",
            ObjectSchema(new Dictionary<string, object> { ["fileItemId"] = new Dictionary<string, object> { ["type"] = "string" } }, ["fileItemId"]),
            async (args, uid) => { var id = args.GetValueOrDefault("fileItemId")?.ToString(); return string.IsNullOrEmpty(id) ? new { error = "fileItemId is required" } : await _versionService.GetVersionStatisticsAsync(id); });
    }
}
