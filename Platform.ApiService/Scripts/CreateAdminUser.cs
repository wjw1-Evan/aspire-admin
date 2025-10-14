using MongoDB.Driver;
using Platform.ApiService.Models;
using Platform.ApiService.Services;

#pragma warning disable CS0618 // 抑制过时API警告 - 脚本需要访问过时属性以确保兼容性

namespace Platform.ApiService.Scripts;

/// <summary>
/// 创建默认管理员用户、企业和角色
/// v3.1: 支持多租户系统，自动创建系统企业和用户-企业关联
/// </summary>
public class CreateAdminUser
{
    private readonly IMongoDatabase _database;

    public CreateAdminUser(IMongoDatabase database)
    {
        _database = database;
    }

    public async Task CreateDefaultAdminAsync()
    {
        var users = _database.GetCollection<AppUser>("users");
        var roles = _database.GetCollection<Role>("roles");
        var companies = _database.GetCollection<Company>("companies");
        var userCompanies = _database.GetCollection<UserCompany>("userCompanies");
        
        // 1️⃣ 检查 admin 用户是否已存在
        var userFilter = Builders<AppUser>.Filter.And(
            Builders<AppUser>.Filter.Eq(u => u.Username, "admin"),
            SoftDeleteExtensions.NotDeleted<AppUser>()
        );
        var existingAdmin = await users.Find(userFilter).FirstOrDefaultAsync();
        
        if (existingAdmin != null)
        {
            Console.WriteLine("管理员用户已存在，跳过初始化");
            return;
        }

        // 检查是否存在已软删除的 admin 用户
        var deletedFilter = Builders<AppUser>.Filter.And(
            Builders<AppUser>.Filter.Eq(u => u.Username, "admin"),
            Builders<AppUser>.Filter.Eq(u => u.IsDeleted, true)
        );
        var deletedAdmin = await users.Find(deletedFilter).FirstOrDefaultAsync();
        
        if (deletedAdmin != null)
        {
            Console.WriteLine("发现已删除的 admin 用户，正在恢复...");
            
            // 恢复已软删除的 admin 用户
            var update = Builders<AppUser>.Update
                .Set(u => u.IsDeleted, false)
                .Set(u => u.DeletedAt, null)
                .Set(u => u.DeletedBy, null)
                .Set(u => u.DeletedReason, null)
                .Set(u => u.IsActive, true)
                .Set(u => u.UpdatedAt, DateTime.UtcNow);

            await users.UpdateOneAsync(u => u.Id == deletedAdmin.Id, update);
            Console.WriteLine("✅ 管理员用户已恢复");
            return;
        }

        // 2️⃣ 创建或获取系统企业
        var companyFilter = Builders<Company>.Filter.And(
            Builders<Company>.Filter.Eq(c => c.Code, "system"),
            SoftDeleteExtensions.NotDeleted<Company>()
        );
        var systemCompany = await companies.Find(companyFilter).FirstOrDefaultAsync();
        
        if (systemCompany == null)
        {
            systemCompany = new Company
            {
                Name = "系统企业",
                Code = "system",
                Description = "默认系统企业，用于超级管理员",
                Industry = "系统",
                ContactName = "系统管理员",
                ContactEmail = "admin@example.com",
                IsActive = true,
                MaxUsers = 10000,
                ExpiresAt = null,  // 永不过期
                IsDeleted = false,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };
            
            await companies.InsertOneAsync(systemCompany);
            Console.WriteLine($"✅ 创建系统企业: {systemCompany.Name} (Code: {systemCompany.Code})");
        }
        else
        {
            Console.WriteLine($"系统企业已存在: {systemCompany.Name}");
        }

        // 3️⃣ 创建或获取超级管理员角色
        var adminRoleFilter = Builders<Role>.Filter.And(
            Builders<Role>.Filter.Eq(r => r.Name, "超级管理员"),
            SoftDeleteExtensions.NotDeleted<Role>()
        );
        var adminRole = await roles.Find(adminRoleFilter).FirstOrDefaultAsync();
        
        if (adminRole == null)
        {
            adminRole = new Role
            {
                Name = "超级管理员",
                Description = "系统超级管理员，拥有所有权限",
                MenuIds = new List<string>(),  // 稍后由菜单初始化脚本填充
                PermissionIds = new List<string>(),  // 稍后由权限初始化脚本填充
                IsActive = true,
                IsDeleted = false,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };
            
            await roles.InsertOneAsync(adminRole);
            Console.WriteLine($"✅ 创建超级管理员角色: {adminRole.Name}");
        }
        else
        {
            Console.WriteLine($"超级管理员角色已存在: {adminRole.Name}");
        }

        // 4️⃣ 创建管理员用户
        var adminUser = new AppUser
        {
            Username = "admin",
            Name = "系统管理员",
            Email = "admin@example.com",
            PasswordHash = HashPassword("admin123"),
            CompanyId = systemCompany.Id!,  // 设置所属企业
            CurrentCompanyId = systemCompany.Id,  // 设置当前企业
            PersonalCompanyId = systemCompany.Id,  // 设置个人企业（管理员的个人企业就是系统企业）
            CustomPermissionIds = new List<string>(),
            IsActive = true,
            IsDeleted = false,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        await users.InsertOneAsync(adminUser);
        Console.WriteLine($"✅ 创建管理员用户: {adminUser.Username} (密码: admin123)");

        // 5️⃣ 创建用户-企业关联
        var userCompany = new UserCompany
        {
            UserId = adminUser.Id!,
            CompanyId = systemCompany.Id!,
            RoleIds = new List<string> { adminRole.Id! },  // 分配超级管理员角色
            IsAdmin = true,  // 标记为企业管理员
            Status = "active",  // 状态：激活
            JoinedAt = DateTime.UtcNow,
            IsDeleted = false,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        await userCompanies.InsertOneAsync(userCompany);
        Console.WriteLine($"✅ 创建用户-企业关联: {adminUser.Username} ↔ {systemCompany.Name}");

        // 6️⃣ 输出初始化总结
        Console.WriteLine("\n" + new string('=', 60));
        Console.WriteLine("🎉 管理员初始化完成！");
        Console.WriteLine(new string('=', 60));
        Console.WriteLine($"企业名称: {systemCompany.Name}");
        Console.WriteLine($"企业代码: {systemCompany.Code}");
        Console.WriteLine($"管理员账号: {adminUser.Username}");
        Console.WriteLine($"管理员密码: admin123");
        Console.WriteLine($"管理员邮箱: {adminUser.Email}");
        Console.WriteLine($"管理员角色: {adminRole.Name}");
        Console.WriteLine(new string('=', 60) + "\n");
    }

    private static string HashPassword(string password)
    {
        return BCrypt.Net.BCrypt.HashPassword(password);
    }
}
