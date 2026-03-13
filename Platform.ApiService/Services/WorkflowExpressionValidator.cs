using System;
using System.Collections.Generic;
using System.Linq;
using System.Text.RegularExpressions;
using Microsoft.Extensions.Logging;

namespace Platform.ApiService.Services;

/// <summary>
/// 工作流表达式验证接口
/// </summary>
public interface IWorkflowExpressionValidator
{
    /// <summary>
    /// 验证表达式是否安全
    /// </summary>
    /// <param name="expression">表达式字符串</param>
    /// <returns>验证结果</returns>
    ValidationResult Validate(string expression);

    /// <summary>
    /// 验证变量名是否合法
    /// </summary>
    /// <param name="variableName">变量名</param>
    /// <returns>验证结果</returns>
    ValidationResult ValidateVariableName(string variableName);
}

/// <summary>
/// 验证结果
/// </summary>
public class ValidationResult
{
    /// <summary>
    /// 是否通过验证
    /// </summary>
    public bool IsValid { get; set; }

    /// <summary>
    /// 错误信息
    /// </summary>
    public string? ErrorMessage { get; set; }

    /// <summary>
    /// 创建成功的验证结果
    /// </summary>
    public static ValidationResult Success() => new() { IsValid = true };

    /// <summary>
    /// 创建失败的验证结果
    /// </summary>
    public static ValidationResult Failure(string errorMessage) => new() { IsValid = false, ErrorMessage = errorMessage };
}

/// <summary>
/// 工作流表达式验证器实现
/// 
/// 安全规则：
/// 1. 限制允许的字符集（字母、数字、下划线、点号、大括号、空格、操作符）
/// 2. 限制表达式长度（最大 1000 字符）
/// 3. 验证变量名格式（字母/数字/下划线/点号）
/// 4. 防止恶意操作符组合
/// 5. 防止过度嵌套
/// </summary>
public class WorkflowExpressionValidator : IWorkflowExpressionValidator
{
    private readonly ILogger<WorkflowExpressionValidator> _logger;

    // 允许的字符集：字母、数字、下划线、点号、大括号、空格、操作符
    private static readonly Regex AllowedCharactersRegex = new(@"^[a-zA-Z0-9_\.\{\}\s\>\<\=\!\&\|\(\)""']+$", RegexOptions.Compiled);

    // 变量名格式：字母/数字/下划线/点号，支持嵌套对象访问
    private static readonly Regex VariableNameRegex = new(@"^[a-zA-Z_][a-zA-Z0-9_]*(\.[a-zA-Z_][a-zA-Z0-9_]*)*$", RegexOptions.Compiled);

    // 允许的操作符
    private static readonly HashSet<string> AllowedOperators = new()
    {
        ">", "<", ">=", "<=", "==", "!=", "&&", "||"
    };

    // 最大表达式长度
    private const int MaxExpressionLength = 1000;

    // 最大嵌套深度
    private const int MaxNestingDepth = 5;

    public WorkflowExpressionValidator(ILogger<WorkflowExpressionValidator> logger)
    {
        _logger = logger;
    }

    /// <summary>
    /// 验证表达式是否安全
    /// </summary>
    public ValidationResult Validate(string expression)
    {
        if (string.IsNullOrWhiteSpace(expression))
        {
            return ValidationResult.Success(); // 空表达式视为有效
        }

        // 检查表达式长度
        if (expression.Length > MaxExpressionLength)
        {
            var error = $"表达式长度超过限制（最大 {MaxExpressionLength} 字符）";
            _logger.LogWarning("表达式验证失败: {Error}", error);
            return ValidationResult.Failure(error);
        }

        // 检查允许的字符集
        if (!AllowedCharactersRegex.IsMatch(expression))
        {
            var error = "表达式包含不允许的字符";
            _logger.LogWarning("表达式验证失败: {Error}, Expression={Expression}", error, expression);
            return ValidationResult.Failure(error);
        }

        // 检查括号匹配
        var parenResult = ValidateParentheses(expression);
        if (!parenResult.IsValid)
        {
            return parenResult;
        }

        // 检查嵌套深度
        var depthResult = ValidateNestingDepth(expression);
        if (!depthResult.IsValid)
        {
            return depthResult;
        }

        // 检查操作符有效性
        var operatorResult = ValidateOperators(expression);
        if (!operatorResult.IsValid)
        {
            return operatorResult;
        }

        // 检查变量名有效性
        var variableResult = ValidateVariablesInExpression(expression);
        if (!variableResult.IsValid)
        {
            return variableResult;
        }

        _logger.LogDebug("表达式验证通过: {Expression}", expression);
        return ValidationResult.Success();
    }

