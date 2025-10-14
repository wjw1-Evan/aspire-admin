using MongoDB.Driver;
using Platform.ApiService.Models;

namespace Platform.ApiService.Scripts;

/// <summary>
/// v3.1 多企业隶属架构索引创建
/// </summary>
public static class CreateMultiCompanyIndexes
{
    public static async Task ExecuteAsync(IMongoDatabase database)
    {
        Console.WriteLine("=== 开始创建 v3.1 多企业隶属索引 ===");
        
        try
        {
            // 1. 用户表索引
            await CreateAppUserIndexesAsync(database);
            
            // 2. UserCompany 表索引（新增）
            await CreateUserCompanyIndexesAsync(database);
            
            // 3. CompanyJoinRequest 表索引（新增）
            await CreateJoinRequestIndexesAsync(database);
            
            Console.WriteLine("=== v3.1 多企业隶属索引创建完成 ===");
        }
        catch (Exception ex)
        {
            Console.WriteLine($"❌ 索引创建失败: {ex.Message}");
            // 不抛异常，允许应用继续启动
        }
    }

    /// <summary>
    /// 创建用户表索引（v3.1：全局唯一）
    /// </summary>
    private static async Task CreateAppUserIndexesAsync(IMongoDatabase database)
    {
        var collection = database.GetCollection<AppUser>("users");
        
        try
        {
            // 1. 用户名全局唯一索引（v3.1变更：不再按企业）
            var usernameIndex = Builders<AppUser>.IndexKeys.Ascending(u => u.Username);
            await collection.Indexes.CreateOneAsync(
                new CreateIndexModel<AppUser>(
                    usernameIndex,
                    new CreateIndexOptions 
                    { 
                        Name = "idx_username_unique_global",
                        Unique = true
                    }
                )
            );
            Console.WriteLine("✅ 创建索引: users.username (全局唯一)");
        }
        catch (MongoCommandException ex) when (ex.CodeName == "IndexOptionsConflict" || ex.CodeName == "IndexKeySpecsConflict")
        {
            Console.WriteLine("⚠️  索引已存在: users.username");
        }
        
        try
        {
            // 2. 邮箱全局唯一索引（v3.1变更：不再按企业）
            var emailIndex = Builders<AppUser>.IndexKeys.Ascending(u => u.Email);
            await collection.Indexes.CreateOneAsync(
                new CreateIndexModel<AppUser>(
                    emailIndex,
                    new CreateIndexOptions 
                    { 
                        Name = "idx_email_unique_global",
                        Unique = true,
                        Sparse = true  // 允许 null 值
                    }
                )
            );
            Console.WriteLine("✅ 创建索引: users.email (全局唯一)");
        }
        catch (MongoCommandException ex) when (ex.CodeName == "IndexOptionsConflict" || ex.CodeName == "IndexKeySpecsConflict")
        {
            Console.WriteLine("⚠️  索引已存在: users.email");
        }
        
        try
        {
            // 3. CurrentCompanyId 索引（v3.1新增）
            var currentCompanyIndex = Builders<AppUser>.IndexKeys
                .Ascending(u => u.CurrentCompanyId)
                .Ascending(u => u.IsDeleted);
            await collection.Indexes.CreateOneAsync(
                new CreateIndexModel<AppUser>(
                    currentCompanyIndex,
                    new CreateIndexOptions { Name = "idx_current_company_isdeleted" }
                )
            );
            Console.WriteLine("✅ 创建索引: users.currentCompanyId + isDeleted");
        }
        catch (MongoCommandException ex) when (ex.CodeName == "IndexOptionsConflict" || ex.CodeName == "IndexKeySpecsConflict")
        {
            Console.WriteLine("⚠️  索引已存在: users.currentCompanyId");
        }
    }

