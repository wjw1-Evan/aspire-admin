using User = Platform.ApiService.Models.AppUser;
using Platform.ApiService.Extensions;
using Platform.ApiService.Models;
using Platform.ServiceDefaults.Services;

namespace Platform.ApiService.Services;

/// <summary>
/// 唯一性检查服务 - 统一处理字段唯一性验证
/// </summary>
public interface IUniquenessChecker
{
    /// <summary>
    /// 确保用户名唯一，如果已存在则抛出异常
    /// </summary>
    /// <param name="username">用户名</param>
    /// <param name="excludeUserId">排除的用户ID（用于更新时排除自己）</param>
    Task EnsureUsernameUniqueAsync(string username, string? excludeUserId = null);

    /// <summary>
    /// 确保邮箱唯一，如果已存在则抛出异常
    /// </summary>
    /// <param name="email">邮箱地址</param>
    /// <param name="excludeUserId">排除的用户ID（用于更新时排除自己）</param>
    Task EnsureEmailUniqueAsync(string email, string? excludeUserId = null);

    /// <summary>
    /// 检查用户名是否唯一
    /// </summary>
    /// <param name="username">用户名</param>
    /// <param name="excludeUserId">排除的用户ID（用于更新时排除自己）</param>
    /// <returns>如果唯一返回 true，否则返回 false</returns>
    Task<bool> IsUsernameUniqueAsync(string username, string? excludeUserId = null);

    /// <summary>
    /// 检查邮箱是否唯一
    /// </summary>
    /// <param name="email">邮箱地址</param>
    /// <param name="excludeUserId">排除的用户ID（用于更新时排除自己）</param>
    /// <returns>如果唯一返回 true，否则返回 false</returns>
    Task<bool> IsEmailUniqueAsync(string email, string? excludeUserId = null);

    /// <summary>
    /// 确保手机号唯一，如果已存在则抛出异常
    /// </summary>
    Task EnsurePhoneUniqueAsync(string phone, string? excludeUserId = null);

    /// <summary>
    /// 检查手机号是否唯一
    /// </summary>
    Task<bool> IsPhoneUniqueAsync(string phone, string? excludeUserId = null);
}

/// <summary>
/// 唯一性检查服务实现
/// </summary>
public class UniquenessChecker : IUniquenessChecker
{
    private readonly IDatabaseOperationFactory<User> _userFactory;
    private readonly ITenantContext _tenantContext;

    /// <summary>
    /// 初始化唯一性检查服务
    /// </summary>
    /// <param name="userFactory">用户数据操作工厂</param>
    /// <param name="tenantContext">租户上下文</param>
    public UniquenessChecker(
        IDatabaseOperationFactory<User> userFactory,
        ITenantContext tenantContext)
    {
        _userFactory = userFactory;
        _tenantContext = tenantContext;
    }

    /// <summary>
    /// 确保用户名唯一，如果已存在则抛出异常
    /// </summary>
    public async Task EnsureUsernameUniqueAsync(string username, string? excludeUserId = null)
    {
        if (!await IsUsernameUniqueAsync(username, excludeUserId))
        {
            throw new InvalidOperationException("USER_NAME_EXISTS");
        }
    }

    /// <summary>
    /// 确保邮箱唯一，如果已存在则抛出异常
    /// </summary>
    public async Task EnsureEmailUniqueAsync(string email, string? excludeUserId = null)
    {
        if (!await IsEmailUniqueAsync(email, excludeUserId))
        {
            throw new InvalidOperationException("EMAIL_EXISTS");
        }
    }

    /// <summary>
    /// 确保手机号唯一，如果已存在则抛出异常
    /// </summary>
    public async Task EnsurePhoneUniqueAsync(string phone, string? excludeUserId = null)
    {
        if (!await IsPhoneUniqueAsync(phone, excludeUserId))
        {
            throw new InvalidOperationException("PHONE_NUMBER_EXISTS");
        }
    }

    /// <summary>
    /// 检查用户名是否唯一（v3.1: 全局唯一）
    /// </summary>
    public async Task<bool> IsUsernameUniqueAsync(string username, string? excludeUserId = null)
    {
        var filterBuilder = _userFactory.CreateFilterBuilder()
            .Equal(u => u.Username, username);

        // v3.1: 用户名全局唯一，不再按企业过滤

        if (!string.IsNullOrEmpty(excludeUserId))
        {
            filterBuilder.NotEqual(u => u.Id, excludeUserId);
        }

        var filter = filterBuilder.Build();

        var users = await _userFactory.FindAsync(filter);
        var existing = users.FirstOrDefault();
        return existing == null;
    }

    /// <summary>
    /// 检查邮箱是否唯一（v3.1: 全局唯一）
    /// </summary>
    public async Task<bool> IsEmailUniqueAsync(string email, string? excludeUserId = null)
    {
        if (string.IsNullOrEmpty(email))
            return true;

        var filterBuilder = _userFactory.CreateFilterBuilder()
            .Equal(u => u.Email, email);

        // v3.1: 邮箱全局唯一，不再按企业过滤

        if (!string.IsNullOrEmpty(excludeUserId))
        {
            filterBuilder.NotEqual(u => u.Id, excludeUserId);
        }

        var filter = filterBuilder.Build();

        var users = await _userFactory.FindAsync(filter);
        var existing = users.FirstOrDefault();
        return existing == null;
    }

    /// <summary>
    /// 检查手机号是否唯一
    /// </summary>
    public async Task<bool> IsPhoneUniqueAsync(string phone, string? excludeUserId = null)
    {
        if (string.IsNullOrEmpty(phone))
        {
            return true;
        }

        var filterBuilder = _userFactory.CreateFilterBuilder()
            .Equal(u => u.PhoneNumber, phone);

        if (!string.IsNullOrEmpty(excludeUserId))
        {
            filterBuilder.NotEqual(u => u.Id, excludeUserId);
        }

        var filter = filterBuilder.Build();

        var users = await _userFactory.FindAsync(filter);
        var existing = users.FirstOrDefault();
        return existing == null;
    }
}


