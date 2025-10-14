using MongoDB.Driver;
using Platform.ApiService.Models;

namespace Platform.ApiService.Scripts;

/// <summary>
/// 创建多租户相关的数据库索引
/// </summary>
public class CreateMultiTenantIndexes
{
    private readonly IMongoDatabase _database;
    private readonly ILogger<CreateMultiTenantIndexes> _logger;

    public CreateMultiTenantIndexes(IMongoDatabase database, ILogger<CreateMultiTenantIndexes> logger)
    {
        _database = database;
        _logger = logger;
    }

    /// <summary>
    /// 执行索引创建
    /// </summary>
    public async Task CreateIndexesAsync()
    {
        _logger.LogInformation("开始创建多租户索引...");

        // 每个索引创建都独立处理异常，不影响其他索引
        await CreateCompanyIndexesAsync();
        await CreateAppUserIndexesAsync();
        await CreateRoleIndexesAsync();
        await CreateMenuIndexesAsync();
        await CreatePermissionIndexesAsync();
        await CreateNoticeIndexesAsync();
        await CreateUserActivityLogIndexesAsync();

        _logger.LogInformation("多租户索引创建完成！");
    }

    /// <summary>
    /// 创建 Company 索引
    /// </summary>
    private async Task CreateCompanyIndexesAsync()
    {
        var companies = _database.GetCollection<Company>("companies");

        try
        {
            // 在创建唯一索引前，先清理重复的 code 数据
            var duplicates = await companies.Aggregate()
                .Group(c => c.Code, g => new { Code = g.Key, Count = g.Count(), Ids = g.Select(x => x.Id).ToList() })
                .Match(g => g.Count > 1)
                .ToListAsync();

            if (duplicates.Any())
            {
                _logger.LogWarning("发现 {Count} 个重复的企业代码，正在清理...", duplicates.Count);
                
                foreach (var dup in duplicates)
                {
                    // 保留第一个，删除其他重复项
                    var idsToDelete = dup.Ids.Skip(1).ToList();
                    await companies.DeleteManyAsync(c => idsToDelete.Contains(c.Id));
                    _logger.LogInformation("清理重复企业代码 '{Code}'，删除了 {Count} 个重复项", dup.Code, idsToDelete.Count);
                }
            }

            // Code 唯一索引
            var codeIndex = Builders<Company>.IndexKeys.Ascending(c => c.Code);
            await companies.Indexes.CreateOneAsync(
                new CreateIndexModel<Company>(codeIndex, new CreateIndexOptions
                {
                    Unique = true,
                    Name = "idx_company_code_unique"
                })
            );

            // IsDeleted 索引（用于快速查询未删除的企业）
            var isDeletedIndex = Builders<Company>.IndexKeys.Ascending(c => c.IsDeleted);
            await companies.Indexes.CreateOneAsync(
                new CreateIndexModel<Company>(isDeletedIndex, new CreateIndexOptions
                {
                    Name = "idx_company_isdeleted"
                })
            );

            _logger.LogInformation("Company 索引创建完成");
        }
        catch (MongoCommandException ex) when (ex.CodeName == "IndexOptionsConflict" || ex.Code == 85)
        {
            // 索引已存在，跳过
            _logger.LogInformation("Company 索引已存在，跳过创建");
        }
    }

    /// <summary>
    /// 创建 AppUser 索引
    /// </summary>
    private async Task CreateAppUserIndexesAsync()
    {
        var users = _database.GetCollection<AppUser>("users");

        try
        {
            // (CompanyId, Username) 复合唯一索引 - 企业内用户名唯一
            var companyUsernameIndex = Builders<AppUser>.IndexKeys
                .Ascending(u => u.CompanyId)
                .Ascending(u => u.Username);
            await users.Indexes.CreateOneAsync(
                new CreateIndexModel<AppUser>(companyUsernameIndex, new CreateIndexOptions
                {
                    Unique = true,
                    Name = "idx_user_company_username_unique"
                })
            );

        // (CompanyId, Email) 复合索引
        var companyEmailIndex = Builders<AppUser>.IndexKeys
            .Ascending(u => u.CompanyId)
            .Ascending(u => u.Email);
        await users.Indexes.CreateOneAsync(
            new CreateIndexModel<AppUser>(companyEmailIndex, new CreateIndexOptions
            {
                Name = "idx_user_company_email"
            })
        );

            // (CompanyId, IsDeleted, IsActive) 复合索引 - 常用查询
            var companyStatusIndex = Builders<AppUser>.IndexKeys
                .Ascending(u => u.CompanyId)
                .Ascending(u => u.IsDeleted)
                .Ascending(u => u.IsActive);
            await users.Indexes.CreateOneAsync(
                new CreateIndexModel<AppUser>(companyStatusIndex, new CreateIndexOptions
                {
                    Name = "idx_user_company_status"
                })
            );

            _logger.LogInformation("AppUser 索引创建完成");
        }
        catch (MongoCommandException ex) when (ex.Code == 11000 || ex.Code == 85)
        {
            // 索引已存在或有重复数据
            _logger.LogWarning("AppUser 索引创建跳过: {Message}", ex.Message);
        }
    }

