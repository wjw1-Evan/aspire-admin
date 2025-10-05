using MongoDB.Driver;
using Platform.ApiService.Models;
using System.Text.Json;

namespace Platform.ApiService.Services;

public class RuleService
{
    private readonly IMongoCollection<RuleListItem> _rules;

    public RuleService(IMongoDatabase database)
    {
        _rules = database.GetCollection<RuleListItem>("rules");
        
    }
 

    public async Task<RuleListResponse> GetRulesAsync(RuleQueryParams queryParams)
    {
        var filter = Builders<RuleListItem>.Filter.Empty;

        // 按名称筛选
        if (!string.IsNullOrEmpty(queryParams.Name))
        {
            filter = Builders<RuleListItem>.Filter.Regex(r => r.Name, 
                new MongoDB.Bson.BsonRegularExpression(queryParams.Name, "i"));
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
            try
            {
                var sorter = JsonSerializer.Deserialize<Dictionary<string, string>>(queryParams.Sorter);
                if (sorter != null)
                {
                    // 这里可以根据需要实现更复杂的排序逻辑
                    rules = rules.OrderBy(r => r.Name).ToList();
                }
            }
            catch
            {
                // 忽略排序错误
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
        return await _rules.Find(r => r.Id == id).FirstOrDefaultAsync();
    }

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
            Disabled = request.Disabled,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        await _rules.InsertOneAsync(rule);
        return rule;
    }

    public async Task<RuleListItem?> UpdateRuleAsync(string id, UpdateRuleRequest request)
    {
        var filter = Builders<RuleListItem>.Filter.Eq(r => r.Id, id);
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
        var result = await _rules.DeleteOneAsync(r => r.Id == id);
        return result.DeletedCount > 0;
    }

    public async Task<bool> DeleteRulesAsync(List<int> keys)
    {
        var filter = Builders<RuleListItem>.Filter.In(r => r.Key, keys);
        var result = await _rules.DeleteManyAsync(filter);
        return result.DeletedCount > 0;
    }

    private async Task<int> GetNextKeyAsync()
    {
        var lastRule = await _rules.Find(Builders<RuleListItem>.Filter.Empty)
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
