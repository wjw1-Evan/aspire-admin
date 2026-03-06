using Microsoft.Agents.AI;
using Microsoft.Agents.AI.Workflows;
using Platform.ApiService.Models.Workflow;
using System.Text.Json;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;

namespace Platform.ApiService.Workflows.Executors;

/// <summary>
/// 参数提取执行器 - 利用 LLM 从文本中提取结构化参数
/// </summary>
internal sealed partial class ParameterExtractorExecutor : Executor
{
    private readonly AIAgent _agent;
    private readonly ParameterExtractorConfig _config;

    public ParameterExtractorExecutor(AIAgent agent, ParameterExtractorConfig config) : base("ParameterExtractorExecutor")
    {
        _agent = agent;
        _config = config;
    }

    protected override ProtocolBuilder ConfigureProtocol(ProtocolBuilder builder)
    {
        return builder;
    }

    [MessageHandler]
    private async ValueTask<Dictionary<string, object?>> HandleAsync(string input, IWorkflowContext context, CancellationToken cancellationToken = default)
    {
        // 构建提示词来引导 AI 进行参数提取
        var paramSchema = string.Join("\n", _config.Parameters.Select(p => 
            $"- {p.Name} ({p.Type}): {p.Description} (Required: {p.Required})"));
        
        var extractionPrompt = $@"Task: Extract parameters from the input based on the following schema. 
Return only a valid JSON object. If a parameter is not found and is not required, omit it.

Schema:
{paramSchema}

Input: {input}";

        var response = await _agent.RunAsync(extractionPrompt, cancellationToken: cancellationToken);
        var jsonText = response.Text.Trim();

        // 尝试解析 JSON
        try
        {
            // 处理 AI 可能包裹的 ```json 代码块
            if (jsonText.StartsWith("```json"))
            {
                jsonText = jsonText.Substring(7, jsonText.Length - 10).Trim();
            }
            else if (jsonText.StartsWith("```"))
            {
                jsonText = jsonText.Substring(3, jsonText.Length - 6).Trim();
            }

            var result = JsonSerializer.Deserialize<Dictionary<string, object?>>(jsonText);
            return result ?? new Dictionary<string, object?>();
        }
        catch
        {
            // 解析失败返回空字典
            return new Dictionary<string, object?>();
        }
    }
}
