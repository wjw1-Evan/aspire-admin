using Platform.ApiService.Models;

namespace Platform.ApiService.Services;

/// <summary>
/// 批量操作服务接口
/// </summary>
public interface IBulkOperationService
{
    /// <summary>
    /// 创建批量操作
    /// </summary>
    Task<BulkOperation> CreateBulkOperationAsync(BulkOperationType operationType, List<string> workflowIds, Dictionary<string, object>? parameters = null);

    /// <summary>
    /// 执行批量操作
    /// </summary>
    Task<bool> ExecuteBulkOperationAsync(string operationId, CancellationToken cancellationToken = default);

    /// <summary>
    /// 取消批量操作
    /// </summary>
    Task<bool> CancelBulkOperationAsync(string operationId);

    /// <summary>
    /// 获取批量操作状态
    /// </summary>
    Task<BulkOperation?> GetBulkOperationAsync(string operationId);

    /// <summary>
    /// 获取用户的批量操作列表
    /// </summary>
    Task<List<BulkOperation>> GetUserBulkOperationsAsync(int page = 1, int pageSize = 20);

    /// <summary>
    /// 清理已完成的批量操作
    /// </summary>
    Task<int> CleanupCompletedOperationsAsync(TimeSpan olderThan);
}

/// <summary>
/// 工作流分析服务接口
/// </summary>
public interface IWorkflowAnalyticsService
{
    /// <summary>
    /// 更新工作流使用统计
    /// </summary>
    Task UpdateUsageStatisticsAsync(string workflowId);

    /// <summary>
    /// 更新工作流完成统计
    /// </summary>
    Task UpdateCompletionStatisticsAsync(string workflowId, TimeSpan completionTime);

    /// <summary>
    /// 计算工作流性能评分
    /// </summary>
    Task<double> CalculatePerformanceScoreAsync(string workflowId);

    /// <summary>
    /// 检测性能问题
    /// </summary>
    Task<List<PerformanceIssue>> DetectPerformanceIssuesAsync(string workflowId);

    /// <summary>
    /// 获取工作流分析数据
    /// </summary>
    Task<WorkflowAnalytics?> GetAnalyticsAsync(string workflowId);

    /// <summary>
    /// 获取趋势数据
    /// </summary>
    Task<List<TrendDataPoint>> GetTrendDataAsync(string workflowId, DateTime startDate, DateTime endDate);

    /// <summary>
    /// 批量更新分析数据
    /// </summary>
    Task BatchUpdateAnalyticsAsync();

    /// <summary>
    /// 获取使用排名
    /// </summary>
    Task<List<(string WorkflowId, string WorkflowName, int UsageCount)>> GetUsageRankingAsync(int topCount = 10);

    /// <summary>
    /// 获取性能排名
    /// </summary>
    Task<List<(string WorkflowId, string WorkflowName, double PerformanceScore)>> GetPerformanceRankingAsync(int topCount = 10);
}

/// <summary>
/// 工作流导出导入服务接口
/// </summary>
public interface IWorkflowExportImportService
{
    /// <summary>
    /// 导出工作流
    /// </summary>
    Task<byte[]> ExportWorkflowsAsync(List<string> workflowIds, WorkflowExportConfig config);

    /// <summary>
    /// 导出过滤结果
    /// </summary>
    Task<byte[]> ExportFilteredWorkflowsAsync(Dictionary<string, object> filters, WorkflowExportConfig config);

    /// <summary>
    /// 验证导入文件
    /// </summary>
    Task<WorkflowImportResult> ValidateImportFileAsync(byte[] fileContent, string fileName);

    /// <summary>
    /// 导入工作流
    /// </summary>
    Task<WorkflowImportResult> ImportWorkflowsAsync(byte[] fileContent, string fileName, bool overwriteExisting = false);

    /// <summary>
    /// 预览导入
    /// </summary>
    Task<WorkflowImportResult> PreviewImportAsync(byte[] fileContent, string fileName);

    /// <summary>
    /// 解决导入冲突
    /// </summary>
    Task<WorkflowImportResult> ResolveImportConflictsAsync(byte[] fileContent, string fileName, Dictionary<string, string> resolutions);
}

/// <summary>
/// 工作流模板服务接口
/// </summary>
public interface IWorkflowTemplateService
{
    /// <summary>
    /// 创建模板
    /// </summary>
    Task<WorkflowTemplate> CreateTemplateAsync(WorkflowTemplate template);

