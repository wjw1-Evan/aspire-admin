using MongoDB.Driver;
using Platform.ApiService.Models;

namespace Platform.ApiService.Scripts;

/// <summary>
/// 将通知的 type 字段从数字迁移为字符串
/// 0 -> "Notification"
/// 1 -> "Message"
/// 2 -> "Event"
/// </summary>
public static class MigrateNoticeTypeToString
{
    public static async Task ExecuteAsync(IMongoDatabase database)
    {
        var collection = database.GetCollection<MongoDB.Bson.BsonDocument>("notices");
        
        // 查找所有 type 是数字的文档
        var filter = MongoDB.Bson.BsonDocument.Parse("{ \"type\": { \"$type\": \"number\" } }");
        var notices = await collection.Find(filter).ToListAsync();
        
        if (notices.Count == 0)
        {
            Console.WriteLine("[MigrateNoticeType] 没有需要迁移的通知数据");
            return;
        }
        
        Console.WriteLine($"[MigrateNoticeType] 找到 {notices.Count} 条需要迁移的通知");
        
        foreach (var notice in notices)
        {
            var id = notice["_id"];
            var typeValue = notice["type"].AsInt32;
            
            string typeString = typeValue switch
            {
                0 => "Notification",
                1 => "Message",
                2 => "Event",
                _ => "Notification"
            };
            
            var update = Builders<MongoDB.Bson.BsonDocument>.Update.Set("type", typeString);
            await collection.UpdateOneAsync(
                Builders<MongoDB.Bson.BsonDocument>.Filter.Eq("_id", id),
                update
            );
            
            Console.WriteLine($"[MigrateNoticeType] 更新通知 {id}: {typeValue} -> {typeString}");
        }
        
        Console.WriteLine($"[MigrateNoticeType] 完成迁移 {notices.Count} 条通知");
    }
}

