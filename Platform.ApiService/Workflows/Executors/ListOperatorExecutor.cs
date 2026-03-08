using Microsoft.Agents.AI.Workflows;
using Platform.ApiService.Models.Workflow;
using Platform.ApiService.Workflows.Utilities;
using System.Collections.Generic;
using System.Linq;
using System.Text.Json;
using System.Threading;
using System.Threading.Tasks;

namespace Platform.ApiService.Workflows.Executors;

/// <summary>
/// 列表操作执行器 - 对列表变量进行 transform/filter 等操作
/// </summary>
internal sealed partial class ListOperatorExecutor : Executor
{
    private readonly ListOperatorConfig _config;

    public ListOperatorExecutor(ListOperatorConfig config) : base("ListOperatorExecutor")
    {
        _config = config;
    }

    protected override ProtocolBuilder ConfigureProtocol(ProtocolBuilder builder) => builder;

    [MessageHandler]
    private async ValueTask<Dictionary<string, object?>> HandleAsync(string input, IWorkflowContext context, CancellationToken cancellationToken = default)
    {
        var variables = JsonSerializer.Deserialize<Dictionary<string, object?>>(input) ?? new();
        var inputVar = _config.InputVariable ?? "input";
        var listRaw = DifyVariableResolver.GetValueByPath(inputVar, variables);

        object? result = null;
        if (listRaw is JsonElement je)
        {
            if (je.ValueKind == JsonValueKind.Array)
            {
                try { result = JsonSerializer.Deserialize<List<object?>>(je.GetRawText()); } catch { result = listRaw; }
            }
            else
            {
                result = listRaw;
            }
        }
        else if (listRaw is IEnumerable<object> en)
        {
            result = en.ToList();
        }
        else if (listRaw is string s)
        {
            try
            {
                result = JsonSerializer.Deserialize<List<object?>>(s);
            }
            catch
            {
                result = new List<object?> { s };
            }
        }
        else
        {
            result = listRaw;
        }

        var outputVar = _config.OutputVariable ?? "list_result";
        await Task.CompletedTask;

        return new Dictionary<string, object?>
        {
            ["result"] = result,
            ["__variables__"] = new Dictionary<string, object?> { [outputVar] = result }
        };
    }
}
