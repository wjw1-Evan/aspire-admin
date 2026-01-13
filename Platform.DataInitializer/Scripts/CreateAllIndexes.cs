using MongoDB.Bson;
using MongoDB.Driver;
using Platform.ServiceDefaults.Models;

namespace Platform.DataInitializer.Scripts;

/// <summary>
/// 统一的数据库索引创建脚本
/// 合并了所有索引创建逻辑，确保幂等性和并发安全
/// </summary>
public class CreateAllIndexes
{
    private readonly IMongoDatabase _database;
    private readonly ILogger<CreateAllIndexes> _logger;
    private const string CompanyIdFieldName = "companyId";
    private const string CreatedAtFieldName = "createdAt";

    /// <summary>
    /// 初始化索引创建器
    /// </summary>
    /// <param name="database">MongoDB 数据库实例</param>
    /// <param name="logger">日志记录器</param>
    public CreateAllIndexes(IMongoDatabase database, ILogger<CreateAllIndexes> logger)
    {
        _database = database;
        _logger = logger;
    }

    /// <summary>
    /// 执行所有索引创建
    /// </summary>
    public async Task ExecuteAsync()
    {
        _logger.LogInformation("========== 开始创建数据库索引 ==========");

        await CreateMenuIndexesAsync();
        await CreateCaptchaIndexesAsync();
        await CreateCaptchaImageIndexesAsync();
        await CreateAppUserIndexesAsync();
        await CreateChatIndexesAsync();
        await CreateFriendshipIndexesAsync();
        await CreateFriendRequestIndexesAsync();
        await CreateLocationBeaconIndexesAsync();
        await CreateRefreshTokenIndexesAsync();
        await CreateXiaokeConfigIndexesAsync();
        await CreateWorkflowIndexesAsync();
        await CreateCloudStorageIndexesAsync();

        _logger.LogInformation("========== 数据库索引创建完成 ==========");
    }

