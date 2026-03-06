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
        var result = _config.Template;

        // 简单的变量替换逻辑 {{variable}}
        foreach (var mapping in _config.Variables)
        {
            // 逻辑上这里应该从 context 获取变量
            // 由于 IWorkflowContext 的具体 API 还在探索中，先占位实现
            var value = await GetVariableValueAsync(context, mapping.Value);
            result = result.Replace("{{" + mapping.Key + "}}", value ?? string.Empty);
        }

        return result;
    }

    private Task<string?> GetVariableValueAsync(IWorkflowContext context, string path)
    {
        // 占位实现：未来需要从 WorkflowContext 中获取状态数据
        return Task.FromResult<string?>(null);
    }
}
