using Microsoft.Agents.AI;
using Microsoft.Agents.AI.Workflows;
using Platform.ApiService.Models.Workflow;

namespace Platform.ApiService.Workflows.Executors;

/// <summary>
/// AI 判断节点执行器 - 利用 AIAgent 进行逻辑决策
/// </summary>
internal sealed partial class AiJudgeExecutor : Executor
{
    private readonly AIAgent _agent;
    private readonly AiJudgeConfig _config;

    public AiJudgeExecutor(AIAgent agent, AiJudgeConfig config) : base("AiJudgeExecutor")
    {
        _agent = agent;
        _config = config;
    }

    protected override ProtocolBuilder ConfigureProtocol(ProtocolBuilder builder)
    {
        return builder;
    }

    [MessageHandler]
    private async ValueTask<Dictionary<string, object?>> HandleAsync(string input, IWorkflowContext context, CancellationToken cancellationToken = default)
    {
        // 反序列化变量
        var variables = System.Text.Json.JsonSerializer.Deserialize<Dictionary<string, object?>>(input) ?? new();

        // 解析 Judge Prompt
        var resolvedPrompt = Utilities.DifyVariableResolver.Resolve(_config.JudgePrompt ?? string.Empty, variables);

        var response = await _agent.RunAsync(resolvedPrompt, cancellationToken: cancellationToken);
        var text = response.Text.ToLowerInvariant();
        
        // 简单的逻辑判断解析
        var isTrue = text.Contains("true") && !text.Contains("false");
        
        return new Dictionary<string, object?>
        {
            ["result"] = isTrue,
            ["__sourceHandle"] = isTrue ? "true" : "false"
        };
    }
}
