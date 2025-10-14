using MongoDB.Driver;
using Platform.ApiService.Extensions;
using Platform.ApiService.Models;

namespace Platform.ApiService.Services;

/// <summary>
/// 唯一性检查服务 - 统一处理字段唯一性验证
/// </summary>
public interface IUniquenessChecker
{
    Task EnsureUsernameUniqueAsync(string username, string? excludeUserId = null);
    Task EnsureEmailUniqueAsync(string email, string? excludeUserId = null);
    Task<bool> IsUsernameUniqueAsync(string username, string? excludeUserId = null);
    Task<bool> IsEmailUniqueAsync(string email, string? excludeUserId = null);
}

public class UniquenessChecker : IUniquenessChecker
{
    private readonly IMongoCollection<AppUser> _users;
    private readonly ITenantContext _tenantContext;

    public UniquenessChecker(IMongoDatabase database, ITenantContext tenantContext)
    {
        _users = database.GetCollection<AppUser>("users");
        _tenantContext = tenantContext;
    }

    /// <summary>
    /// 确保用户名唯一，如果已存在则抛出异常
    /// </summary>
    public async Task EnsureUsernameUniqueAsync(string username, string? excludeUserId = null)
    {
        if (!await IsUsernameUniqueAsync(username, excludeUserId))
        {
            throw new InvalidOperationException("用户名已存在");
        }
    }

    /// <summary>
    /// 确保邮箱唯一，如果已存在则抛出异常
    /// </summary>
    public async Task EnsureEmailUniqueAsync(string email, string? excludeUserId = null)
    {
        if (!await IsEmailUniqueAsync(email, excludeUserId))
        {
            throw new InvalidOperationException("邮箱已存在");
        }
    }

    /// <summary>
    /// 检查用户名是否唯一（v3.1: 全局唯一）
    /// </summary>
    public async Task<bool> IsUsernameUniqueAsync(string username, string? excludeUserId = null)
    {
        var filterBuilder = Builders<AppUser>.Filter;
        var filters = new List<FilterDefinition<AppUser>>
        {
            filterBuilder.Eq(u => u.Username, username)
        };
        
        // v3.1: 用户名全局唯一，不再按企业过滤
        
        if (!string.IsNullOrEmpty(excludeUserId))
        {
            filters.Add(filterBuilder.Ne(u => u.Id, excludeUserId));
        }
        
        var filter = filterBuilder.And(filters).AndNotDeleted();
        
        var existing = await _users.Find(filter).FirstOrDefaultAsync();
        return existing == null;
    }

    /// <summary>
    /// 检查邮箱是否唯一（v3.1: 全局唯一）
    /// </summary>
    public async Task<bool> IsEmailUniqueAsync(string email, string? excludeUserId = null)
    {
        if (string.IsNullOrEmpty(email))
            return true;
            
        var filterBuilder = Builders<AppUser>.Filter;
        var filters = new List<FilterDefinition<AppUser>>
        {
            filterBuilder.Eq(u => u.Email, email)
        };
        
        // v3.1: 邮箱全局唯一，不再按企业过滤
        
        if (!string.IsNullOrEmpty(excludeUserId))
        {
            filters.Add(filterBuilder.Ne(u => u.Id, excludeUserId));
        }
        
        var filter = filterBuilder.And(filters).AndNotDeleted();
        
        var existing = await _users.Find(filter).FirstOrDefaultAsync();
        return existing == null;
    }
}


