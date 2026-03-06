using Microsoft.Agents.AI.Workflows;
using Platform.ApiService.Models.Workflow;
using System.Collections.Generic;
using System.Text.Json;
using System.Threading;
using System.Threading.Tasks;

namespace Platform.ApiService.Workflows.Executors;

/// <summary>
/// 工具执行器 - 封装通用工具调用逻辑
/// </summary>
internal sealed partial class ToolExecutor : Executor
{
    private readonly ToolConfig _config;

    public ToolExecutor(ToolConfig config) : base("ToolExecutor")
    {
        _config = config;
    }

    protected override ProtocolBuilder ConfigureProtocol(ProtocolBuilder builder)
    {
        return builder;
    }

    [MessageHandler]
    private async ValueTask<object?> HandleAsync(string input, IWorkflowContext context, CancellationToken cancellationToken = default)
    {
        // 反序列化变量
        var variables = JsonSerializer.Deserialize<Dictionary<string, object?>>(input) ?? new();

        // 解析输入参数
        var resolvedParams = new Dictionary<string, string>();
        foreach (var p in _config.Params)
        {
            resolvedParams[p.Key] = Utilities.DifyVariableResolver.Resolve(p.Value, variables);
        }

        // 模拟工具执行逻辑
        string result;
        switch (_config.Tool?.ToLowerInvariant())
        {
            case "google_search":
                var query = resolvedParams.GetValueOrDefault("query", "AI News");
                result = $"[Simulated Google Search for '{query}']: Found 3 results. 1. Aspire Admin is great. 2. AI workflows are powerful. 3. Dify-style nodes are cool.";
                break;
            case "web_scraper":
                var url = resolvedParams.GetValueOrDefault("url", "https://example.com");
                result = $"[Simulated Scraper for '{url}']: Page Title: Example Domain. Content: This domain is established to be used for illustrative examples in documents.";
                break;
            default:
                result = $"[Tool Result] Provider: {_config.Provider}, Tool: {_config.Tool}, Resolved Params: {JsonSerializer.Serialize(resolvedParams)}";
                break;
        }

        await Task.CompletedTask;

        // 构造结果字典，包含 __variables__ 以便引擎自动合并
        var finalResult = new Dictionary<string, object?>
        {
            ["result"] = result,
            ["__variables__"] = new Dictionary<string, object?>
            {
                [_config.OutputVariable ?? "tool_result"] = result
            }
        };

        return finalResult;
    }
}
