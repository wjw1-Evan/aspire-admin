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
    private async ValueTask<object?> HandleAsync(string input, IWorkflowContext context, CancellationToken cancellationToken = default)
    {
        // 反序列化变量
        var variables = JsonSerializer.Deserialize<Dictionary<string, object?>>(input) ?? new();
        
        // 解析输入变量
        var query = _config.InputVariable != null 
            ? Utilities.DifyVariableResolver.Resolve($"{{{{{_config.InputVariable}}}}}", variables)
            : input;

        // 构建提示词来引导 AI 进行参数提取
        var paramSchema = string.Join("\n", _config.Parameters.Select(p => 
            $"- {p.Name} ({p.Type}): {p.Description} (Required: {p.Required})"));
        
        var extractionPrompt = $@"Task: Extract parameters from the input based on the following schema. 
Return ONLY a valid JSON object. 

Schema:
{paramSchema}

Input: {query}";

        var response = await _agent.RunAsync(extractionPrompt, cancellationToken: cancellationToken);
        var jsonText = response.Text.Trim();

        // 尝试解析 JSON
        try
        {
            // 移除可能存在的 Markdown 代码块标记
            if (jsonText.Contains("```json"))
            {
                var start = jsonText.IndexOf("```json") + 7;
                var end = jsonText.LastIndexOf("```");
                jsonText = jsonText.Substring(start, end - start).Trim();
            }
            else if (jsonText.Contains("```"))
            {
                var start = jsonText.IndexOf("```") + 3;
                var end = jsonText.LastIndexOf("```");
                jsonText = jsonText.Substring(start, end - start).Trim();
            }

            var extracted = JsonSerializer.Deserialize<Dictionary<string, object?>>(jsonText) ?? new();
            
            // 构造结果字典，包含 __variables__ 以便引擎自动合并到全局变量
            var finalResult = new Dictionary<string, object?>(extracted);
            if (!string.IsNullOrEmpty(_config.OutputVariable))
            {
                finalResult["__variables__"] = new Dictionary<string, object?>
                {
                    [_config.OutputVariable] = extracted
                };
            }
            
            return finalResult;
        }
        catch (Exception ex)
        {
            return new Dictionary<string, object?> { ["error"] = ex.Message };
        }
    }
}
