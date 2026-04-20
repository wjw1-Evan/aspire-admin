using Microsoft.AspNetCore.Http;
using MongoDB.Driver;

namespace Platform.ServiceDefaults.Services;

public interface ITenantContext
{
    string? GetCurrentUserId();
    string? GetCurrentCompanyId();
}

public interface ITenantContextSetter
{
    void SetContext(string companyId, string? userId);
    string? GetCurrentCompanyId();
    string? GetCurrentUserId();
}

public class TenantContext : ITenantContext, ITenantContextSetter
{
    private readonly IHttpContextAccessor _httpContextAccessor;
    private readonly IMongoDatabase _database;
    private string? _cachedCompanyId;
    private string? _overrideCompanyId;
    private string? _overrideUserId;
    private string? _currentUserId;
    private bool _isOverridden;

    public TenantContext(
        IHttpContextAccessor httpContextAccessor,
        IMongoDatabase database)
    {
        _httpContextAccessor = httpContextAccessor;
        _database = database;
    }

    public string? GetCurrentUserId()
    {
        if (_isOverridden) return _overrideUserId;

        // 首先尝试从 HttpContext.Items 读取（由 TenantContextMiddleware 设置）
        if (_httpContextAccessor.HttpContext?.Items.TryGetValue("UserId", out var contextUserId) == true)
        {
            return contextUserId?.ToString();
        }

        return _currentUserId;
    }

    public string? GetCurrentCompanyId()
    {
        if (_isOverridden) return _overrideCompanyId;

        // 首先尝试从 HttpContext.Items 读取（由 TenantContextMiddleware 设置）
        if (_httpContextAccessor.HttpContext?.Items.TryGetValue("companyId", out var contextCompanyId) == true)
        {
            return contextCompanyId?.ToString();
        }

        return _cachedCompanyId;
    }

    public void SetContext(string companyId, string? userId)
    {
        _overrideCompanyId = companyId;
        _overrideUserId = userId;
        _currentUserId = userId;
        _isOverridden = true;
        _cachedCompanyId = companyId;
        PlatformDbContext.SetContext(companyId, userId);
    }


}
