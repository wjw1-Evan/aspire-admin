using Platform.DataPlatform.Models;

namespace Platform.DataPlatform.Services;

/// <summary>
/// 数据质量服务接口
/// </summary>
public interface IDataQualityService
{
    /// <summary>
    /// 获取数据质量规则列表
    /// </summary>
    Task<List<DataQualityRule>> GetAllRulesAsync();

    /// <summary>
    /// 根据ID获取数据质量规则
    /// </summary>
    Task<DataQualityRule?> GetRuleByIdAsync(string id);

    /// <summary>
    /// 创建数据质量规则
    /// </summary>
    Task<DataQualityRule> CreateRuleAsync(DataQualityRule rule);

    /// <summary>
    /// 更新数据质量规则
    /// </summary>
    Task<bool> UpdateRuleAsync(string id, DataQualityRule rule);

    /// <summary>
    /// 删除数据质量规则
    /// </summary>
    Task<bool> DeleteRuleAsync(string id);

    /// <summary>
    /// 执行数据质量检查
    /// </summary>
    Task<QualityCheckResult> ExecuteQualityCheckAsync(string ruleId);

    /// <summary>
    /// 批量执行数据质量检查
    /// </summary>
    Task<List<QualityCheckResult>> ExecuteBatchQualityCheckAsync(List<string> ruleIds);

    /// <summary>
    /// 获取数据源的质量规则
    /// </summary>
    Task<List<DataQualityRule>> GetRulesByDataSourceAsync(string dataSourceId);

    /// <summary>
    /// 获取质量检查历史
    /// </summary>
    Task<List<QualityCheckResult>> GetQualityCheckHistoryAsync(string ruleId, int limit = 10);

    /// <summary>
    /// 获取数据源质量统计
    /// </summary>
    Task<Dictionary<string, object>> GetDataSourceQualityStatisticsAsync(string dataSourceId);

    /// <summary>
    /// 获取整体质量概览
    /// </summary>
    Task<Dictionary<string, object>> GetOverallQualityOverviewAsync();
}
