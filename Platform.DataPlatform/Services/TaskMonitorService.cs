using MongoDB.Driver;
using Platform.DataPlatform.Models;

namespace Platform.DataPlatform.Services;

/// <summary>
/// 任务监控服务实现
/// </summary>
public class TaskMonitorService : ITaskMonitorService
{
    private readonly IMongoCollection<TaskExecution> _taskExecutions;
    private readonly IMongoCollection<SystemMetrics> _systemMetrics;
    private readonly IMongoCollection<AlertRule> _alertRules;
    private readonly IMongoCollection<Alert> _alerts;
    private readonly string _companyId;

    public TaskMonitorService(
        IMongoDatabase database,
        IHttpContextAccessor httpContextAccessor)
    {
        _taskExecutions = database.GetCollection<TaskExecution>("taskExecutions");
        _systemMetrics = database.GetCollection<SystemMetrics>("systemMetrics");
        _alertRules = database.GetCollection<AlertRule>("alertRules");
        _alerts = database.GetCollection<Alert>("alerts");
        _companyId = httpContextAccessor.HttpContext?.User?.FindFirst("companyId")?.Value ?? "default";
    }

    public async Task<List<TaskExecution>> GetTaskExecutionsAsync(int limit = 50)
    {
        var filter = Builders<TaskExecution>.Filter.And(
            Builders<TaskExecution>.Filter.Eq(t => t.CompanyId, _companyId),
            Builders<TaskExecution>.Filter.Eq(t => t.IsDeleted, false)
        );

        var sort = Builders<TaskExecution>.Sort.Descending(t => t.StartTime);

        return await _taskExecutions.Find(filter)
            .Sort(sort)
            .Limit(limit)
            .ToListAsync();
    }

    public async Task<TaskExecution?> GetTaskExecutionByIdAsync(string id)
    {
        var filter = Builders<TaskExecution>.Filter.And(
            Builders<TaskExecution>.Filter.Eq(t => t.Id, id),
            Builders<TaskExecution>.Filter.Eq(t => t.CompanyId, _companyId),
            Builders<TaskExecution>.Filter.Eq(t => t.IsDeleted, false)
        );

        return await _taskExecutions.Find(filter).FirstOrDefaultAsync();
    }

    public async Task<TaskExecution> CreateTaskExecutionAsync(TaskExecution taskExecution)
    {
        taskExecution.CompanyId = _companyId;
        taskExecution.CreatedAt = DateTime.UtcNow;
        taskExecution.UpdatedAt = DateTime.UtcNow;

        await _taskExecutions.InsertOneAsync(taskExecution);
        return taskExecution;
    }

    public async Task<bool> UpdateTaskStatusAsync(string id, Models.TaskStatus status, double? progress = null, string? errorMessage = null)
    {
        var filter = Builders<TaskExecution>.Filter.And(
            Builders<TaskExecution>.Filter.Eq(t => t.Id, id),
            Builders<TaskExecution>.Filter.Eq(t => t.CompanyId, _companyId)
        );

        var update = Builders<TaskExecution>.Update
            .Set(t => t.Status, status)
            .Set(t => t.UpdatedAt, DateTime.UtcNow);

        if (progress.HasValue)
        {
            update = update.Set(t => t.Progress, progress.Value);
        }

        if (status == Models.TaskStatus.Completed || status == Models.TaskStatus.Failed)
        {
            update = update.Set(t => t.EndTime, DateTime.UtcNow);
        }

        if (!string.IsNullOrEmpty(errorMessage))
        {
            update = update.Set(t => t.ErrorMessage, errorMessage);
        }

        var result = await _taskExecutions.UpdateOneAsync(filter, update);
        return result.ModifiedCount > 0;
    }

    public async Task<bool> CompleteTaskExecutionAsync(string id, Dictionary<string, object>? result = null)
    {
        var filter = Builders<TaskExecution>.Filter.And(
            Builders<TaskExecution>.Filter.Eq(t => t.Id, id),
            Builders<TaskExecution>.Filter.Eq(t => t.CompanyId, _companyId)
        );

        var update = Builders<TaskExecution>.Update
            .Set(t => t.Status, Models.TaskStatus.Completed)
            .Set(t => t.Progress, 100.0)
            .Set(t => t.EndTime, DateTime.UtcNow)
            .Set(t => t.UpdatedAt, DateTime.UtcNow);

        if (result != null)
        {
            update = update.Set(t => t.Result, result);
        }

        var updateResult = await _taskExecutions.UpdateOneAsync(filter, update);
        return updateResult.ModifiedCount > 0;
    }

