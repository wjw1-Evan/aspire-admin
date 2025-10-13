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

    public UniquenessChecker(IMongoDatabase database)
    {
        _users = database.GetCollection<AppUser>("users");
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
    /// 检查用户名是否唯一
    /// </summary>
    public async Task<bool> IsUsernameUniqueAsync(string username, string? excludeUserId = null)
    {
        var filterBuilder = Builders<AppUser>.Filter;
        var filter = filterBuilder.Eq(u => u.Username, username);
        
        if (!string.IsNullOrEmpty(excludeUserId))
        {
            filter = filterBuilder.And(
                filter,
                filterBuilder.Ne(u => u.Id, excludeUserId)
            );
        }
        
        filter = filter.AndNotDeleted();
        
        var existing = await _users.Find(filter).FirstOrDefaultAsync();
        return existing == null;
    }

    /// <summary>
    /// 检查邮箱是否唯一
    /// </summary>
    public async Task<bool> IsEmailUniqueAsync(string email, string? excludeUserId = null)
    {
        if (string.IsNullOrEmpty(email))
            return true;
            
        var filterBuilder = Builders<AppUser>.Filter;
        var filter = filterBuilder.Eq(u => u.Email, email);
        
        if (!string.IsNullOrEmpty(excludeUserId))
        {
            filter = filterBuilder.And(
                filter,
                filterBuilder.Ne(u => u.Id, excludeUserId)
            );
        }
        
        filter = filter.AndNotDeleted();
        
        var existing = await _users.Find(filter).FirstOrDefaultAsync();
        return existing == null;
    }
}