    /// <summary>
    /// 创建 UserCompany 表索引
    /// </summary>
    private static async Task CreateUserCompanyIndexesAsync(IMongoDatabase database)
    {
        var collection = database.GetCollection<UserCompany>("user_companies");
        
        try
        {
            // 1. userId + companyId 唯一索引
            var userCompanyIndex = Builders<UserCompany>.IndexKeys
                .Ascending(uc => uc.UserId)
                .Ascending(uc => uc.CompanyId);
            await collection.Indexes.CreateOneAsync(
                new CreateIndexModel<UserCompany>(
                    userCompanyIndex,
                    new CreateIndexOptions 
                    { 
                        Name = "idx_user_company_unique",
                        Unique = true
                    }
                )
            );
            Console.WriteLine("✅ 创建索引: user_companies.userId + companyId (唯一)");
        }
        catch (MongoCommandException ex) when (ex.CodeName == "IndexOptionsConflict" || ex.CodeName == "IndexKeySpecsConflict")
        {
            Console.WriteLine("⚠️  索引已存在: user_companies.userId + companyId");
        }
        
        try
        {
            // 2. userId + status 索引（查询用户的所有企业）
            var userStatusIndex = Builders<UserCompany>.IndexKeys
                .Ascending(uc => uc.UserId)
                .Ascending(uc => uc.Status)
                .Ascending(uc => uc.IsDeleted);
            await collection.Indexes.CreateOneAsync(
                new CreateIndexModel<UserCompany>(
                    userStatusIndex,
                    new CreateIndexOptions { Name = "idx_user_status_isdeleted" }
                )
            );
            Console.WriteLine("✅ 创建索引: user_companies.userId + status + isDeleted");
        }
        catch (MongoCommandException ex) when (ex.CodeName == "IndexOptionsConflict" || ex.CodeName == "IndexKeySpecsConflict")
        {
            Console.WriteLine("⚠️  索引已存在: user_companies.userId + status");
        }
        
        try
        {
            // 3. companyId + status 索引（查询企业的所有成员）
            var companyStatusIndex = Builders<UserCompany>.IndexKeys
                .Ascending(uc => uc.CompanyId)
                .Ascending(uc => uc.Status)
                .Ascending(uc => uc.IsDeleted);
            await collection.Indexes.CreateOneAsync(
                new CreateIndexModel<UserCompany>(
                    companyStatusIndex,
                    new CreateIndexOptions { Name = "idx_company_status_isdeleted" }
                )
            );
            Console.WriteLine("✅ 创建索引: user_companies.companyId + status + isDeleted");
        }
        catch (MongoCommandException ex) when (ex.CodeName == "IndexOptionsConflict" || ex.CodeName == "IndexKeySpecsConflict")
        {
            Console.WriteLine("⚠️  索引已存在: user_companies.companyId + status");
        }
        
        try
        {
            // 4. companyId + isAdmin 索引（查询企业管理员）
            var adminIndex = Builders<UserCompany>.IndexKeys
                .Ascending(uc => uc.CompanyId)
                .Ascending(uc => uc.IsAdmin)
                .Ascending(uc => uc.IsDeleted);
            await collection.Indexes.CreateOneAsync(
                new CreateIndexModel<UserCompany>(
                    adminIndex,
                    new CreateIndexOptions { Name = "idx_company_admin_isdeleted" }
                )
            );
            Console.WriteLine("✅ 创建索引: user_companies.companyId + isAdmin + isDeleted");
        }
        catch (MongoCommandException ex) when (ex.CodeName == "IndexOptionsConflict" || ex.CodeName == "IndexKeySpecsConflict")
        {
            Console.WriteLine("⚠️  索引已存在: user_companies.companyId + isAdmin");
        }
    }

    /// <summary>
    /// 创建 CompanyJoinRequest 表索引
    /// </summary>
    private static async Task CreateJoinRequestIndexesAsync(IMongoDatabase database)
    {
        var collection = database.GetCollection<CompanyJoinRequest>("company_join_requests");
        
        try
        {
            // 1. userId + companyId + status 索引
            var userCompanyStatusIndex = Builders<CompanyJoinRequest>.IndexKeys
                .Ascending(jr => jr.UserId)
                .Ascending(jr => jr.CompanyId)
                .Ascending(jr => jr.Status);
            await collection.Indexes.CreateOneAsync(
                new CreateIndexModel<CompanyJoinRequest>(
                    userCompanyStatusIndex,
                    new CreateIndexOptions { Name = "idx_user_company_status" }
                )
            );
            Console.WriteLine("✅ 创建索引: company_join_requests.userId + companyId + status");
        }
        catch (MongoCommandException ex) when (ex.CodeName == "IndexOptionsConflict" || ex.CodeName == "IndexKeySpecsConflict")
        {
            Console.WriteLine("⚠️  索引已存在: company_join_requests.userId + companyId");
        }
        
        try
        {
            // 2. companyId + status 索引（查询企业的待审核申请）
            var companyStatusIndex = Builders<CompanyJoinRequest>.IndexKeys
                .Ascending(jr => jr.CompanyId)
                .Ascending(jr => jr.Status)
                .Ascending(jr => jr.IsDeleted);
            await collection.Indexes.CreateOneAsync(
                new CreateIndexModel<CompanyJoinRequest>(
                    companyStatusIndex,
                    new CreateIndexOptions { Name = "idx_company_status_isdeleted" }
                )
            );
            Console.WriteLine("✅ 创建索引: company_join_requests.companyId + status + isDeleted");
        }
        catch (MongoCommandException ex) when (ex.CodeName == "IndexOptionsConflict" || ex.CodeName == "IndexKeySpecsConflict")
        {
            Console.WriteLine("⚠️  索引已存在: company_join_requests.companyId + status");
        }
        
        try
        {
            // 3. userId + status 索引（查询用户的申请历史）
            var userStatusIndex = Builders<CompanyJoinRequest>.IndexKeys
                .Ascending(jr => jr.UserId)
                .Ascending(jr => jr.Status)
                .Ascending(jr => jr.IsDeleted);
            await collection.Indexes.CreateOneAsync(
                new CreateIndexModel<CompanyJoinRequest>(
                    userStatusIndex,
                    new CreateIndexOptions { Name = "idx_user_status_isdeleted" }
                )
            );
            Console.WriteLine("✅ 创建索引: company_join_requests.userId + status + isDeleted");
        }
        catch (MongoCommandException ex) when (ex.CodeName == "IndexOptionsConflict" || ex.CodeName == "IndexKeySpecsConflict")
        {
            Console.WriteLine("⚠️  索引已存在: company_join_requests.userId + status");
        }
    }
}

