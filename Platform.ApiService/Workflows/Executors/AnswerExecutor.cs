using Microsoft.Agents.AI.Workflows;
using Platform.ApiService.Models.Workflow;
using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;

namespace Platform.ApiService.Workflows.Executors;

/// <summary>
/// 响应执行器 - 定义工作流的最终输出内容
/// </summary>
internal sealed partial class AnswerExecutor : Executor
{
    private readonly AnswerConfig _config;

    public AnswerExecutor(AnswerConfig config) : base("AnswerExecutor")
    {
        _config = config;
    }

    protected override ProtocolBuilder ConfigureProtocol(ProtocolBuilder builder)
    {
        return builder;
    }

    [MessageHandler]
    private async ValueTask<string> HandleAsync(string input, IWorkflowContext context, CancellationToken cancellationToken = default)
    {
        // 反序列化变量
        var variables = System.Text.Json.JsonSerializer.Deserialize<Dictionary<string, object?>>(input) ?? new();

        // 使用 DifyVariableResolver 解析响应内容
        var resolvedAnswer = Utilities.DifyVariableResolver.Resolve(_config.Answer ?? string.Empty, variables);

        return await Task.FromResult(resolvedAnswer);
    }
}
