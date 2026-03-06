using Microsoft.Agents.AI;
using Microsoft.Agents.AI.Workflows;
using Platform.ApiService.Models.Workflow;
using System.Text.Json;
using System.Linq;

namespace Platform.ApiService.Workflows.Executors;

/// <summary>
/// 问题分类执行器 - 利用 AIAgent 对输入进行意图分类
/// </summary>
internal sealed partial class QuestionClassifierExecutor : Executor
{
    private readonly AIAgent _agent;
    private readonly QuestionClassifierConfig _config;

    public QuestionClassifierExecutor(AIAgent agent, QuestionClassifierConfig config) : base("QuestionClassifierExecutor")
    {
        _agent = agent;
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
        var variables = JsonSerializer.Deserialize<Dictionary<string, object?>>(input) ?? new();
        
        // 解析输入变量
        var query = _config.InputVariable != null 
            ? Utilities.DifyVariableResolver.Resolve($"{{{{{_config.InputVariable}}}}}", variables)
            : input;

        // 构建提示词来引导 AI 进行分类
        var classesDesc = string.Join("\n", _config.Classes.Select(c => $"- {c.Id}: {c.Name} ({c.Description})"));
        var classificationPrompt = $@"Task: Classify the user query into exactly one of the following classes. 
Return ONLY the Class ID, no other text.

Classes:
{classesDesc}

User Query: {query}";

        var response = await _agent.RunAsync(classificationPrompt, cancellationToken: cancellationToken);
        var classId = response.Text.Trim();

        // 验证返回的 ClassId 是否在合法列表中
        var matched = _config.Classes.FirstOrDefault(c => string.Equals(c.Id, classId, StringComparison.OrdinalIgnoreCase));
        
        // 如果没有完全匹配，尝试在返回结果中查找 ID (防止 AI 返回 "Class ID: XXX")
        if (matched == null)
        {
            matched = _config.Classes.FirstOrDefault(c => classId.Contains(c.Id, StringComparison.OrdinalIgnoreCase));
        }

        return matched?.Id ?? _config.Classes.FirstOrDefault()?.Id ?? "unknown";
    }
}
