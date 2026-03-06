using Microsoft.Agents.AI.Workflows;
using Platform.ApiService.Models.Workflow;
using System.Collections.Generic;
using System.Threading.Tasks;
using System.Text.Json;
using System.Linq;

namespace Platform.ApiService.Workflows.Executors;

/// <summary>
/// 代码执行器 - 处理工作流中的自定义脚本逻辑
/// </summary>
internal sealed partial class CodeExecutor : Executor
{
    private readonly CodeConfig _config;

    public CodeExecutor(CodeConfig config) : base("CodeExecutor")
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
        var variables = JsonSerializer.Deserialize<Dictionary<string, object?>>(input?.ToString() ?? "{}") ?? new();
        
        // 1. 提取输入变量的值
        var inputs = new Dictionary<string, object?>();
        if (_config.InputVariables != null)
        {
            foreach (var varName in _config.InputVariables)
            {
                inputs[varName] = Utilities.DifyVariableResolver.GetValueByPath(varName, variables);
            }
        }

        // 2. 模拟执行逻辑: 如果代码包含特定的关键词，模拟不同的输出
        string resultSummary;
        var code = _config.Code ?? "";
        
        if (code.Contains("return {") || code.Contains("output ="))
        {
            resultSummary = $"Calculated result based on inputs: {string.Join(", ", inputs.Keys)}";
        }
        else
        {
            var inputSummary = string.Join(", ", inputs.Select(kv => $"{kv.Key}={kv.Value}"));
            resultSummary = $"Executed {_config.Language} code. Inputs: [{inputSummary}]. Code length: {code.Length}";
        }

        await Task.CompletedTask;
        
        // 构造结构化结果
        return new Dictionary<string, object?>
        {
            ["result"] = resultSummary,
            ["inputs"] = inputs,
            ["language"] = _config.Language,
            ["__variables__"] = new Dictionary<string, object?>
            {
                [_config.OutputVariable ?? "code_result"] = resultSummary
            }
        };
    }
}
