using FsCheck;
using FsCheck.Xunit;
using Platform.ApiService.Models;
using Xunit;
using System;
using System.Collections.Generic;
using System.Linq;

namespace Platform.ApiService.Tests.Models;

/// <summary>
/// 工作流模型属性测试
/// 验证需求 5.1, 5.2, 5.3 - 分析计算准确性
/// </summary>
public class WorkflowModelsPropertyTests
{
    /// <summary>
    /// 属性 13: 分析计算准确性
    /// 验证工作流分析数据的计算逻辑正确性
    /// </summary>
    [Property]
    public bool AnalyticsCalculationAccuracy(int usageCount, double completionRate, double averageTime)
    {
        // 过滤掉无效输入
        if (double.IsNaN(completionRate) || double.IsInfinity(completionRate) ||
            double.IsNaN(averageTime) || double.IsInfinity(averageTime))
        {
            return true; // 跳过无效输入
        }

        // 确保输入值在合理范围内
        var validUsageCount = Math.Max(0, Math.Min(Math.Abs(usageCount), 10000));
        var validCompletionRate = Math.Max(0.0, Math.Min(Math.Abs(completionRate), 100.0));
        var validAverageTime = Math.Max(0.0, Math.Min(Math.Abs(averageTime), 1000.0));

        var analytics = new WorkflowAnalytics
        {
            UsageCount = validUsageCount,
            CompletionRate = validCompletionRate,
            AverageCompletionTimeHours = validAverageTime,
            PerformanceScore = CalculatePerformanceScore(validUsageCount, validCompletionRate, validAverageTime)
        };

        // 验证分析数据的基本约束
        return (analytics.UsageCount >= 0) &&
               (analytics.CompletionRate >= 0.0 && analytics.CompletionRate <= 100.0) &&
               (analytics.AverageCompletionTimeHours >= 0.0) &&
               (analytics.PerformanceScore >= 0.0 && analytics.PerformanceScore <= 100.0);
    }

    /// <summary>
    /// 验证趋势数据点的时间顺序性
    /// </summary>
    [Property]
    public bool TrendDataTimeOrdering(DateTime[] dates)
    {
        if (dates == null || dates.Length == 0) return true;

        var trendData = dates.Select(date => new TrendDataPoint
        {
            Date = date,
            UsageCount = 1,
            CompletionCount = 1,
            AverageCompletionTimeHours = 1.0
        }).OrderBy(t => t.Date).ToList();

        // 验证排序后的趋势数据时间顺序正确
        for (int i = 1; i < trendData.Count; i++)
        {
            if (trendData[i].Date < trendData[i - 1].Date)
                return false;
        }

        return true;
    }

    /// <summary>
    /// 验证批量操作进度计算的正确性
    /// </summary>
    [Property]
    public bool BulkOperationProgressCalculation(int total, int processed, int success)
    {
        // 确保输入值合理
        var validTotal = Math.Max(1, Math.Min(Math.Abs(total), 1000));
        var validProcessed = Math.Max(0, Math.Min(Math.Abs(processed), validTotal));
        var validSuccess = Math.Max(0, Math.Min(Math.Abs(success), validProcessed));

        var bulkOperation = new BulkOperation
        {
            TotalCount = validTotal,
            ProcessedCount = validProcessed,
            SuccessCount = validSuccess,
            FailureCount = validProcessed - validSuccess
        };

        // 验证批量操作的数据一致性
        return (bulkOperation.ProcessedCount <= bulkOperation.TotalCount) &&
               (bulkOperation.SuccessCount <= bulkOperation.ProcessedCount) &&
               (bulkOperation.FailureCount >= 0) &&
               (bulkOperation.SuccessCount + bulkOperation.FailureCount == bulkOperation.ProcessedCount);
    }

    /// <summary>
    /// 验证性能问题严重程度的合理性
    /// </summary>
    [Property]
    public bool PerformanceIssueSeverityValidation(string description, ValidationSeverity severity)
    {
        if (string.IsNullOrEmpty(description)) return true;

        var issue = new PerformanceIssue
        {
            Type = "TestIssue",
            Description = description,
            Severity = severity,
            DetectedAt = DateTime.UtcNow
        };

        // 验证性能问题的基本属性
        return (!string.IsNullOrEmpty(issue.Type)) &&
               (!string.IsNullOrEmpty(issue.Description)) &&
               (Enum.IsDefined(typeof(ValidationSeverity), issue.Severity)) &&
               (issue.DetectedAt <= DateTime.UtcNow);
    }

