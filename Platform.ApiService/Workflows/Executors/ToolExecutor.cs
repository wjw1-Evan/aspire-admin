using Microsoft.Agents.AI.Workflows;
using Platform.ApiService.Models.Workflow;
using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;

namespace Platform.ApiService.Workflows.Executors;

/// <summary>
/// 工具执行器 - 封装通用工具调用逻辑
/// </summary>
internal sealed partial class ToolExecutor : Executor
{
    private readonly ToolConfig _config;

    public ToolExecutor(ToolConfig config) : base("ToolExecutor")
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
        var variables = System.Text.Json.JsonSerializer.Deserialize<Dictionary<string, object?>>(input) ?? new();

        // 逻辑：根据 _config.Provider 和 _config.Tool 调用具体工具
        // 这里可以使用 DifyVariableResolver 来解析工具输入参数
        
        return await Task.FromResult($"[Tool Result] Provider: {_config.Provider}, Tool: {_config.Tool}, Inputs: {input}");
    }
}
