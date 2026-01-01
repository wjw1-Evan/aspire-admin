using Microsoft.Extensions.Logging;
using Platform.ServiceDefaults.Services;

namespace Platform.ApiService.Services;

/// <summary>
/// 工作流性能监控服务实现
/// </summary>
public class WorkflowPerformanceService : IWorkflowPerformanceService
{
    private readonly ILogger<WorkflowPerformanceService> _logger;
    private readonly List<PerformanceRecord> _performanceRecords = new();
    private readonly object _lockObject = new();

    public WorkflowPerformanceService(ILogger<WorkflowPerformanceService> logger)
    {
        _logger = logger;
    }

    /// <summary>
    /// 记录操作性能
    /// </summary>
    public async Task RecordOperationPerformanceAsync(string operation, TimeSpan duration, Dictionary<string, object>? metadata = null)
    {
        try
        {
            var record = new PerformanceRecord
            {
                Operation = operation,
                Duration = duration,
                Timestamp = DateTime.UtcNow,
                Metadata = metadata ?? new Dictionary<string, object>()
            };

            lock (_lockObject)
            {
                _performanceRecords.Add(record);

                // 只保留最近1000条记录
                if (_performanceRecords.Count > 1000)
                {
                    _performanceRecords.RemoveRange(0, _performanceRecords.Count - 1000);
                }
            }

            // 记录慢操作
            if (duration.TotalSeconds > 5.0)
            {
                _logger.LogWarning("检测到慢操作: Operation={Operation}, Duration={Duration}ms, Metadata={Metadata}",
                    operation, duration.TotalMilliseconds, metadata);
            }
            else
            {
                _logger.LogDebug("操作性能记录: Operation={Operation}, Duration={Duration}ms",
                    operation, duration.TotalMilliseconds);
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "记录操作性能失败: Operation={Operation}", operation);
        }
    }

    /// <summary>
    /// 获取性能指标
    /// </summary>
    public async Task<Dictionary<string, object>> GetPerformanceMetricsAsync(DateTime startDate, DateTime endDate)
    {
        try
        {
            List<PerformanceRecord> records;
            lock (_lockObject)
            {
                records = _performanceRecords
                    .Where(r => r.Timestamp >= startDate && r.Timestamp <= endDate)
                    .ToList();
            }

            if (!records.Any())
            {
                return new Dictionary<string, object>
                {
                    ["totalOperations"] = 0,
                    ["averageDuration"] = 0,
                    ["maxDuration"] = 0,
                    ["minDuration"] = 0,
                    ["slowOperations"] = 0
                };
            }

            var totalOperations = records.Count;
            var averageDuration = records.Average(r => r.Duration.TotalMilliseconds);
            var maxDuration = records.Max(r => r.Duration.TotalMilliseconds);
            var minDuration = records.Min(r => r.Duration.TotalMilliseconds);
            var slowOperations = records.Count(r => r.Duration.TotalSeconds > 5.0);

            var operationStats = records
                .GroupBy(r => r.Operation)
                .ToDictionary(
                    g => g.Key,
                    g => new
                    {
                        count = g.Count(),
                        averageDuration = g.Average(r => r.Duration.TotalMilliseconds),
                        maxDuration = g.Max(r => r.Duration.TotalMilliseconds)
                    }
                );

            return new Dictionary<string, object>
            {
                ["totalOperations"] = totalOperations,
                ["averageDuration"] = averageDuration,
                ["maxDuration"] = maxDuration,
                ["minDuration"] = minDuration,
                ["slowOperations"] = slowOperations,
                ["operationStats"] = operationStats,
                ["timeRange"] = new { startDate, endDate }
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "获取性能指标失败");
            return new Dictionary<string, object> { ["error"] = ex.Message };
        }
    }

