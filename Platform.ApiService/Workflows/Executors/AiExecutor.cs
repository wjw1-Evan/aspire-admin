using Microsoft.Agents.AI;
using Microsoft.Agents.AI.Workflows;
using Platform.ApiService.Models.Workflow;
using System.Text.Json;

namespace Platform.ApiService.Workflows.Executors;

/// <summary>
/// AI 节点执行器 - 封装 AIAgent 处理工作流中的 AI 任务
/// </summary>
internal sealed partial class AiExecutor : Executor
{
    private readonly AIAgent _agent;
    private readonly AiConfig _config;

    public AiExecutor(AIAgent agent, AiConfig config) : base("AiExecutor")
    {
        _agent = agent;
        _config = config;
    }

    protected override ProtocolBuilder ConfigureProtocol(ProtocolBuilder builder)
    {
        // 配置协议，源码生成需要
        return builder;
    }

    [MessageHandler]
    private async ValueTask<string> HandleAsync(string input, IWorkflowContext context, CancellationToken cancellationToken = default)
    {
        // 反序列化变量
        var variables = JsonSerializer.Deserialize<Dictionary<string, object?>>(input) ?? new();

        // 解析 Prompt 模板
        var resolvedPrompt = Utilities.DifyVariableResolver.Resolve(_config.PromptTemplate ?? string.Empty, variables);

        // 执行 Agent 运行逻辑
        var response = await _agent.RunAsync(resolvedPrompt, cancellationToken: cancellationToken);
        var result = response.Text;

        return result;
    }
}
