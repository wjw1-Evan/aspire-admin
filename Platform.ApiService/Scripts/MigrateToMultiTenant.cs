using MongoDB.Bson;
using MongoDB.Driver;
using Platform.ApiService.Constants;
using Platform.ApiService.Models;

namespace Platform.ApiService.Scripts;

/// <summary>
/// 数据迁移：将现有数据迁移到多租户架构
/// </summary>
public class MigrateToMultiTenant
{
    private readonly IMongoDatabase _database;
    private readonly ILogger<MigrateToMultiTenant> _logger;

    public MigrateToMultiTenant(IMongoDatabase database, ILogger<MigrateToMultiTenant> logger)
    {
        _database = database;
        _logger = logger;
    }

    /// <summary>
    /// 执行迁移
    /// </summary>
    public async Task MigrateAsync()
    {
        try
        {
            _logger.LogInformation("开始多租户数据迁移...");

            // 1. 检查是否已存在默认企业
            var companies = _database.GetCollection<Company>("companies");
            var defaultCompany = await companies
                .Find(c => c.Code == CompanyConstants.DefaultCompanyCode)
                .FirstOrDefaultAsync();

            if (defaultCompany != null)
            {
                _logger.LogInformation("默认企业已存在，跳过迁移。企业ID: {CompanyId}", defaultCompany.Id);
                return;
            }

            // 2. 创建默认企业
            defaultCompany = new Company
            {
                Name = CompanyConstants.DefaultCompanyName,
                Code = CompanyConstants.DefaultCompanyCode,
                Description = "系统默认企业（用于迁移现有数据）",
                IsActive = true,
                MaxUsers = 1000, // 默认企业不限制用户数
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow,
                IsDeleted = false
            };

            await companies.InsertOneAsync(defaultCompany);
            _logger.LogInformation("创建默认企业成功。企业ID: {CompanyId}", defaultCompany.Id);

            var companyId = defaultCompany.Id!;

            // 3. 迁移用户数据
            await MigrateCollectionAsync<AppUser>("users", companyId);

            // 4. 迁移角色数据
            await MigrateCollectionAsync<Role>("roles", companyId);

            // 5. 迁移菜单数据
            await MigrateCollectionAsync<Menu>("menus", companyId);

            // 6. 迁移权限数据
            await MigrateCollectionAsync<Permission>("permissions", companyId);

            // 7. 迁移通知数据
            await MigrateCollectionAsync<NoticeIconItem>("notices", companyId);

            // 8. 迁移用户活动日志
            await MigrateCollectionAsync<UserActivityLog>("user_activity_logs", companyId);

            // 9. 迁移 User 集合（如果存在）
            await MigrateCollectionAsync<User>("User", companyId);

            _logger.LogInformation("多租户数据迁移完成！");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "多租户数据迁移失败");
            throw;
        }
    }

    /// <summary>
    /// 迁移集合数据
    /// </summary>
    private async Task MigrateCollectionAsync<T>(string collectionName, string companyId) where T : class
    {
        try
        {
            var collection = _database.GetCollection<T>(collectionName);

            // 检查集合是否存在
            var collections = await _database.ListCollectionNamesAsync();
            var collectionsList = await collections.ToListAsync();
            if (!collectionsList.Contains(collectionName))
            {
                _logger.LogInformation("集合 {CollectionName} 不存在，跳过迁移", collectionName);
                return;
            }

            // 检查是否有需要迁移的文档（没有 companyId 字段的文档）
            var filter = Builders<T>.Filter.Or(
                Builders<T>.Filter.Exists("companyId", false),
                Builders<T>.Filter.Eq("companyId", ""),
                Builders<T>.Filter.Eq("companyId", BsonNull.Value)
            );

            var count = await collection.CountDocumentsAsync(filter);
            if (count == 0)
            {
                _logger.LogInformation("集合 {CollectionName} 无需迁移，所有文档已有企业ID", collectionName);
                return;
            }

            // 更新文档，添加 companyId 字段
            var update = Builders<T>.Update.Set("companyId", companyId);
            var result = await collection.UpdateManyAsync(filter, update);

            _logger.LogInformation(
                "集合 {CollectionName} 迁移完成。匹配文档数: {MatchedCount}, 更新文档数: {ModifiedCount}",
                collectionName,
                result.MatchedCount,
                result.ModifiedCount);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "迁移集合 {CollectionName} 时发生错误", collectionName);
            throw;
        }
    }
}