    /// <summary>
    /// 创建 Role 索引
    /// </summary>
    private async Task CreateRoleIndexesAsync()
    {
        try
        {
            var roles = _database.GetCollection<Role>("roles");

            // (CompanyId, Name) 复合唯一索引 - 企业内角色名唯一
            var companyNameIndex = Builders<Role>.IndexKeys
                .Ascending(r => r.CompanyId)
                .Ascending(r => r.Name);
            await roles.Indexes.CreateOneAsync(
                new CreateIndexModel<Role>(companyNameIndex, new CreateIndexOptions
                {
                    Unique = true,
                    Name = "idx_role_company_name_unique"
                })
            );

            // (CompanyId, IsDeleted) 复合索引
            var companyDeletedIndex = Builders<Role>.IndexKeys
                .Ascending(r => r.CompanyId)
                .Ascending(r => r.IsDeleted);
            await roles.Indexes.CreateOneAsync(
                new CreateIndexModel<Role>(companyDeletedIndex, new CreateIndexOptions
                {
                    Name = "idx_role_company_isdeleted"
                })
            );

            _logger.LogInformation("Role 索引创建完成");
        }
        catch (MongoCommandException ex)
        {
            _logger.LogWarning("Role 索引创建跳过: {Message}", ex.Message);
        }
    }

    /// <summary>
    /// 创建 Menu 索引
    /// </summary>
    private async Task CreateMenuIndexesAsync()
    {
        try
        {
            var menus = _database.GetCollection<Menu>("menus");

        // (CompanyId, Name) 复合索引
        var companyNameIndex = Builders<Menu>.IndexKeys
            .Ascending(m => m.CompanyId)
            .Ascending(m => m.Name);
        await menus.Indexes.CreateOneAsync(
            new CreateIndexModel<Menu>(companyNameIndex, new CreateIndexOptions
            {
                Name = "idx_menu_company_name"
            })
        );

        // (CompanyId, ParentId) 复合索引 - 查询子菜单
        var companyParentIndex = Builders<Menu>.IndexKeys
            .Ascending(m => m.CompanyId)
            .Ascending(m => m.ParentId);
        await menus.Indexes.CreateOneAsync(
            new CreateIndexModel<Menu>(companyParentIndex, new CreateIndexOptions
            {
                Name = "idx_menu_company_parent"
            })
        );

            // (CompanyId, IsDeleted, IsEnabled) 复合索引
            var companyStatusIndex = Builders<Menu>.IndexKeys
                .Ascending(m => m.CompanyId)
                .Ascending(m => m.IsDeleted)
                .Ascending(m => m.IsEnabled);
            await menus.Indexes.CreateOneAsync(
                new CreateIndexModel<Menu>(companyStatusIndex, new CreateIndexOptions
                {
                    Name = "idx_menu_company_status"
                })
            );

            _logger.LogInformation("Menu 索引创建完成");
        }
        catch (MongoCommandException ex)
        {
            _logger.LogWarning("Menu 索引创建跳过: {Message}", ex.Message);
        }
    }

    /// <summary>
    /// 创建 Permission 索引
    /// </summary>
    private async Task CreatePermissionIndexesAsync()
    {
        try
        {
            var permissions = _database.GetCollection<Permission>("permissions");

        // (CompanyId, Code) 复合唯一索引 - 企业内权限代码唯一
        var companyCodeIndex = Builders<Permission>.IndexKeys
            .Ascending(p => p.CompanyId)
            .Ascending(p => p.Code);
        await permissions.Indexes.CreateOneAsync(
            new CreateIndexModel<Permission>(companyCodeIndex, new CreateIndexOptions
            {
                Unique = true,
                Name = "idx_permission_company_code_unique"
            })
        );

        // (CompanyId, ResourceName) 复合索引 - 按资源查询权限
        var companyResourceIndex = Builders<Permission>.IndexKeys
            .Ascending(p => p.CompanyId)
            .Ascending(p => p.ResourceName);
        await permissions.Indexes.CreateOneAsync(
            new CreateIndexModel<Permission>(companyResourceIndex, new CreateIndexOptions
            {
                Name = "idx_permission_company_resource"
            })
        );

            // (CompanyId, IsDeleted) 复合索引
            var companyDeletedIndex = Builders<Permission>.IndexKeys
                .Ascending(p => p.CompanyId)
                .Ascending(p => p.IsDeleted);
            await permissions.Indexes.CreateOneAsync(
                new CreateIndexModel<Permission>(companyDeletedIndex, new CreateIndexOptions
                {
                    Name = "idx_permission_company_isdeleted"
                })
            );

            _logger.LogInformation("Permission 索引创建完成");
        }
        catch (MongoCommandException ex)
        {
            _logger.LogWarning("Permission 索引创建跳过: {Message}", ex.Message);
        }
    }

