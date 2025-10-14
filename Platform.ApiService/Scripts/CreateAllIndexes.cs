using MongoDB.Bson;
using MongoDB.Driver;
using Platform.ApiService.Models;

namespace Platform.ApiService.Scripts;

/// <summary>
/// 统一的数据库索引创建脚本
/// 合并了所有索引创建逻辑，确保幂等性和并发安全
/// </summary>
public class CreateAllIndexes
{
    private readonly IMongoDatabase _database;
    private readonly ILogger<CreateAllIndexes> _logger;

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

        await CreateCompanyIndexesAsync();
        await CreateUserIndexesAsync();
        await CreateUserCompanyIndexesAsync();
        await CreateJoinRequestIndexesAsync();
        await CreateRoleIndexesAsync();
        await CreateMenuIndexesAsync();
        await CreateNoticeIndexesAsync();
        await CreateTagIndexesAsync();
        await CreateRuleIndexesAsync();
        await CreateActivityLogIndexesAsync();

        _logger.LogInformation("========== 数据库索引创建完成 ==========");
    }

    /// <summary>
    /// 创建 Company 索引
    /// </summary>
    private async Task CreateCompanyIndexesAsync()
    {
        var collection = _database.GetCollection<Company>("companies");

        try
        {
            // 创建唯一索引前，先清理重复的 code
            await CleanupDuplicateCompanyCodesAsync(collection);
            
            // Code 唯一索引
            await CreateIndexAsync(collection, 
                Builders<Company>.IndexKeys.Ascending(c => c.Code),
                new CreateIndexOptions { Unique = true, Name = "idx_company_code_unique" },
                "companies.code (唯一)");

            // IsDeleted 索引
            await CreateIndexAsync(collection,
                Builders<Company>.IndexKeys.Ascending(c => c.IsDeleted),
                new CreateIndexOptions { Name = "idx_company_isdeleted" },
                "companies.isDeleted");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "创建 Company 索引失败");
        }
    }
    
    /// <summary>
    /// 清理重复的企业代码
    /// </summary>
    private async Task CleanupDuplicateCompanyCodesAsync(IMongoCollection<Company> collection)
    {
        try
        {
            var pipeline = new[]
            {
                new BsonDocument("$group", new BsonDocument
                {
                    { "_id", "$code" },
                    { "count", new BsonDocument("$sum", 1) },
                    { "ids", new BsonDocument("$push", "$_id") },
                    { "createdAts", new BsonDocument("$push", "$createdAt") }
                }),
                new BsonDocument("$match", new BsonDocument("count", new BsonDocument("$gt", 1)))
            };

            var duplicates = await collection.Aggregate<BsonDocument>(pipeline).ToListAsync();

            if (duplicates.Count > 0)
            {
                _logger.LogWarning("发现 {Count} 个重复的企业代码，正在清理...", duplicates.Count);

                foreach (var dup in duplicates)
                {
                    var ids = dup["ids"].AsBsonArray;
                    var createdAts = dup["createdAts"].AsBsonArray;
                    
                    // 找到最新的记录（保留）
                    var newestIndex = 0;
                    var newestDate = createdAts[0].ToUniversalTime();
                    for (int i = 1; i < createdAts.Count; i++)
                    {
                        var date = createdAts[i].ToUniversalTime();
                        if (date > newestDate)
                        {
                            newestDate = date;
                            newestIndex = i;
                        }
                    }

                    // 删除其他重复记录
                    for (int i = 0; i < ids.Count; i++)
                    {
                        if (i != newestIndex)
                        {
                            var idToDelete = ids[i].AsObjectId;
                            await collection.DeleteOneAsync(Builders<Company>.Filter.Eq("_id", idToDelete));
                            _logger.LogInformation("删除重复企业记录: code={Code}, id={Id}", 
                                dup["_id"].AsString, idToDelete);
                        }
                    }
                }
            }
        }
        catch (Exception ex)
        {
            _logger.LogWarning("清理重复企业代码时发生异常: {Error}", ex.Message);
        }
    }

    /// <summary>
    /// 创建 User 索引
    /// </summary>
    private async Task CreateUserIndexesAsync()
    {
        var collection = _database.GetCollection<AppUser>("users");

        try
        {
            // 用户名全局唯一索引
            await CreateIndexAsync(collection,
                Builders<AppUser>.IndexKeys.Ascending(u => u.Username),
                new CreateIndexOptions { Unique = true, Name = "idx_username_unique_global" },
                "users.username (全局唯一)");

            // 邮箱全局唯一索引（允许null）
            await CreateIndexAsync(collection,
                Builders<AppUser>.IndexKeys.Ascending(u => u.Email),
                new CreateIndexOptions { Unique = true, Sparse = true, Name = "idx_email_unique_global" },
                "users.email (全局唯一, sparse)");

            // CurrentCompanyId + IsDeleted 复合索引
            await CreateIndexAsync(collection,
                Builders<AppUser>.IndexKeys
                    .Ascending(u => u.CurrentCompanyId)
                    .Ascending(u => u.IsDeleted),
                new CreateIndexOptions { Name = "idx_current_company_isdeleted" },
                "users.currentCompanyId + isDeleted");

            // v3.1: RoleIds 已废弃，角色信息现在存储在 UserCompany.RoleIds 中
            // 不再为 AppUser.RoleIds 创建索引

            // IsActive + IsDeleted 复合索引
            await CreateIndexAsync(collection,
                Builders<AppUser>.IndexKeys
                    .Ascending(u => u.IsActive)
                    .Ascending(u => u.IsDeleted),
                new CreateIndexOptions { Name = "idx_isActive_isDeleted" },
                "users.isActive + isDeleted");

            // CreatedAt 索引
            await CreateIndexAsync(collection,
                Builders<AppUser>.IndexKeys.Descending(u => u.CreatedAt),
                new CreateIndexOptions { Name = "idx_createdAt" },
                "users.createdAt");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "创建 User 索引失败");
        }
    }

    /// <summary>
    /// 创建 UserCompany 索引
    /// </summary>
    private async Task CreateUserCompanyIndexesAsync()
    {
        var collection = _database.GetCollection<UserCompany>("user_companies");

        try
        {
            // UserId + CompanyId 唯一索引
            await CreateIndexAsync(collection,
                Builders<UserCompany>.IndexKeys
                    .Ascending(uc => uc.UserId)
                    .Ascending(uc => uc.CompanyId),
                new CreateIndexOptions { Unique = true, Name = "idx_user_company_unique" },
                "user_companies.userId + companyId (唯一)");

            // UserId + Status + IsDeleted 复合索引
            await CreateIndexAsync(collection,
                Builders<UserCompany>.IndexKeys
                    .Ascending(uc => uc.UserId)
                    .Ascending(uc => uc.Status)
                    .Ascending(uc => uc.IsDeleted),
                new CreateIndexOptions { Name = "idx_user_status_isdeleted" },
                "user_companies.userId + status + isDeleted");

            // CompanyId + Status + IsDeleted 复合索引
            await CreateIndexAsync(collection,
                Builders<UserCompany>.IndexKeys
                    .Ascending(uc => uc.CompanyId)
                    .Ascending(uc => uc.Status)
                    .Ascending(uc => uc.IsDeleted),
                new CreateIndexOptions { Name = "idx_company_status_isdeleted" },
                "user_companies.companyId + status + isDeleted");

            // CompanyId + IsAdmin + IsDeleted 复合索引
            await CreateIndexAsync(collection,
                Builders<UserCompany>.IndexKeys
                    .Ascending(uc => uc.CompanyId)
                    .Ascending(uc => uc.IsAdmin)
                    .Ascending(uc => uc.IsDeleted),
                new CreateIndexOptions { Name = "idx_company_admin_isdeleted" },
                "user_companies.companyId + isAdmin + isDeleted");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "创建 UserCompany 索引失败");
        }
    }

    /// <summary>
    /// 创建 JoinRequest 索引
    /// </summary>
    private async Task CreateJoinRequestIndexesAsync()
    {
        var collection = _database.GetCollection<CompanyJoinRequest>("company_join_requests");

        try
        {
            // UserId + CompanyId + Status 复合索引
            await CreateIndexAsync(collection,
                Builders<CompanyJoinRequest>.IndexKeys
                    .Ascending(jr => jr.UserId)
                    .Ascending(jr => jr.CompanyId)
                    .Ascending(jr => jr.Status),
                new CreateIndexOptions { Name = "idx_user_company_status" },
                "join_requests.userId + companyId + status");

            // CompanyId + Status + IsDeleted 复合索引
            await CreateIndexAsync(collection,
                Builders<CompanyJoinRequest>.IndexKeys
                    .Ascending(jr => jr.CompanyId)
                    .Ascending(jr => jr.Status)
                    .Ascending(jr => jr.IsDeleted),
                new CreateIndexOptions { Name = "idx_company_status_isdeleted" },
                "join_requests.companyId + status + isDeleted");

            // UserId + Status + IsDeleted 复合索引
            await CreateIndexAsync(collection,
                Builders<CompanyJoinRequest>.IndexKeys
                    .Ascending(jr => jr.UserId)
                    .Ascending(jr => jr.Status)
                    .Ascending(jr => jr.IsDeleted),
                new CreateIndexOptions { Name = "idx_user_status_isdeleted" },
                "join_requests.userId + status + isDeleted");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "创建 JoinRequest 索引失败");
        }
    }

    /// <summary>
    /// 创建 Role 索引
    /// </summary>
    private async Task CreateRoleIndexesAsync()
    {
        var collection = _database.GetCollection<Role>("roles");

        try
        {
            // 创建唯一索引前，先清理重复的 companyId + name
            await CleanupDuplicateRolesAsync(collection);
            
            // CompanyId + Name 唯一索引（企业内角色名唯一）
            await CreateIndexAsync(collection,
                Builders<Role>.IndexKeys
                    .Ascending(r => r.CompanyId)
                    .Ascending(r => r.Name),
                new CreateIndexOptions { Unique = true, Name = "idx_company_name_unique" },
                "roles.companyId + name (企业内唯一)");

            // CompanyId + IsDeleted 复合索引
            await CreateIndexAsync(collection,
                Builders<Role>.IndexKeys
                    .Ascending(r => r.CompanyId)
                    .Ascending(r => r.IsDeleted),
                new CreateIndexOptions { Name = "idx_company_isdeleted" },
                "roles.companyId + isDeleted");

            // IsActive + IsDeleted 复合索引
            await CreateIndexAsync(collection,
                Builders<Role>.IndexKeys
                    .Ascending(r => r.IsActive)
                    .Ascending(r => r.IsDeleted),
                new CreateIndexOptions { Name = "idx_isActive_isDeleted" },
                "roles.isActive + isDeleted");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "创建 Role 索引失败");
        }
    }
    
    /// <summary>
    /// 清理重复的角色（companyId + name 重复）
    /// </summary>
    private async Task CleanupDuplicateRolesAsync(IMongoCollection<Role> collection)
    {
        try
        {
            var pipeline = new[]
            {
                new BsonDocument("$group", new BsonDocument
                {
                    { "_id", new BsonDocument { { "companyId", "$companyId" }, { "name", "$name" } } },
                    { "count", new BsonDocument("$sum", 1) },
                    { "ids", new BsonDocument("$push", "$_id") },
                    { "createdAts", new BsonDocument("$push", "$createdAt") }
                }),
                new BsonDocument("$match", new BsonDocument("count", new BsonDocument("$gt", 1)))
            };

            var duplicates = await collection.Aggregate<BsonDocument>(pipeline).ToListAsync();

            if (duplicates.Count > 0)
            {
                _logger.LogWarning("发现 {Count} 组重复的角色，正在清理...", duplicates.Count);

                foreach (var dup in duplicates)
                {
                    var ids = dup["ids"].AsBsonArray;
                    var createdAts = dup["createdAts"].AsBsonArray;
                    var groupId = dup["_id"].AsBsonDocument;
                    var companyId = groupId["companyId"].AsString;
                    var name = groupId["name"].AsString;
                    
                    // 找到最新的记录（保留）
                    var newestIndex = 0;
                    var newestDate = createdAts[0].ToUniversalTime();
                    for (int i = 1; i < createdAts.Count; i++)
                    {
                        var date = createdAts[i].ToUniversalTime();
                        if (date > newestDate)
                        {
                            newestDate = date;
                            newestIndex = i;
                        }
                    }

                    // 删除其他重复记录
                    for (int i = 0; i < ids.Count; i++)
                    {
                        if (i != newestIndex)
                        {
                            var idToDelete = ids[i].AsObjectId;
                            await collection.DeleteOneAsync(Builders<Role>.Filter.Eq("_id", idToDelete));
                            _logger.LogInformation("删除重复角色记录: companyId={CompanyId}, name={Name}, id={Id}", 
                                companyId, name, idToDelete);
                        }
                    }
                }
            }
        }
        catch (Exception ex)
        {
            _logger.LogWarning("清理重复角色时发生异常: {Error}", ex.Message);
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
    /// 创建 Notice 索引
    /// </summary>
    private async Task CreateNoticeIndexesAsync()
    {
        var collection = _database.GetCollection<NoticeIconItem>("notices");

        try
        {
            // CompanyId + IsDeleted 复合索引
            await CreateIndexAsync(collection,
                Builders<NoticeIconItem>.IndexKeys
                    .Ascending(n => n.CompanyId)
                    .Ascending(n => n.IsDeleted),
                new CreateIndexOptions { Name = "idx_company_isdeleted" },
                "notices.companyId + isDeleted");

            // CompanyId + Type 复合索引
            await CreateIndexAsync(collection,
                Builders<NoticeIconItem>.IndexKeys
                    .Ascending(n => n.CompanyId)
                    .Ascending(n => n.Type),
                new CreateIndexOptions { Name = "idx_company_type" },
                "notices.companyId + type");

            // CompanyId + Datetime 复合索引
            await CreateIndexAsync(collection,
                Builders<NoticeIconItem>.IndexKeys
                    .Ascending(n => n.CompanyId)
                    .Descending(n => n.Datetime),
                new CreateIndexOptions { Name = "idx_company_datetime" },
                "notices.companyId + datetime");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "创建 Notice 索引失败");
        }
    }

    /// <summary>
    /// 创建 Tag 索引
    /// </summary>
    private async Task CreateTagIndexesAsync()
    {
        var collection = _database.GetCollection<TagItem>("tags");

        try
        {
            // CompanyId + IsDeleted 复合索引
            await CreateIndexAsync(collection,
                Builders<TagItem>.IndexKeys
                    .Ascending(t => t.CompanyId)
                    .Ascending(t => t.IsDeleted),
                new CreateIndexOptions { Name = "idx_company_isdeleted" },
                "tags.companyId + isDeleted");

            // CompanyId + Type 复合索引
            await CreateIndexAsync(collection,
                Builders<TagItem>.IndexKeys
                    .Ascending(t => t.CompanyId)
                    .Ascending(t => t.Type),
                new CreateIndexOptions { Name = "idx_company_type" },
                "tags.companyId + type");

            // CompanyId + Name 复合索引
            await CreateIndexAsync(collection,
                Builders<TagItem>.IndexKeys
                    .Ascending(t => t.CompanyId)
                    .Ascending(t => t.Name),
                new CreateIndexOptions { Name = "idx_company_name" },
                "tags.companyId + name");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "创建 Tag 索引失败");
        }
    }

    /// <summary>
    /// 创建 Rule 索引
    /// </summary>
    private async Task CreateRuleIndexesAsync()
    {
        var collection = _database.GetCollection<RuleListItem>("rules");

        try
        {
            // CompanyId + IsDeleted 复合索引
            await CreateIndexAsync(collection,
                Builders<RuleListItem>.IndexKeys
                    .Ascending(r => r.CompanyId)
                    .Ascending(r => r.IsDeleted),
                new CreateIndexOptions { Name = "idx_company_isdeleted" },
                "rules.companyId + isDeleted");

            // CompanyId + Key 复合索引（唯一索引）
            await CreateIndexAsync(collection,
                Builders<RuleListItem>.IndexKeys
                    .Ascending(r => r.CompanyId)
                    .Ascending(r => r.Key),
                new CreateIndexOptions { Name = "idx_company_key_unique", Unique = true },
                "rules.companyId + key (unique)");

            // CompanyId + Name 复合索引
            await CreateIndexAsync(collection,
                Builders<RuleListItem>.IndexKeys
                    .Ascending(r => r.CompanyId)
                    .Ascending(r => r.Name),
                new CreateIndexOptions { Name = "idx_company_name" },
                "rules.companyId + name");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "创建 Rule 索引失败");
        }
    }

    /// <summary>
    /// 创建 ActivityLog 索引
    /// </summary>
    private async Task CreateActivityLogIndexesAsync()
    {
        var collection = _database.GetCollection<UserActivityLog>("user_activity_logs");

        try
        {
            // CompanyId + UserId 复合索引
            await CreateIndexAsync(collection,
                Builders<UserActivityLog>.IndexKeys
                    .Ascending(l => l.CompanyId)
                    .Ascending(l => l.UserId),
                new CreateIndexOptions { Name = "idx_company_user" },
                "activity_logs.companyId + userId");

            // UserId + CreatedAt 复合索引
            await CreateIndexAsync(collection,
                Builders<UserActivityLog>.IndexKeys
                    .Ascending(l => l.UserId)
                    .Descending(l => l.CreatedAt),
                new CreateIndexOptions { Name = "idx_userId_createdAt" },
                "activity_logs.userId + createdAt");

            // CompanyId + CreatedAt 复合索引
            await CreateIndexAsync(collection,
                Builders<UserActivityLog>.IndexKeys
                    .Ascending(l => l.CompanyId)
                    .Descending(l => l.CreatedAt),
                new CreateIndexOptions { Name = "idx_company_createdat" },
                "activity_logs.companyId + createdAt");

            // Action 索引
            await CreateIndexAsync(collection,
                Builders<UserActivityLog>.IndexKeys.Ascending(l => l.Action),
                new CreateIndexOptions { Name = "idx_action" },
                "activity_logs.action");

            // CompanyId + IsDeleted 复合索引
            await CreateIndexAsync(collection,
                Builders<UserActivityLog>.IndexKeys
                    .Ascending(l => l.CompanyId)
                    .Ascending(l => l.IsDeleted),
                new CreateIndexOptions { Name = "idx_company_isdeleted" },
                "activity_logs.companyId + isDeleted");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "创建 ActivityLog 索引失败");
        }
    }

    /// <summary>
    /// 通用索引创建方法（处理异常）
    /// </summary>
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
            _logger.LogDebug("⚠️  索引已存在: {Description}", description);
        }
        catch (Exception ex)
        {
            _logger.LogWarning("创建索引失败: {Description}, 错误: {Error}", description, ex.Message);
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

