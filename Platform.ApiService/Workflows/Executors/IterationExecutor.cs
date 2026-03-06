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
    private async ValueTask<object?> HandleAsync(string input, IWorkflowContext context, CancellationToken cancellationToken = default)
    {
        // 反序列化变量
        var variables = JsonSerializer.Deserialize<Dictionary<string, object?>>(input) ?? new();

        // 获取列表对象
        var listObject = Utilities.DifyVariableResolver.GetValueByPath(_config.IteratorVariable ?? string.Empty, variables);
        var list = new List<object?>();

        if (listObject is IEnumerable<object> enumerable)
        {
            list = enumerable.Cast<object?>().ToList();
        }
        else if (listObject is JsonElement element && element.ValueKind == JsonValueKind.Array)
        {
            foreach (var item in element.EnumerateArray())
            {
                list.Add(item);
            }
        }

        // 获取当前索引 (从变量中读取)
        var indexKey = $"iter_{_config.OutputVariable}_index";
        var outputsKey = $"iter_{_config.OutputVariable}_outputs";
        
        var index = 0;
        if (variables.TryGetValue(indexKey, out var indexObj))
        {
            index = indexObj switch
            {
                JsonElement el when el.ValueKind == JsonValueKind.Number => el.GetInt32(),
                int i => i,
                long l => (int)l,
                _ => 0
            };
        }

        // 获取并累加结果 (如果不是第一轮)
        var outputs = new List<object?>();
        if (variables.TryGetValue(outputsKey, out var outputsObj))
        {
            if (outputsObj is JsonElement el && el.ValueKind == JsonValueKind.Array)
                outputs = el.EnumerateArray().Select(e => (object?)e).ToList();
            else if (outputsObj is List<object?> listObj)
                outputs = listObj;
        }

        // 如果 index > 0，说明刚完成前一轮，记录前一轮的最后结果
        if (index > 0 && variables.TryGetValue("last_node_result", out var lastResult))
        {
            outputs.Add(lastResult);
        }

        var result = new Dictionary<string, object?>();

        if (index < list.Count)
        {
            // 继续循环
            var currentItem = list[index];
            result["item"] = currentItem;
            result["index"] = index;
            result["__sourceHandle"] = "loop";
            
            // 将当前项也存入全局变量，方便子节点通过 {{item}} 引用
            var extraVars = new Dictionary<string, object?> {
                [indexKey] = index + 1,
                [outputsKey] = outputs,
                ["item"] = currentItem
            };
            
            result["__variables__"] = extraVars;
        }
        else
        {
            // 循环结束
            result["__sourceHandle"] = "done";
            result["final_list"] = outputs; // 供后续节点参考
            
            result["__variables__"] = new Dictionary<string, object?> {
                [indexKey] = 0,
                [outputsKey] = new List<object?>() // 清空以便下次使用
            };
        }

        return await Task.FromResult(result);
    }
}
