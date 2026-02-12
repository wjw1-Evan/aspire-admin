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
        await CreateUserActivityLogIndexesAsync();
        await CreateCompanyIndexesAsync();
        await CreateUserCompanyIndexesAsync();
        await CreateJoinRequestIndexesAsync();
        await CreateOrganizationIndexesAsync();
        await CreateRoleIndexesAsync();
        await CreateDocumentIndexesAsync();
        await CreateNoticeIndexesAsync();
        await CreateLoginFailureRecordIndexesAsync();
        await CreateProjectIndexesAsync();
        await CreateTaskIndexesAsync();
        await CreateFormIndexesAsync();
        await CreateIoTIndexesAsync();
        await CreatePasswordBookIndexesAsync();
        await CreateRuleIndexesAsync();
        await CreateOperationAuditIndexesAsync();

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

            // 清理现有的 email: null 记录，将它们改为字段不存在（因为使用了 BsonIgnoreIfNull）
            // 这样可以避免稀疏唯一索引的冲突
            var nullEmailFilter = Builders<BsonDocument>.Filter.Eq("email", BsonNull.Value);
            var unsetEmailUpdate = Builders<BsonDocument>.Update.Unset("email");
            var nullEmailResult = await collection.UpdateManyAsync(nullEmailFilter, unsetEmailUpdate);
            if (nullEmailResult.ModifiedCount > 0)
            {
                _logger.LogInformation("✅ 清理了 {Count} 条 email 字段为 null 的记录", nullEmailResult.ModifiedCount);
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
                    Sparse = true,
                    Background = true
                },
                "appusers.phone (sparse unique)");

            // 唯一索引：username
            await CreateIndexAsync(collection,
                Builders<BsonDocument>.IndexKeys.Ascending("username"),
                new CreateIndexOptions
                {
                    Name = "idx_appusers_username_unique",
                    Unique = true,
                    Background = true
                },
                "appusers.username (unique)");

            // 稀疏唯一索引：email
            await CreateIndexAsync(collection,
                Builders<BsonDocument>.IndexKeys.Ascending("email"),
                new CreateIndexOptions
                {
                    Name = "idx_appusers_email_unique",
                    Unique = true,
                    Sparse = true,
                    Background = true
                },
                "appusers.email (sparse unique)");

            // 查询优化：currentCompanyId
            await CreateIndexAsync(collection,
                Builders<BsonDocument>.IndexKeys.Ascending("currentCompanyId"),
                new CreateIndexOptions
                {
                    Name = "idx_appusers_currentCompanyId",
                    Background = true
                },
                "appusers.currentCompanyId");

            _logger.LogInformation("✅ AppUsers 集合索引创建完成");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "创建 AppUser 索引失败");
        }
    }

    /// <summary>
    /// 创建 Company 索引
    /// </summary>
    private async Task CreateCompanyIndexesAsync()
    {
        var collection = _database.GetCollection<BsonDocument>("companies");

        try
        {
            // 唯一索引：code
            await CreateIndexAsync(collection,
                Builders<BsonDocument>.IndexKeys.Ascending("code"),
                new CreateIndexOptions
                {
                    Name = "idx_companies_code_unique",
                    Unique = true,
                    Background = true
                },
                "companies.code (unique)");

            // 查询优化：name
            await CreateIndexAsync(collection,
                Builders<BsonDocument>.IndexKeys.Ascending("name"),
                new CreateIndexOptions
                {
                    Name = "idx_companies_name",
                    Background = true
                },
                "companies.name");

            _logger.LogInformation("✅ Companys 集合索引创建完成");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "创建 Company 索引失败");
        }
    }

    /// <summary>
    /// 创建 UserCompany 索引
    /// </summary>
    private async Task CreateUserCompanyIndexesAsync()
    {
        var collection = _database.GetCollection<BsonDocument>("user_companies");

        try
        {
            // 用户ID查询优化
            await CreateIndexAsync(collection,
                Builders<BsonDocument>.IndexKeys.Ascending("userId"),
                new CreateIndexOptions { Name = "idx_user_companies_userId", Background = true },
                "user_companies.userId");

            // 企业ID查询优化
            await CreateIndexAsync(collection,
                Builders<BsonDocument>.IndexKeys.Ascending(CompanyIdFieldName),
                new CreateIndexOptions { Name = "idx_user_companies_companyId", Background = true },
                "user_companies.companyId");

            // 唯一约束：userId + companyId
            await CreateIndexAsync(collection,
                Builders<BsonDocument>.IndexKeys.Ascending("userId").Ascending(CompanyIdFieldName),
                new CreateIndexOptions
                {
                    Name = "idx_user_companies_user_company_unique",
                    Unique = true,
                    Background = true
                },
                "user_companies.userId + companyId (unique)");

            // 状态查询优化
            await CreateIndexAsync(collection,
                Builders<BsonDocument>.IndexKeys.Ascending("status"),
                new CreateIndexOptions { Name = "idx_user_companies_status", Background = true },
                "user_companies.status");

            _logger.LogInformation("✅ UserCompanies 集合索引创建完成");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "创建 UserCompany 索引失败");
        }
    }

    /// <summary>
    /// 创建 CompanyJoinRequest 索引
    /// </summary>
    private async Task CreateJoinRequestIndexesAsync()
    {
        var collection = _database.GetCollection<BsonDocument>("companyjoinrequests");

        try
        {
            await CreateIndexAsync(collection,
                Builders<BsonDocument>.IndexKeys.Ascending("userId"),
                new CreateIndexOptions { Name = "idx_join_requests_userId", Background = true },
                "companyjoinrequests.userId");

            await CreateIndexAsync(collection,
                Builders<BsonDocument>.IndexKeys.Ascending(CompanyIdFieldName),
                new CreateIndexOptions { Name = "idx_join_requests_companyId", Background = true },
                "companyjoinrequests.companyId");

            await CreateIndexAsync(collection,
                Builders<BsonDocument>.IndexKeys.Ascending("status"),
                new CreateIndexOptions { Name = "idx_join_requests_status", Background = true },
                "companyjoinrequests.status");

            _logger.LogInformation("✅ CompanyJoinRequests 集合索引创建完成");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "创建 JoinRequest 索引失败");
        }
    }

    /// <summary>
    /// 创建组织架构相关索引
    /// </summary>
    private async Task CreateOrganizationIndexesAsync()
    {
        var unitsCol = _database.GetCollection<BsonDocument>("organization_units");
        var userOrgsCol = _database.GetCollection<BsonDocument>("user_organizations");

        try
        {
            // OrganizationUnit 索引
            await CreateIndexAsync(unitsCol,
                Builders<BsonDocument>.IndexKeys.Ascending(CompanyIdFieldName),
                new CreateIndexOptions { Name = "idx_org_units_companyId", Background = true },
                "organization_units.companyId");

            await CreateIndexAsync(unitsCol,
                Builders<BsonDocument>.IndexKeys.Ascending("parentId"),
                new CreateIndexOptions { Name = "idx_org_units_parentId", Background = true },
                "organization_units.parentId");

            await CreateIndexAsync(unitsCol,
                Builders<BsonDocument>.IndexKeys.Ascending("code"),
                new CreateIndexOptions { Name = "idx_org_units_code", Sparse = true, Background = true },
                "organization_units.code (sparse)");

            // UserOrganization 索引
            await CreateIndexAsync(userOrgsCol,
                Builders<BsonDocument>.IndexKeys.Ascending("userId"),
                new CreateIndexOptions { Name = "idx_user_orgs_userId", Background = true },
                "user_organizations.userId");

            await CreateIndexAsync(userOrgsCol,
                Builders<BsonDocument>.IndexKeys.Ascending("organizationUnitId"),
                new CreateIndexOptions { Name = "idx_user_orgs_unitId", Background = true },
                "user_organizations.organizationUnitId");

            await CreateIndexAsync(userOrgsCol,
                Builders<BsonDocument>.IndexKeys.Ascending("userId").Ascending("organizationUnitId"),
                new CreateIndexOptions
                {
                    Name = "idx_user_orgs_user_unit",
                    Unique = false,
                    Background = true
                },
                "user_organizations.userId + unitId");

            _logger.LogInformation("✅ Organization 集合索引创建完成");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "创建 Organization 索引失败");
        }
    }

    /// <summary>
    /// 创建角色索引
    /// </summary>
    private async Task CreateRoleIndexesAsync()
    {
        var collection = _database.GetCollection<BsonDocument>("roles");

        try
        {
            await CreateIndexAsync(collection,
                Builders<BsonDocument>.IndexKeys.Ascending(CompanyIdFieldName),
                new CreateIndexOptions { Name = "idx_roles_companyId", Background = true },
                "roles.companyId");

            await CreateIndexAsync(collection,
                Builders<BsonDocument>.IndexKeys.Ascending("name").Ascending(CompanyIdFieldName),
                new CreateIndexOptions
                {
                    Name = "idx_roles_name_company",
                    Unique = false,
                    Background = true
                },
                "roles.name + companyId");

            _logger.LogInformation("✅ Roles 集合索引创建完成");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "创建 Role 索引失败");
        }
    }

    /// <summary>
    /// 创建公文索引
    /// </summary>
    private async Task CreateDocumentIndexesAsync()
    {
        var collection = _database.GetCollection<BsonDocument>("documents");

        try
        {
            await CreateIndexAsync(collection,
                Builders<BsonDocument>.IndexKeys.Ascending(CompanyIdFieldName),
                new CreateIndexOptions { Name = "idx_docs_companyId", Background = true },
                "documents.companyId");

            await CreateIndexAsync(collection,
                Builders<BsonDocument>.IndexKeys.Ascending("createdBy"),
                new CreateIndexOptions { Name = "idx_docs_createdBy", Background = true },
                "documents.createdBy");

            await CreateIndexAsync(collection,
                Builders<BsonDocument>.IndexKeys.Ascending("status"),
                new CreateIndexOptions { Name = "idx_docs_status", Background = true },
                "documents.status");

            await CreateIndexAsync(collection,
                Builders<BsonDocument>.IndexKeys.Ascending("workflowInstanceId"),
                new CreateIndexOptions { Name = "idx_docs_workflowInstanceId", Background = true },
                "documents.workflowInstanceId");

            _logger.LogInformation("✅ Documents 集合索引创建完成");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "创建 Document 索引失败");
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

            // ChatAttachment 索引
            var attachments = _database.GetCollection<BsonDocument>("chatattachments");
            await CreateIndexAsync(attachments,
                Builders<BsonDocument>.IndexKeys.Ascending("sessionId"),
                new CreateIndexOptions { Name = "idx_chat_attachments_sessionId", Background = true },
                "chatattachments.sessionId");

            await CreateIndexAsync(attachments,
                Builders<BsonDocument>.IndexKeys.Ascending("messageId"),
                new CreateIndexOptions { Name = "idx_chat_attachments_messageId", Background = true },
                "chatattachments.messageId");
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
    /// <summary>
    /// 创建工作流相关索引
    /// </summary>
    private async Task CreateWorkflowIndexesAsync()
    {
        var collection = _database.GetCollection<BsonDocument>("workflowinstances");
        var templates = _database.GetCollection<BsonDocument>("workflow_templates");
        var operations = _database.GetCollection<BsonDocument>("bulk_operations");
        var prefs = _database.GetCollection<BsonDocument>("user_workflow_filter_preferences");

        try
        {
            // --- WorkflowInstances ---
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

            // --- WorkflowTemplates ---
            await CreateIndexAsync(templates,
                Builders<BsonDocument>.IndexKeys
                    .Ascending(CompanyIdFieldName)
                    .Ascending("isPublic"),
                new CreateIndexOptions { Name = "idx_wf_templates_company_public", Background = true },
                "workflow_templates.companyId + isPublic");

            await CreateIndexAsync(templates,
                Builders<BsonDocument>.IndexKeys
                    .Ascending(CompanyIdFieldName)
                    .Ascending("category"),
                new CreateIndexOptions { Name = "idx_wf_templates_company_category", Background = true },
                "workflow_templates.companyId + category");

            // --- BulkOperations ---
            await CreateIndexAsync(operations,
                Builders<BsonDocument>.IndexKeys
                    .Ascending(CompanyIdFieldName)
                    .Descending(CreatedAtFieldName),
                new CreateIndexOptions { Name = "idx_bulk_ops_company_createdAt", Background = true },
                "bulk_operations.companyId + createdAt");

            await CreateIndexAsync(operations,
                Builders<BsonDocument>.IndexKeys
                    .Ascending(CompanyIdFieldName)
                    .Ascending("status"),
                new CreateIndexOptions { Name = "idx_bulk_ops_company_status", Background = true },
                "bulk_operations.companyId + status");

            // --- UserWorkflowFilterPreferences ---
            await CreateIndexAsync(prefs,
                Builders<BsonDocument>.IndexKeys
                    .Ascending(CompanyIdFieldName)
                    .Ascending("userId")
                    .Ascending("isDefault"),
                new CreateIndexOptions { Name = "idx_wf_prefs_user_default", Background = true },
                "user_workflow_filter_preferences.companyId + userId + isDefault");

            _logger.LogInformation("✅ Workflow 相关集合索引创建完成");
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
    /// 创建用户活动日志索引
    /// </summary>
    private async Task CreateUserActivityLogIndexesAsync()
    {
        var collection = _database.GetCollection<BsonDocument>("useractivitylogs");

        try
        {
            // 1. 用户个人活动查询优化：userId + createdAt (用于“我的活动”分页和统计)
            await CreateIndexAsync(collection,
                Builders<BsonDocument>.IndexKeys
                    .Ascending("userId")
                    .Descending(CreatedAtFieldName),
                new CreateIndexOptions
                {
                    Name = "idx_activity_user_createdAt",
                    Background = true
                },
                "useractivitylogs.userId + createdAt");

            // 2. 企业全量活动查询优化：companyId + createdAt (用于“操作日志”管理)
            await CreateIndexAsync(collection,
                Builders<BsonDocument>.IndexKeys
                    .Ascending(CompanyIdFieldName)
                    .Descending(CreatedAtFieldName),
                new CreateIndexOptions
                {
                    Name = "idx_activity_company_createdAt",
                    Background = true
                },
                "useractivitylogs.companyId + createdAt");

            // 3. 统计查询优化：userId + statusCode + createdAt (加速成功/错误数统计)
            await CreateIndexAsync(collection,
                Builders<BsonDocument>.IndexKeys
                    .Ascending("userId")
                    .Ascending("statusCode")
                    .Descending(CreatedAtFieldName),
                new CreateIndexOptions
                {
                    Name = "idx_activity_user_status_createdAt",
                    Background = true
                },
                "useractivitylogs.userId + statusCode + createdAt");

            // 4. 操作类型统计优化：userId + action (加速聚合统计 action 种类)
            await CreateIndexAsync(collection,
                Builders<BsonDocument>.IndexKeys
                    .Ascending("userId")
                    .Ascending("action"),
                new CreateIndexOptions
                {
                    Name = "idx_activity_user_action",
                    Background = true
                },
                "useractivitylogs.userId + action");

            // 5. 软删除清理索引
            await CreateIndexAsync(collection,
                Builders<BsonDocument>.IndexKeys
                    .Ascending("isDeleted")
                    .Descending(CreatedAtFieldName),
                new CreateIndexOptions
                {
                    Name = "idx_activity_isDeleted_createdAt",
                    Background = true
                },
                "useractivitylogs.isDeleted + createdAt");

            _logger.LogInformation("✅ UserActivityLogs 集合索引创建完成");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "创建用户活动日志索引失败");
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

    /// <summary>
    /// 创建通知相关索引
    /// </summary>
    private async Task CreateNoticeIndexesAsync()
    {
        var collection = _database.GetCollection<BsonDocument>("noticeiconitems");

        try
        {
            await CreateIndexAsync(collection,
                Builders<BsonDocument>.IndexKeys
                    .Ascending(CompanyIdFieldName)
                    .Descending("datetime"),
                new CreateIndexOptions { Name = "idx_notices_company_datetime", Background = true },
                "noticeiconitems.companyId + datetime");

            await CreateIndexAsync(collection,
                Builders<BsonDocument>.IndexKeys
                    .Ascending(CompanyIdFieldName)
                    .Ascending("read"),
                new CreateIndexOptions { Name = "idx_notices_company_read", Background = true },
                "noticeiconitems.companyId + read");

            _logger.LogInformation("✅ Notices 集合索引创建完成");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "创建 Notice 索引失败");
        }
    }

    /// <summary>
    /// 创建登录失败记录索引
    /// </summary>
    private async Task CreateLoginFailureRecordIndexesAsync()
    {
        var collection = _database.GetCollection<BsonDocument>("login_failure_records");

        try
        {
            // TTL 索引：自动清理过期记录
            await CreateIndexAsync(collection,
                Builders<BsonDocument>.IndexKeys.Ascending("expiresAt"),
                new CreateIndexOptions
                {
                    Name = "idx_login_failure_ttl",
                    ExpireAfter = TimeSpan.Zero, // expiresAt 字段值即为过期时间
                    Background = true
                },
                "login_failure_records.expiresAt (TTL)");

            // 客户端查询索引
            await CreateIndexAsync(collection,
                Builders<BsonDocument>.IndexKeys
                    .Ascending("clientId")
                    .Ascending("type"),
                new CreateIndexOptions { Name = "idx_login_failure_client_type", Background = true },
                "login_failure_records.clientId + type");

            _logger.LogInformation("✅ LoginFailureRecords 集合索引创建完成");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "创建 LoginFailureRecord 索引失败");
        }
    }

    /// <summary>
    /// 创建项目管理相关索引
    /// </summary>
    private async Task CreateProjectIndexesAsync()
    {
        var projects = _database.GetCollection<BsonDocument>("projects");
        var members = _database.GetCollection<BsonDocument>("projectMembers");
        var milestones = _database.GetCollection<BsonDocument>("milestones");
        var dependencies = _database.GetCollection<BsonDocument>("taskDependencies");

        try
        {
            // --- Projects ---
            await CreateIndexAsync(projects,
                Builders<BsonDocument>.IndexKeys
                    .Ascending(CompanyIdFieldName)
                    .Ascending("status")
                    .Descending(CreatedAtFieldName),
                new CreateIndexOptions { Name = "idx_projects_company_status", Background = true },
                "projects.companyId + status + createdAt");

            await CreateIndexAsync(projects,
                Builders<BsonDocument>.IndexKeys
                    .Ascending(CompanyIdFieldName)
                    .Ascending("managerId"),
                new CreateIndexOptions { Name = "idx_projects_company_manager", Background = true },
                "projects.companyId + managerId");

            // --- ProjectMembers ---
            await CreateIndexAsync(members,
                Builders<BsonDocument>.IndexKeys
                    .Ascending(CompanyIdFieldName)
                    .Ascending("projectId")
                    .Ascending("userId"),
                new CreateIndexOptions { Name = "idx_project_members_unique", Unique = true, Background = true },
                "projectMembers.companyId + projectId + userId (Unique)");

            // --- Milestones ---
            await CreateIndexAsync(milestones,
                Builders<BsonDocument>.IndexKeys
                    .Ascending(CompanyIdFieldName)
                    .Ascending("projectId")
                    .Ascending("targetDate"),
                new CreateIndexOptions { Name = "idx_milestones_project_date", Background = true },
                "milestones.companyId + projectId + targetDate");

            // --- TaskDependencies ---
            await CreateIndexAsync(dependencies,
                Builders<BsonDocument>.IndexKeys
                    .Ascending(CompanyIdFieldName)
                    .Ascending("predecessorTaskId"),
                new CreateIndexOptions { Name = "idx_task_deps_predecessor", Background = true },
                "taskDependencies.companyId + predecessorTaskId");

            await CreateIndexAsync(dependencies,
                Builders<BsonDocument>.IndexKeys
                    .Ascending(CompanyIdFieldName)
                    .Ascending("successorTaskId"),
                new CreateIndexOptions { Name = "idx_task_deps_successor", Background = true },
                "taskDependencies.companyId + successorTaskId");

            _logger.LogInformation("✅ Project 相关集合索引创建完成");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "创建 Project 索引失败");
        }
    }

    /// <summary>
    /// 创建任务管理相关索引
    /// </summary>
    private async Task CreateTaskIndexesAsync()
    {
        var tasks = _database.GetCollection<BsonDocument>("tasks");
        var logs = _database.GetCollection<BsonDocument>("task_execution_logs");

        try
        {
            // --- Tasks ---
            await CreateIndexAsync(tasks,
                Builders<BsonDocument>.IndexKeys
                    .Ascending(CompanyIdFieldName)
                    .Ascending("assignedTo")
                    .Ascending("status"),
                new CreateIndexOptions { Name = "idx_tasks_assigned_status", Background = true },
                "tasks.companyId + assignedTo + status");

            await CreateIndexAsync(tasks,
                Builders<BsonDocument>.IndexKeys
                    .Ascending(CompanyIdFieldName)
                    .Ascending("projectId")
                    .Ascending("parentTaskId"),
                new CreateIndexOptions { Name = "idx_tasks_project_hierarchy", Background = true },
                "tasks.companyId + projectId + parentTaskId");

            await CreateIndexAsync(tasks,
                Builders<BsonDocument>.IndexKeys
                    .Ascending(CompanyIdFieldName)
                    .Ascending("status")
                    .Descending("priority"),
                new CreateIndexOptions { Name = "idx_tasks_status_priority", Background = true },
                "tasks.companyId + status + priority");

            // --- TaskExecutionLogs ---
            await CreateIndexAsync(logs,
                Builders<BsonDocument>.IndexKeys
                    .Ascending(CompanyIdFieldName)
                    .Ascending("taskId")
                    .Descending(CreatedAtFieldName),
                new CreateIndexOptions { Name = "idx_task_logs_task_createdAt", Background = true },
                "task_execution_logs.companyId + taskId + createdAt");

            _logger.LogInformation("✅ Task 相关集合索引创建完成");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "创建 Task 索引失败");
        }
    }

    /// <summary>
    /// 创建表单相关索引
    /// </summary>
    private async Task CreateFormIndexesAsync()
    {
        var definitions = _database.GetCollection<BsonDocument>("form_definitions");

        try
        {
            await CreateIndexAsync(definitions,
                Builders<BsonDocument>.IndexKeys
                    .Ascending(CompanyIdFieldName)
                    .Ascending("key"),
                new CreateIndexOptions { Name = "idx_form_defs_company_key", Unique = true, Background = true },
                "form_definitions.companyId + key (Unique)");

            await CreateIndexAsync(definitions,
                Builders<BsonDocument>.IndexKeys
                    .Ascending(CompanyIdFieldName)
                    .Ascending("isActive"),
                new CreateIndexOptions { Name = "idx_form_defs_company_active", Background = true },
                "form_definitions.companyId + isActive");

            _logger.LogInformation("✅ Form 相关集合索引创建完成");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "创建 Form 索引失败");
        }
    }

    /// <summary>
    /// 创建 IoT 相关索引
    /// </summary>
    private async Task CreateIoTIndexesAsync()
    {
        var gateways = _database.GetCollection<BsonDocument>("iotgateways");
        var devices = _database.GetCollection<BsonDocument>("iotdevices");
        var dataPoints = _database.GetCollection<BsonDocument>("iotdatapoints");
        var records = _database.GetCollection<BsonDocument>("iotdatarecords");
        var events = _database.GetCollection<BsonDocument>("iotdeviceevents");

        try
        {
            // --- Gateways ---
            await CreateIndexAsync(gateways,
                Builders<BsonDocument>.IndexKeys
                    .Ascending(CompanyIdFieldName)
                    .Ascending("status"),
                new CreateIndexOptions { Name = "idx_iot_gateways_status", Background = true },
                "iotgateways.companyId + status");

            // --- Devices ---
            await CreateIndexAsync(devices,
                Builders<BsonDocument>.IndexKeys
                    .Ascending(CompanyIdFieldName)
                    .Ascending("gatewayId")
                    .Ascending("status"),
                new CreateIndexOptions { Name = "idx_iot_devices_gateway_status", Background = true },
                "iotdevices.companyId + gatewayId + status");

            // --- DataPoints ---
            await CreateIndexAsync(dataPoints,
                Builders<BsonDocument>.IndexKeys
                    .Ascending(CompanyIdFieldName)
                    .Ascending("deviceId"),
                new CreateIndexOptions { Name = "idx_iot_datapoints_device", Background = true },
                "iotdatapoints.companyId + deviceId");

            // --- DataRecords ---
            await CreateIndexAsync(records,
                Builders<BsonDocument>.IndexKeys
                    .Ascending(CompanyIdFieldName)
                    .Ascending("deviceId")
                    .Descending("reportedAt"),
                new CreateIndexOptions { Name = "idx_iot_records_device_time", Background = true },
                "iotdatarecords.companyId + deviceId + reportedAt");

            await CreateIndexAsync(records,
                Builders<BsonDocument>.IndexKeys
                    .Ascending(CompanyIdFieldName)
                    .Ascending("dataPointId")
                    .Descending("reportedAt"),
                new CreateIndexOptions { Name = "idx_iot_records_datapoint_time", Background = true },
                "iotdatarecords.companyId + dataPointId + reportedAt");

            // --- DeviceEvents ---
            await CreateIndexAsync(events,
                Builders<BsonDocument>.IndexKeys
                    .Ascending(CompanyIdFieldName)
                    .Ascending("deviceId")
                    .Descending("occurredAt"),
                new CreateIndexOptions { Name = "idx_iot_events_device_time", Background = true },
                "iotdeviceevents.companyId + deviceId + occurredAt");

            _logger.LogInformation("✅ IoT 相关集合索引创建完成");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "创建 IoT 索引失败");
        }
    }

    /// <summary>
    /// 创建密码本相关索引
    /// </summary>
    private async Task CreatePasswordBookIndexesAsync()
    {
        var collection = _database.GetCollection<BsonDocument>("passwordBookEntries");

        try
        {
            await CreateIndexAsync(collection,
                Builders<BsonDocument>.IndexKeys
                    .Ascending(CompanyIdFieldName)
                    .Ascending("userId")
                    .Ascending("category"),
                new CreateIndexOptions { Name = "idx_pwbook_user_category", Background = true },
                "passwordBookEntries.companyId + userId + category");

            await CreateIndexAsync(collection,
                Builders<BsonDocument>.IndexKeys
                    .Ascending(CompanyIdFieldName)
                    .Ascending("userId")
                    .Ascending("tags"),
                new CreateIndexOptions { Name = "idx_pwbook_user_tags", Background = true },
                "passwordBookEntries.companyId + userId + tags");

            _logger.LogInformation("✅ PasswordBook 集合索引创建完成");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "创建 PasswordBook 索引失败");
        }
    }

    /// <summary>
    /// 创建规则引擎相关索引
    /// </summary>
    private async Task CreateRuleIndexesAsync()
    {
        var collection = _database.GetCollection<BsonDocument>("rulelistitems");

        try
        {
            await CreateIndexAsync(collection,
                Builders<BsonDocument>.IndexKeys
                    .Ascending(CompanyIdFieldName)
                    .Ascending("key"),
                new CreateIndexOptions { Name = "idx_rules_company_key", Background = true },
                "rulelistitems.companyId + key");

            await CreateIndexAsync(collection,
                Builders<BsonDocument>.IndexKeys
                    .Ascending(CompanyIdFieldName)
                    .Ascending("name"),
                new CreateIndexOptions { Name = "idx_rules_company_name", Background = true },
                "rulelistitems.companyId + name");

            _logger.LogInformation("✅ Rule 相关集合索引创建完成");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "创建 Rule 索引失败");
        }
    }

    /// <summary>
    /// 创建操作审计相关索引
    /// </summary>
    private async Task CreateOperationAuditIndexesAsync()
    {
        var collection = _database.GetCollection<BsonDocument>("operationaudits");

        try
        {
            await CreateIndexAsync(collection,
                Builders<BsonDocument>.IndexKeys
                    .Ascending("entityType")
                    .Ascending("entityId"),
                new CreateIndexOptions { Name = "idx_audit_entity", Background = true },
                "operationaudits.entityType + entityId");

            await CreateIndexAsync(collection,
                Builders<BsonDocument>.IndexKeys
                    .Ascending(CompanyIdFieldName)
                    .Descending(CreatedAtFieldName),
                new CreateIndexOptions { Name = "idx_audit_company_createdAt", Background = true },
                "operationaudits.companyId + createdAt");

            await CreateIndexAsync(collection,
                Builders<BsonDocument>.IndexKeys
                    .Ascending("userId")
                    .Descending(CreatedAtFieldName),
                new CreateIndexOptions { Name = "idx_audit_user_createdAt", Background = true },
                "operationaudits.userId + createdAt");

            _logger.LogInformation("✅ OperationAudit 集合索引创建完成");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "创建 OperationAudit 索引失败");
        }
    }
}
