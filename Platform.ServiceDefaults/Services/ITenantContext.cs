using Microsoft.AspNetCore.Http;

namespace Platform.ServiceDefaults.Services;

/// <summary>
/// 租户上下文接口 - 提供多租户支持
/// </summary>
public interface ITenantContext
{
    /// <summary>
    /// 获取当前用户ID
    /// </summary>
    string? GetCurrentUserId();

    /// <summary>
    /// 获取当前用户名
    /// </summary>
    string? GetCurrentUsername();

    /// <summary>
    /// 获取当前用户角色
    /// </summary>
    string? GetCurrentUserRole();

    /// <summary>
    /// 获取当前企业ID
    /// </summary>
    string? GetCurrentCompanyId();

    /// <summary>
    /// 获取当前企业名称
    /// </summary>
    string? GetCurrentCompanyName();

    /// <summary>
    /// 是否为管理员
    /// </summary>
    bool IsAdmin();

    /// <summary>
    /// 检查权限
    /// </summary>
    bool HasPermission(string permission);

    /// <summary>
    /// 获取用户权限列表
    /// </summary>
    IEnumerable<string> GetUserPermissions();
}

/// <summary>
/// 租户上下文实现 - 从HTTP上下文获取租户信息
/// </summary>
public class TenantContext : ITenantContext
{
    private readonly IHttpContextAccessor _httpContextAccessor;

    public TenantContext(IHttpContextAccessor httpContextAccessor)
    {
        _httpContextAccessor = httpContextAccessor;
    }

    public string? GetCurrentUserId()
    {
        return _httpContextAccessor.HttpContext?.User?.FindFirst("userId")?.Value;
    }

    public string? GetCurrentUsername()
    {
        return _httpContextAccessor.HttpContext?.User?.FindFirst("username")?.Value;
    }

    public string? GetCurrentUserRole()
    {
        return _httpContextAccessor.HttpContext?.User?.FindFirst("role")?.Value;
    }

    public string? GetCurrentCompanyId()
    {
        return _httpContextAccessor.HttpContext?.User?.FindFirst("companyId")?.Value;
    }

    public string? GetCurrentCompanyName()
    {
        return _httpContextAccessor.HttpContext?.User?.FindFirst("companyName")?.Value;
    }

    public bool IsAdmin()
    {
        return GetCurrentUserRole() == "admin";
    }

    public bool HasPermission(string permission)
    {
        // 管理员拥有所有权限
        if (IsAdmin()) return true;
        
        // 检查用户权限
        var permissions = GetUserPermissions();
        return permissions.Contains(permission);
    }

    public IEnumerable<string> GetUserPermissions()
    {
        return _httpContextAccessor.HttpContext?.User?.FindAll("permission")?.Select(x => x.Value) ?? Enumerable.Empty<string>();
    }
}
