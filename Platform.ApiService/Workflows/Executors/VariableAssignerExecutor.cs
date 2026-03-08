using Microsoft.Agents.AI.Workflows;
using Platform.ApiService.Models.Workflow;
using Platform.ApiService.Workflows.Utilities;
using System.Collections.Generic;
using System.Text.Json;
using System.Threading;
using System.Threading.Tasks;

namespace Platform.ApiService.Workflows.Executors;

/// <summary>
/// 多变量赋值执行器 - 批量设置多个变量
/// </summary>
internal sealed partial class VariableAssignerExecutor : Executor
{
    private readonly VariableAssignerConfig _config;

    public VariableAssignerExecutor(VariableAssignerConfig config) : base("VariableAssignerExecutor")
    {
        _config = config;
    }

    protected override ProtocolBuilder ConfigureProtocol(ProtocolBuilder builder) => builder;

    [MessageHandler]
    private async ValueTask<Dictionary<string, object?>> HandleAsync(string input, IWorkflowContext context, CancellationToken cancellationToken = default)
    {
        var variables = JsonSerializer.Deserialize<Dictionary<string, object?>>(input) ?? new();
        var assigned = new Dictionary<string, object?>();

        foreach (var a in _config.Assignments ?? new List<VariableAssignment>())
        {
            var val = DifyVariableResolver.Resolve(a.Value ?? string.Empty, variables);
            object? finalVal = val;
            var trimmed = val.Trim();
            if ((trimmed.StartsWith("{") && trimmed.EndsWith("}")) || (trimmed.StartsWith("[") && trimmed.EndsWith("]")))
            {
                try
                {
                    using var doc = JsonDocument.Parse(trimmed);
                    finalVal = JsonSerializer.Deserialize<object>(doc.RootElement.GetRawText()) ?? val;
                }
                catch { /* 解析失败保持字符串 */ }
            }
            assigned[a.Variable] = finalVal;
        }

        await Task.CompletedTask;

        return new Dictionary<string, object?>
        {
            ["result"] = assigned,
            ["__variables__"] = assigned
        };
    }
}
