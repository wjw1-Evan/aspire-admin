using Platform.ApiService.Models;

namespace Platform.ApiService.Services;

/// <summary>
/// 规则服务接口
/// </summary>
public interface IRuleService
{
    Task<RuleListResponse> GetRulesAsync(RuleQueryParams queryParams);
    Task<RuleListItem?> GetRuleByIdAsync(string id);
    Task<RuleListItem> CreateRuleAsync(CreateRuleRequest request);
    Task<RuleListItem?> UpdateRuleAsync(string id, UpdateRuleRequest request);
    Task<bool> DeleteRuleAsync(string id);
    Task<bool> DeleteRulesAsync(List<int> keys);
}

