using Microsoft.EntityFrameworkCore;
using Platform.ApiService.Models;
using Platform.ServiceDefaults.Services;
using Microsoft.Extensions.Logging;

namespace Platform.ApiService.Services.Mcp.Handlers;

/// <summary>
/// 表单管理 MCP 工具处理器
/// </summary>
public class FormMcpToolHandler : McpToolHandlerBase
{
    private readonly DbContext _context;

    private readonly ILogger<FormMcpToolHandler> _logger;

    /// <summary>
    /// 初始化表单管理 MCP 处理器
    /// </summary>
    /// <param name="context">数据库上下文</param>
    /// <param name="logger">日志处理器</param>
    public FormMcpToolHandler(DbContext context, ILogger<FormMcpToolHandler> logger)
    {
        _context = context;
        
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
                var query = _context.Set<FormDefinition>().Where(
                    f => (string.IsNullOrEmpty(keyword) || f.Name.Contains(keyword)) &&
                         (!args.ContainsKey("isActive") || f.IsActive == (args.GetValueOrDefault("isActive") as bool? ?? true)));
                var total = await query.LongCountAsync();
                var items = await query.OrderByDescending(f => f.CreatedAt).Skip((page - 1) * pageSize).Take(pageSize).ToListAsync();
                return new { items, total, page, pageSize };
            });

        RegisterTool("get_form_detail", "获取表单详情。关键词：查看表单,表单字段",
            ObjectSchema(new Dictionary<string, object> { ["id"] = new Dictionary<string, object> { ["type"] = "string" } }, ["id"]),
            async (args, uid) => { var id = args.GetValueOrDefault("id")?.ToString(); return string.IsNullOrEmpty(id) ? new { error = "id is required" } : await _context.Set<FormDefinition>().FirstOrDefaultAsync(x => x.Id == id); });
    }
}