    public async Task<SystemMetrics> GetSystemMetricsAsync()
    {
        // 模拟系统监控指标
        var metrics = new SystemMetrics
        {
            Timestamp = DateTime.UtcNow,
            CpuUsage = Random.Shared.NextDouble() * 100,
            MemoryUsage = Random.Shared.NextDouble() * 100,
            DiskUsage = Random.Shared.NextDouble() * 100,
            NetworkIn = Random.Shared.NextInt64(1000, 10000),
            NetworkOut = Random.Shared.NextInt64(1000, 10000),
            ActiveConnections = Random.Shared.Next(10, 100),
            RunningTasks = await GetRunningTasksCountAsync(),
            FailedTasks = await GetFailedTasksCountAsync(),
            CompletedTasks = await GetCompletedTasksCountAsync()
        };

        // 保存指标到数据库
        await _systemMetrics.InsertOneAsync(metrics);

        return metrics;
    }

    public async Task<List<SystemMetrics>> GetMetricsHistoryAsync(DateTime from, DateTime to)
    {
        var filter = Builders<SystemMetrics>.Filter.And(
            Builders<SystemMetrics>.Filter.Gte(m => m.Timestamp, from),
            Builders<SystemMetrics>.Filter.Lte(m => m.Timestamp, to)
        );

        var sort = Builders<SystemMetrics>.Sort.Descending(m => m.Timestamp);

        return await _systemMetrics.Find(filter)
            .Sort(sort)
            .Limit(1000)
            .ToListAsync();
    }

    public async Task<Dictionary<string, object>> GetTaskStatisticsAsync()
    {
        var companyFilter = Builders<TaskExecution>.Filter.And(
            Builders<TaskExecution>.Filter.Eq(t => t.CompanyId, _companyId),
            Builders<TaskExecution>.Filter.Eq(t => t.IsDeleted, false)
        );

        var totalTasks = await _taskExecutions.CountDocumentsAsync(companyFilter);
        var runningTasks = await _taskExecutions.CountDocumentsAsync(
            Builders<TaskExecution>.Filter.And(
                companyFilter,
                Builders<TaskExecution>.Filter.Eq(t => t.Status, Models.TaskStatus.Running)
            )
        );
        var completedTasks = await _taskExecutions.CountDocumentsAsync(
            Builders<TaskExecution>.Filter.And(
                companyFilter,
                Builders<TaskExecution>.Filter.Eq(t => t.Status, Models.TaskStatus.Completed)
            )
        );
        var failedTasks = await _taskExecutions.CountDocumentsAsync(
            Builders<TaskExecution>.Filter.And(
                companyFilter,
                Builders<TaskExecution>.Filter.Eq(t => t.Status, Models.TaskStatus.Failed)
            )
        );

        var successRate = totalTasks > 0 ? (double)completedTasks / totalTasks * 100 : 0;

        // 获取最近24小时的任务
        var last24Hours = DateTime.UtcNow.AddHours(-24);
        var recentTasks = await _taskExecutions.CountDocumentsAsync(
            Builders<TaskExecution>.Filter.And(
                companyFilter,
                Builders<TaskExecution>.Filter.Gte(t => t.StartTime, last24Hours)
            )
        );

        return new Dictionary<string, object>
        {
            ["totalTasks"] = totalTasks,
            ["runningTasks"] = runningTasks,
            ["completedTasks"] = completedTasks,
            ["failedTasks"] = failedTasks,
            ["successRate"] = Math.Round(successRate, 2),
            ["recentTasks24h"] = recentTasks
        };
    }

    public async Task<List<AlertRule>> GetAlertRulesAsync()
    {
        var filter = Builders<AlertRule>.Filter.And(
            Builders<AlertRule>.Filter.Eq(r => r.CompanyId, _companyId),
            Builders<AlertRule>.Filter.Eq(r => r.IsDeleted, false)
        );

        return await _alertRules.Find(filter).ToListAsync();
    }

    public async Task<AlertRule> CreateAlertRuleAsync(AlertRule rule)
    {
        rule.CompanyId = _companyId;
        rule.CreatedAt = DateTime.UtcNow;
        rule.UpdatedAt = DateTime.UtcNow;

        await _alertRules.InsertOneAsync(rule);
        return rule;
    }