    /// <summary>
    /// 创建用户定位信标索引。
    /// </summary>
    private async Task CreateLocationBeaconIndexesAsync()
    {
        var collection = _database.GetCollection<BsonDocument>("userlocationbeacons");

        try
        {
           

            await CreateIndexAsync(collection,
                Builders<BsonDocument>.IndexKeys
                    .Ascending(CompanyIdFieldName)
                    .Ascending("userId"),
                new CreateIndexOptions
                {
                    Name = "idx_beacon_company_user",
                    Background = true
                },
                "userlocationbeacons.companyId + userId");

            await CreateIndexAsync(collection,
                Builders<BsonDocument>.IndexKeys
                    .Ascending(CompanyIdFieldName)
                    .Descending("lastSeenAt"),
                new CreateIndexOptions
                {
                    Name = "idx_beacon_company_lastSeenAt",
                    Background = true
                },
                "userlocationbeacons.companyId + lastSeenAt");

            await CreateIndexAsync(collection,
                Builders<BsonDocument>.IndexKeys.Ascending("lastSeenAt"),
                new CreateIndexOptions
                {
                    Name = "idx_beacon_lastSeenAt_ttl",
                    ExpireAfter = TimeSpan.FromHours(2),
                    Background = true
                },
                "userlocationbeacons.lastSeenAt (TTL)");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "创建用户定位信标索引失败");
        }
    }

    /// <summary>
    /// 创建 Menu 索引（菜单是全局资源，无 CompanyId）
    /// </summary>
    private async Task CreateMenuIndexesAsync()
    {
        var collection = _database.GetCollection<Menu>("menus");

        try
        {
            // Name 唯一索引（菜单名称全局唯一）
            await CreateIndexAsync(collection,
                Builders<Menu>.IndexKeys.Ascending(m => m.Name),
                new CreateIndexOptions { Unique = true, Name = "idx_name_unique" },
                "menus.name (全局唯一)");

            // ParentId + SortOrder 复合索引
            await CreateIndexAsync(collection,
                Builders<Menu>.IndexKeys
                    .Ascending(m => m.ParentId)
                    .Ascending(m => m.SortOrder),
                new CreateIndexOptions { Name = "idx_parentId_sortOrder" },
                "menus.parentId + sortOrder");

            // IsDeleted + IsEnabled 复合索引
            await CreateIndexAsync(collection,
                Builders<Menu>.IndexKeys
                    .Ascending(m => m.IsDeleted)
                    .Ascending(m => m.IsEnabled),
                new CreateIndexOptions { Name = "idx_isDeleted_isEnabled" },
                "menus.isDeleted + isEnabled");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "创建 Menu 索引失败");
        }
    }

    /// <summary>
    /// 创建 Captcha 索引（验证码是全局资源，无 CompanyId）
    /// </summary>
    private async Task CreateCaptchaIndexesAsync()
    {
        var collection = _database.GetCollection<BsonDocument>("captchas");

        try
        {
            // TTL 索引 - 自动删除过期验证码
            await CreateIndexAsync(collection,
                Builders<BsonDocument>.IndexKeys.Ascending("expiresAt"),
                new CreateIndexOptions 
                { 
                    Name = "captcha_ttl",
                    ExpireAfter = TimeSpan.Zero,
                    Background = true
                },
                "captchas.expiresAt (TTL)");

            // 手机号索引 - 用于快速查询
            await CreateIndexAsync(collection,
                Builders<BsonDocument>.IndexKeys.Ascending("phone"),
                new CreateIndexOptions 
                { 
                    Name = "captcha_phone",
                    Background = true
                },
                "captchas.phone");

            _logger.LogInformation("✅ Captchas 集合索引创建完成");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "创建 Captcha 索引失败");
        }
    }

    /// <summary>
    /// 创建 CaptchaImage 索引（图形验证码是全局资源，无 CompanyId）
    /// </summary>
    private async Task CreateCaptchaImageIndexesAsync()
    {
        var collection = _database.GetCollection<BsonDocument>("captcha_images");

        try
        {
            // TTL 索引 - 自动删除过期验证码
            await CreateIndexAsync(collection,
                Builders<BsonDocument>.IndexKeys.Ascending("expiresAt"),
                new CreateIndexOptions 
                { 
                    Name = "captcha_image_ttl",
                    ExpireAfter = TimeSpan.Zero,
                    Background = true
                },
                "captcha_images.expiresAt (TTL)");

            // 验证码ID索引 - 用于快速查询
            await CreateIndexAsync(collection,
                Builders<BsonDocument>.IndexKeys.Ascending("captchaId"),
                new CreateIndexOptions 
                { 
                    Name = "captcha_image_id",
                    Background = true
                },
                "captcha_images.captchaId");

            // 客户端IP + 类型索引 - 用于防刷
            await CreateIndexAsync(collection,
                Builders<BsonDocument>.IndexKeys
                    .Ascending("clientIp")
                    .Ascending("type"),
                new CreateIndexOptions 
                { 
                    Name = "captcha_image_ip_type",
                    Background = true
                },
                "captcha_images.clientIp + type");

            _logger.LogInformation("✅ CaptchaImages 集合索引创建完成");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "创建 CaptchaImage 索引失败");
        }
    }

    /// <summary>
    /// 创建 AppUser 索引
    /// </summary>
    private async Task CreateAppUserIndexesAsync()
    {
        var collection = _database.GetCollection<BsonDocument>("appusers");

        try
        {
            // 清理现有的 phone: null 记录，将它们改为字段不存在（因为使用了 BsonIgnoreIfNull）
            // 这样可以避免稀疏唯一索引的冲突
            var nullPhoneFilter = Builders<BsonDocument>.Filter.Eq("phone", BsonNull.Value);
            var unsetPhoneUpdate = Builders<BsonDocument>.Update.Unset("phone");
            var nullPhoneResult = await collection.UpdateManyAsync(nullPhoneFilter, unsetPhoneUpdate);
            if (nullPhoneResult.ModifiedCount > 0)
            {
                _logger.LogInformation("✅ 清理了 {Count} 条 phone 字段为 null 的记录", nullPhoneResult.ModifiedCount);
            }
            
            // 删除可能存在的旧索引（如果存在）
            try
            {
                await collection.Indexes.DropOneAsync("idx_appusers_phone_unique");
                _logger.LogInformation("✅ 删除旧索引: idx_appusers_phone_unique");
            }
            catch
            {
                // 索引不存在，忽略错误
            }
            
            // 创建稀疏唯一索引：只索引非空值，字段不存在或为 null 的文档不会被索引
            await CreateIndexAsync(collection,
                Builders<BsonDocument>.IndexKeys.Ascending("phone"),
                new CreateIndexOptions
                {
                    Name = "idx_appusers_phone_unique",
                    Unique = true,
                    Sparse = true  // 稀疏索引：只索引字段存在且非 null 的文档
                },
                "appusers.phone (唯一，稀疏索引，忽略 null 值)");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "创建 AppUser 索引失败");
        }
    }

    /// <summary>
    /// 创建聊天相关索引
    /// </summary>
    private async Task CreateChatIndexesAsync()
    {
        var sessions = _database.GetCollection<BsonDocument>("chatsessions");
        var messages = _database.GetCollection<BsonDocument>("chatmessages");

        try
        {
            await CreateIndexAsync(sessions,
                Builders<BsonDocument>.IndexKeys
                    .Ascending(CompanyIdFieldName)
                    .Descending("updatedAt"),
                new CreateIndexOptions
                {
                    Name = "idx_chat_sessions_company_updatedAt"
                },
                "chatsessions.companyId + updatedAt");

            await CreateIndexAsync(sessions,
                Builders<BsonDocument>.IndexKeys
                    .Ascending(CompanyIdFieldName)
                    .Ascending("participants"),
                new CreateIndexOptions
                {
                    Name = "idx_chat_sessions_company_participants"
                },
                "chatsessions.companyId + participants");

            await CreateIndexAsync(messages,
                Builders<BsonDocument>.IndexKeys
                    .Ascending(CompanyIdFieldName)
                    .Ascending("sessionId")
                    .Descending(CreatedAtFieldName),
                new CreateIndexOptions
                {
                    Name = "idx_chat_messages_company_session_createdAt"
                },
                "chatmessages.companyId + sessionId + createdAt");

            await CreateIndexAsync(messages,
                Builders<BsonDocument>.IndexKeys
                    .Ascending(CompanyIdFieldName)
                    .Ascending("senderId")
                    .Descending(CreatedAtFieldName),
                new CreateIndexOptions
                {
                    Name = "idx_chat_messages_company_sender_createdAt"
                },
                "chatmessages.companyId + senderId + createdAt");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "创建聊天索引失败");
        }
    }

    /// <summary>
    /// 创建好友关系索引
    /// </summary>
    private async Task CreateFriendshipIndexesAsync()
    {
        var collection = _database.GetCollection<BsonDocument>("friendships");

        try
        {
            await CreateIndexAsync(collection,
                Builders<BsonDocument>.IndexKeys
                    .Ascending("userId")
                    .Ascending("friendUserId"),
                new CreateIndexOptions
                {
                    Name = "idx_friendships_user_friend",
                    Unique = true
                },
                "friendships.userId + friendUserId (唯一)");

            await CreateIndexAsync(collection,
                Builders<BsonDocument>.IndexKeys
                    .Ascending("userId")
                    .Descending(CreatedAtFieldName),
                new CreateIndexOptions
                {
                    Name = "idx_friendships_user_createdAt"
                },
                "friendships.userId + createdAt");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "创建好友关系索引失败");
        }
    }

    /// <summary>
    /// 创建好友请求索引
    /// </summary>
    private async Task CreateFriendRequestIndexesAsync()
    {
        var collection = _database.GetCollection<BsonDocument>("friendrequests");

        try
        {
            await CreateIndexAsync(collection,
                Builders<BsonDocument>.IndexKeys
                    .Ascending("requesterId")
                    .Ascending("targetUserId")
                    .Descending("status"),
                new CreateIndexOptions
                {
                    Name = "idx_friendrequests_pair_status"
                },
                "friendrequests.requesterId + targetUserId + status");

            await CreateIndexAsync(collection,
                Builders<BsonDocument>.IndexKeys
                    .Ascending("targetUserId")
                    .Ascending("status")
                    .Descending(CreatedAtFieldName),
                new CreateIndexOptions
                {
                    Name = "idx_friendrequests_target_status"
                },
                "friendrequests.targetUserId + status");

            await CreateIndexAsync(collection,
                Builders<BsonDocument>.IndexKeys
                    .Ascending("requesterId")
                    .Ascending("status")
                    .Descending(CreatedAtFieldName),
                new CreateIndexOptions
                {
                    Name = "idx_friendrequests_requester_status"
                },
                "friendrequests.requesterId + status");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "创建好友请求索引失败");
        }
    }

    /// <summary>
    /// 创建刷新 Token 索引（RefreshToken 是全局资源，无 CompanyId）
    /// </summary>
    private async Task CreateRefreshTokenIndexesAsync()
    {
        var collection = _database.GetCollection<BsonDocument>("refreshtokens");

        try
        {
            // Token 唯一索引（用于快速查找和验证）
            await CreateIndexAsync(collection,
                Builders<BsonDocument>.IndexKeys.Ascending("token"),
                new CreateIndexOptions
                {
                    Name = "idx_refreshtokens_token_unique",
                    Unique = true,
                    Background = true
                },
                "refreshtokens.token (唯一)");

            // UserId 索引（用于查询用户的所有token）
            await CreateIndexAsync(collection,
                Builders<BsonDocument>.IndexKeys.Ascending("userId"),
                new CreateIndexOptions
                {
                    Name = "idx_refreshtokens_userId",
                    Background = true
                },
                "refreshtokens.userId");

            // IsRevoked + ExpiresAt 复合索引（用于查询有效token）
            await CreateIndexAsync(collection,
                Builders<BsonDocument>.IndexKeys
                    .Ascending("isRevoked")
                    .Ascending("expiresAt"),
                new CreateIndexOptions
                {
                    Name = "idx_refreshtokens_isRevoked_expiresAt",
                    Background = true
                },
                "refreshtokens.isRevoked + expiresAt");

            // ExpiresAt TTL 索引（自动删除过期记录）
            await CreateIndexAsync(collection,
                Builders<BsonDocument>.IndexKeys.Ascending("expiresAt"),
                new CreateIndexOptions
                {
                    Name = "idx_refreshtokens_expiresAt_ttl",
                    ExpireAfter = TimeSpan.Zero,
                    Background = true
                },
                "refreshtokens.expiresAt (TTL)");

            _logger.LogInformation("✅ RefreshTokens 集合索引创建完成");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "创建 RefreshToken 索引失败");
        }
    }

    /// <summary>
    /// 创建 XiaokeConfig 索引（小科配置是多租户实体）
    /// </summary>
    private async Task CreateXiaokeConfigIndexesAsync()
    {
        var collection = _database.GetCollection<BsonDocument>("xiaokeConfigs");

        try
        {
            // CompanyId + IsDeleted 复合索引（用于查询未删除的配置）
            await CreateIndexAsync(collection,
                Builders<BsonDocument>.IndexKeys
                    .Ascending(CompanyIdFieldName)
                    .Ascending("isDeleted"),
                new CreateIndexOptions
                {
                    Name = "idx_xiaoke_config_company_isDeleted",
                    Background = true
                },
                "xiaokeConfigs.companyId + isDeleted");

            // CompanyId + IsDefault 复合索引（用于快速查找默认配置）
            await CreateIndexAsync(collection,
                Builders<BsonDocument>.IndexKeys
                    .Ascending(CompanyIdFieldName)
                    .Ascending("isDefault"),
                new CreateIndexOptions
                {
                    Name = "idx_xiaoke_config_company_isDefault",
                    Background = true
                },
                "xiaokeConfigs.companyId + isDefault");

            // CompanyId + UpdatedAt 复合索引（用于排序）
            await CreateIndexAsync(collection,
                Builders<BsonDocument>.IndexKeys
                    .Ascending(CompanyIdFieldName)
                    .Descending("updatedAt"),
                new CreateIndexOptions
                {
                    Name = "idx_xiaoke_config_company_updatedAt",
                    Background = true
                },
                "xiaokeConfigs.companyId + updatedAt");

            _logger.LogInformation("✅ XiaokeConfigs 集合索引创建完成");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "创建 XiaokeConfig 索引失败");
        }
    }

    /// <summary>
    /// 创建工作流相关索引
    /// </summary>
    private async Task CreateWorkflowIndexesAsync()
    {
        var collection = _database.GetCollection<BsonDocument>("workflowinstances");

        try
        {
            // 待办查询优化索引：CompanyId + Status + CurrentApproverIds
            await CreateIndexAsync(collection,
                Builders<BsonDocument>.IndexKeys
                    .Ascending(CompanyIdFieldName)
                    .Ascending("status")
                    .Ascending("currentApproverIds")
                    .Descending(CreatedAtFieldName),
                new CreateIndexOptions
                {
                    Name = "idx_workflow_todo_lookup",
                    Background = true
                },
                "workflowinstances.companyId + status + currentApproverIds + createdAt");

            // 按公文查询实例
            await CreateIndexAsync(collection,
                Builders<BsonDocument>.IndexKeys
                    .Ascending(CompanyIdFieldName)
                    .Ascending("documentId"),
                new CreateIndexOptions
                {
                    Name = "idx_workflow_documentId",
                    Background = true
                },
                "workflowinstances.companyId + documentId");

            _logger.LogInformation("✅ WorkflowInstances 集合索引创建完成");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "创建 Workflow 索引失败");
        }
    }

    private async Task CreateIndexAsync<T>(
        IMongoCollection<T> collection,
        IndexKeysDefinition<T> keys,
        CreateIndexOptions options,
        string description)
    {
        try
        {
            await collection.Indexes.CreateOneAsync(new CreateIndexModel<T>(keys, options));
            _logger.LogInformation("✅ 创建索引: {Description}", description);
        }
        catch (MongoCommandException ex) when (ex.CodeName == "IndexOptionsConflict" || 
                                               ex.CodeName == "IndexKeySpecsConflict" || 
                                               ex.Code == 85)
        {
            _logger.LogDebug(ex, "⚠️  索引已存在: {Description}", description);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "创建索引失败: {Description}", description);
        }
    }

    /// <summary>
    /// 创建网盘管理相关索引
    /// </summary>
    private async Task CreateCloudStorageIndexesAsync()
    {
        var fileItems = _database.GetCollection<BsonDocument>("file_items");
        var quotas = _database.GetCollection<BsonDocument>("storage_quotas");
        var versions = _database.GetCollection<BsonDocument>("file_versions");

        try
        {
            // 1. FileItems 索引
            // 路径 + 租户 复合索引 (用于快速查找和列表)
            await CreateIndexAsync(fileItems,
                Builders<BsonDocument>.IndexKeys
                    .Ascending(CompanyIdFieldName)
                    .Ascending("parentId")
                    .Ascending("status")
                    .Ascending("type"),
                new CreateIndexOptions { Name = "idx_file_parent_status_type" },
                "file_items.companyId + parentId + status + type");

            // Hash 索引 (用于全库秒传/去重)
            await CreateIndexAsync(fileItems,
                Builders<BsonDocument>.IndexKeys
                    .Ascending(CompanyIdFieldName)
                    .Ascending("hash")
                    .Ascending("status"),
                new CreateIndexOptions { Name = "idx_file_hash" },
                "file_items.companyId + hash");

            // Path 前缀索引 (用于递归路径更新和搜索)
            await CreateIndexAsync(fileItems,
                Builders<BsonDocument>.IndexKeys.Ascending("path"),
                new CreateIndexOptions { Name = "idx_file_path" },
                "file_items.path");

            // 2. StorageQuotas 索引
            await CreateIndexAsync(quotas,
                Builders<BsonDocument>.IndexKeys
                    .Ascending(CompanyIdFieldName)
                    .Ascending("userId"),
                new CreateIndexOptions { Name = "idx_quota_user", Unique = true },
                "storage_quotas.companyId + userId (唯一)");

            // 3. FileVersions 索引
            await CreateIndexAsync(versions,
                Builders<BsonDocument>.IndexKeys
                    .Ascending(CompanyIdFieldName)
                    .Ascending("fileItemId")
                    .Descending("versionNumber"),
                new CreateIndexOptions { Name = "idx_version_lookup" },
                "file_versions.companyId + fileItemId + versionNumber");

            _logger.LogInformation("✅ Cloud Storage 集合索引创建完成");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "创建网盘索引失败");
        }
    }

    /// <summary>
    /// 静态执行方法（用于向后兼容）
    /// </summary>
    public static async Task ExecuteAsync(IMongoDatabase database, ILogger<CreateAllIndexes> logger)
    {
        var creator = new CreateAllIndexes(database, logger);
        await creator.ExecuteAsync();
    }
}