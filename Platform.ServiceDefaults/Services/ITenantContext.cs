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

    // ── 核心加载逻辑（仅查 appusers 1 张表） ───────

    private async Task<string?> LoadCompanyIdAsync(string userId)
    {
        var userDoc = await FindOneAsync("appusers", IdFilter(userId),
            Builders<BsonDocument>.Projection
                .Include("isActive").Include("currentCompanyId").Include("personalCompanyId"));

        if (userDoc == null) { logger.LogWarning("未找到用户: {UserId}", userId); return null; }
        if (!userDoc.GetValue("isActive", false).AsBoolean) { logger.LogWarning("用户未激活: {UserId}", userId); return null; }

        // 优先 currentCompanyId → 回退 personalCompanyId
        return BsonId(userDoc, "currentCompanyId") ?? BsonId(userDoc, "personalCompanyId");
    }

    // ── 通用工具 ────────────────────────────────────

    /// <summary>兼容 string/ObjectId 的 _id 过滤器 + isDeleted != true</summary>
    private static FilterDefinition<BsonDocument> IdFilter(string id)
    {
        var f = Builders<BsonDocument>.Filter;
        var idMatch = ObjectId.TryParse(id, out var oid)
            ? f.Or(f.Eq("_id", id), f.Eq("_id", oid))
            : f.Eq("_id", id);
        return f.And(idMatch, f.Ne("isDeleted", true));
    }

    private async Task<BsonDocument?> FindOneAsync(string collection,
        FilterDefinition<BsonDocument> filter, ProjectionDefinition<BsonDocument>? projection = null)
    {
        var query = database.GetCollection<BsonDocument>(collection).Find(filter);
        if (projection != null) query = query.Project(projection);
        return await query.FirstOrDefaultAsync();
    }

    /// <summary>从 BsonDocument 安全提取 ID（兼容 string/ObjectId）</summary>
    private static string? BsonId(BsonDocument doc, string field)
    {
        var val = doc.GetValue(field, BsonNull.Value);
        return val switch
        {
            { IsString: true } when !string.IsNullOrWhiteSpace(val.AsString) => val.AsString,
            { IsObjectId: true } when val.AsObjectId != ObjectId.Empty => val.AsObjectId.ToString(),
            _ => null
        };
    }
}
