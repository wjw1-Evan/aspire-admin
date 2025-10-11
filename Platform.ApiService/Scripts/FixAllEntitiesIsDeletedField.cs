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
        Console.WriteLine("\n========================================");
        Console.WriteLine("开始修复所有实体的 IsDeleted 字段...");
        Console.WriteLine("========================================\n");

        int totalFixed = 0;

        // 修复用户
        totalFixed += await FixCollectionAsync<AppUser>("users", "用户");

        // 修复菜单
        totalFixed += await FixCollectionAsync<Menu>("menus", "菜单");

        // 修复角色
        totalFixed += await FixCollectionAsync<Role>("roles", "角色");

        // 修复用户活动日志
        totalFixed += await FixCollectionAsync<UserActivityLog>("user_activity_logs", "用户活动日志");

        // 修复通知
        totalFixed += await FixCollectionAsync<NoticeIconItem>("notices", "通知");

        // 修复标签
        totalFixed += await FixCollectionAsync<TagItem>("tags", "标签");

        // 修复规则
        totalFixed += await FixCollectionAsync<RuleListItem>("rules", "规则");

        Console.WriteLine("\n========================================");
        Console.WriteLine($"修复完成！共修复 {totalFixed} 条记录");
        Console.WriteLine("========================================\n");
    }

    private async Task<int> FixCollectionAsync<T>(string collectionName, string displayName) where T : ISoftDeletable
    {
        try
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
                Console.WriteLine($"✓ {displayName}: 所有记录的 IsDeleted 字段都已正确设置");
                return 0;
            }

            // 批量更新
            var update = Builders<T>.Update.Set(x => x.IsDeleted, false);
            var result = await collection.UpdateManyAsync(filter, update);

            Console.WriteLine($"✓ {displayName}: 修复了 {result.ModifiedCount} 条记录");
            return (int)result.ModifiedCount;
        }
        catch (Exception ex)
        {
            Console.WriteLine($"✗ {displayName}: 修复失败 - {ex.Message}");
            return 0;
        }
    }
}

