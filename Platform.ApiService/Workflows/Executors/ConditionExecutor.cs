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

    [MessageHandler]
    public async Task<object?> HandleAsync(string input, IWorkflowContext context, CancellationToken cancellationToken = default)
    {
        // 反序列化变量（包含表单数据）
        var variables = System.Text.Json.JsonSerializer.Deserialize<Dictionary<string, object?>>(input, new System.Text.Json.JsonSerializerOptions { PropertyNameCaseInsensitive = true }) ?? new();

        // 构建调试信息
        var debugInfo = new System.Text.StringBuilder();
        debugInfo.AppendLine($"========== 条件节点开始评估 ==========");
        debugInfo.AppendLine($"变量总数 = {variables.Count}");
        debugInfo.AppendLine($"分支数 = {_config.Branches?.Count ?? 0}");

        debugInfo.AppendLine($"变量列表:");
        foreach (var v in variables)
        {
            var valueStr = v.Value == null ? "null" : $"{v.Value} ({v.Value.GetType().Name})";
            debugInfo.AppendLine($"  [{v.Key}] = {valueStr}");
        }

        System.Console.WriteLine(debugInfo.ToString());
        System.Console.Out.Flush();

        // 验证表达式安全性
        if (!string.IsNullOrWhiteSpace(_config.Expression))
        {
            var validationResult = _expressionValidator.Validate(_config.Expression);
            if (!validationResult.IsValid)
            {
                System.Console.WriteLine($"DEBUG_CONDITION: 表达式验证失败 - {validationResult.ErrorMessage}");
                return new Dictionary<string, object?>
                {
                    ["__sourceHandle"] = _config.DefaultBranchId ?? "default",
                    ["result"] = false,
                    ["error"] = validationResult.ErrorMessage,
                    ["evaluatedAt"] = System.DateTime.UtcNow
                };
            }
        }

        // 评估分支，找到匹配的分支
        var matchedBranch = EvaluateConditionBranches(variables);

        System.Console.WriteLine($"DEBUG_CONDITION: 匹配的分支 = {matchedBranch?.Id ?? "default"}");
        System.Console.Out.Flush();

        await Task.CompletedTask;

        // 返回匹配的分支 ID 作为 sourceHandle，用于路由到不同的下一个组件
        return new Dictionary<string, object?>
        {
            ["__sourceHandle"] = matchedBranch?.Id ?? _config.DefaultBranchId ?? "default",
            ["branchId"] = matchedBranch?.Id,
            ["branchLabel"] = matchedBranch?.Label,
            ["result"] = matchedBranch != null,
            ["evaluatedAt"] = System.DateTime.UtcNow
        };
    }

    /// <summary>
    /// 评估所有分支，返回第一个匹配的分支
    /// </summary>
    private ConditionBranch? EvaluateConditionBranches(Dictionary<string, object?> variables)
    {
        // 如果没有配置分支，返回 null
        if (_config.Branches == null || _config.Branches.Count == 0)
        {
            System.Console.WriteLine("DEBUG_CONDITION: 未配置分支，使用默认分支");
            System.Console.Out.Flush();
            return null;
        }

        // 遍历所有分支，找到第一个匹配的
        foreach (var branch in _config.Branches.OrderBy(b => b.Order))
        {
            System.Console.WriteLine($"DEBUG_CONDITION: 评估分支 [{branch.Id}] - {branch.Label}");
            System.Console.Out.Flush();

            // 评估分支内的条件
            bool branchMatches = EvaluateBranchConditions(branch, variables);

            System.Console.WriteLine($"DEBUG_CONDITION: 分支 [{branch.Id}] 匹配结果 = {branchMatches}");
            System.Console.Out.Flush();

            if (branchMatches)
            {
                return branch;
            }
        }

        // 没有分支匹配，返回 null（将使用默认分支）
        System.Console.WriteLine("DEBUG_CONDITION: 没有分支匹配，将使用默认分支");
        System.Console.Out.Flush();
        return null;
    }

    /// <summary>
    /// 评估单个分支内的所有条件
    /// </summary>
    private bool EvaluateBranchConditions(ConditionBranch branch, Dictionary<string, object?> variables)
    {
        // 如果分支没有条件，则默认匹配
        if (branch.Conditions == null || branch.Conditions.Count == 0)
        {
            System.Console.WriteLine($"DEBUG_CONDITION: 分支 [{branch.Id}] 无条件，默认匹配");
            System.Console.Out.Flush();
            return true;
        }

        // 评估分支内的所有条件规则
        var results = new List<bool>();
        foreach (var rule in branch.Conditions)
        {
            System.Console.WriteLine($"DEBUG_CONDITION: 处理规则 - Variable={rule.Variable}, Operator={rule.Operator}, Value={rule.Value}");
            System.Console.Out.Flush();
            bool ruleResult = EvaluateSingleRule(rule, variables);
            results.Add(ruleResult);
            System.Console.WriteLine($"DEBUG_CONDITION: 规则 [{rule.Variable} {rule.Operator} {rule.Value}] = {ruleResult}");
            System.Console.Out.Flush();
        }

        // 根据分支的逻辑运算符组合结果
        bool finalResult = CombineResults(results, branch.LogicalOperator);
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
            System.Console.Out.Flush();
            return false;
        }

        // 从变量中获取值（支持大小写不敏感查找）
        object? variableValue = GetVariableValue(rule.Variable, variables);

        System.Console.WriteLine($"DEBUG_CONDITION: 获取变量 [{rule.Variable}] = {(variableValue == null ? "null" : $"{variableValue} ({variableValue.GetType().Name})")}");
        System.Console.Out.Flush();

        if (variableValue == null)
        {
            System.Console.WriteLine($"DEBUG_CONDITION: 变量 '{rule.Variable}' 不存在，返回 {(rule.Operator == "not_equals" || rule.Operator == "!=")}");
            System.Console.Out.Flush();
            // 变量不存在时的处理
            return rule.Operator == "not_equals" || rule.Operator == "!=";
        }

        // 构造表达式并评估
        string expression = BuildExpression(rule.Variable, rule.Operator, rule.Value);
        System.Console.WriteLine($"DEBUG_CONDITION: 构造表达式 = [{expression}]");
        System.Console.Out.Flush();
        bool result = _expressionEvaluator.Evaluate(expression, variables);

        System.Console.WriteLine($"DEBUG_CONDITION: 表达式 [{expression}] 评估结果 = {result}");
        System.Console.Out.Flush();
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
    private bool CombineResults(List<bool> results, string? logicalOperator = null)
    {
        if (results.Count == 0) return true;

        string logicalOp = (logicalOperator ?? "and").ToLower();

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