    /// <summary>
    /// 验证变量名是否合法
    /// </summary>
    public ValidationResult ValidateVariableName(string variableName)
    {
        if (string.IsNullOrWhiteSpace(variableName))
        {
            return ValidationResult.Failure("变量名不能为空");
        }

        if (variableName.Length > 256)
        {
            return ValidationResult.Failure("变量名长度超过限制（最大 256 字符）");
        }

        // 移除大括号（如果有的话）
        var cleanName = variableName.Replace("{", "").Replace("}", "").Trim();

        // 验证清洁后的变量名
        if (string.IsNullOrWhiteSpace(cleanName))
        {
            return ValidationResult.Failure("变量名不能为空");
        }

        if (!VariableNameRegex.IsMatch(cleanName))
        {
            var error = $"变量名格式不合法: {cleanName}";
            _logger.LogWarning("变量名验证失败: {Error}", error);
            return ValidationResult.Failure(error);
        }

        return ValidationResult.Success();
    }

    /// <summary>
    /// 验证括号匹配
    /// </summary>
    private ValidationResult ValidateParentheses(string expression)
    {
        int parenCount = 0;
        int braceCount = 0;

        foreach (var ch in expression)
        {
            switch (ch)
            {
                case '(':
                    parenCount++;
                    break;
                case ')':
                    parenCount--;
                    break;
                case '{':
                    braceCount++;
                    break;
                case '}':
                    braceCount--;
                    break;
            }

            if (parenCount < 0 || braceCount < 0)
            {
                return ValidationResult.Failure("括号不匹配");
            }
        }

        if (parenCount != 0 || braceCount != 0)
        {
            return ValidationResult.Failure("括号不匹配");
        }

        return ValidationResult.Success();
    }

    /// <summary>
    /// 验证嵌套深度
    /// </summary>
    private ValidationResult ValidateNestingDepth(string expression)
    {
        int maxDepth = 0;
        int currentDepth = 0;

        foreach (var ch in expression)
        {
            if (ch == '(' || ch == '{')
            {
                currentDepth++;
                maxDepth = Math.Max(maxDepth, currentDepth);
            }
            else if (ch == ')' || ch == '}')
            {
                currentDepth--;
            }
        }

        if (maxDepth > MaxNestingDepth)
        {
            return ValidationResult.Failure($"嵌套深度超过限制（最大 {MaxNestingDepth} 层）");
        }

        return ValidationResult.Success();
    }

    /// <summary>
    /// 验证操作符有效性
    /// </summary>
    private ValidationResult ValidateOperators(string expression)
    {
        // 检查是否包含不允许的操作符组合
        var invalidPatterns = new[]
        {
            "===", "!==", "<<", ">>", "**", "//", "%%"
        };

        foreach (var pattern in invalidPatterns)
        {
            if (expression.Contains(pattern))
            {
                return ValidationResult.Failure($"表达式包含不允许的操作符: {pattern}");
            }
        }

        // 检查操作符是否有效
        var operators = new[] { ">=", "<=", "!=", "==", ">", "<", "&&", "||" };
        var foundOperators = new HashSet<string>();

        foreach (var op in operators)
        {
            if (expression.Contains(op))
            {
                foundOperators.Add(op);
            }
        }

        // 如果没有找到任何操作符，检查是否是有效的布尔表达式
        if (foundOperators.Count == 0)
        {
            var cleanExpr = expression.Replace("{", "").Replace("}", "").Trim();
            if (!bool.TryParse(cleanExpr, out _) && !VariableNameRegex.IsMatch(cleanExpr))
            {
                return ValidationResult.Failure("表达式不包含有效的操作符或变量");
            }
        }

        return ValidationResult.Success();
    }

    /// <summary>
    /// 验证表达式中的变量名
    /// </summary>
    private ValidationResult ValidateVariablesInExpression(string expression)
    {
        // 提取所有 {variable} 格式的变量
        var variableMatches = Regex.Matches(expression, @"\{([^}]+)\}");

        foreach (Match match in variableMatches)
        {
            var variableName = match.Groups[1].Value;
            var result = ValidateVariableName(variableName);
            if (!result.IsValid)
            {
                return result;
            }
        }

        return ValidationResult.Success();
    }
}
