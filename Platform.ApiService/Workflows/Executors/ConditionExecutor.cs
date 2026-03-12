using Microsoft.Agents.AI.Workflows;
using Platform.ApiService.Models.Workflow;
using Platform.ApiService.Services;
using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;

namespace Platform.ApiService.Workflows.Executors;

/// <summary>
/// 条件分支执行器 - 根据逻辑规则决定流程走向
/// </summary>
internal sealed partial class ConditionExecutor : Executor
{
    private readonly ConditionConfig _config;
    private readonly IWorkflowExpressionEvaluator _expressionEvaluator;

    public ConditionExecutor(ConditionConfig config, IWorkflowExpressionEvaluator expressionEvaluator) : base("ConditionExecutor")
    {
        _config = config;
        _expressionEvaluator = expressionEvaluator;
    }

    protected override ProtocolBuilder ConfigureProtocol(ProtocolBuilder builder) => builder;

    [MessageHandler]
    public async Task<object?> HandleAsync(string input, IWorkflowContext context, CancellationToken cancellationToken = default)
    {
        // 反序列化变量
        var variables = System.Text.Json.JsonSerializer.Deserialize<Dictionary<string, object?>>(input, new System.Text.Json.JsonSerializerOptions { PropertyNameCaseInsensitive = true }) ?? new();

        System.Console.WriteLine($"DEBUG_EVALUATOR: Input Variables Count = {variables.Count}");
        foreach(var v in variables) System.Console.WriteLine($"DEBUG_EVALUATOR: Var {v.Key} = {v.Value}");

        // 遍历所有条件分支 (Dify 的条件通常是 IF/ELSE 结构)
        // 注意：在标准 Dify 节点中，条件边有明确的 handle
        // 此处我们遍历配置中的规则
        
        // 如果是简单的单一条件节点，通常有 true 和 false 两个出口
        bool allMatch = true;
        if (_config.Conditions != null && _config.Conditions.Count > 0)
        {
            var results = new List<bool>();
            foreach (var rule in _config.Conditions)
            {
                // 构造简单的表达式字符串: "{var} operator value"
                var expression = $"{{{rule.Variable}}} {MapOperator(rule.Operator)} {rule.Value}";
                var res = _expressionEvaluator.Evaluate(expression, variables);
                
                try {
                    variables.TryGetValue(rule.Variable ?? "", out var leftVal);
                    // 如果变量名不存在，尝试不分大小写查找
                    if (leftVal == null && rule.Variable != null) 
                    {
                        leftVal = variables.FirstOrDefault(v => v.Key.Equals(rule.Variable, System.StringComparison.OrdinalIgnoreCase)).Value;
                    }
                } catch {}

                results.Add(res);
            }

            if (_config.LogicalOperator?.ToLower() == "or")
            {
                allMatch = results.Contains(true);
            }
            else
            {
                allMatch = !results.Contains(false);
            }
        }

        await Task.CompletedTask;

        // 返回匹配的 handle
        return new Dictionary<string, object?>
        {
            ["__sourceHandle"] = allMatch ? "true" : "false",
            ["result"] = allMatch
        };
    }

    private string MapOperator(string op) => op switch
    {
        "equals" => "==",
        "not_equals" => "!=",
        "greater_than" => ">",
        "less_than" => "<",
        "greater_than_or_equal" => ">=",
        "less_than_or_equal" => "<=",
        "contains" => "==", // 评估器目前对 contains 处理有限，暂映射为等于
        _ => "=="
    };
}
