using Microsoft.Agents.AI.Workflows;
using Platform.ApiService.Models.Workflow;
using System.Text.RegularExpressions;

namespace Platform.ApiService.Workflows.Executors;

/// <summary>
/// 模板转换执行器 - 支持变量插值的文本处理
/// </summary>
internal sealed partial class TemplateExecutor : Executor
{
    private readonly TemplateConfig _config;

    public TemplateExecutor(TemplateConfig config) : base("TemplateExecutor")
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

        // 使用 DifyVariableResolver 解析模板
        var result = Utilities.DifyVariableResolver.Resolve(_config.Template ?? string.Empty, variables);

        await Task.CompletedTask;
        return result;
    }
}
