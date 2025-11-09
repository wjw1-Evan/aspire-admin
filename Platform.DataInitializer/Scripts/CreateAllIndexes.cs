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
            await DropIndexIfExistsAsync(collection, "idx_beacon_company_user", "userlocationbeacons.companyId + userId (移除唯一约束)");

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
            await CreateIndexAsync(collection,
                Builders<BsonDocument>.IndexKeys.Ascending("phone"),
                new CreateIndexOptions
                {
                    Name = "idx_appusers_phone_unique",
                    Unique = true,
                    Sparse = true
                },
                "appusers.phone (唯一，忽略空值)");
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

    private async Task DropIndexIfExistsAsync<T>(
        IMongoCollection<T> collection,
        string indexName,
        string description)
    {
        try
        {
            await collection.Indexes.DropOneAsync(indexName);
            _logger.LogInformation("删除索引: {Description}", description);
        }
        catch (MongoCommandException ex) when (ex.CodeName == "IndexNotFound")
        {
            _logger.LogDebug(ex, "索引不存在，无需删除: {Description}", description);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "删除索引失败: {Description}", description);
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
    /// 静态执行方法（用于向后兼容）
    /// </summary>
    public static async Task ExecuteAsync(IMongoDatabase database, ILogger<CreateAllIndexes> logger)
    {
        var creator = new CreateAllIndexes(database, logger);
        await creator.ExecuteAsync();
    }
}