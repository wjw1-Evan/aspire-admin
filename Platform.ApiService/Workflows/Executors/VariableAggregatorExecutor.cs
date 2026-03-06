using Microsoft.Agents.AI.Workflows;
using Platform.ApiService.Models.Workflow;
using System.Collections.Generic;
using System.Linq;

namespace Platform.ApiService.Workflows.Executors;

/// <summary>
/// 变量聚合执行器 - 合并多路分支的变量数据
/// </summary>
internal sealed partial class VariableAggregatorExecutor : Executor
{
    private readonly VariableAggregatorConfig _config;

    public VariableAggregatorExecutor(VariableAggregatorConfig config) : base("VariableAggregatorExecutor")
    {
        _config = config;
    }

    protected override ProtocolBuilder ConfigureProtocol(ProtocolBuilder builder)
    {
        return builder;
    }

    [MessageHandler]
    private async ValueTask<Dictionary<string, object?>> HandleAsync(object input, IWorkflowContext context, CancellationToken cancellationToken = default)
    {
        var result = new Dictionary<string, object?>();

        foreach (var varPath in _config.Variables)
        {
            // 逻辑上这里聚合来自不同节点的输出
            var value = await GetVariableValueAsync(context, varPath);
            result[varPath] = value;
        }

        return result;
    }

    private Task<object?> GetVariableValueAsync(IWorkflowContext context, string path)
    {
        return Task.FromResult<object?>(null);
    }
}
