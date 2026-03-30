using System.Collections.Generic;
using Platform.ApiService.Models.Workflow;

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
