using MongoDB.Driver;
using Platform.ApiService.Models;
using Platform.ServiceDefaults.Models;

namespace Platform.ApiService.Services;

/// <summary>
/// 软删除扩展方法
/// </summary>
public static class SoftDeleteExtensions
{
    /// <summary>
    /// 构建排除已删除数据的过滤器
    /// </summary>
    public static FilterDefinition<T> WithSoftDeleteFilter<T>(this FilterDefinition<T> filter) where T : Platform.ServiceDefaults.Models.ISoftDeletable
    {
        var notDeletedFilter = Builders<T>.Filter.Eq(x => x.IsDeleted, false);
        return Builders<T>.Filter.And(filter, notDeletedFilter);
    }

    /// <summary>
    /// 创建排除已删除数据的过滤器
    /// </summary>
    public static FilterDefinition<T> NotDeleted<T>() where T : Platform.ServiceDefaults.Models.ISoftDeletable
    {
        return Builders<T>.Filter.Eq(x => x.IsDeleted, false);
    }

    /// <summary>
    /// 构建软删除更新定义
    /// </summary>
    public static UpdateDefinition<T> ApplySoftDelete<T>(
        string? deletedBy = null, 
        string? reason = null) where T : Platform.ServiceDefaults.Models.ISoftDeletable
    {
        var updateBuilder = Builders<T>.Update;
        return updateBuilder.Set(x => x.IsDeleted, true);
    }

    /// <summary>
    /// 软删除单个实体
    /// </summary>
    public static async Task<bool> SoftDeleteOneAsync<T>(
        this IMongoCollection<T> collection,
        FilterDefinition<T> filter,
        string? deletedBy = null,
        string? reason = null) where T : Platform.ServiceDefaults.Models.ISoftDeletable
    {
        var update = ApplySoftDelete<T>(deletedBy, reason);
        var result = await collection.UpdateOneAsync(filter, update);
        return result.ModifiedCount > 0;
    }

    /// <summary>
    /// 软删除多个实体
    /// </summary>
    public static async Task<long> SoftDeleteManyAsync<T>(
        this IMongoCollection<T> collection,
        FilterDefinition<T> filter,
        string? deletedBy = null,
        string? reason = null) where T : Platform.ServiceDefaults.Models.ISoftDeletable
    {
        var update = ApplySoftDelete<T>(deletedBy, reason);
        var result = await collection.UpdateManyAsync(filter, update);
        return result.ModifiedCount;
    }

    /// <summary>
    /// 根据ID软删除
    /// </summary>
    public static async Task<bool> SoftDeleteByIdAsync<T>(
        this IMongoCollection<T> collection,
        string id,
        string? deletedBy = null,
        string? reason = null) where T : Platform.ServiceDefaults.Models.ISoftDeletable
    {
        var filter = Builders<T>.Filter.Eq("_id", MongoDB.Bson.ObjectId.Parse(id));
        return await collection.SoftDeleteOneAsync(filter, deletedBy, reason);
    }
}



