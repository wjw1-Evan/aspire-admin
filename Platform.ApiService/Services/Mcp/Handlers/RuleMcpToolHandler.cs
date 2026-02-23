using System.Text.Json;
using Platform.ApiService.Models;
using Platform.ServiceDefaults.Services;
using Microsoft.Extensions.Logging;

namespace Platform.ApiService.Services.Mcp.Handlers;

/// <summary>
/// 动态规则、资源与提示词 MCP 工具处理器
/// </summary>
public class RuleMcpToolHandler : McpToolHandlerBase
{
    private readonly IDataFactory<RuleListItem> _ruleFactory;
    private readonly ILogger<RuleMcpToolHandler> _logger;

    /// <summary>
    /// 初始化规则、资源与提示词 MCP 处理器
    /// </summary>
    /// <param name="ruleFactory">规则数据工厂</param>
    /// <param name="logger">日志处理器</param>
    public RuleMcpToolHandler(
        IDataFactory<RuleListItem> ruleFactory,
        ILogger<RuleMcpToolHandler> logger)
    {
        _ruleFactory = ruleFactory;
        _logger = logger;
    }

    /// <inheritdoc />
    public override async Task<IReadOnlyList<McpTool>> GetToolDefinitionsAsync()
    {
        var rules = await _ruleFactory.FindAsync(r => r.McpConfig != null && r.McpConfig.Enabled);
        return rules.Where(r => !string.IsNullOrEmpty(r.McpConfig!.ToolName))
            .Select(r => new McpTool
            {
                Name = r.McpConfig!.ToolName!,
                Description = r.McpConfig.ToolDescription ?? r.Desc ?? "",
                InputSchema = r.McpConfig.InputSchema
            }).ToList();
    }

    /// <summary>
    /// 尝试执行规则定义的工具
    /// </summary>
    public async Task<(bool Handled, object? Result)> TryHandleRuleToolAsync(string toolName, Dictionary<string, object> arguments, string currentUserId)
    {
        var rule = (await _ruleFactory.FindAsync(r => r.McpConfig != null && r.McpConfig.Enabled && r.McpConfig.ToolName == toolName)).FirstOrDefault();
        if (rule == null) return (false, null);

        // TODO: 可在此处实现动态脚本执行引擎
        return (true, new { message = $"Rule-based tool '{toolName}' executed.", ruleId = rule.Id, ruleName = rule.Name });
    }

    #region Resources & Prompts

    /// <summary>
    /// 获取动态资源列表
    /// </summary>
    public async Task<List<McpResource>> GetResourcesAsync()
    {
        var rules = await _ruleFactory.FindAsync(r => r.McpConfig != null && r.McpConfig.Enabled && r.McpConfig.IsResource);
        return rules.Select(r => new McpResource
        {
            Uri = r.McpConfig!.ResourceUri ?? $"rule://{r.Id}",
            Name = r.McpConfig.ToolName ?? r.Name ?? "Unnamed Resource",
            Description = r.McpConfig.ToolDescription ?? r.Desc,
            MimeType = r.McpConfig.ResourceMimeType
        }).ToList();
    }

    /// <summary>
    /// 读取动态资源内容
    /// </summary>
    public async Task<string?> ReadResourceAsync(string uri)
    {
        var rule = (await _ruleFactory.FindAsync(r => r.McpConfig != null && r.McpConfig.Enabled && r.McpConfig.ResourceUri == uri)).FirstOrDefault();
        return rule?.McpConfig?.PromptTemplate ?? rule?.Desc;
    }

    /// <summary>
    /// 获取动态提示词列表
    /// </summary>
    public async Task<List<McpPrompt>> GetPromptsAsync()
    {
        var rules = await _ruleFactory.FindAsync(r => r.McpConfig != null && r.McpConfig.Enabled && r.McpConfig.IsPrompt);
        return rules.Select(r => new McpPrompt
        {
            Name = r.McpConfig!.ToolName ?? r.Name ?? "Unnamed Prompt",
            Description = r.McpConfig.ToolDescription ?? r.Desc,
            Arguments = r.McpConfig.PromptArguments
        }).ToList();
    }

    /// <summary>
    /// 获取动态提示词详情
    /// </summary>
    public async Task<McpGetPromptResponse?> GetPromptAsync(string name, Dictionary<string, string>? arguments)
    {
        var rule = (await _ruleFactory.FindAsync(r => r.McpConfig != null && r.McpConfig.Enabled && r.McpConfig.IsPrompt && r.McpConfig.ToolName == name)).FirstOrDefault();
        if (rule == null) return null;

        var content = rule.McpConfig!.PromptTemplate ?? "";
        if (arguments != null)
        {
            foreach (var arg in arguments)
            {
                content = content.Replace($"{{{arg.Key}}}", arg.Value);
            }
        }

        return new McpGetPromptResponse
        {
            Messages = new List<McpContent>
            {
                new McpContent
                {
                    Type = "text",
                    Text = content
                }
            }
        };
    }

    #endregion
}
