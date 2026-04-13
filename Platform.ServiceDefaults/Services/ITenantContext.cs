using Microsoft.AspNetCore.Http;
using MongoDB.Driver;

namespace Platform.ServiceDefaults.Services;

public interface ITenantContext
{
    string? GetCurrentUserId();
    Task<string?> GetCurrentCompanyIdAsync();
}

public class TenantContext(
    IHttpContextAccessor httpContextAccessor,
    IMongoDatabase database) : ITenantContext
{
    private string? _cachedCompanyId;

    private string? GetCachedUserId()
    {
        try
        {
            return httpContextAccessor.HttpContext?.Items["UserId"] as string;
        }
        catch (ObjectDisposedException)
        {
            return null;
        }
    }

    public string? GetCurrentUserId() => GetCachedUserId();

    public async Task<string?> GetCurrentCompanyIdAsync()
    {
        if (_cachedCompanyId != null) return _cachedCompanyId;

        var userId = GetCachedUserId();
        if (string.IsNullOrEmpty(userId)) return null;

        _cachedCompanyId = await LoadCompanyIdAsync(userId);
        return _cachedCompanyId;
    }

    private async Task<string?> LoadCompanyIdAsync(string userId)
    {
        var collection = database.GetCollection<MongoDB.Bson.BsonDocument>("AppUser");

        var filter = MongoDB.Driver.Builders<MongoDB.Bson.BsonDocument>.Filter.And(
            MongoDB.Driver.Builders<MongoDB.Bson.BsonDocument>.Filter.Eq("_id", MongoDB.Bson.ObjectId.TryParse(userId, out var oid) ? (object)oid : userId),
            MongoDB.Driver.Builders<MongoDB.Bson.BsonDocument>.Filter.Ne("IsDeleted", true)
        );

        var projection = MongoDB.Driver.Builders<MongoDB.Bson.BsonDocument>.Projection
            .Include("IsActive").Include("CurrentCompanyId").Include("PersonalCompanyId");

        var userDoc = await collection.Find(filter).Project(projection).FirstOrDefaultAsync();
        if (userDoc == null) return null;

        if (!userDoc.GetValue("IsActive", false).AsBoolean) return null;

        var currentCompanyId = userDoc.GetValue("CurrentCompanyId", MongoDB.Bson.BsonNull.Value);
        var personalCompanyId = userDoc.GetValue("PersonalCompanyId", MongoDB.Bson.BsonNull.Value);

        return currentCompanyId.AsString ?? (personalCompanyId.IsObjectId ? personalCompanyId.AsObjectId.ToString() : null);
    }
}
