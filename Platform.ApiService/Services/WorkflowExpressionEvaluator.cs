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
    bool Evaluate(string expression, Dictionary<string, object> variables);
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
    public bool Evaluate(string expression, Dictionary<string, object> variables)
    {
        if (string.IsNullOrWhiteSpace(expression)) return true;

        try
        {
            expression = expression.Trim();

            // Bug 10 修复：更精确的运算符匹配，使用带空格边界的检测
            var (foundOp, leftKey, rightValueStr) = ParseExpression(expression);

            if (foundOp != null && leftKey != null && rightValueStr != null)
            {
                if (variables.TryGetValue(leftKey, out var leftValue))
                {
                    return CompareValues(leftValue, rightValueStr, foundOp);
                }

                // Bug 11 修复：变量不存在时，!= 返回 true，== 返回 false
                if (foundOp == "!=") return true;
                if (foundOp == "==") return false;

                _logger.LogWarning("表达式变量不存在: Variable={Variable}, Expression={Expression}", leftKey, expression);
                return false;
            }
            else
            {
                // 布尔变量直接判断
                if (variables.TryGetValue(expression, out var boolValue))
                {
                    if (boolValue is bool b) return b;
                    if (bool.TryParse(boolValue?.ToString(), out var parsedBool)) return parsedBool;
                }
            }

            _logger.LogWarning("无法解析表达式: {Expression}", expression);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "表达式评估失败: {Expression}", expression);
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
}
