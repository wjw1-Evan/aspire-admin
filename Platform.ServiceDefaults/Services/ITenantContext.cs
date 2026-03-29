using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Logging;
using MongoDB.Driver;
using System.Collections.Concurrent;

namespace Platform.ServiceDefaults.Services;

public interface ITenantContext
{
    string? GetCurrentUserId();
    Task<string?> GetCurrentCompanyIdAsync();
    bool IsSystemContext { get; }
    void ClearUserCache(string userId);
}

internal class TenantCache
{
    public string? CompanyId { get; set; }
    public bool CompanyLoaded { get; set; }
}

public class TenantContext(
    IHttpContextAccessor httpContextAccessor,
    IMongoDatabase database,
    ILogger<TenantContext> logger) : ITenantContext
{
    private static readonly ConcurrentDictionary<string, TenantCache> _caches = new();
    private static readonly ConcurrentDictionary<string, SemaphoreSlim> _userLocks = new();

    public bool IsSystemContext => httpContextAccessor.HttpContext == null;

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

    public string? GetCurrentUserId()
    {
        return GetCachedUserId();
    }

    public async Task<string?> GetCurrentCompanyIdAsync()
    {
        var userId = GetCachedUserId();
        if (string.IsNullOrEmpty(userId))
        {
            logger.LogWarning("【TenantContext】GetCurrentCompanyIdAsync: userId is null or empty");
            return null;
        }

        logger.LogInformation("【TenantContext】GetCurrentCompanyIdAsync: userId = {UserId}", userId);

        if (!_caches.TryGetValue(userId, out var cache))
        {
            cache = new TenantCache();
            _caches.TryAdd(userId, cache);
        }

        if (cache.CompanyLoaded) 
        {
            logger.LogInformation("【TenantContext】GetCurrentCompanyIdAsync: cache hit, companyId = {CompanyId}", cache.CompanyId);
            return cache.CompanyId;
        }

        var userLock = _userLocks.GetOrAdd(userId, _ => new SemaphoreSlim(1, 1));
        await userLock.WaitAsync();
        try
        {
            if (cache.CompanyLoaded)
            {
                logger.LogInformation("【TenantContext】GetCurrentCompanyIdAsync: cache hit after lock, companyId = {CompanyId}", cache.CompanyId);
                return cache.CompanyId;
            }

            cache.CompanyId = await LoadCompanyIdAsync(userId);
            
            if (cache.CompanyId != null)
            {
                cache.CompanyLoaded = true;
                logger.LogInformation("【TenantContext】GetCurrentCompanyIdAsync: loaded companyId = {CompanyId}", cache.CompanyId);
            }
            else
            {
                logger.LogWarning("【TenantContext】GetCurrentCompanyIdAsync: companyId is null, will retry on next request");
            }
        }
        finally
        {
            userLock.Release();
            _userLocks.TryRemove(userId, out _);
        }
        
        return cache.CompanyId;
    }

    public void ClearUserCache(string userId)
    {
        _caches.TryRemove(userId, out _);
    }

    private async Task<string?> LoadCompanyIdAsync(string userId)
    {
        var collection = database.GetCollection<MongoDB.Bson.BsonDocument>("appusers");

        var filter = MongoDB.Driver.Builders<MongoDB.Bson.BsonDocument>.Filter.And(
            MongoDB.Driver.Builders<MongoDB.Bson.BsonDocument>.Filter.Eq("_id", MongoDB.Bson.ObjectId.TryParse(userId, out var oid) ? (object)oid : userId),
            MongoDB.Driver.Builders<MongoDB.Bson.BsonDocument>.Filter.Ne("isDeleted", true)
        );

        var projection = MongoDB.Driver.Builders<MongoDB.Bson.BsonDocument>.Projection
            .Include("isActive").Include("currentCompanyId").Include("personalCompanyId");

        var userDoc = await collection.Find(filter).Project(projection).FirstOrDefaultAsync();

        if (userDoc == null)
        {
            logger.LogWarning("【TenantContext】LoadCompanyIdAsync: user not found, userId = {UserId}, parsed as ObjectId: {IsObjectId}", 
                userId, 
                MongoDB.Bson.ObjectId.TryParse(userId, out _));
            return null;
        }

        if (!userDoc.GetValue("isActive", false).AsBoolean)
        {
            logger.LogWarning("【TenantContext】LoadCompanyIdAsync: user is not active, userId = {UserId}", userId);
            return null;
        }

        string? GetId(string field)
        {
            var val = userDoc.GetValue(field, MongoDB.Bson.BsonNull.Value);
            return val switch
            {
                { IsString: true } => val.AsString,
                { IsObjectId: true } => val.AsObjectId.ToString(),
                _ => null
            };
        }

        var currentCompanyId = GetId("currentCompanyId");
        var personalCompanyId = GetId("personalCompanyId");
        
        logger.LogInformation("【TenantContext】LoadCompanyIdAsync: currentCompanyId = {CurrentCompanyId}, personalCompanyId = {PersonalCompanyId}", 
            currentCompanyId, personalCompanyId);

        return currentCompanyId ?? personalCompanyId;
    }
}
