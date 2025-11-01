using Platform.ApiService.Extensions;
using Platform.ApiService.Models;
using Platform.ServiceDefaults.Models;
using Platform.ServiceDefaults.Services;
using System.Text.Json;
using MongoDB.Driver;

namespace Platform.ApiService.Services;

public class RuleService : IRuleService
{
    private readonly IDatabaseOperationFactory<RuleListItem> _ruleFactory;
    private readonly ITenantContext _tenantContext;

    public RuleService(
        IDatabaseOperationFactory<RuleListItem> ruleFactory,
        ITenantContext tenantContext)
    {
        _ruleFactory = ruleFactory;
        _tenantContext = tenantContext;
    }
    
    /// <summary>
    /// 获取当前用户的企业ID（从数据库获取，不使用 JWT token）
    /// </summary>
    private async Task<string> GetCurrentCompanyIdAsync()
    {
        var companyId = await _tenantContext.GetCurrentCompanyIdAsync();
        if (string.IsNullOrEmpty(companyId))
        {
            throw new UnauthorizedAccessException("未找到当前企业信息");
        }
        return companyId;
    }
 

    /// <summary>
    /// 获取规则列表
    /// ✅ 使用数据工厂的自动企业过滤（RuleListItem 实现了 IMultiTenant）
    /// </summary>
    public async Task<RuleListResponse> GetRulesAsync(RuleQueryParams queryParams)
    {
        var filterBuilder = _ruleFactory.CreateFilterBuilder();

        // 按名称筛选
        if (!string.IsNullOrEmpty(queryParams.Name))
        {
#pragma warning disable CS8603 // FilterBuilder.Regex 总是返回 this，不会返回 null
            filterBuilder = filterBuilder.Regex(r => r.Name, queryParams.Name, "i");
#pragma warning restore CS8603
        }

        var filter = filterBuilder.Build();

        // ✅ 数据工厂会自动添加企业过滤（因为 RuleListItem 实现了 IMultiTenant）
        // 获取总数
        var total = await _ruleFactory.CountAsync(filter);

        // 分页
        var skip = (queryParams.Current - 1) * queryParams.PageSize;
        var sortBuilder = _ruleFactory.CreateSortBuilder();
        sortBuilder.Descending(r => r.UpdatedAt);
        var (rules, _) = await _ruleFactory.FindPagedAsync(filter, sortBuilder.Build(), skip, queryParams.PageSize);

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
    public async Task<RuleListItem?> GetRuleByIdAsync(string id)
    {
        // ✅ 数据工厂会自动添加企业过滤（因为 RuleListItem 实现了 IMultiTenant）
        return await _ruleFactory.GetByIdAsync(id);
    }

    public async Task<RuleListItem> CreateRuleAsync(CreateRuleRequest request)
    {
        // 获取当前企业ID进行多租户过滤（从数据库获取，不使用 JWT token）
        var companyId = await GetCurrentCompanyIdAsync();

        var rule = new RuleListItem
        {
            CompanyId = companyId,
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
            // ✅ DatabaseOperationFactory.CreateAsync 会自动设置 IsDeleted = false, CreatedAt, UpdatedAt
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
        var filter = _ruleFactory.CreateFilterBuilder()
            .Equal(r => r.Id, id)
            .Build();

        var updateBuilder = _ruleFactory.CreateUpdateBuilder();
        
        if (!string.IsNullOrEmpty(request.Name))
            updateBuilder.Set(r => r.Name, request.Name);
        
        if (!string.IsNullOrEmpty(request.Desc))
            updateBuilder.Set(r => r.Desc, request.Desc);
        
        if (!string.IsNullOrEmpty(request.Owner))
            updateBuilder.Set(r => r.Owner, request.Owner);
        
        if (!string.IsNullOrEmpty(request.Href))
            updateBuilder.Set(r => r.Href, request.Href);
        
        if (!string.IsNullOrEmpty(request.Avatar))
            updateBuilder.Set(r => r.Avatar, request.Avatar);
        
        if (request.CallNo.HasValue)
            updateBuilder.Set(r => r.CallNo, request.CallNo.Value);
        
        if (request.Status.HasValue)
            updateBuilder.Set(r => r.Status, request.Status.Value);
        
        if (request.Progress.HasValue)
            updateBuilder.Set(r => r.Progress, request.Progress.Value);
        
        if (request.Disabled.HasValue)
            updateBuilder.Set(r => r.Disabled, request.Disabled.Value);
        
        var update = updateBuilder.Build();

        var options = new FindOneAndUpdateOptions<RuleListItem>
        {
            ReturnDocument = ReturnDocument.After,
            IsUpsert = false
        };

        var updatedRule = await _ruleFactory.FindOneAndUpdateAsync(filter, update, options);
        
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
        var filter = _ruleFactory.CreateFilterBuilder()
            .Equal(r => r.Id, id)
            .Build();
        
        // ✅ 数据工厂会自动添加企业过滤（因为 RuleListItem 实现了 IMultiTenant）
        var result = await _ruleFactory.FindOneAndSoftDeleteAsync(filter);
        return result != null;
    }

    /// <summary>
    /// 批量删除规则
    /// ✅ 使用数据工厂的自动企业过滤（RuleListItem 实现了 IMultiTenant）
    /// </summary>
    public async Task<bool> DeleteRulesAsync(List<int> keys)
    {
        var filter = _ruleFactory.CreateFilterBuilder()
            .In(r => r.Key, keys)
            .Build();
        
        // ✅ 数据工厂会自动添加企业过滤（因为 RuleListItem 实现了 IMultiTenant）
        var rules = await _ruleFactory.FindAsync(filter);
        var ruleIds = rules.Select(r => r.Id!).ToList();
        
        if (ruleIds.Any())
        {
            await _ruleFactory.SoftDeleteManyAsync(ruleIds);
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
        var sortBuilder = _ruleFactory.CreateSortBuilder()
            .Descending(r => r.Key);
        
        // ✅ 数据工厂会自动添加企业过滤（因为 RuleListItem 实现了 IMultiTenant）
        var rules = await _ruleFactory.FindAsync(sort: sortBuilder.Build(), limit: 1);
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
