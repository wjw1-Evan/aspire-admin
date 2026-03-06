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
        var response = await _agent.RunAsync(input, cancellationToken: cancellationToken);
        var text = response.Text.ToLowerInvariant();
        
        // 简单的逻辑判断解析
        return text.Contains("true") && !text.Contains("false");
    }
}
