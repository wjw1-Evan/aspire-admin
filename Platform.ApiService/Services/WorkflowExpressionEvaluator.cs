using System;
using System.Collections.Generic;
using Microsoft.Extensions.Logging;

namespace Platform.ApiService.Services;

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

        // 尝试作为数字比较
        if (double.TryParse(leftValue.ToString(), out var leftNum) && double.TryParse(rightValueStr, out var rightNum))
        {
            return op switch
            {
                ">" => leftNum > rightNum,
                "<" => leftNum < rightNum,
                ">=" => leftNum >= rightNum,
                "<=" => leftNum <= rightNum,
                "==" => Math.Abs(leftNum - rightNum) < 0.0001,
                "!=" => Math.Abs(leftNum - rightNum) >= 0.0001,
                _ => false
            };
        }

        // 默认作为字符串比较
        var leftStr = leftValue.ToString();
        return op switch
        {
            "==" => leftStr == rightValueStr,
            "!=" => leftStr != rightValueStr,
            _ => false
        };
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
                        current = property.GetRawText();
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
}
