using MongoDB.Bson;
using MongoDB.Driver;
using Platform.ServiceDefaults.Models;

namespace Platform.DataInitializer.Scripts;

/// <summary>
/// 统一的数据库索引创建脚本 - 简化版
/// 通过通用方法减少冗余代码，保持核心索引逻辑
/// </summary>
public class CreateAllIndexes(IMongoDatabase database, ILogger<CreateAllIndexes> logger)
{
    private readonly IMongoDatabase _database = database;
    private readonly ILogger<CreateAllIndexes> _logger = logger;
    private const string CompanyId = "companyId";
    private const string CreatedAt = "createdAt";

    public async Task ExecuteAsync()
    {
        _logger.LogInformation("========== 开始创建数据库索引 ==========");

        // 基础集合
        await CreateSimpleIndex("menus", keys => keys.Ascending("name"), unique: true);
        await CreateSimpleIndex("menus", keys => keys.Ascending("parentId").Ascending("sortOrder"));
        
        await CreateSimpleIndex("captchas", keys => keys.Ascending("expiresAt"), ttl: TimeSpan.Zero);
        await CreateSimpleIndex("captchas", keys => keys.Ascending("phone"));
        
        await CreateSimpleIndex("captcha_images", keys => keys.Ascending("expiresAt"), ttl: TimeSpan.Zero);
        await CreateSimpleIndex("captcha_images", keys => keys.Ascending("captchaId"));
        await CreateSimpleIndex("captcha_images", keys => keys.Ascending("clientIp").Ascending("type"));

        // 用户与企业
        await CreateAppUserIndexes();
        await CreateSimpleIndex("companies", keys => keys.Ascending("code"), unique: true);
        await CreateSimpleIndex("companies", keys => keys.Ascending("name"));
        
        await CreateSimpleIndex("user_companies", keys => keys.Ascending("userId"));
        await CreateSimpleIndex("user_companies", keys => keys.Ascending(CompanyId));
        await CreateSimpleIndex("user_companies", keys => keys.Ascending("userId").Ascending(CompanyId), unique: true);

        // 组织与角色
        await CreateSimpleIndex("organization_units", keys => keys.Ascending(CompanyId));
        await CreateSimpleIndex("organization_units", keys => keys.Ascending("parentId"));
        await CreateSimpleIndex("organization_units", keys => keys.Ascending("code"), sparse: true);
        
        await CreateSimpleIndex("user_organizations", keys => keys.Ascending("userId"));
        await CreateSimpleIndex("user_organizations", keys => keys.Ascending("organizationUnitId"));
        
        await CreateSimpleIndex("roles", keys => keys.Ascending(CompanyId));
        await CreateSimpleIndex("roles", keys => keys.Ascending("name").Ascending(CompanyId));

        // 聊天与社交
        await CreateSimpleIndex("chatsessions", keys => keys.Ascending(CompanyId).Descending("updatedAt"));
        await CreateSimpleIndex("chatsessions", keys => keys.Ascending(CompanyId).Ascending("participants"));
        await CreateSimpleIndex("chatmessages", keys => keys.Ascending(CompanyId).Ascending("sessionId").Descending(CreatedAt));
        await CreateSimpleIndex("chatmessages", keys => keys.Ascending(CompanyId).Ascending("senderId").Descending(CreatedAt));
        await CreateSimpleIndex("chatattachments", keys => keys.Ascending("sessionId"));
        
        await CreateSimpleIndex("friendships", keys => keys.Ascending("userId").Ascending("friendUserId"), unique: true);
        await CreateSimpleIndex("friendrequests", keys => keys.Ascending("requesterId").Ascending("targetUserId").Descending("status"));
        
        await CreateSimpleIndex("refreshtokens", keys => keys.Ascending("token"), unique: true);
        await CreateSimpleIndex("refreshtokens", keys => keys.Ascending("expiresAt"), ttl: TimeSpan.Zero);

        // 业务模块
        await CreateSimpleIndex("documents", keys => keys.Ascending(CompanyId));
        await CreateSimpleIndex("documents", keys => keys.Ascending("status"));
        await CreateSimpleIndex("documents", keys => keys.Ascending("workflowInstanceId"));
        
        await CreateSimpleIndex("workflowinstances", keys => keys.Ascending(CompanyId).Ascending("status").Ascending("currentApproverIds").Descending(CreatedAt));
        await CreateSimpleIndex("workflow_templates", keys => keys.Ascending(CompanyId).Ascending("category"));
        
        await CreateSimpleIndex("file_items", keys => keys.Ascending(CompanyId).Ascending("parentId").Ascending("status"));
        await CreateSimpleIndex("file_items", keys => keys.Ascending("path"));
        await CreateSimpleIndex("storage_quotas", keys => keys.Ascending(CompanyId).Ascending("userId"), unique: true);

        await CreateSimpleIndex("useractivitylogs", keys => keys.Ascending("userId").Descending(CreatedAt));
        await CreateSimpleIndex("useractivitylogs", keys => keys.Ascending(CompanyId).Descending(CreatedAt));
        
        await CreateSimpleIndex("iotgateways", keys => keys.Ascending(CompanyId).Ascending("status"));
        await CreateSimpleIndex("iotdevices", keys => keys.Ascending(CompanyId).Ascending("gatewayId"));
        await CreateSimpleIndex("iotdatarecords", keys => keys.Ascending(CompanyId).Ascending("deviceId").Descending("reportedAt"));
        
        await CreateSimpleIndex("projects", keys => keys.Ascending(CompanyId).Ascending("status"));
        await CreateSimpleIndex("tasks", keys => keys.Ascending(CompanyId).Ascending("assignedTo").Ascending("status"));
        
        await CreateSimpleIndex("passwordBookEntries", keys => keys.Ascending(CompanyId).Ascending("userId").Ascending("category"));
        await CreateSimpleIndex("rulelistitems", keys => keys.Ascending(CompanyId).Ascending("key"));
        await CreateSimpleIndex("operationaudits", keys => keys.Ascending(CompanyId).Descending(CreatedAt));

        _logger.LogInformation("========== 数据库索引创建完成 ==========");
    }