    /// <summary>
    /// 从工作流创建模板
    /// </summary>
    Task<WorkflowTemplate> CreateTemplateFromWorkflowAsync(string workflowId, string templateName, string? description = null, List<TemplateParameter>? parameters = null);

    /// <summary>
    /// 应用模板创建工作流
    /// </summary>
    Task<WorkflowDefinition> ApplyTemplateAsync(string templateId, Dictionary<string, object> parameterValues, string workflowName);

    /// <summary>
    /// 获取模板列表
    /// </summary>
    Task<(List<WorkflowTemplate> Templates, int Total)> GetTemplatesAsync(string? category = null, string? searchTerm = null, TemplateType? templateType = null, int page = 1, int pageSize = 20);

    /// <summary>
    /// 获取模板详情
    /// </summary>
    Task<WorkflowTemplate?> GetTemplateAsync(string templateId);

    /// <summary>
    /// 更新模板
    /// </summary>
    Task<WorkflowTemplate?> UpdateTemplateAsync(string templateId, WorkflowTemplate template);

    /// <summary>
    /// 删除模板
    /// </summary>
    Task<bool> DeleteTemplateAsync(string templateId);

    /// <summary>
    /// 评价模板
    /// </summary>
    Task<bool> RateTemplateAsync(string templateId, int rating);

    /// <summary>
    /// 获取基于模板的工作流列表
    /// </summary>
    Task<List<WorkflowDefinition>> GetWorkflowsBasedOnTemplateAsync(string templateId);

    /// <summary>
    /// 传播模板更新
    /// </summary>
    Task<int> PropagateTemplateUpdatesAsync(string templateId, bool forceUpdate = false);

    /// <summary>
    /// 导出模板
    /// </summary>
    Task<byte[]> ExportTemplateAsync(string templateId, bool includeDependencies = true);

    /// <summary>
    /// 导入模板
    /// </summary>
    Task<WorkflowTemplate> ImportTemplateAsync(byte[] fileContent, string fileName);
}

/// <summary>
/// 工作流验证服务接口
/// </summary>
public interface IWorkflowValidationService
{
    /// <summary>
    /// 验证工作流定义
    /// </summary>
    Task<WorkflowValidationResult> ValidateWorkflowAsync(WorkflowDefinition workflow);

    /// <summary>
    /// 验证工作流图形连接性
    /// </summary>
    Task<List<ValidationIssue>> ValidateGraphConnectivityAsync(WorkflowGraph graph);

    /// <summary>
    /// 验证节点配置
    /// </summary>
    Task<List<ValidationIssue>> ValidateNodeConfigurationsAsync(List<WorkflowNode> nodes);

    /// <summary>
    /// 验证审批节点配置
    /// </summary>
    Task<List<ValidationIssue>> ValidateApprovalNodesAsync(List<WorkflowNode> approvalNodes);

    /// <summary>
    /// 验证外部依赖项
    /// </summary>
    Task<List<ValidationIssue>> ValidateExternalDependenciesAsync(WorkflowDefinition workflow);

    /// <summary>
    /// 批量验证工作流
    /// </summary>
    Task<Dictionary<string, WorkflowValidationResult>> BatchValidateWorkflowsAsync(List<string> workflowIds);

    /// <summary>
    /// 获取验证规则列表
    /// </summary>
    Task<List<string>> GetValidationRulesAsync();

    /// <summary>
    /// 检查激活前验证
    /// </summary>
    Task<bool> CanActivateWorkflowAsync(string workflowId);
}

/// <summary>
/// 性能监控服务接口
/// </summary>
public interface IWorkflowPerformanceService
{
    /// <summary>
    /// 记录操作性能
    /// </summary>
    Task RecordOperationPerformanceAsync(string operation, TimeSpan duration, Dictionary<string, object>? metadata = null);

    /// <summary>
    /// 获取性能指标
    /// </summary>
    Task<Dictionary<string, object>> GetPerformanceMetricsAsync(DateTime startDate, DateTime endDate);

    /// <summary>
    /// 检测性能瓶颈
    /// </summary>
    Task<List<string>> DetectPerformanceBottlenecksAsync();

    /// <summary>
    /// 获取慢查询列表
    /// </summary>
    Task<List<Dictionary<string, object>>> GetSlowQueriesAsync(int topCount = 10);

    /// <summary>
    /// 优化建议
    /// </summary>
    Task<List<string>> GetOptimizationSuggestionsAsync();
}
