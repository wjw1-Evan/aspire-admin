using Platform.DataPlatform.Models;

namespace Platform.DataPlatform.Services;

/// <summary>
/// 任务监控服务接口
/// </summary>
public interface ITaskMonitorService
{
    /// <summary>
    /// 获取任务执行列表
    /// </summary>
    Task<List<TaskExecution>> GetTaskExecutionsAsync(int limit = 50);

    /// <summary>
    /// 根据ID获取任务执行记录
    /// </summary>
    Task<TaskExecution?> GetTaskExecutionByIdAsync(string id);

    /// <summary>
    /// 创建任务执行记录
    /// </summary>
    Task<TaskExecution> CreateTaskExecutionAsync(TaskExecution taskExecution);

    /// <summary>
    /// 更新任务执行状态
    /// </summary>
    Task<bool> UpdateTaskStatusAsync(string id, Models.TaskStatus status, double? progress = null, string? errorMessage = null);

    /// <summary>
    /// 完成任务执行
    /// </summary>
    Task<bool> CompleteTaskExecutionAsync(string id, Dictionary<string, object>? result = null);

    /// <summary>
    /// 获取系统监控指标
    /// </summary>
    Task<SystemMetrics> GetSystemMetricsAsync();

    /// <summary>
    /// 获取监控指标历史
    /// </summary>
    Task<List<SystemMetrics>> GetMetricsHistoryAsync(DateTime from, DateTime to);

    /// <summary>
    /// 获取任务统计信息
    /// </summary>
    Task<Dictionary<string, object>> GetTaskStatisticsAsync();

    /// <summary>
    /// 获取告警规则列表
    /// </summary>
    Task<List<AlertRule>> GetAlertRulesAsync();

    /// <summary>
    /// 创建告警规则
    /// </summary>
    Task<AlertRule> CreateAlertRuleAsync(AlertRule rule);

    /// <summary>
    /// 更新告警规则
    /// </summary>
    Task<bool> UpdateAlertRuleAsync(string id, AlertRule rule);

    /// <summary>
    /// 删除告警规则
    /// </summary>
    Task<bool> DeleteAlertRuleAsync(string id);

    /// <summary>
    /// 获取活跃告警
    /// </summary>
    Task<List<Alert>> GetActiveAlertsAsync();

    /// <summary>
    /// 获取告警历史
    /// </summary>
    Task<List<Alert>> GetAlertHistoryAsync(DateTime from, DateTime to);

    /// <summary>
    /// 确认告警
    /// </summary>
    Task<bool> AcknowledgeAlertAsync(string id, string acknowledgedBy);

    /// <summary>
    /// 解决告警
    /// </summary>
    Task<bool> ResolveAlertAsync(string id, string resolvedBy);

    /// <summary>
    /// 检查告警条件
    /// </summary>
    Task CheckAlertConditionsAsync();
}