    private async Task CreateAppUserIndexes()
    {
        var col = _database.GetCollection<BsonDocument>("appusers");
        // 清理 null 值以支持稀疏索引
        await col.UpdateManyAsync(Builders<BsonDocument>.Filter.Eq("phone", BsonNull.Value), Builders<BsonDocument>.Update.Unset("phone"));
        await col.UpdateManyAsync(Builders<BsonDocument>.Filter.Eq("email", BsonNull.Value), Builders<BsonDocument>.Update.Unset("email"));

        await CreateSimpleIndex("appusers", keys => keys.Ascending("username"), unique: true);
        await CreateSimpleIndex("appusers", keys => keys.Ascending("phone"), unique: true, sparse: true);
        await CreateSimpleIndex("appusers", keys => keys.Ascending("email"), unique: true, sparse: true);
        await CreateSimpleIndex("appusers", keys => keys.Ascending("currentCompanyId"));
    }

    private async Task CreateSimpleIndex(string collectionName, 
        Func<IndexKeysDefinitionBuilder<BsonDocument>, IndexKeysDefinition<BsonDocument>> keyBuilder,
        bool unique = false, bool sparse = false, TimeSpan? ttl = null)
    {
        try
        {
            var collection = _database.GetCollection<BsonDocument>(collectionName);
            var keys = keyBuilder(Builders<BsonDocument>.IndexKeys);
            var options = new CreateIndexOptions { Unique = unique, Sparse = sparse, Background = true };
            if (ttl.HasValue) options.ExpireAfter = ttl.Value;

            await collection.Indexes.CreateOneAsync(new CreateIndexModel<BsonDocument>(keys, options));
        }
        catch (MongoCommandException ex) when (ex.Code == 85 || ex.CodeName == "IndexOptionsConflict")
        {
            // 忽略已存在的索引
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "创建集合 {Collection} 索引失败", collectionName);
        }
    }

    public static async Task ExecuteAsync(IMongoDatabase database, ILogger<CreateAllIndexes> logger)
    {
        await new CreateAllIndexes(database, logger).ExecuteAsync();
    }
}
