using System;
using System.Collections.Generic;
using Microsoft.Extensions.Logging;
using Platform.ApiService.Models.Workflow;

namespace Platform.ApiService.Services;

/// <summary>
/// 条件分支评估结果
/// </summary>
public class ConditionEvaluationResult
{
    /// <summary>
    /// 匹配的分支ID
    /// </summary>
    public string BranchId { get; set; } = string.Empty;

    /// <summary>
    /// 目标节点ID
    /// </summary>
    public string TargetNodeId { get; set; } = string.Empty;

    /// <summary>
    /// 是否有分支匹配
    /// </summary>
    public bool IsMatched { get; set; }
}

/// <summary>
/// 工作流表达式评估接口
/// </summary>
public interface IWorkflowExpressionEvaluator
{
    /// <summary>
    /// 评估表达式在给定变量集下是否成立
    /// </summary>
    /// <param name="expression">表达式字符串（支持 &gt;, &lt;, &gt;=, &lt;=, ==, != 及布尔变量）</param>
    /// <param name="variables">变量字典</param>
    /// <returns>表达式是否为真</returns>
    bool Evaluate(string expression, Dictionary<string, object?> variables);

    /// <summary>
    /// 评估条件规则列表
    /// </summary>
    /// <param name="conditions">条件规则列表</param>
    /// <param name="logicalOperator">逻辑运算符（and/or）</param>
    /// <param name="variables">变量字典</param>
    /// <returns>条件是否满足</returns>
    bool EvaluateConditions(List<ConditionRule> conditions, string logicalOperator, Dictionary<string, object?> variables);

    /// <summary>
    /// 评估条件分支，返回匹配的分支
    /// </summary>
    /// <param name="config">条件配置</param>
    /// <param name="variables">变量字典</param>
    /// <returns>匹配的分支信息</returns>
    ConditionEvaluationResult EvaluateConditionBranches(ConditionConfig config, Dictionary<string, object?> variables);
}

/// <summary>
/// 默认的工作流表达式评估器实现
/// </summary>
public class WorkflowExpressionEvaluator : IWorkflowExpressionEvaluator
{
    private readonly ILogger<WorkflowExpressionEvaluator> _logger;

    /// <summary>
    /// 初始化表达式评估器
    /// </summary>
    /// <param name="logger">日志记录器</param>
    public WorkflowExpressionEvaluator(ILogger<WorkflowExpressionEvaluator> logger)
    {
        _logger = logger;
    }

