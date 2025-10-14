using MongoDB.Driver;
using Platform.ApiService.Models;
using Platform.ApiService.Services;

#pragma warning disable CS0618 // 抑制过时API警告 - 脚本需要访问过时属性以确保兼容性

namespace Platform.ApiService.Scripts;

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
        
        // 首先检查未删除的 admin 用户
        var filter = Builders<AppUser>.Filter.And(
            Builders<AppUser>.Filter.Eq(u => u.Username, "admin"),
            SoftDeleteExtensions.NotDeleted<AppUser>()
        );
        var existingAdmin = await users.Find(filter).FirstOrDefaultAsync();
        
        if (existingAdmin != null)
        {
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
            // 恢复已软删除的 admin 用户
            var update = Builders<AppUser>.Update
                .Set(u => u.IsDeleted, false)
                .Set(u => u.DeletedAt, null)
                .Set(u => u.DeletedBy, null)
                .Set(u => u.DeletedReason, null)
                .Set(u => u.IsActive, true)
                .Set(u => u.UpdatedAt, DateTime.UtcNow);

            await users.UpdateOneAsync(u => u.Id == deletedAdmin.Id, update);
            
            return;
        }

        // 确保 admin 角色存在
        var adminRoleFilter = Builders<Role>.Filter.And(
            Builders<Role>.Filter.Eq(r => r.Name, "admin"),
            SoftDeleteExtensions.NotDeleted<Role>()
        );
        var adminRole = await roles.Find(adminRoleFilter).FirstOrDefaultAsync();
        
        if (adminRole == null)
        {
            // 创建 admin 角色
            adminRole = new Role
            {
                Name = "admin",
                Description = "系统管理员角色",
                MenuIds = new List<string>(),
                PermissionIds = new List<string>(),
                IsActive = true,
                IsDeleted = false,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };
            await roles.InsertOneAsync(adminRole);
            Console.WriteLine($"创建系统管理员角色: {adminRole.Id}");
        }

        // 创建默认管理员用户
        var adminUser = new AppUser
        {
            Username = "admin",
            Email = "admin@example.com",
            PasswordHash = HashPassword("admin123"),
            RoleIds = new List<string> { adminRole.Id! },  // 分配 admin 角色
            IsActive = true,
            IsDeleted = false,  // 显式设置软删除标志
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        await users.InsertOneAsync(adminUser);
        Console.WriteLine($"创建默认管理员用户: {adminUser.Username}");
    }

    private static string HashPassword(string password)
    {
        return BCrypt.Net.BCrypt.HashPassword(password);
    }
}
