using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;

namespace Platform.ApiService.Models.Workflow;

/// <summary>
/// 工作流分析数据
/// </summary>
public class WorkflowAnalytics
{
    /// <summary>
    /// 使用次数
    /// </summary>
    public int UsageCount { get; set; } = 0;

    /// <summary>
    /// 完成率（百分比）
    /// </summary>
    public double CompletionRate { get; set; } = 0.0;

    /// <summary>
    /// 平均完成时间（小时）
    /// </summary>
    public double AverageCompletionTimeHours { get; set; } = 0.0;

    /// <summary>
    /// 最后使用时间
    /// </summary>
    public DateTime? LastUsedAt { get; set; }

    /// <summary>
    /// 性能评分（0-100）
    /// </summary>
    public double PerformanceScore { get; set; } = 0.0;

    /// <summary>
    /// 趋势数据（最近30天的使用情况）
    /// </summary>
    public List<TrendDataPoint> TrendData { get; set; } = new();

    /// <summary>
    /// 性能问题列表
    /// </summary>
    public List<PerformanceIssue> PerformanceIssues { get; set; } = new();
}

/// <summary>
/// 趋势数据点
/// </summary>
public class TrendDataPoint
{
    /// <summary>
    /// 日期
    /// </summary>
    public DateTime Date { get; set; }

    /// <summary>
    /// 使用次数
    /// </summary>
    public int UsageCount { get; set; }

    /// <summary>
    /// 完成次数
    /// </summary>
    public int CompletionCount { get; set; }

    /// <summary>
    /// 平均完成时间（小时）
    /// </summary>
    public double AverageCompletionTimeHours { get; set; }
}

/// <summary>
/// 性能问题
/// </summary>
public class PerformanceIssue
{
    /// <summary>
    /// 问题类型
    /// </summary>
    public string Type { get; set; } = string.Empty;

    /// <summary>
    /// 问题描述
    /// </summary>
    public string Description { get; set; } = string.Empty;

    /// <summary>
    /// 严重程度
    /// </summary>
    [BsonRepresentation(BsonType.String)]
    public ValidationSeverity Severity { get; set; }

    /// <summary>
    /// 检测时间
    /// </summary>
    public DateTime DetectedAt { get; set; } = DateTime.UtcNow;

    /// <summary>
    /// 建议解决方案
    /// </summary>
    public string? SuggestedSolution { get; set; }
}