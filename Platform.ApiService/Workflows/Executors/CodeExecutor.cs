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
    private async ValueTask<object?> HandleAsync(object input, IWorkflowContext context, CancellationToken cancellationToken = default)
    {
        // 反序列化变量
        var variables = JsonSerializer.Deserialize<Dictionary<string, object?>>(input?.ToString() ?? "{}") ?? new();
        
        // 提取输入变量的值
        var inputs = new Dictionary<string, object?>();
        foreach (var varName in _config.InputVariables)
        {
            inputs[varName] = Utilities.DifyVariableResolver.GetValueByPath(varName, variables);
        }

        // 模拟执行逻辑: 拼接输入变量
        var inputSummary = string.Join(", ", inputs.Select(kv => $"{kv.Key}={kv.Value}"));
        var result = $"Executed {_config.Language} code. Inputs: [{inputSummary}]. Code length: {_config.Code.Length}";

        return await Task.FromResult<object?>(result);
    }
}
