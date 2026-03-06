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
    private async ValueTask<bool> HandleAsync(string input, IWorkflowContext context, CancellationToken cancellationToken = default)
    {
        // 反序列化变量
        var variables = System.Text.Json.JsonSerializer.Deserialize<Dictionary<string, object?>>(input) ?? new();

        // 解析 Judge Prompt
        var resolvedPrompt = Utilities.DifyVariableResolver.Resolve(_config.JudgePrompt ?? string.Empty, variables);

        // 如果有输入变量，进行替换
        if (!string.IsNullOrEmpty(_config.InputVariable) && variables.TryGetValue(_config.InputVariable, out var inputVal))
        {
            resolvedPrompt = resolvedPrompt.Replace("{{inputVariable}}", inputVal?.ToString() ?? "");
        }

        var response = await _agent.RunAsync(resolvedPrompt, cancellationToken: cancellationToken);
        var text = response.Text.ToLowerInvariant();
        
        // 简单的逻辑判断解析
        return text.Contains("true") && !text.Contains("false");
    }
}