    public async Task<bool> UpdateAlertRuleAsync(string id, AlertRule rule)
    {
        var filter = Builders<AlertRule>.Filter.And(
            Builders<AlertRule>.Filter.Eq(r => r.Id, id),
            Builders<AlertRule>.Filter.Eq(r => r.CompanyId, _companyId),
            Builders<AlertRule>.Filter.Eq(r => r.IsDeleted, false)
        );

        rule.Id = id;
        rule.CompanyId = _companyId;
        rule.UpdatedAt = DateTime.UtcNow;

        var result = await _alertRules.ReplaceOneAsync(filter, rule);
        return result.ModifiedCount > 0;
    }

    public async Task<bool> DeleteAlertRuleAsync(string id)
    {
        var filter = Builders<AlertRule>.Filter.And(
            Builders<AlertRule>.Filter.Eq(r => r.Id, id),
            Builders<AlertRule>.Filter.Eq(r => r.CompanyId, _companyId),
            Builders<AlertRule>.Filter.Eq(r => r.IsDeleted, false)
        );

        var update = Builders<AlertRule>.Update
            .Set(r => r.IsDeleted, true)
            .Set(r => r.UpdatedAt, DateTime.UtcNow);

        var result = await _alertRules.UpdateOneAsync(filter, update);
        return result.ModifiedCount > 0;
    }

    public async Task<List<Alert>> GetActiveAlertsAsync()
    {
        var filter = Builders<Alert>.Filter.And(
            Builders<Alert>.Filter.Eq(a => a.CompanyId, _companyId),
            Builders<Alert>.Filter.Eq(a => a.IsDeleted, false),
            Builders<Alert>.Filter.Eq(a => a.Status, AlertStatus.Active)
        );

        var sort = Builders<Alert>.Sort.Descending(a => a.TriggeredAt);

        return await _alerts.Find(filter)
            .Sort(sort)
            .Limit(100)
            .ToListAsync();
    }

    public async Task<List<Alert>> GetAlertHistoryAsync(DateTime from, DateTime to)
    {
        var filter = Builders<Alert>.Filter.And(
            Builders<Alert>.Filter.Eq(a => a.CompanyId, _companyId),
            Builders<Alert>.Filter.Eq(a => a.IsDeleted, false),
            Builders<Alert>.Filter.Gte(a => a.TriggeredAt, from),
            Builders<Alert>.Filter.Lte(a => a.TriggeredAt, to)
        );

        var sort = Builders<Alert>.Sort.Descending(a => a.TriggeredAt);

        return await _alerts.Find(filter)
            .Sort(sort)
            .Limit(1000)
            .ToListAsync();
    }

    public async Task<bool> AcknowledgeAlertAsync(string id, string acknowledgedBy)
    {
        var filter = Builders<Alert>.Filter.And(
            Builders<Alert>.Filter.Eq(a => a.Id, id),
            Builders<Alert>.Filter.Eq(a => a.CompanyId, _companyId)
        );

        var update = Builders<Alert>.Update
            .Set(a => a.Status, AlertStatus.Acknowledged)
            .Set(a => a.AcknowledgedAt, DateTime.UtcNow)
            .Set(a => a.AcknowledgedBy, acknowledgedBy)
            .Set(a => a.UpdatedAt, DateTime.UtcNow);

        var result = await _alerts.UpdateOneAsync(filter, update);
        return result.ModifiedCount > 0;
    }

    public async Task<bool> ResolveAlertAsync(string id, string resolvedBy)
    {
        var filter = Builders<Alert>.Filter.And(
            Builders<Alert>.Filter.Eq(a => a.Id, id),
            Builders<Alert>.Filter.Eq(a => a.CompanyId, _companyId)
        );

        var update = Builders<Alert>.Update
            .Set(a => a.Status, AlertStatus.Resolved)
            .Set(a => a.ResolvedAt, DateTime.UtcNow)
            .Set(a => a.ResolvedBy, resolvedBy)
            .Set(a => a.UpdatedAt, DateTime.UtcNow);

        var result = await _alerts.UpdateOneAsync(filter, update);
        return result.ModifiedCount > 0;
    }

    public async Task CheckAlertConditionsAsync()
    {
        var rules = await GetAlertRulesAsync();
        var enabledRules = rules.Where(r => r.IsEnabled).ToList();

        foreach (var rule in enabledRules)
        {
            try
            {
                await CheckAlertRuleAsync(rule);
            }
            catch (Exception ex)
            {
                // 记录错误但继续检查其他规则
                Console.WriteLine($"检查告警规则 {rule.Name} 时发生错误: {ex.Message}");
            }
        }
    }

