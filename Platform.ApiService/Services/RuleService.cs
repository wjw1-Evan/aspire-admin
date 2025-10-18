using MongoDB.Driver;
using Platform.ApiService.Models;
using Platform.ServiceDefaults.Models;
using Platform.ServiceDefaults.Services;
using System.Text.Json;

namespace Platform.ApiService.Services;

public class RuleService : BaseService, IRuleService
{
    private readonly IMongoCollection<RuleListItem> _rules;
    // 移除未使用的 _logger 字段，使用基类的 Logger

    public RuleService(
        IMongoDatabase database,
        IHttpContextAccessor httpContextAccessor,
        ITenantContext tenantContext,
        ILogger<RuleService> logger)
        : base(database, httpContextAccessor, tenantContext, logger)
    {
        _rules = database.GetCollection<RuleListItem>("rules");
    }
 

    public async Task<RuleListResponse> GetRulesAsync(RuleQueryParams queryParams)
    {
        // 获取当前企业ID进行多租户过滤
        var companyId = GetCurrentCompanyId();
        if (string.IsNullOrEmpty(companyId))
        {
            throw new UnauthorizedAccessException("未找到当前企业信息");
        }

        var filter = Builders<RuleListItem>.Filter.And(
            Builders<RuleListItem>.Filter.Eq(r => r.CompanyId, companyId),
            Builders<RuleListItem>.Filter.Eq(r => r.IsDeleted, false)
        );

        // 按名称筛选
        if (!string.IsNullOrEmpty(queryParams.Name))
        {
            filter = Builders<RuleListItem>.Filter.And(filter,
                Builders<RuleListItem>.Filter.Regex(r => r.Name,
                new MongoDB.Bson.BsonRegularExpression(queryParams.Name, "i")));
        }

        // 获取总数
        var total = await _rules.CountDocumentsAsync(filter);

        // 分页
        var skip = (queryParams.Current - 1) * queryParams.PageSize;
        var rules = await _rules.Find(filter)
            .Skip(skip)
            .Limit(queryParams.PageSize)
            .ToListAsync();

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
        var companyId = GetCurrentCompanyId();
        if (string.IsNullOrEmpty(companyId))
        {
            throw new UnauthorizedAccessException("未找到当前企业信息");
        }

        var filter = Builders<RuleListItem>.Filter.And(
            Builders<RuleListItem>.Filter.Eq(r => r.Id, id),
            Builders<RuleListItem>.Filter.Eq(r => r.CompanyId, companyId),
            Builders<RuleListItem>.Filter.Eq(r => r.IsDeleted, false)
        );

        return await _rules.Find(filter).FirstOrDefaultAsync();
    }

    public async Task<RuleListItem> CreateRuleAsync(CreateRuleRequest request)
    {
        var companyId = GetCurrentCompanyId();
        if (string.IsNullOrEmpty(companyId))
        {
            throw new UnauthorizedAccessException("未找到当前企业信息");
        }

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

        await _rules.InsertOneAsync(rule);
        return rule;
    }

    public async Task<RuleListItem?> UpdateRuleAsync(string id, UpdateRuleRequest request)
    {
        var companyId = GetCurrentCompanyId();
        if (string.IsNullOrEmpty(companyId))
        {
            throw new UnauthorizedAccessException("未找到当前企业信息");
        }

        var filter = Builders<RuleListItem>.Filter.And(
            Builders<RuleListItem>.Filter.Eq(r => r.Id, id),
            Builders<RuleListItem>.Filter.Eq(r => r.CompanyId, companyId),
            Builders<RuleListItem>.Filter.Eq(r => r.IsDeleted, false)
        );
        var update = Builders<RuleListItem>.Update.Set(r => r.UpdatedAt, DateTime.UtcNow);

        if (!string.IsNullOrEmpty(request.Name))
            update = update.Set(r => r.Name, request.Name);
        
        if (!string.IsNullOrEmpty(request.Desc))
            update = update.Set(r => r.Desc, request.Desc);
        
        if (!string.IsNullOrEmpty(request.Owner))
            update = update.Set(r => r.Owner, request.Owner);
        
        if (!string.IsNullOrEmpty(request.Href))
            update = update.Set(r => r.Href, request.Href);
        
        if (!string.IsNullOrEmpty(request.Avatar))
            update = update.Set(r => r.Avatar, request.Avatar);
        
        if (request.CallNo.HasValue)
            update = update.Set(r => r.CallNo, request.CallNo.Value);
        
        if (request.Status.HasValue)
            update = update.Set(r => r.Status, request.Status.Value);
        
        if (request.Progress.HasValue)
            update = update.Set(r => r.Progress, request.Progress.Value);
        
        if (request.Disabled.HasValue)
            update = update.Set(r => r.Disabled, request.Disabled.Value);

        var result = await _rules.UpdateOneAsync(filter, update);
        
        if (result.ModifiedCount > 0)
        {
            return await GetRuleByIdAsync(id);
        }
        
        return null;
    }


    public async Task<bool> DeleteRuleAsync(string id)
    {
        var companyId = GetCurrentCompanyId();
        if (string.IsNullOrEmpty(companyId))
        {
            throw new UnauthorizedAccessException("未找到当前企业信息");
        }

        var filter = Builders<RuleListItem>.Filter.And(
            Builders<RuleListItem>.Filter.Eq(r => r.Id, id),
            Builders<RuleListItem>.Filter.Eq(r => r.CompanyId, companyId),
            Builders<RuleListItem>.Filter.Eq(r => r.IsDeleted, false)
        );

        var result = await _rules.DeleteOneAsync(filter);
        return result.DeletedCount > 0;
    }

    public async Task<bool> DeleteRulesAsync(List<int> keys)
    {
        var companyId = GetCurrentCompanyId();
        if (string.IsNullOrEmpty(companyId))
        {
            throw new UnauthorizedAccessException("未找到当前企业信息");
        }

        var filter = Builders<RuleListItem>.Filter.And(
            Builders<RuleListItem>.Filter.In(r => r.Key, keys),
            Builders<RuleListItem>.Filter.Eq(r => r.CompanyId, companyId),
            Builders<RuleListItem>.Filter.Eq(r => r.IsDeleted, false)
        );
        var result = await _rules.DeleteManyAsync(filter);
        return result.DeletedCount > 0;
    }

    private async Task<int> GetNextKeyAsync()
    {
        var companyId = GetCurrentCompanyId();
        if (string.IsNullOrEmpty(companyId))
        {
            throw new UnauthorizedAccessException("未找到当前企业信息");
        }

        var filter = Builders<RuleListItem>.Filter.And(
            Builders<RuleListItem>.Filter.Eq(r => r.CompanyId, companyId),
            Builders<RuleListItem>.Filter.Eq(r => r.IsDeleted, false)
        );

        var lastRule = await _rules.Find(filter)
            .SortByDescending(r => r.Key)
            .FirstOrDefaultAsync();

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
