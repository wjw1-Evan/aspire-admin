using Platform.ApiService.Models;

namespace Platform.ApiService.Services;

/// <summary>
/// 规则服务接口
/// </summary>
public interface IRuleService
{
    /// <summary>
    /// 获取规则列表（支持分页和筛选）
    /// </summary>
    /// <param name="queryParams">查询参数</param>
    /// <returns>规则列表响应</returns>
    Task<RuleListResponse> GetRulesAsync(RuleQueryParams queryParams);
    
    /// <summary>
    /// 根据ID获取规则
    /// </summary>
    /// <param name="id">规则ID</param>
    /// <returns>规则信息，如果不存在则返回 null</returns>
    Task<RuleListItem?> GetRuleByIdAsync(string id);
    
    /// <summary>
    /// 创建规则
    /// </summary>
    /// <param name="request">创建规则请求</param>
    /// <returns>创建的规则信息</returns>
    Task<RuleListItem> CreateRuleAsync(CreateRuleRequest request);
    
    /// <summary>
    /// 更新规则
    /// </summary>
    /// <param name="id">规则ID</param>
    /// <param name="request">更新规则请求</param>
    /// <returns>更新后的规则信息，如果不存在则返回 null</returns>
    Task<RuleListItem?> UpdateRuleAsync(string id, UpdateRuleRequest request);
    
    /// <summary>
    /// 删除规则
    /// </summary>
    /// <param name="id">规则ID</param>
    /// <returns>是否成功删除</returns>
    Task<bool> DeleteRuleAsync(string id);
    
    /// <summary>
    /// 批量删除规则
    /// </summary>
    /// <param name="keys">规则键列表</param>
    /// <returns>是否成功删除</returns>
    Task<bool> DeleteRulesAsync(List<int> keys);
}