    private async Task CheckAlertRuleAsync(AlertRule rule)
    {
        var currentMetrics = await GetSystemMetricsAsync();
        var value = GetMetricValue(currentMetrics, rule.Metric);
        var shouldAlert = EvaluateCondition(value, rule.Operator, rule.Threshold);

        if (shouldAlert)
        {
            // 检查是否在冷却期内
            var lastAlert = await GetLastAlertForRuleAsync(rule.Id);
            if (lastAlert == null || !IsInCooldown(lastAlert, rule.CooldownMinutes))
            {
                await CreateAlertAsync(rule, value);
            }
        }
    }

    private double GetMetricValue(SystemMetrics metrics, string metric)
    {
        return metric switch
        {
            "cpuUsage" => metrics.CpuUsage,
            "memoryUsage" => metrics.MemoryUsage,
            "diskUsage" => metrics.DiskUsage,
            "runningTasks" => metrics.RunningTasks,
            "failedTasks" => metrics.FailedTasks,
            _ => 0
        };
    }

    private bool EvaluateCondition(double value, string op, double threshold)
    {
        return op switch
        {
            ">" => value > threshold,
            ">=" => value >= threshold,
            "<" => value < threshold,
            "<=" => value <= threshold,
            "==" => Math.Abs(value - threshold) < 0.001,
            "!=" => Math.Abs(value - threshold) >= 0.001,
            _ => false
        };
    }

    private async Task<Alert?> GetLastAlertForRuleAsync(string ruleId)
    {
        var filter = Builders<Alert>.Filter.And(
            Builders<Alert>.Filter.Eq(a => a.RuleId, ruleId),
            Builders<Alert>.Filter.Eq(a => a.CompanyId, _companyId)
        );

        var sort = Builders<Alert>.Sort.Descending(a => a.TriggeredAt);

        return await _alerts.Find(filter)
            .Sort(sort)
            .FirstOrDefaultAsync();
    }

    private bool IsInCooldown(Alert lastAlert, int cooldownMinutes)
    {
        return lastAlert.TriggeredAt.AddMinutes(cooldownMinutes) > DateTime.UtcNow;
    }

    private async Task CreateAlertAsync(AlertRule rule, double value)
    {
        var alert = new Alert
        {
            RuleId = rule.Id,
            RuleName = rule.Name,
            Severity = rule.Severity,
            Message = $"{rule.Title}: {rule.Metric} {rule.Operator} {rule.Threshold} (当前值: {value:F2})",
            Metric = rule.Metric,
            Value = value,
            Threshold = rule.Threshold,
            Status = AlertStatus.Active,
            TriggeredAt = DateTime.UtcNow,
            CompanyId = _companyId,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        await _alerts.InsertOneAsync(alert);
    }

    private async Task<int> GetRunningTasksCountAsync()
    {
        var filter = Builders<TaskExecution>.Filter.And(
            Builders<TaskExecution>.Filter.Eq(t => t.CompanyId, _companyId),
            Builders<TaskExecution>.Filter.Eq(t => t.IsDeleted, false),
            Builders<TaskExecution>.Filter.Eq(t => t.Status, Models.TaskStatus.Running)
        );

        return (int)await _taskExecutions.CountDocumentsAsync(filter);
    }

    private async Task<int> GetFailedTasksCountAsync()
    {
        var filter = Builders<TaskExecution>.Filter.And(
            Builders<TaskExecution>.Filter.Eq(t => t.CompanyId, _companyId),
            Builders<TaskExecution>.Filter.Eq(t => t.IsDeleted, false),
            Builders<TaskExecution>.Filter.Eq(t => t.Status, Models.TaskStatus.Failed)
        );

        return (int)await _taskExecutions.CountDocumentsAsync(filter);
    }

    private async Task<int> GetCompletedTasksCountAsync()
    {
        var filter = Builders<TaskExecution>.Filter.And(
            Builders<TaskExecution>.Filter.Eq(t => t.CompanyId, _companyId),
            Builders<TaskExecution>.Filter.Eq(t => t.IsDeleted, false),
            Builders<TaskExecution>.Filter.Eq(t => t.Status, Models.TaskStatus.Completed)
        );

        return (int)await _taskExecutions.CountDocumentsAsync(filter);
    }
}
