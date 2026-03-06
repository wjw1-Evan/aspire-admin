using Microsoft.Agents.AI.Workflows;
using Platform.ApiService.Models.Workflow;
using System.Collections.Generic;
using System.Threading.Tasks;

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
        // 逻辑：在沙箱中执行 _config.Code
        // 初步实现：由于实现完整的沙箱逻辑比较复杂，这里先做一个模拟或简单的逻辑映射
        // 对于 Dify 而言，这里通常会使用 Pyodide (Python) 或 Node.js vm2 (JS)

        return await ExecuteScriptAsync(_config.Code ?? string.Empty, _config.InputVariables ?? new List<string>(), context);
    }

    private Task<object?> ExecuteScriptAsync(string code, List<string> inputVariables, IWorkflowContext context)
    {
        // 模拟执行结果
        return Task.FromResult<object?>($"Code execution result for logic: {code.Length} chars");
    }
}