    /// <summary>
    /// 创建 Notice 索引
    /// </summary>
    private async Task CreateNoticeIndexesAsync()
    {
        try
        {
            var notices = _database.GetCollection<NoticeIconItem>("notices");

        // (CompanyId, IsDeleted) 复合索引
        var companyDeletedIndex = Builders<NoticeIconItem>.IndexKeys
            .Ascending(n => n.CompanyId)
            .Ascending(n => n.IsDeleted);
        await notices.Indexes.CreateOneAsync(
            new CreateIndexModel<NoticeIconItem>(companyDeletedIndex, new CreateIndexOptions
            {
                Name = "idx_notice_company_isdeleted"
            })
        );

        // (CompanyId, Type) 复合索引 - 按类型查询
        var companyTypeIndex = Builders<NoticeIconItem>.IndexKeys
            .Ascending(n => n.CompanyId)
            .Ascending(n => n.Type);
        await notices.Indexes.CreateOneAsync(
            new CreateIndexModel<NoticeIconItem>(companyTypeIndex, new CreateIndexOptions
            {
                Name = "idx_notice_company_type"
            })
        );

            // (CompanyId, Datetime) 复合索引 - 按时间排序
            var companyDatetimeIndex = Builders<NoticeIconItem>.IndexKeys
                .Ascending(n => n.CompanyId)
                .Descending(n => n.Datetime);
            await notices.Indexes.CreateOneAsync(
                new CreateIndexModel<NoticeIconItem>(companyDatetimeIndex, new CreateIndexOptions
                {
                    Name = "idx_notice_company_datetime"
                })
            );

            _logger.LogInformation("Notice 索引创建完成");
        }
        catch (MongoCommandException ex)
        {
            _logger.LogWarning("Notice 索引创建跳过: {Message}", ex.Message);
        }
    }

    /// <summary>
    /// 创建 UserActivityLog 索引
    /// </summary>
    private async Task CreateUserActivityLogIndexesAsync()
    {
        try
        {
            var logs = _database.GetCollection<UserActivityLog>("user_activity_logs");

        // (CompanyId, UserId) 复合索引 - 按用户查询日志
        var companyUserIndex = Builders<UserActivityLog>.IndexKeys
            .Ascending(l => l.CompanyId)
            .Ascending(l => l.UserId);
        await logs.Indexes.CreateOneAsync(
            new CreateIndexModel<UserActivityLog>(companyUserIndex, new CreateIndexOptions
            {
                Name = "idx_activitylog_company_user"
            })
        );

        // (CompanyId, CreatedAt) 复合索引 - 按时间查询
        var companyCreatedAtIndex = Builders<UserActivityLog>.IndexKeys
            .Ascending(l => l.CompanyId)
            .Descending(l => l.CreatedAt);
        await logs.Indexes.CreateOneAsync(
            new CreateIndexModel<UserActivityLog>(companyCreatedAtIndex, new CreateIndexOptions
            {
                Name = "idx_activitylog_company_createdat"
            })
        );

            // (CompanyId, IsDeleted) 复合索引
            var companyDeletedIndex = Builders<UserActivityLog>.IndexKeys
                .Ascending(l => l.CompanyId)
                .Ascending(l => l.IsDeleted);
            await logs.Indexes.CreateOneAsync(
                new CreateIndexModel<UserActivityLog>(companyDeletedIndex, new CreateIndexOptions
                {
                    Name = "idx_activitylog_company_isdeleted"
                })
            );

            _logger.LogInformation("UserActivityLog 索引创建完成");
        }
        catch (MongoCommandException ex)
        {
            _logger.LogWarning("UserActivityLog 索引创建跳过: {Message}", ex.Message);
        }
    }

    /// <summary>
    /// 静态方法：执行索引创建（用于 Program.cs 调用）
    /// </summary>
    public static async Task ExecuteAsync(IMongoDatabase database, ILogger<CreateMultiTenantIndexes> logger)
    {
        var creator = new CreateMultiTenantIndexes(database, logger);
        await creator.CreateIndexesAsync();
    }
}

