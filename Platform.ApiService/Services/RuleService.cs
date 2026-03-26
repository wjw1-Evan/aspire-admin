using Platform.ApiService.Extensions;
using Platform.ApiService.Models;
using Platform.ServiceDefaults.Models;
using Platform.ServiceDefaults.Services;
using System.Linq.Expressions;
using System.Text.Json;

namespace Platform.ApiService.Services;

/// <summary>
/// 规则服务实现
/// </summary>
public class RuleService : IRuleService
{
    private readonly IDataFactory<RuleListItem> _ruleFactory;

    /// <summary>
    /// 初始化规则服务
    /// </summary>
    /// <param name="ruleFactory">规则数据操作工厂</param>
    public RuleService(
        IDataFactory<RuleListItem> ruleFactory)
    {
        _ruleFactory = ruleFactory;
    }


    /// <summary>
    /// 获取规则列表
    /// </summary>
    public async Task<RuleListResponse> GetRulesAsync(RuleQueryParams queryParams)
    {
        Expression<Func<RuleListItem, bool>> filter = r => true;

        // 按名称筛选
        if (!string.IsNullOrEmpty(queryParams.Name))
        {
            var nameLower = queryParams.Name.ToLower();
            filter = r => r.Name != null && r.Name.ToLower().Contains(nameLower);
        }

        // ✅ 数据工厂会自动添加企业过滤（因为 RuleListItem 实现了 IMultiTenant）
        // 获取总数
        var total = await _ruleFactory.CountAsync(filter);

        // 分页
        var (rules, _) = await _ruleFactory.FindPagedAsync(
            filter,
            query => query.OrderByDescending(r => r.UpdatedAt),
            queryParams.Current,
            queryParams.PageSize);

        // 排序处理
        if (!string.IsNullOrEmpty(queryParams.Sorter))
        {
            var sorter = JsonSerializer.Deserialize<Dictionary<string, string>>(queryParams.Sorter);
            if (sorter != null)
            {
                // 这里可以根据需要实现更复杂的排序逻辑
                rules = rules.OrderBy(r => r.Name).ToList();
            }
        }

        return new RuleListResponse
        {
            Data = rules,
            Total = (int)total,
            Success = true,
            PageSize = queryParams.PageSize,
            Current = queryParams.Current
        };
    }

    /// <summary>
    /// 根据ID获取规则
    /// ✅ 使用数据工厂的自动企业过滤（RuleListItem 实现了 IMultiTenant）
    /// </summary>
    /// <param name="id">规则ID</param>
    /// <returns>规则信息，如果不存在则返回 null</returns>
    public async Task<RuleListItem?> GetRuleByIdAsync(string id)
    {
        // ✅ 数据工厂会自动添加企业过滤（因为 RuleListItem 实现了 IMultiTenant）
        return await _ruleFactory.GetByIdAsync(id);
    }

    /// <summary>
    /// 创建规则
    /// </summary>
    /// <param name="request">创建规则请求</param>
    /// <returns>创建的规则信息</returns>
    public async Task<RuleListItem> CreateRuleAsync(CreateRuleRequest request)
    {
        var rule = new RuleListItem
        {
            Key = await GetNextKeyAsync(),
            Name = request.Name ?? string.Empty,
            Desc = request.Desc ?? string.Empty,
            Owner = request.Owner ?? "曲丽丽",
            Href = request.Href ?? "https://ant.design",
            Avatar = request.Avatar ?? GetRandomAvatar(),
            CallNo = request.CallNo,
            Status = request.Status,
            Progress = request.Progress,
            Disabled = request.Disabled
        };

        await _ruleFactory.CreateAsync(rule);
        return rule;
    }

    /// <summary>
    /// 更新规则（使用原子操作）
    /// ✅ 使用数据工厂的自动企业过滤（RuleListItem 实现了 IMultiTenant）
    /// </summary>
    public async Task<RuleListItem?> UpdateRuleAsync(string id, UpdateRuleRequest request)
    {
        var updatedRule = await _ruleFactory.UpdateAsync(id, r =>
        {
            if (!string.IsNullOrEmpty(request.Name))
                r.Name = request.Name;

            if (!string.IsNullOrEmpty(request.Desc))
                r.Desc = request.Desc;

            if (!string.IsNullOrEmpty(request.Owner))
                r.Owner = request.Owner;

            if (!string.IsNullOrEmpty(request.Href))
                r.Href = request.Href;

            if (!string.IsNullOrEmpty(request.Avatar))
                r.Avatar = request.Avatar;

            if (request.CallNo.HasValue)
                r.CallNo = request.CallNo.Value;

            if (request.Status.HasValue)
                r.Status = request.Status.Value;

            if (request.Progress.HasValue)
                r.Progress = request.Progress.Value;

            if (request.Disabled.HasValue)
                r.Disabled = request.Disabled.Value;

            r.UpdatedAt = DateTime.UtcNow;
        });

        if (updatedRule == null)
        {
            throw new KeyNotFoundException($"规则 {id} 不存在");
        }

        return await GetRuleByIdAsync(id);
    }


    /// <summary>
    /// 删除规则（软删除）
    /// ✅ 使用数据工厂的自动企业过滤（RuleListItem 实现了 IMultiTenant）
    /// </summary>
    public async Task<bool> DeleteRuleAsync(string id)
    {
        var result = await _ruleFactory.SoftDeleteAsync(id);
        return result;
    }

    /// <summary>
    /// 批量删除规则
    /// ✅ 使用数据工厂的自动企业过滤（RuleListItem 实现了 IMultiTenant）
    /// </summary>
    public async Task<bool> DeleteRulesAsync(List<int> keys)
    {
        if (keys.Any())
        {
            await _ruleFactory.SoftDeleteManyAsync(r => keys.Contains(r.Key));
            return true;
        }

        return false;
    }

    /// <summary>
    /// 获取下一个规则Key
    /// ✅ 使用数据工厂的自动企业过滤（RuleListItem 实现了 IMultiTenant）
    /// </summary>
    private async Task<int> GetNextKeyAsync()
    {
        var rules = await _ruleFactory.FindAsync(
            r => true,
            query => query.OrderByDescending(r => r.Key),
            1);

        var lastRule = rules.FirstOrDefault();

        return lastRule?.Key + 1 ?? 1;
    }

    private static string GetRandomAvatar()
    {
        var avatars = new[]
        {
            "https://gw.alipayobjects.com/zos/rmsportal/eeHMaZBwmTvLdIwMfBpg.png",
            "https://gw.alipayobjects.com/zos/rmsportal/udxAbMEhpwthVVcjLXik.png"
        };

        return avatars[Random.Shared.Next(avatars.Length)];
    }

}
