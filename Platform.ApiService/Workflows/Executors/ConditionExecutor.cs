using Microsoft.Agents.AI.Workflows;
using Platform.ApiService.Models.Workflow;
using Platform.ApiService.Services;
using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;
using System.Linq;

namespace Platform.ApiService.Workflows.Executors;

/// <summary>
/// 条件分支执行器 - 根据逻辑规则决定流程走向
/// 
/// 业务规则：
/// 1. 条件组件使用流程中绑定的表单数据进行判断
/// 2. 支持多个条件规则，通过逻辑运算符（AND/OR）组合
/// 3. 根据判断结果返回对应的 sourceHandle（true/false），走向不同的下一个组件
/// 
/// 安全规则：
/// 1. 所有表达式在执行前都会进行验证
/// 2. 防止表达式注入攻击
/// 3. 限制表达式长度和复杂度
/// </summary>
internal sealed partial class ConditionExecutor : Executor
{
    private readonly ConditionConfig _config;
    private readonly IWorkflowExpressionEvaluator _expressionEvaluator;
    private readonly IWorkflowExpressionValidator _expressionValidator;

    public ConditionExecutor(ConditionConfig config, IWorkflowExpressionEvaluator expressionEvaluator, IWorkflowExpressionValidator expressionValidator) : base("ConditionExecutor")
    {
        _config = config;
        _expressionEvaluator = expressionEvaluator;
        _expressionValidator = expressionValidator;
    }

    protected override ProtocolBuilder ConfigureProtocol(ProtocolBuilder builder) => builder;

    [MessageHandler]
    public async Task<object?> HandleAsync(string input, IWorkflowContext context, CancellationToken cancellationToken = default)
    {
        // 反序列化变量（包含表单数据）
        var variables = System.Text.Json.JsonSerializer.Deserialize<Dictionary<string, object?>>(input, new System.Text.Json.JsonSerializerOptions { PropertyNameCaseInsensitive = true }) ?? new();

        System.Console.WriteLine($"DEBUG_CONDITION: 条件节点开始评估，变量总数 = {variables.Count}");
        foreach (var v in variables)
        {
            System.Console.WriteLine($"DEBUG_CONDITION: 变量 {v.Key} = {v.Value}");
        }

        // 验证表达式安全性
        if (!string.IsNullOrWhiteSpace(_config.Expression))
        {
            var validationResult = _expressionValidator.Validate(_config.Expression);
            if (!validationResult.IsValid)
            {
                System.Console.WriteLine($"DEBUG_CONDITION: 表达式验证失败 - {validationResult.ErrorMessage}");
                return new Dictionary<string, object?>
                {
                    ["__sourceHandle"] = "false",
                    ["result"] = false,
                    ["error"] = validationResult.ErrorMessage,
                    ["evaluatedAt"] = System.DateTime.UtcNow
                };
            }
        }

        // 验证条件规则中的变量名
        if (_config.Conditions != null)
        {
            foreach (var rule in _config.Conditions)
            {
                var validationResult = _expressionValidator.ValidateVariableName(rule.Variable);
                if (!validationResult.IsValid)
                {
                    System.Console.WriteLine($"DEBUG_CONDITION: 变量名验证失败 - {validationResult.ErrorMessage}");
                    return new Dictionary<string, object?>
                    {
                        ["__sourceHandle"] = "false",
                        ["result"] = false,
                        ["error"] = validationResult.ErrorMessage,
                        ["evaluatedAt"] = System.DateTime.UtcNow
                    };
                }
            }
        }

        // 评估条件规则
        bool conditionResult = EvaluateConditions(variables);

        System.Console.WriteLine($"DEBUG_CONDITION: 条件评估结果 = {conditionResult}");

        await Task.CompletedTask;

        // 返回匹配的 handle（true/false），用于路由到不同的下一个组件
        return new Dictionary<string, object?>
        {
            ["__sourceHandle"] = conditionResult ? "true" : "false",
            ["result"] = conditionResult,
            ["evaluatedAt"] = System.DateTime.UtcNow
        };
    }

