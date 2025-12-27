using System;
using System.Collections.Generic;
using Microsoft.Extensions.Logging;

namespace Platform.ApiService.Services;

/// <summary>
/// 工作流表达式评估接口
/// </summary>
public interface IWorkflowExpressionEvaluator
{
    bool Evaluate(string expression, Dictionary<string, object> variables);
}

public class WorkflowExpressionEvaluator : IWorkflowExpressionEvaluator
{
    private readonly ILogger<WorkflowExpressionEvaluator> _logger;

    public WorkflowExpressionEvaluator(ILogger<WorkflowExpressionEvaluator> logger)
    {
        _logger = logger;
    }

    public bool Evaluate(string expression, Dictionary<string, object> variables)
    {
        if (string.IsNullOrWhiteSpace(expression)) return true;

        try
        {
            // 增强版实现：支持常用的比较操作符
            expression = expression.Trim();

            // 按照长度降序排列操作符，避免 ">=" 被识别为 ">"
            string[] operators = { ">=", "<=", "!=", "==", ">", "<" };
            
            string? foundOp = null;
            foreach (var op in operators)
            {
                if (expression.Contains(op))
                {
                    foundOp = op;
                    break;
                }
            }

            if (foundOp != null)
            {
                var parts = expression.Split(new[] { foundOp }, StringSplitOptions.RemoveEmptyEntries);
                if (parts.Length == 2)
                {
                    var leftKey = parts[0].Trim();
                    var rightValueStr = parts[1].Trim().Trim('"', '\'');

                    if (variables.TryGetValue(leftKey, out var leftValue))
                    {
                        return CompareValues(leftValue, rightValueStr, foundOp);
                    }
                }
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
                "==" => leftNum == rightNum,
                "!=" => leftNum != rightNum,
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
