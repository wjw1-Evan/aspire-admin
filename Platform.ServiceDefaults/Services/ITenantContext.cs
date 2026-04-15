using Microsoft.AspNetCore.Http;
using MongoDB.Driver;

namespace Platform.ServiceDefaults.Services;

public interface ITenantContext
{
    string? GetCurrentUserId();
    Task<string?> GetCurrentCompanyIdAsync();
}

public interface ITenantContextSetter
{
    void SetContext(string companyId, string? userId);
    string? GetCurrentCompanyId();  // 同步方法
}

public class TenantContext : ITenantContext, ITenantContextSetter
{
    private readonly IHttpContextAccessor _httpContextAccessor;
    private readonly IMongoDatabase _database;
    private string? _cachedCompanyId;
    private string? _overrideCompanyId;
    private string? _overrideUserId;
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

        try
        {
            return _httpContextAccessor.HttpContext?.Items["UserId"] as string;
        }
        catch (ObjectDisposedException)
        {
            return null;
        }
    }

    public async Task<string?> GetCurrentCompanyIdAsync()
    {
        if (_isOverridden) return _overrideCompanyId;

        if (_cachedCompanyId != null) return _cachedCompanyId;

        var userId = GetCurrentUserId();
        if (string.IsNullOrEmpty(userId)) return null;

        _cachedCompanyId = await LoadCompanyIdAsync(userId);
        return _cachedCompanyId;
    }

    public void SetContext(string companyId, string? userId)
    {
        _overrideCompanyId = companyId;
        _overrideUserId = userId;
        _isOverridden = true;
        _cachedCompanyId = null;  // 清除缓存
    }

    public string? GetCurrentCompanyId()
    {
        if (_isOverridden) return _overrideCompanyId;
        return _cachedCompanyId;
    }

    private async Task<string?> LoadCompanyIdAsync(string userId)
    {
        var collection = _database.GetCollection<MongoDB.Bson.BsonDocument>("AppUser");

        var filter = Builders<MongoDB.Bson.BsonDocument>.Filter.And(
            Builders<MongoDB.Bson.BsonDocument>.Filter.Eq("_id", MongoDB.Bson.ObjectId.TryParse(userId, out var oid) ? (object)oid : userId),
            Builders<MongoDB.Bson.BsonDocument>.Filter.Ne("IsDeleted", true)
        );

        var projection = Builders<MongoDB.Bson.BsonDocument>.Projection
            .Include("IsActive").Include("CurrentCompanyId").Include("PersonalCompanyId");

        var userDoc = await collection.Find(filter).Project(projection).FirstOrDefaultAsync();
        if (userDoc == null) return null;

        if (!userDoc.GetValue("IsActive", false).AsBoolean) return null;

        var currentCompanyId = userDoc.GetValue("CurrentCompanyId", MongoDB.Bson.BsonNull.Value);
        var personalCompanyId = userDoc.GetValue("PersonalCompanyId", MongoDB.Bson.BsonNull.Value);

        return currentCompanyId.AsString ?? (personalCompanyId.IsObjectId ? personalCompanyId.AsObjectId.ToString() : null);
    }
}