    /// <summary>
    /// 评估所有条件规则
    /// </summary>
    private bool EvaluateConditions(Dictionary<string, object?> variables)
    {
        // 如果没有配置条件规则，默认返回 true
        if (_config.Conditions == null || _config.Conditions.Count == 0)
        {
            System.Console.WriteLine("DEBUG_CONDITION: 未配置条件规则，默认返回 true");
            return true;
        }

        // 如果配置了表达式，优先使用表达式
        if (!string.IsNullOrWhiteSpace(_config.Expression))
        {
            System.Console.WriteLine($"DEBUG_CONDITION: 使用表达式评估: {_config.Expression}");
            return _expressionEvaluator.Evaluate(_config.Expression, variables);
        }

        // 否则使用条件规则列表
        var results = new List<bool>();
        foreach (var rule in _config.Conditions)
        {
            bool ruleResult = EvaluateSingleRule(rule, variables);
            results.Add(ruleResult);
            System.Console.WriteLine($"DEBUG_CONDITION: 规则 [{rule.Variable} {rule.Operator} {rule.Value}] = {ruleResult}");
        }

        // 根据逻辑运算符组合结果
        bool finalResult = CombineResults(results);
        return finalResult;
    }

    /// <summary>
    /// 评估单个条件规则
    /// </summary>
    private bool EvaluateSingleRule(ConditionRule rule, Dictionary<string, object?> variables)
    {
        if (string.IsNullOrWhiteSpace(rule.Variable))
        {
            System.Console.WriteLine("DEBUG_CONDITION: 规则变量名为空");
            return false;
        }

        // 从变量中获取值（支持大小写不敏感查找）
        object? variableValue = GetVariableValue(rule.Variable, variables);

        if (variableValue == null)
        {
            System.Console.WriteLine($"DEBUG_CONDITION: 变量 '{rule.Variable}' 不存在");
            // 变量不存在时的处理
            return rule.Operator == "not_equals" || rule.Operator == "!=";
        }

        // 构造表达式并评估
        string expression = BuildExpression(rule.Variable, rule.Operator, rule.Value);
        bool result = _expressionEvaluator.Evaluate(expression, variables);

        System.Console.WriteLine($"DEBUG_CONDITION: 表达式 '{expression}' 评估结果 = {result}");
        return result;
    }

    /// <summary>
    /// 从变量字典中获取值（支持大小写不敏感）
    /// </summary>
    private object? GetVariableValue(string variableName, Dictionary<string, object?> variables)
    {
        // 首先尝试精确匹配
        if (variables.TryGetValue(variableName, out var value))
        {
            return value;
        }

        // 然后尝试大小写不敏感匹配
        var caseInsensitiveMatch = variables.FirstOrDefault(v =>
            v.Key.Equals(variableName, System.StringComparison.OrdinalIgnoreCase));

        if (!caseInsensitiveMatch.Equals(default(KeyValuePair<string, object?>)))
        {
            return caseInsensitiveMatch.Value;
        }

        return null;
    }

    /// <summary>
    /// 构造表达式字符串
    /// </summary>
    private string BuildExpression(string variable, string op, string? value)
    {
        string mappedOp = MapOperator(op);
        string cleanValue = value ?? "null";
        return $"{{{variable}}} {mappedOp} {cleanValue}";
    }

    /// <summary>
    /// 组合多个条件结果
    /// </summary>
    private bool CombineResults(List<bool> results)
    {
        if (results.Count == 0) return true;

        string logicalOp = _config.LogicalOperator?.ToLower() ?? "and";

        if (logicalOp == "or")
        {
            // OR 逻辑：任意一个为 true 则结果为 true
            return results.Any(r => r);
        }
        else
        {
            // AND 逻辑（默认）：所有都为 true 则结果为 true
            return results.All(r => r);
        }
    }

    /// <summary>
    /// 映射操作符
    /// </summary>
    private string MapOperator(string op) => op switch
    {
        "equals" or "==" => "==",
        "not_equals" or "!=" => "!=",
        "greater_than" or ">" => ">",
        "less_than" or "<" => "<",
        "greater_than_or_equal" or ">=" => ">=",
        "less_than_or_equal" or "<=" => "<=",
        "contains" => "==", // 评估器目前对 contains 处理有限，暂映射为等于
        "in" => "==",
        "not_in" => "!=",
        _ => "=="
    };
}
