using MongoDB.Driver;
using Platform.ApiService.Models;

namespace Platform.ApiService.Extensions;

/// <summary>
/// MongoDB 过滤器扩展方法
/// </summary>
public static class MongoFilterExtensions
{
    /// <summary>
    /// 创建未删除记录的过滤器
    /// </summary>
    /// <typeparam name="T">实体类型，必须实现 ISoftDeletable 接口</typeparam>
    /// <returns>未删除记录的过滤器</returns>
    public static FilterDefinition<T> NotDeleted<T>() where T : ISoftDeletable
    {
        return Builders<T>.Filter.Eq(x => x.IsDeleted, false);
    }

    /// <summary>
    /// 创建根据ID查找且未删除的过滤器
    /// </summary>
    /// <typeparam name="T">实体类型，必须实现 ISoftDeletable 和 IEntity 接口</typeparam>
    /// <param name="id">实体ID</param>
    /// <returns>根据ID查找且未删除的过滤器</returns>
    public static FilterDefinition<T> ByIdAndNotDeleted<T>(string id) where T : ISoftDeletable, IEntity
    {
        var builder = Builders<T>.Filter;
        return builder.And(
            builder.Eq(x => x.Id, id),
            builder.Eq(x => x.IsDeleted, false)
        );
    }

    /// <summary>
    /// 为现有过滤器添加未删除条件
    /// </summary>
    /// <typeparam name="T">实体类型，必须实现 ISoftDeletable 接口</typeparam>
    /// <param name="filter">现有过滤器</param>
    /// <returns>添加了未删除条件的过滤器</returns>
    public static FilterDefinition<T> AndNotDeleted<T>(this FilterDefinition<T> filter) where T : ISoftDeletable
    {
        return Builders<T>.Filter.And(filter, Builders<T>.Filter.Eq(x => x.IsDeleted, false));
    }

    /// <summary>
    /// 创建根据多个ID查找且未删除的过滤器
    /// </summary>
    /// <typeparam name="T">实体类型，必须实现 ISoftDeletable 和 IEntity 接口</typeparam>
    /// <param name="ids">实体ID列表</param>
    /// <returns>根据多个ID查找且未删除的过滤器</returns>
    public static FilterDefinition<T> ByIdsAndNotDeleted<T>(IEnumerable<string> ids) where T : ISoftDeletable, IEntity
    {
        var builder = Builders<T>.Filter;
        return builder.And(
            builder.In(x => x.Id, ids),
            builder.Eq(x => x.IsDeleted, false)
        );
    }

    /// <summary>
    /// 创建根据用户名查找且未删除的过滤器
    /// </summary>
    /// <param name="username">用户名</param>
    /// <returns>根据用户名查找且未删除的过滤器</returns>
    public static FilterDefinition<AppUser> ByUsernameAndNotDeleted(string username)
    {
        var builder = Builders<AppUser>.Filter;
        return builder.And(
            builder.Eq(x => x.Username, username),
            builder.Eq(x => x.IsDeleted, false)
        );
    }

    /// <summary>
    /// 创建根据邮箱查找且未删除的过滤器
    /// </summary>
    /// <param name="email">邮箱</param>
    /// <returns>根据邮箱查找且未删除的过滤器</returns>
    public static FilterDefinition<AppUser> ByEmailAndNotDeleted(string email)
    {
        var builder = Builders<AppUser>.Filter;
        return builder.And(
            builder.Eq(x => x.Email, email),
            builder.Eq(x => x.IsDeleted, false)
        );
    }

    /// <summary>
    /// 创建根据角色查找且未删除的过滤器
    /// </summary>
    /// <param name="roleId">角色ID</param>
    /// <returns>根据角色查找且未删除的过滤器</returns>
    public static FilterDefinition<AppUser> ByRoleAndNotDeleted(string roleId)
    {
        var builder = Builders<AppUser>.Filter;
        return builder.And(
            builder.AnyEq(x => x.RoleIds, roleId),
            builder.Eq(x => x.IsDeleted, false)
        );
    }

    /// <summary>
    /// 创建文本搜索且未删除的过滤器
    /// </summary>
    /// <typeparam name="T">实体类型，必须实现 ISoftDeletable 接口</typeparam>
    /// <param name="searchText">搜索文本</param>
    /// <returns>文本搜索且未删除的过滤器</returns>
    public static FilterDefinition<T> TextSearchAndNotDeleted<T>(string searchText) where T : ISoftDeletable
    {
        var builder = Builders<T>.Filter;
        return builder.And(
            builder.Text(searchText),
            builder.Eq(x => x.IsDeleted, false)
        );
    }

    /// <summary>
    /// 创建根据名称模糊查找且未删除的过滤器（适用于Menu、Role等）
    /// </summary>
    /// <typeparam name="T">实体类型，必须实现 ISoftDeletable 和 INamedEntity 接口</typeparam>
    /// <param name="name">名称关键词</param>
    /// <returns>根据名称模糊查找且未删除的过滤器</returns>
    public static FilterDefinition<T> ByNameContainsAndNotDeleted<T>(string name) where T : ISoftDeletable, INamedEntity
    {
        var builder = Builders<T>.Filter;
        return builder.And(
            builder.Regex(x => x.Name, new MongoDB.Bson.BsonRegularExpression(name, "i")),
            builder.Eq(x => x.IsDeleted, false)
        );
    }
}
