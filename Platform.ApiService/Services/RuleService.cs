using Microsoft.EntityFrameworkCore;
using Platform.ApiService.Extensions;
using Platform.ApiService.Models;
using Platform.ServiceDefaults.Models;
using Platform.ServiceDefaults.Services;
using Platform.ServiceDefaults.Extensions;
using System.Linq.Dynamic.Core;
using System.Linq.Expressions;
using System.Text.Json;

namespace Platform.ApiService.Services;

/// <summary>
/// 规则服务实现
/// </summary>
public class RuleService : IRuleService
{
    private readonly DbContext _context;

    /// <summary>
    /// 初始化规则服务
    /// </summary>
    public RuleService(DbContext context)
    {
        _context = context;
        
    }

    /// <summary>
    /// 获取规则列表
    /// </summary>
    public async Task<System.Linq.Dynamic.Core.PagedResult<RuleListItem>> GetRulesAsync(Platform.ServiceDefaults.Models.ProTableRequest queryParams)
    {
        var pagedResult = _context.Set<RuleListItem>().ToPagedList(queryParams);
        var rules = await pagedResult.Queryable.ToListAsync();
        return pagedResult;
    }

    /// <summary>
    /// 根据ID获取规则
    /// </summary>
    public async Task<RuleListItem?> GetRuleByIdAsync(string id)
    {
        return await _context.Set<RuleListItem>().FirstOrDefaultAsync(x => x.Id == id);
    }

    /// <summary>
    /// 创建规则
    /// </summary>
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

        await _context.Set<RuleListItem>().AddAsync(rule);
        await _context.SaveChangesAsync();
        return rule;
    }

    /// <summary>
    /// 更新规则
    /// </summary>
    public async Task<RuleListItem?> UpdateRuleAsync(string id, UpdateRuleRequest request)
    {
        var r = await _context.Set<RuleListItem>().FirstOrDefaultAsync(x => x.Id == id);
        if (r == null) throw new KeyNotFoundException($"规则 {id} 不存在");

        if (!string.IsNullOrEmpty(request.Name)) r.Name = request.Name;
        if (!string.IsNullOrEmpty(request.Desc)) r.Desc = request.Desc;
        if (!string.IsNullOrEmpty(request.Owner)) r.Owner = request.Owner;
        if (!string.IsNullOrEmpty(request.Href)) r.Href = request.Href;
        if (!string.IsNullOrEmpty(request.Avatar)) r.Avatar = request.Avatar;
        if (request.CallNo.HasValue) r.CallNo = request.CallNo.Value;
        if (request.Status.HasValue) r.Status = request.Status.Value;
        if (request.Progress.HasValue) r.Progress = request.Progress.Value;
        if (request.Disabled.HasValue) r.Disabled = request.Disabled.Value;

        await _context.SaveChangesAsync();
        return r;
    }

    /// <summary>
    /// 删除规则（软删除）
    /// </summary>
    public async Task<bool> DeleteRuleAsync(string id)
    {
        var entity = await _context.Set<RuleListItem>().FirstOrDefaultAsync(x => x.Id == id);
        if (entity == null) return false;
        _context.Set<RuleListItem>().Remove(entity);
        await _context.SaveChangesAsync();
        return true;
    }

    /// <summary>
    /// 批量删除规则
    /// </summary>
    public async Task<bool> DeleteRulesAsync(List<int> keys)
    {
        if (!keys.Any()) return false;

        var items = await _context.Set<RuleListItem>().Where(r => keys.Contains(r.Key)).ToListAsync();
        _context.Set<RuleListItem>().RemoveRange(items);
        await _context.SaveChangesAsync();
        return true;
    }

    /// <summary>
    /// 获取下一个规则Key
    /// </summary>
    private async Task<int> GetNextKeyAsync()
    {
        var lastRule = await _context.Set<RuleListItem>()
            .OrderByDescending(r => r.Key)
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