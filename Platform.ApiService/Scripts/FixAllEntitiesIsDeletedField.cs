using MongoDB.Driver;
using Platform.ApiService.Models;

namespace Platform.ApiService.Scripts;

/// <summary>
/// 修复所有实体的 IsDeleted 字段
/// </summary>
public class FixAllEntitiesIsDeletedField
{
    private readonly IMongoDatabase _database;

    public FixAllEntitiesIsDeletedField(IMongoDatabase database)
    {
        _database = database;
    }

    public async Task FixAsync()
    {
        // 修复用户
        await FixCollectionAsync<AppUser>("users");

        // 修复菜单
        await FixCollectionAsync<Menu>("menus");

        // 修复角色
        await FixCollectionAsync<Role>("roles");

        // 修复用户活动日志
        await FixCollectionAsync<UserActivityLog>("user_activity_logs");

        // 修复通知
        await FixCollectionAsync<NoticeIconItem>("notices");

        // 修复标签
        await FixCollectionAsync<TagItem>("tags");

        // 修复规则
        await FixCollectionAsync<RuleListItem>("rules");

        // 修复权限
        await FixCollectionAsync<Permission>("permissions");
    }

    private async Task FixCollectionAsync<T>(string collectionName) where T : ISoftDeletable
    {
        var collection = _database.GetCollection<T>(collectionName);

        // 查找所有 IsDeleted 字段不存在或为 null 的记录
        var filter = Builders<T>.Filter.Or(
            Builders<T>.Filter.Exists("isDeleted", false),
            Builders<T>.Filter.Eq("isDeleted", MongoDB.Bson.BsonNull.Value)
        );

        var count = await collection.CountDocumentsAsync(filter);

        if (count == 0)
        {
            return;
        }

        // 批量更新
        var update = Builders<T>.Update.Set(x => x.IsDeleted, false);
        await collection.UpdateManyAsync(filter, update);
    }
}