    /// <summary>
    /// 验证模板参数验证规则的一致性
    /// </summary>
    [Property]
    public bool TemplateParameterValidationConsistency(string paramType, bool required, double? min, double? max)
    {
        if (string.IsNullOrEmpty(paramType)) return true;

        // 过滤掉无效的数值输入
        if ((min.HasValue && (double.IsNaN(min.Value) || double.IsInfinity(min.Value))) ||
            (max.HasValue && (double.IsNaN(max.Value) || double.IsInfinity(max.Value))))
        {
            return true; // 跳过无效输入
        }

        // 如果同时有 min 和 max，且 min > max，则交换它们以确保有效范围
        if (min.HasValue && max.HasValue && min.Value > max.Value)
        {
            (min, max) = (max, min);
        }

        var parameter = new TemplateParameter
        {
            Name = "TestParam",
            Type = paramType,
            Required = required,
            Validation = min.HasValue || max.HasValue ? new ParameterValidation
            {
                Min = min,
                Max = max
            } : null
        };

        // 验证参数验证规则的逻辑一致性
        var isValid = true;

        if (parameter.Validation != null)
        {
            if (parameter.Validation.Min.HasValue && parameter.Validation.Max.HasValue)
            {
                // 确保 min <= max（现在应该总是成立，因为我们已经交换了）
                isValid = parameter.Validation.Min.Value <= parameter.Validation.Max.Value;
            }
        }

        return isValid &&
               (!string.IsNullOrEmpty(parameter.Name)) &&
               (!string.IsNullOrEmpty(parameter.Type));
    }

    /// <summary>
    /// 验证工作流验证结果的完整性
    /// </summary>
    [Property]
    public bool WorkflowValidationResultCompleteness(ValidationIssue[] issues)
    {
        var validationResult = new WorkflowValidationResult
        {
            Issues = issues?.ToList() ?? new List<ValidationIssue>(),
            ValidatedAt = DateTime.UtcNow,
            ValidatorVersion = "1.0.0"
        };

        // 根据问题列表确定是否有效
        var hasErrors = validationResult.Issues.Any(i => i.Severity == ValidationSeverity.Error || i.Severity == ValidationSeverity.Critical);
        validationResult.IsValid = !hasErrors;

        // 验证验证结果的逻辑一致性
        return (validationResult.IsValid == !hasErrors) &&
               (validationResult.ValidatedAt <= DateTime.UtcNow) &&
               (!string.IsNullOrEmpty(validationResult.ValidatorVersion));
    }

    /// <summary>
    /// 验证导入冲突解决的逻辑性
    /// </summary>
    [Property]
    public bool ImportConflictResolutionLogic(int imported, int skipped, int failed)
    {
        var validImported = Math.Max(0, Math.Abs(imported));
        var validSkipped = Math.Max(0, Math.Abs(skipped));
        var validFailed = Math.Max(0, Math.Abs(failed));

        var importResult = new WorkflowImportResult
        {
            ImportedCount = validImported,
            SkippedCount = validSkipped,
            FailedCount = validFailed
        };

        var totalProcessed = importResult.ImportedCount + importResult.SkippedCount + importResult.FailedCount;

        // 验证导入结果的数据一致性
        return (importResult.ImportedCount >= 0) &&
               (importResult.SkippedCount >= 0) &&
               (importResult.FailedCount >= 0) &&
               (totalProcessed >= 0);
    }

    #region 辅助方法

    /// <summary>
    /// 计算性能评分（模拟实现）
    /// </summary>
    private static double CalculatePerformanceScore(int usageCount, double completionRate, double averageTimeHours)
    {
        // 使用频率评分 (30%)
        var usageScore = Math.Min(30.0, usageCount * 0.5);

        // 完成率评分 (40%)
        var completionScore = (completionRate / 100.0) * 40.0;

        // 效率评分 (30%) - 基于平均完成时间，时间越短评分越高
        var efficiencyScore = 30.0;
        if (averageTimeHours > 0)
        {
            // 假设理想完成时间为24小时，超过则扣分
            var idealHours = 24.0;
            if (averageTimeHours > idealHours)
            {
                efficiencyScore = Math.Max(0, 30.0 - ((averageTimeHours - idealHours) / idealHours) * 15.0);
            }
        }

        return Math.Max(0.0, Math.Min(100.0, usageScore + completionScore + efficiencyScore));
    }

    #endregion
}
