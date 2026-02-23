using Platform.ApiService.Models;
using Platform.ServiceDefaults.Services;
using Microsoft.Extensions.Logging;

namespace Platform.ApiService.Services.Mcp.Handlers;

/// <summary>
/// 表单管理 MCP 工具处理器
/// </summary>
public class FormMcpToolHandler : McpToolHandlerBase
{
    private readonly IDataFactory<FormDefinition> _formFactory;
    private readonly ILogger<FormMcpToolHandler> _logger;

    /// <summary>
    /// 初始化表单管理 MCP 处理器
    /// </summary>
    /// <param name="formFactory">表单定义数据工厂</param>
    /// <param name="logger">日志处理器</param>
    public FormMcpToolHandler(IDataFactory<FormDefinition> formFactory, ILogger<FormMcpToolHandler> logger)
    {
        _formFactory = formFactory;
        _logger = logger;

        RegisterTool("get_forms", "获取表单列表。关键词：表单设计,自定义表单",
            ObjectSchema(MergeProperties(new Dictionary<string, object>
            {
                ["keyword"] = new Dictionary<string, object> { ["type"] = "string" },
                ["isActive"] = new Dictionary<string, object> { ["type"] = "boolean" }
            }, PaginationSchema())),
            async (args, uid) =>
            {
                var keyword = args.GetValueOrDefault("keyword")?.ToString();
                var (page, pageSize) = ParsePaginationArgs(args);
                var (items, total) = await _formFactory.FindPagedAsync(
                    filter: f => (string.IsNullOrEmpty(keyword) || f.Name.Contains(keyword)) &&
                                 (!args.ContainsKey("isActive") || f.IsActive == (args.GetValueOrDefault("isActive") as bool? ?? true)),
                    page: page,
                    pageSize: pageSize);
                return new { items, total, page, pageSize };
            });

        RegisterTool("get_form_detail", "获取表单详情。关键词：查看表单,表单字段",
            ObjectSchema(new Dictionary<string, object> { ["id"] = new Dictionary<string, object> { ["type"] = "string" } }, ["id"]),
            async (args, uid) => { var id = args.GetValueOrDefault("id")?.ToString(); return string.IsNullOrEmpty(id) ? new { error = "id is required" } : await _formFactory.GetByIdAsync(id); });
    }
}
