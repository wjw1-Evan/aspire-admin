using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Logging;
using MongoDB.Driver;
using MongoDB.Bson;

namespace Platform.ServiceDefaults.Services;

/// <summary>
/// 租户上下文接口 - 提供多租户支持。
/// userId 从 JWT token 读取，companyId 从数据库异步加载并缓存于 Scoped 生命周期内。
/// </summary>
public interface ITenantContext
{
    string? GetCurrentUserId();
    Task<string?> GetCurrentCompanyIdAsync();
    void ClearUserCache(string userId);
}

/// <summary>
/// 租户上下文实现 - userId 从 JWT token 读取，companyId 从数据库加载（Scoped 缓存）
/// </summary>
public class TenantContext(
    IHttpContextAccessor httpContextAccessor,
    IMongoDatabase database,
    ILogger<TenantContext> logger) : ITenantContext
{
    private string? _cachedCompanyId;
    private bool _companyLoaded;

    public string? GetCurrentUserId()
    {
        try
        {
            var user = httpContextAccessor.HttpContext?.User;
            return user?.FindFirst("userId")?.Value
                   ?? user?.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value
                   ?? user?.FindFirst("sub")?.Value;
        }
        catch (ObjectDisposedException) { return null; }
    }

    public async Task<string?> GetCurrentCompanyIdAsync()
    {
        if (_companyLoaded) return _cachedCompanyId;

        var userId = GetCurrentUserId();
        if (string.IsNullOrEmpty(userId))
        {
            _companyLoaded = true;
            return null;
        }

        try { _cachedCompanyId = await LoadCompanyIdAsync(userId); }
        catch (Exception ex) { logger.LogError(ex, "加载用户企业信息失败: {UserId}", userId); }

        _companyLoaded = true;
        return _cachedCompanyId;
    }

    public void ClearUserCache(string userId)
    {
        _cachedCompanyId = null;
        _companyLoaded = false;
        logger.LogDebug("TenantContext: 缓存已清除: {UserId}", userId);
    }

    private async Task<string?> LoadCompanyIdAsync(string userId)
    {
        var collection = database.GetCollection<BsonDocument>("appusers");

        // 构建简单的过滤器
        var filter = Builders<BsonDocument>.Filter.And(
            Builders<BsonDocument>.Filter.Eq("_id", ObjectId.TryParse(userId, out var oid) ? (object)oid : userId),
            Builders<BsonDocument>.Filter.Ne("isDeleted", true)
        );

        var projection = Builders<BsonDocument>.Projection
            .Include("isActive").Include("currentCompanyId").Include("personalCompanyId");

        var userDoc = await collection.Find(filter).Project(projection).FirstOrDefaultAsync();

        if (userDoc == null || !userDoc.GetValue("isActive", false).AsBoolean) return null;

        // 获取 ID 的辅助方法
        string? GetId(string field)
        {
            var val = userDoc.GetValue(field, BsonNull.Value);
            return val switch
            {
                { IsString: true } => val.AsString,
                { IsObjectId: true } => val.AsObjectId.ToString(),
                _ => null
            };
        }

        return GetId("currentCompanyId") ?? GetId("personalCompanyId");
    }
}
