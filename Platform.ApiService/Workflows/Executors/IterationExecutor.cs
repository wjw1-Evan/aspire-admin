using Microsoft.Agents.AI.Workflows;
using Platform.ApiService.Models.Workflow;
using System.Text.Json;
using System.Threading;
using System.Threading.Tasks;

namespace Platform.ApiService.Workflows.Executors;

/// <summary>
/// 迭代执行器 - 处理工作流中的循环逻辑 (如遍历列表)
/// </summary>
internal sealed partial class IterationExecutor : Executor
{
    private readonly IterationConfig _config;

    public IterationExecutor(IterationConfig config) : base("IterationExecutor")
    {
        _config = config;
    }

    protected override ProtocolBuilder ConfigureProtocol(ProtocolBuilder builder)
    {
        return builder;
    }

    [MessageHandler]
    private async ValueTask<List<object?>> HandleAsync(string input, IWorkflowContext context, CancellationToken cancellationToken = default)
    {
        // 反序列化变量
        var variables = System.Text.Json.JsonSerializer.Deserialize<Dictionary<string, object?>>(input) ?? new();

        // 使用 DifyVariableResolver 获取迭代对象 (应该是列表)
        var listObject = Utilities.DifyVariableResolver.GetValueByPath(_config.IteratorVariable ?? string.Empty, variables);
        
        var results = new List<object?>();

        if (listObject is IEnumerable<object> enumerable)
        {
            foreach (var item in enumerable)
            {
                // TODO: 在子流程中执行逻辑
                // 这里暂时模拟结果
                results.Add(new { original = item, processed = true });
            }
        }
        else if (listObject is JsonElement element && element.ValueKind == JsonValueKind.Array)
        {
            foreach (var item in element.EnumerateArray())
            {
                results.Add(new { original = item, processed = true });
            }
        }

        return await Task.FromResult(results);
    }
}
