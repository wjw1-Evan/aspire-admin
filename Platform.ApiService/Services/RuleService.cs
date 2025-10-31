using Platform.ApiService.Models;
using Platform.ServiceDefaults.Models;
using Platform.ServiceDefaults.Services;
using System.Text.Json;
using MongoDB.Driver;

namespace Platform.ApiService.Services;

public class RuleService : IRuleService
{
    private readonly IDatabaseOperationFactory<RuleListItem> _ruleFactory;
    private readonly IDatabaseOperationFactory<AppUser> _userFactory;

    public RuleService(
        IDatabaseOperationFactory<RuleListItem> ruleFactory,
        IDatabaseOperationFactory<AppUser> userFactory)
    {
        _ruleFactory = ruleFactory;
        _userFactory = userFactory;
    }
    
    /// <summary>
    /// 获取当前用户的企业ID（从数据库获取，不使用 JWT token）
    /// </summary>
    private async Task<string> GetCurrentCompanyIdAsync()
    {
        // ⚠️ 已移除 JWT token 中的 CurrentCompanyId，从当前用户获取
        var currentUserId = _userFactory.GetRequiredUserId();
        var currentUser = await _userFactory.GetByIdAsync(currentUserId);
        if (currentUser == null || string.IsNullOrEmpty(currentUser.CurrentCompanyId))
        {
            throw new UnauthorizedAccessException("未找到当前企业信息");
        }
        return currentUser.CurrentCompanyId;
    }
 

    public async Task<RuleListResponse> GetRulesAsync(RuleQueryParams queryParams)
    {
        // 获取当前企业ID进行多租户过滤（从数据库获取，不使用 JWT token）
        var companyId = await GetCurrentCompanyIdAsync();

        var filterBuilder = _ruleFactory.CreateFilterBuilder()
            .Equal(r => r.CompanyId, companyId);

        // 按名称筛选
        if (!string.IsNullOrEmpty(queryParams.Name))
        {
            filterBuilder.Regex(r => r.Name, queryParams.Name, "i");
        }

        var filter = filterBuilder.Build();

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

    public async Task<RuleListItem?> GetRuleByIdAsync(string id)
    {
        // 获取当前企业ID进行多租户过滤（从数据库获取，不使用 JWT token）
        var companyId = await GetCurrentCompanyIdAsync();
        
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
            Disabled = request.Disabled,
            IsDeleted = false,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        await _ruleFactory.CreateAsync(rule);
        return rule;
    }

    /// <summary>
    /// 更新规则（使用原子操作）
    /// </summary>
    public async Task<RuleListItem?> UpdateRuleAsync(string id, UpdateRuleRequest request)
    {
        // 获取当前企业ID进行多租户过滤（从数据库获取，不使用 JWT token）
        var companyId = await GetCurrentCompanyIdAsync();

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


    public async Task<bool> DeleteRuleAsync(string id)
    {
        // 获取当前企业ID进行多租户过滤（从数据库获取，不使用 JWT token）
        var companyId = await GetCurrentCompanyIdAsync();

        var filter = _ruleFactory.CreateFilterBuilder().Equal(r => r.Id, id).Build();
        var result = await _ruleFactory.FindOneAndSoftDeleteAsync(filter);
        return result != null;
    }

    public async Task<bool> DeleteRulesAsync(List<int> keys)
    {
        // 获取当前企业ID进行多租户过滤（从数据库获取，不使用 JWT token）
        var companyId = await GetCurrentCompanyIdAsync();

        var filter = _ruleFactory.CreateFilterBuilder()
            .In(r => r.Key, keys)
            .Equal(r => r.CompanyId, companyId)
            .Build();
        
        var rules = await _ruleFactory.FindAsync(filter);
        var ruleIds = rules.Select(r => r.Id!).ToList();
        
        if (ruleIds.Any())
        {
            await _ruleFactory.SoftDeleteManyAsync(ruleIds);
            return true;
        }
        
        return false;
    }

    private async Task<int> GetNextKeyAsync()
    {
        // 获取当前企业ID进行多租户过滤（从数据库获取，不使用 JWT token）
        var companyId = await GetCurrentCompanyIdAsync();

        var filter = _ruleFactory.CreateFilterBuilder()
            .Equal(r => r.CompanyId, companyId)
            .Build();

        var sortBuilder = _ruleFactory.CreateSortBuilder()
            .Descending(r => r.Key);
        
        var rules = await _ruleFactory.FindAsync(filter, sort: sortBuilder.Build(), limit: 1);
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
