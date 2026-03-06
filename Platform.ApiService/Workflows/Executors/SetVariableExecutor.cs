using Microsoft.Agents.AI.Workflows;
using Platform.ApiService.Models.Workflow;
using Platform.ApiService.Workflows.Utilities;
using System.Collections.Generic;
using System.Text.Json;
using System.Threading;
using System.Threading.Tasks;

namespace Platform.ApiService.Workflows.Executors;

/// <summary>
/// 变量设置执行器 - 支持动态变量设置
/// </summary>
internal sealed partial class SetVariableExecutor : Executor
{
    private readonly VariableConfig _config;

    public SetVariableExecutor(VariableConfig config) : base("SetVariableExecutor")
    {
        _config = config;
    }

    protected override ProtocolBuilder ConfigureProtocol(ProtocolBuilder builder) => builder;

    [MessageHandler]
    private async ValueTask<Dictionary<string, object?>> HandleAsync(string input, IWorkflowContext context, CancellationToken cancellationToken = default)
    {
        var variables = JsonSerializer.Deserialize<Dictionary<string, object?>>(input) ?? new();

        var val = DifyVariableResolver.Resolve(_config.Value ?? string.Empty, variables);
        
        // 返回包含 __variables__ 的字典，由引擎合并到全局变量
        await Task.CompletedTask;
        return new Dictionary<string, object?>
        {
            ["result"] = val,
            ["__variables__"] = new Dictionary<string, object?>
            {
                [_config.Name ?? "unnamed_var"] = val
            }
        };
    }
}
