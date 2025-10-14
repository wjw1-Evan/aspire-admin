using MongoDB.Driver;
using Platform.ApiService.Models;

namespace Platform.ApiService.Services;

/// <summary>
/// 租户上下文实现（v3.1: 支持多企业隶属）
/// </summary>
public class TenantContext : ITenantContext
{
    private readonly IHttpContextAccessor _httpContextAccessor;
    private readonly IMongoDatabase _database;
    
    // 缓存当前请求的企业ID
    private string? _cachedCompanyId;
    private bool _companyIdCached = false;

    public TenantContext(IHttpContextAccessor httpContextAccessor, IMongoDatabase database)
    {
        _httpContextAccessor = httpContextAccessor;
        _database = database;
    }

    /// <summary>
    /// v3.1: 从 user.CurrentCompanyId 获取当前企业ID
    /// </summary>
    public string? GetCurrentCompanyId()
    {
        // 使用缓存避免重复查询
        if (_companyIdCached)
        {
            return _cachedCompanyId;
        }
        
        // v3.1: 优先从 JWT Claims 获取 currentCompanyId
        var companyIdFromToken = _httpContextAccessor.HttpContext?.User?.FindFirst("currentCompanyId")?.Value;
        if (!string.IsNullOrEmpty(companyIdFromToken))
        {
            _cachedCompanyId = companyIdFromToken;
            _companyIdCached = true;
            return _cachedCompanyId;
        }
        
        // 向后兼容：从 companyId claim 获取（v3.0）
        companyIdFromToken = _httpContextAccessor.HttpContext?.User?.FindFirst("companyId")?.Value;
        if (!string.IsNullOrEmpty(companyIdFromToken))
        {
            _cachedCompanyId = companyIdFromToken;
            _companyIdCached = true;
            return _cachedCompanyId;
        }
        
        // 如果 token 中没有，从数据库查询用户的 CurrentCompanyId
        var userId = GetCurrentUserId();
        if (!string.IsNullOrEmpty(userId))
        {
            try
            {
                var users = _database.GetCollection<AppUser>("users");
                var user = users.Find(u => u.Id == userId)
                    .Project(u => new { u.CurrentCompanyId })
                    .FirstOrDefault();
                
                _cachedCompanyId = user?.CurrentCompanyId;
                _companyIdCached = true;
                return _cachedCompanyId;
            }
            catch
            {
                // 查询失败，返回null
            }
        }
        
        _companyIdCached = true;
        return null;
    }

    /// <summary>
    /// 获取当前用户ID
    /// </summary>
    public string? GetCurrentUserId()
    {
        return _httpContextAccessor.HttpContext?.User?.FindFirst("userId")?.Value;
    }

    /// <summary>
    /// 获取当前用户名
    /// </summary>
    public string? GetCurrentUsername()
    {
        return _httpContextAccessor.HttpContext?.User?.FindFirst("username")?.Value
               ?? _httpContextAccessor.HttpContext?.User?.Identity?.Name;
    }
    
    /// <summary>
    /// v3.1: 获取用户所属的所有企业ID列表
    /// </summary>
    public async Task<List<string>> GetUserCompanyIdsAsync(string userId)
    {
        var userCompanies = _database.GetCollection<UserCompany>("user_companies");
        
        var filter = Builders<UserCompany>.Filter.And(
            Builders<UserCompany>.Filter.Eq(uc => uc.UserId, userId),
            Builders<UserCompany>.Filter.Eq(uc => uc.Status, "active"),
            Builders<UserCompany>.Filter.Eq(uc => uc.IsDeleted, false)
        );
        
        var memberships = await userCompanies.Find(filter)
            .Project(uc => uc.CompanyId)
            .ToListAsync();
        
        return memberships;
    }
    
    /// <summary>
    /// v3.1: 检查用户是否属于指定企业
    /// </summary>
    public async Task<bool> IsUserInCompanyAsync(string userId, string companyId)
    {
        var userCompanies = _database.GetCollection<UserCompany>("user_companies");
        
        var filter = Builders<UserCompany>.Filter.And(
            Builders<UserCompany>.Filter.Eq(uc => uc.UserId, userId),
            Builders<UserCompany>.Filter.Eq(uc => uc.CompanyId, companyId),
            Builders<UserCompany>.Filter.Eq(uc => uc.Status, "active"),
            Builders<UserCompany>.Filter.Eq(uc => uc.IsDeleted, false)
        );
        
        var membership = await userCompanies.Find(filter).FirstOrDefaultAsync();
        return membership != null;
    }
}
