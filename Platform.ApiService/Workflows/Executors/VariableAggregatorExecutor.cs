using Microsoft.Agents.AI.Workflows;
using Platform.ApiService.Models.Workflow;
using Platform.ApiService.Workflows.Utilities;
using System.Collections.Generic;
using System.Linq;
using System.Text.Json;

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
    private async ValueTask<string> HandleAsync(string input, IWorkflowContext context, CancellationToken cancellationToken = default)
    {
        // 反序列化变量
        var variables = JsonSerializer.Deserialize<Dictionary<string, object?>>(input) ?? new();

        // 1. 提取指定的变量
        var result = new Dictionary<string, object?>();
        foreach (var varName in _config.InputVariables)
        {
            if (variables.TryGetValue(varName, out var val))
            {
                result[varName] = val;
            }
        }

        // 2. 如果提供了模板，则进行解析
        if (!string.IsNullOrEmpty(_config.Template))
        {
            var resolvedTemplate = DifyVariableResolver.Resolve(_config.Template, variables);
            return resolvedTemplate;
        }

        // 3. 否则返回 JSON 字符串
        return JsonSerializer.Serialize(result);
    }

    private Task<object?> GetVariableValueAsync(IWorkflowContext context, string path)
    {
        return Task.FromResult<object?>(null);
    }
}