    /// <summary>
    /// 检测性能瓶颈
    /// </summary>
    public async Task<List<string>> DetectPerformanceBottlenecksAsync()
    {
        var bottlenecks = new List<string>();

        try
        {
            List<PerformanceRecord> recentRecords;
            lock (_lockObject)
            {
                var cutoffTime = DateTime.UtcNow.AddHours(-1);
                recentRecords = _performanceRecords
                    .Where(r => r.Timestamp >= cutoffTime)
                    .ToList();
            }

            if (!recentRecords.Any())
            {
                return bottlenecks;
            }

            // 检测平均响应时间过长的操作
            var operationGroups = recentRecords.GroupBy(r => r.Operation);
            foreach (var group in operationGroups)
            {
                var avgDuration = group.Average(r => r.Duration.TotalSeconds);
                if (avgDuration > 3.0) // 超过3秒
                {
                    bottlenecks.Add($"操作 '{group.Key}' 平均响应时间过长: {avgDuration:F2}秒");
                }

                var slowCount = group.Count(r => r.Duration.TotalSeconds > 5.0);
                var totalCount = group.Count();
                if (totalCount > 10 && (double)slowCount / totalCount > 0.2) // 超过20%的操作很慢
                {
                    bottlenecks.Add($"操作 '{group.Key}' 慢操作比例过高: {slowCount}/{totalCount} ({(double)slowCount / totalCount * 100:F1}%)");
                }
            }

            // 检测总体性能下降
            var overallAvg = recentRecords.Average(r => r.Duration.TotalSeconds);
            if (overallAvg > 2.0)
            {
                bottlenecks.Add($"系统整体响应时间过长: {overallAvg:F2}秒");
            }

            _logger.LogInformation("性能瓶颈检测完成: 发现{Count}个问题", bottlenecks.Count);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "检测性能瓶颈失败");
            bottlenecks.Add($"性能检测失败: {ex.Message}");
        }

        return bottlenecks;
    }

    /// <summary>
    /// 获取慢查询列表
    /// </summary>
    public async Task<List<Dictionary<string, object>>> GetSlowQueriesAsync(int topCount = 10)
    {
        try
        {
            List<PerformanceRecord> slowRecords;
            lock (_lockObject)
            {
                slowRecords = _performanceRecords
                    .Where(r => r.Duration.TotalSeconds > 1.0) // 超过1秒的操作
                    .OrderByDescending(r => r.Duration)
                    .Take(topCount)
                    .ToList();
            }

            return slowRecords.Select(r => new Dictionary<string, object>
            {
                ["operation"] = r.Operation,
                ["duration"] = r.Duration.TotalMilliseconds,
                ["timestamp"] = r.Timestamp,
                ["metadata"] = r.Metadata
            }).ToList();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "获取慢查询列表失败");
            return new List<Dictionary<string, object>>();
        }
    }

    /// <summary>
    /// 优化建议
    /// </summary>
    public async Task<List<string>> GetOptimizationSuggestionsAsync()
    {
        var suggestions = new List<string>();

        try
        {
            var bottlenecks = await DetectPerformanceBottlenecksAsync();

            if (bottlenecks.Any(b => b.Contains("数据库")))
            {
                suggestions.Add("考虑添加数据库索引以提高查询性能");
                suggestions.Add("检查是否有N+1查询问题");
            }

            if (bottlenecks.Any(b => b.Contains("搜索")))
            {
                suggestions.Add("考虑实现搜索结果缓存");
                suggestions.Add("优化搜索查询条件和索引");
            }

            if (bottlenecks.Any(b => b.Contains("批量")))
            {
                suggestions.Add("考虑实现批量操作的分批处理");
                suggestions.Add("添加批量操作进度反馈");
            }

            List<PerformanceRecord> recentRecords;
            lock (_lockObject)
            {
                recentRecords = _performanceRecords
                    .Where(r => r.Timestamp >= DateTime.UtcNow.AddHours(-1))
                    .ToList();
            }

            if (recentRecords.Count > 100)
            {
                var avgDuration = recentRecords.Average(r => r.Duration.TotalSeconds);
                if (avgDuration > 1.0)
                {
                    suggestions.Add("系统整体性能较慢，建议检查服务器资源使用情况");
                }
            }

            if (!suggestions.Any())
            {
                suggestions.Add("当前系统性能良好，无需特别优化");
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "生成优化建议失败");
            suggestions.Add($"无法生成优化建议: {ex.Message}");
        }

        return suggestions;
    }

    #region 私有类型

    /// <summary>
    /// 性能记录
    /// </summary>
    private class PerformanceRecord
    {
        public string Operation { get; set; } = string.Empty;
        public TimeSpan Duration { get; set; }
        public DateTime Timestamp { get; set; }
        public Dictionary<string, object> Metadata { get; set; } = new();
    }

    #endregion
}