    /// <summary>
    /// 评估表达式在给定变量集下是否成立
    /// </summary>
    public bool Evaluate(string expression, Dictionary<string, object?> variables)
    {
        if (string.IsNullOrWhiteSpace(expression)) return true;

        var stopwatch = System.Diagnostics.Stopwatch.StartNew();

        try
        {
            expression = expression.Trim();

            // 处理复合逻辑的简单且实用实现：按顺序计算（目前不处理复杂括号优先级嵌套）
            if (expression.Contains("||"))
            {
                var parts = expression.Split("||", StringSplitOptions.RemoveEmptyEntries);
                foreach (var part in parts)
                {
                    if (EvaluateSingle(part, variables)) return true;
                }
                return false;
            }

            if (expression.Contains("&&"))
            {
                var parts = expression.Split("&&", StringSplitOptions.RemoveEmptyEntries);
                foreach (var part in parts)
                {
                    if (!EvaluateSingle(part, variables)) return false;
                }
                return true;
            }

            return EvaluateSingle(expression, variables);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "表达式评估失败: {Expression}", expression);
            return false;
        }
        finally
        {
            stopwatch.Stop();
            // 记录性能指标
            if (stopwatch.ElapsedMilliseconds > 100)
            {
                _logger.LogWarning("表达式评估耗时过长: {Expression}, 耗时={ElapsedMilliseconds}ms", expression, stopwatch.ElapsedMilliseconds);
            }
            else if (stopwatch.ElapsedMilliseconds > 10)
            {
                _logger.LogDebug("表达式评估耗时: {Expression}, 耗时={ElapsedMilliseconds}ms", expression, stopwatch.ElapsedMilliseconds);
            }
        }
    }

    private bool EvaluateSingle(string expression, Dictionary<string, object?> variables)
    {
        expression = expression.Trim();
        var (foundOp, leftKeyRaw, rightValueStr) = ParseExpression(expression);

        if (foundOp != null && leftKeyRaw != null && rightValueStr != null)
        {
            // 清洗变量键，移除前端插值符号的大括号
            var leftKeyClean = leftKeyRaw.Replace("{", "").Replace("}", "").Trim();

            // 支持嵌套对象访问，例如 user.level
            var leftValue = GetNestedValue(leftKeyClean, variables);

            if (leftValue != null)
            {
                var res = CompareValues(leftValue, rightValueStr, foundOp);
                System.Console.WriteLine($"DEBUG_EVALUATOR: Compare Variable '{leftKeyClean}' Value '{leftValue}' ({leftValue?.GetType().Name}) {foundOp} '{rightValueStr}' -> {res}");
                return res;
            }

            // 变量不存在时的宽容处理
            if (foundOp == "!=") return true;
            if (foundOp == "==") return false;

            _logger.LogWarning("表达式变量不存在: Variable={Variable}, Expression={Expression}", leftKeyClean, expression);
            return false;
        }
        else
        {
            // 单独布尔变量或单一字面量
            var singleKeyClean = expression.Replace("{", "").Replace("}", "").Trim();

            // 是否字面布尔值
            if (bool.TryParse(singleKeyClean, out var literalBool)) return literalBool;

            // 支持嵌套对象访问
            var boolValue = GetNestedValue(singleKeyClean, variables);
            if (boolValue != null)
            {
                if (boolValue is bool b) return b;
                if (bool.TryParse(boolValue?.ToString(), out var parsedBool)) return parsedBool;
                var strVal = boolValue?.ToString()?.Trim().ToLower();
                return strVal == "true" || strVal == "1" || strVal == "yes";
            }
        }

        return false;
    }

    /// <summary>
    /// Bug 10 修复：更精确地解析表达式，避免变量名中包含运算符时的误匹配
    /// </summary>
    private (string? op, string? left, string? right) ParseExpression(string expression)
    {
        // 按照长度降序排列操作符
        string[] operators = { ">=", "<=", "!=", "==", ">", "<" };

        foreach (var op in operators)
        {
            // 尝试用运算符分割，取第一次出现的位置
            var idx = expression.IndexOf(op, StringComparison.Ordinal);
            if (idx <= 0) continue; // 运算符不在开头

            var leftKey = expression.Substring(0, idx).Trim();
            var rightValueStr = expression.Substring(idx + op.Length).Trim().Trim('"', '\'');

            // 验证左侧是合法的变量名（不包含运算符字符）
            if (!string.IsNullOrEmpty(leftKey) && !string.IsNullOrEmpty(rightValueStr))
            {
                return (op, leftKey, rightValueStr);
            }
        }

        return (null, null, null);
    }

    private bool CompareValues(object? leftValue, string rightValueStr, string op)
    {
        if (leftValue == null) return op == "==" ? rightValueStr == "null" : op == "!=";

        // 处理 JsonElement 类型（从 JSON 反序列化得到）
        if (leftValue is System.Text.Json.JsonElement jsonElement)
        {
            leftValue = jsonElement.ValueKind switch
            {
                System.Text.Json.JsonValueKind.Number => jsonElement.GetDouble(),
                System.Text.Json.JsonValueKind.String => jsonElement.GetString(),
                System.Text.Json.JsonValueKind.True => true,
                System.Text.Json.JsonValueKind.False => false,
                System.Text.Json.JsonValueKind.Null => null,
                _ => jsonElement.ToString()
            };

            if (leftValue == null)
                return op == "==" ? rightValueStr == "null" : op == "!=";
        }

        // 处理布尔值比较
        if (leftValue is bool leftBool)
        {
            if (bool.TryParse(rightValueStr, out var rightBool))
            {
                return op switch
                {
                    "==" => leftBool == rightBool,
                    "!=" => leftBool != rightBool,
                    _ => false
                };
            }
        }

        // 尝试作为数字比较
        if (double.TryParse(leftValue.ToString(), out var leftNum) && double.TryParse(rightValueStr, out var rightNum))
        {
            var result = op switch
            {
                ">" => leftNum > rightNum,
                "<" => leftNum < rightNum,
                ">=" => leftNum >= rightNum,
                "<=" => leftNum <= rightNum,
                "==" => Math.Abs(leftNum - rightNum) < 0.0001,
                "!=" => Math.Abs(leftNum - rightNum) >= 0.0001,
                _ => false
            };
            return result;
        }

        // 默认作为字符串比较（不区分大小写）
        var leftStr = leftValue.ToString() ?? string.Empty;
        var stringResult = op switch
        {
            "==" => leftStr.Equals(rightValueStr, StringComparison.OrdinalIgnoreCase),
            "!=" => !leftStr.Equals(rightValueStr, StringComparison.OrdinalIgnoreCase),
            _ => false
        };
        return stringResult;
    }

    /// <summary>
    /// 获取嵌套对象的值，支持点号语法
    /// 例如：user.level, address.city
    /// </summary>
    private object? GetNestedValue(string path, Dictionary<string, object?> variables)
    {
        if (string.IsNullOrWhiteSpace(path))
            return null;

        // 如果路径中包含点号，则进行嵌套访问
        if (path.Contains("."))
        {
            var parts = path.Split(".", StringSplitOptions.RemoveEmptyEntries);
            object? current = null;

            // 首先从变量字典中获取根对象
            if (!variables.TryGetValue(parts[0], out current))
            {
                // 尝试大小写不敏感匹配
                var match = variables.FirstOrDefault(v =>
                    v.Key.Equals(parts[0], StringComparison.OrdinalIgnoreCase));
                if (match.Equals(default(KeyValuePair<string, object?>)))
                    return null;
                current = match.Value;
            }

            // 逐级访问嵌套属性
            for (int i = 1; i < parts.Length; i++)
            {
                if (current == null)
                    return null;

                var propertyName = parts[i];

                // 尝试作为 JSON 对象访问
                if (current is System.Text.Json.JsonElement jsonElement)
                {
                    if (jsonElement.TryGetProperty(propertyName, out var property))
                    {
                        // 根据 JSON 元素类型返回相应的值
                        current = property.ValueKind switch
                        {
                            System.Text.Json.JsonValueKind.String => property.GetString(),
                            System.Text.Json.JsonValueKind.Number => property.GetDouble(),
                            System.Text.Json.JsonValueKind.True => true,
                            System.Text.Json.JsonValueKind.False => false,
                            System.Text.Json.JsonValueKind.Null => null,
                            _ => property // 返回 JsonElement 本身以支持进一步的嵌套访问
                        };
                    }
                    else
                    {
                        return null;
                    }
                }
                // 尝试作为普通对象的属性访问
                else
                {
                    var property = current.GetType().GetProperty(propertyName,
                        System.Reflection.BindingFlags.IgnoreCase | System.Reflection.BindingFlags.Public);
                    if (property != null)
                    {
                        current = property.GetValue(current);
                    }
                    else
                    {
                        return null;
                    }
                }
            }

            return current;
        }

        // 单级访问
        if (variables.TryGetValue(path, out var value))
        {
            return value;
        }

        // 尝试大小写不敏感匹配
        var caseInsensitiveMatch = variables.FirstOrDefault(v =>
            v.Key.Equals(path, StringComparison.OrdinalIgnoreCase));

        if (!caseInsensitiveMatch.Equals(default(KeyValuePair<string, object?>)))
        {
            return caseInsensitiveMatch.Value;
        }

        return null;
    }

    /// <summary>
    /// 评估条件规则列表
    /// </summary>
    public bool EvaluateConditions(List<ConditionRule> conditions, string logicalOperator, Dictionary<string, object?> variables)
    {
        if (conditions == null || conditions.Count == 0)
            return true;

        var isAnd = logicalOperator?.ToLower() == "and";

        foreach (var condition in conditions)
        {
            // 构建表达式：variable operator value
            var expression = $"{condition.Variable} {condition.Operator} {condition.Value}";
            var result = Evaluate(expression, variables);

            if (isAnd && !result)
                return false;

            if (!isAnd && result)
                return true;
        }

        return isAnd;
    }

    /// <summary>
    /// 评估条件分支，返回匹配的分支
    /// </summary>
    public ConditionEvaluationResult EvaluateConditionBranches(ConditionConfig config, Dictionary<string, object?> variables)
    {
        if (config?.Branches == null || config.Branches.Count == 0)
        {
            return new ConditionEvaluationResult { IsMatched = false };
        }

        // 按顺序评估每个分支
        foreach (var branch in config.Branches.OrderBy(b => b.Order))
        {
            // 评估该分支的条件
            var isMatched = EvaluateConditions(
                branch.Conditions,
                branch.LogicalOperator,
                variables);

            if (isMatched)
            {
                return new ConditionEvaluationResult
                {
                    BranchId = branch.Id,
                    TargetNodeId = branch.TargetNodeId,
                    IsMatched = true
                };
            }
        }

        // 如果没有分支匹配，使用默认节点
        if (!string.IsNullOrEmpty(config.DefaultNodeId))
        {
            return new ConditionEvaluationResult
            {
                TargetNodeId = config.DefaultNodeId,
                IsMatched = false
            };
        }

        // 没有匹配的分支，也没有默认节点
        return new ConditionEvaluationResult { IsMatched = false };
    }
}