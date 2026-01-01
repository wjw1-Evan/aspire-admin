using Microsoft.Extensions.Logging;
using Platform.ApiService.Models;
using Platform.ServiceDefaults.Services;

namespace Platform.ApiService.Services;

/// <summary>
/// 工作流分析服务实现
/// </summary>
public class WorkflowAnalyticsService : IWorkflowAnalyticsService
{
    private readonly IDatabaseOperationFactory<WorkflowDefinition> _workflowFactory;
    private readonly IDatabaseOperationFactory<WorkflowInstance> _instanceFactory;
    private readonly ITenantContext _tenantContext;
    private readonly ILogger<WorkflowAnalyticsService> _logger;

    public WorkflowAnalyticsService(
        IDatabaseOperationFactory<WorkflowDefinition> workflowFactory,
        IDatabaseOperationFactory<WorkflowInstance> instanceFactory,
        ITenantContext tenantContext,
        ILogger<WorkflowAnalyticsService> logger)
    {
        _workflowFactory = workflowFactory;
        _instanceFactory = instanceFactory;
        _tenantContext = tenantContext;
        _logger = logger;
    }

    /// <summary>
    /// 更新工作流使用统计
    /// </summary>
    public async Task UpdateUsageStatisticsAsync(string workflowId)
    {
        try
        {
            var filter = _workflowFactory.CreateFilterBuilder()
                .Equal(w => w.Id, workflowId)
                .Equal(w => w.IsDeleted, false)
                .Build();

            var update = _workflowFactory.CreateUpdateBuilder()
                .Inc(w => w.Analytics.UsageCount, 1)
                .Set(w => w.Analytics.LastUsedAt, DateTime.UtcNow)
                .Build();

            await _workflowFactory.FindOneAndUpdateAsync(filter, update);

            _logger.LogDebug("工作流使用统计已更新: WorkflowId={WorkflowId}", workflowId);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "更新工作流使用统计失败: WorkflowId={WorkflowId}", workflowId);
        }
    }

    /// <summary>
    /// 更新工作流完成统计
    /// </summary>
    public async Task UpdateCompletionStatisticsAsync(string workflowId, TimeSpan completionTime)
    {
        try
        {
            var workflow = await _workflowFactory.GetByIdAsync(workflowId);
            if (workflow == null) return;

            var analytics = workflow.Analytics;
            var completionTimeHours = completionTime.TotalHours;

            // 计算新的平均完成时间
            var totalCompletions = analytics.UsageCount > 0 ? analytics.UsageCount : 1;
            var newAverageTime = ((analytics.AverageCompletionTimeHours * (totalCompletions - 1)) + completionTimeHours) / totalCompletions;

            // 计算完成率（假设所有使用都会完成，实际应该基于实际完成数据）
            var completionRate = Math.Min(100.0, (totalCompletions * 100.0) / Math.Max(analytics.UsageCount, 1));

            var filter = _workflowFactory.CreateFilterBuilder()
                .Equal(w => w.Id, workflowId)
                .Equal(w => w.IsDeleted, false)
                .Build();

            var update = _workflowFactory.CreateUpdateBuilder()
                .Set(w => w.Analytics.AverageCompletionTimeHours, newAverageTime)
                .Set(w => w.Analytics.CompletionRate, completionRate)
                .Build();

            await _workflowFactory.FindOneAndUpdateAsync(filter, update);

            // 更新趋势数据
            await UpdateTrendDataAsync(workflowId, completionTimeHours);

            _logger.LogDebug("工作流完成统计已更新: WorkflowId={WorkflowId}, CompletionTime={CompletionTimeHours}h",
                workflowId, completionTimeHours);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "更新工作流完成统计失败: WorkflowId={WorkflowId}", workflowId);
        }
    }

    /// <summary>
    /// 计算工作流性能评分
    /// </summary>
    public async Task<double> CalculatePerformanceScoreAsync(string workflowId)
    {
        try
        {
            var workflow = await _workflowFactory.GetByIdAsync(workflowId);
            if (workflow == null) return 0.0;

            var analytics = workflow.Analytics;
            var score = 0.0;

            // 使用频率评分 (30%)
            var usageScore = Math.Min(30.0, analytics.UsageCount * 0.5);

            // 完成率评分 (40%)
            var completionScore = (analytics.CompletionRate / 100.0) * 40.0;

            // 效率评分 (30%) - 基于平均完成时间，时间越短评分越高
            var efficiencyScore = 30.0;
            if (analytics.AverageCompletionTimeHours > 0)
            {
                // 假设理想完成时间为24小时，超过则扣分
                var idealHours = 24.0;
                if (analytics.AverageCompletionTimeHours > idealHours)
                {
                    efficiencyScore = Math.Max(0, 30.0 - ((analytics.AverageCompletionTimeHours - idealHours) / idealHours) * 15.0);
                }
            }

            score = usageScore + completionScore + efficiencyScore;

            // 更新性能评分
            var filter = _workflowFactory.CreateFilterBuilder()
                .Equal(w => w.Id, workflowId)
                .Equal(w => w.IsDeleted, false)
                .Build();

            var update = _workflowFactory.CreateUpdateBuilder()
                .Set(w => w.Analytics.PerformanceScore, score)
                .Build();

            await _workflowFactory.FindOneAndUpdateAsync(filter, update);

            return score;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "计算工作流性能评分失败: WorkflowId={WorkflowId}", workflowId);
            return 0.0;
        }
    }

    /// <summary>
    /// 检测性能问题
    /// </summary>
    public async Task<List<PerformanceIssue>> DetectPerformanceIssuesAsync(string workflowId)
    {
        var issues = new List<PerformanceIssue>();

        try
        {
            var workflow = await _workflowFactory.GetByIdAsync(workflowId);
            if (workflow == null) return issues;

            var analytics = workflow.Analytics;

            // 检测低使用率问题
            if (analytics.UsageCount < 5 && workflow.CreatedAt < DateTime.UtcNow.AddMonths(-1))
            {
                issues.Add(new PerformanceIssue
                {
                    Type = "LowUsage",
                    Description = "工作流使用率较低，可能需要优化或推广",
                    Severity = ValidationSeverity.Warning,
                    SuggestedSolution = "检查工作流是否符合业务需求，考虑简化流程或加强培训"
                });
            }

            // 检测低完成率问题
            if (analytics.CompletionRate < 80.0 && analytics.UsageCount > 10)
            {
                issues.Add(new PerformanceIssue
                {
                    Type = "LowCompletionRate",
                    Description = $"工作流完成率较低 ({analytics.CompletionRate:F1}%)",
                    Severity = ValidationSeverity.Error,
                    SuggestedSolution = "检查流程设计是否合理，是否存在阻塞节点或复杂的审批流程"
                });
            }

            // 检测长时间完成问题
            if (analytics.AverageCompletionTimeHours > 72.0) // 超过3天
            {
                issues.Add(new PerformanceIssue
                {
                    Type = "LongCompletionTime",
                    Description = $"平均完成时间过长 ({analytics.AverageCompletionTimeHours:F1} 小时)",
                    Severity = ValidationSeverity.Warning,
                    SuggestedSolution = "考虑设置超时提醒、简化审批流程或增加并行处理"
                });
            }

            // 检测性能下降趋势
            if (analytics.TrendData.Count >= 7)
            {
                var recentTrend = analytics.TrendData.TakeLast(7).ToList();
                var avgRecentUsage = recentTrend.Average(t => t.UsageCount);
                var avgRecentCompletion = recentTrend.Average(t => t.AverageCompletionTimeHours);

                var olderTrend = analytics.TrendData.Take(Math.Max(1, analytics.TrendData.Count - 7)).ToList();
                if (olderTrend.Any())
                {
                    var avgOlderUsage = olderTrend.Average(t => t.UsageCount);
                    var avgOlderCompletion = olderTrend.Average(t => t.AverageCompletionTimeHours);

                    if (avgRecentUsage < avgOlderUsage * 0.7) // 使用量下降30%以上
                    {
                        issues.Add(new PerformanceIssue
                        {
                            Type = "UsageDecline",
                            Description = "工作流使用量呈下降趋势",
                            Severity = ValidationSeverity.Warning,
                            SuggestedSolution = "分析使用量下降原因，可能需要流程优化或用户培训"
                        });
                    }

                    if (avgRecentCompletion > avgOlderCompletion * 1.3) // 完成时间增加30%以上
                    {
                        issues.Add(new PerformanceIssue
                        {
                            Type = "PerformanceDecline",
                            Description = "工作流完成时间呈上升趋势",
                            Severity = ValidationSeverity.Warning,
                            SuggestedSolution = "检查是否有新的瓶颈节点或审批人员变更导致的延迟"
                        });
                    }
                }
            }

            // 更新性能问题列表
            var filter = _workflowFactory.CreateFilterBuilder()
                .Equal(w => w.Id, workflowId)
                .Equal(w => w.IsDeleted, false)
                .Build();

            var update = _workflowFactory.CreateUpdateBuilder()
                .Set(w => w.Analytics.PerformanceIssues, issues)
                .Build();

            await _workflowFactory.FindOneAndUpdateAsync(filter, update);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "检测工作流性能问题失败: WorkflowId={WorkflowId}", workflowId);
        }

        return issues;
    }

    /// <summary>
    /// 获取工作流分析数据
    /// </summary>
    public async Task<WorkflowAnalytics?> GetAnalyticsAsync(string workflowId)
    {
        try
        {
            var workflow = await _workflowFactory.GetByIdAsync(workflowId);
            return workflow?.Analytics;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "获取工作流分析数据失败: WorkflowId={WorkflowId}", workflowId);
            return null;
        }
    }

    /// <summary>
    /// 获取趋势数据
    /// </summary>
    public async Task<List<TrendDataPoint>> GetTrendDataAsync(string workflowId, DateTime startDate, DateTime endDate)
    {
        try
        {
            var workflow = await _workflowFactory.GetByIdAsync(workflowId);
            if (workflow == null) return new List<TrendDataPoint>();

            return workflow.Analytics.TrendData
                .Where(t => t.Date >= startDate && t.Date <= endDate)
                .OrderBy(t => t.Date)
                .ToList();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "获取工作流趋势数据失败: WorkflowId={WorkflowId}", workflowId);
            return new List<TrendDataPoint>();
        }
    }

    /// <summary>
    /// 批量更新分析数据
    /// </summary>
    public async Task BatchUpdateAnalyticsAsync()
    {
        try
        {
            _logger.LogInformation("开始批量更新工作流分析数据");

            var filter = _workflowFactory.CreateFilterBuilder()
                .Equal(w => w.IsDeleted, false)
                .Build();

            var workflows = await _workflowFactory.FindAsync(filter);

            foreach (var workflow in workflows)
            {
                try
                {
                    // 重新计算性能评分
                    await CalculatePerformanceScoreAsync(workflow.Id);

                    // 检测性能问题
                    await DetectPerformanceIssuesAsync(workflow.Id);

                    _logger.LogDebug("工作流分析数据更新完成: WorkflowId={WorkflowId}", workflow.Id);
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "更新工作流分析数据失败: WorkflowId={WorkflowId}", workflow.Id);
                }
            }

            _logger.LogInformation("批量更新工作流分析数据完成: 处理数量={WorkflowCount}", workflows.Count);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "批量更新工作流分析数据失败");
        }
    }

    /// <summary>
    /// 获取使用排名
    /// </summary>
    public async Task<List<(string WorkflowId, string WorkflowName, int UsageCount)>> GetUsageRankingAsync(int topCount = 10)
    {
        try
        {
            var filter = _workflowFactory.CreateFilterBuilder()
                .Equal(w => w.IsDeleted, false)
                .GreaterThan(w => w.Analytics.UsageCount, 0)
                .Build();

            var sort = _workflowFactory.CreateSortBuilder()
                .Descending(w => w.Analytics.UsageCount)
                .Build();

            var (workflows, _) = await _workflowFactory.FindPagedAsync(filter, sort, 1, topCount);

            return workflows.Select(w => (w.Id, w.Name, w.Analytics.UsageCount)).ToList();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "获取工作流使用排名失败");
            return new List<(string, string, int)>();
        }
    }

    /// <summary>
    /// 获取性能排名
    /// </summary>
    public async Task<List<(string WorkflowId, string WorkflowName, double PerformanceScore)>> GetPerformanceRankingAsync(int topCount = 10)
    {
        try
        {
            var filter = _workflowFactory.CreateFilterBuilder()
                .Equal(w => w.IsDeleted, false)
                .GreaterThan(w => w.Analytics.PerformanceScore, 0)
                .Build();

            var sort = _workflowFactory.CreateSortBuilder()
                .Descending(w => w.Analytics.PerformanceScore)
                .Build();

            var (workflows, _) = await _workflowFactory.FindPagedAsync(filter, sort, 1, topCount);

            return workflows.Select(w => (w.Id, w.Name, w.Analytics.PerformanceScore)).ToList();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "获取工作流性能排名失败");
            return new List<(string, string, double)>();
        }
    }

    #region 私有方法

    /// <summary>
    /// 更新趋势数据
    /// </summary>
    private async Task UpdateTrendDataAsync(string workflowId, double completionTimeHours)
    {
        try
        {
            var today = DateTime.UtcNow.Date;
            var workflow = await _workflowFactory.GetByIdAsync(workflowId);
            if (workflow == null) return;

            var trendData = workflow.Analytics.TrendData;
            var todayData = trendData.FirstOrDefault(t => t.Date.Date == today);

            if (todayData == null)
            {
                todayData = new TrendDataPoint
                {
                    Date = today,
                    UsageCount = 1,
                    CompletionCount = 1,
                    AverageCompletionTimeHours = completionTimeHours
                };
                trendData.Add(todayData);
            }
            else
            {
                todayData.UsageCount++;
                todayData.CompletionCount++;
                todayData.AverageCompletionTimeHours =
                    ((todayData.AverageCompletionTimeHours * (todayData.CompletionCount - 1)) + completionTimeHours) / todayData.CompletionCount;
            }

            // 只保留最近30天的数据
            var cutoffDate = DateTime.UtcNow.AddDays(-30).Date;
            trendData.RemoveAll(t => t.Date < cutoffDate);

            var filter = _workflowFactory.CreateFilterBuilder()
                .Equal(w => w.Id, workflowId)
                .Equal(w => w.IsDeleted, false)
                .Build();

            var update = _workflowFactory.CreateUpdateBuilder()
                .Set(w => w.Analytics.TrendData, trendData)
                .Build();

            await _workflowFactory.FindOneAndUpdateAsync(filter, update);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "更新工作流趋势数据失败: WorkflowId={WorkflowId}", workflowId);
        }
    }

    #endregion
}