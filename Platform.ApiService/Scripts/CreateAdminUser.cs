using MongoDB.Driver;
using Platform.ApiService.Models;
using Platform.ApiService.Services;

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
        
        // 首先检查未删除的 admin 用户
        var filter = Builders<AppUser>.Filter.And(
            Builders<AppUser>.Filter.Eq(u => u.Username, "admin"),
            SoftDeleteExtensions.NotDeleted<AppUser>()
        );
        var existingAdmin = await users.Find(filter).FirstOrDefaultAsync();
        
        if (existingAdmin != null)
        {
            Console.WriteLine($"✓ 管理员用户已存在: {existingAdmin.Username} (ID: {existingAdmin.Id})");
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
            
            Console.WriteLine("✓ 恢复已软删除的管理员用户:");
            Console.WriteLine($"  - 用户名: {deletedAdmin.Username}");
            Console.WriteLine($"  - 邮箱: {deletedAdmin.Email}");
            Console.WriteLine($"  - ID: {deletedAdmin.Id}");
            Console.WriteLine($"  - 删除时间: {deletedAdmin.DeletedAt}");
            return;
        }

        // 创建默认管理员用户
        var adminUser = new AppUser
        {
            Username = "admin",
            Email = "admin@example.com",
            PasswordHash = HashPassword("admin123"),
            Role = "admin",
            IsActive = true,
            IsDeleted = false,  // 显式设置软删除标志
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        await users.InsertOneAsync(adminUser);
        Console.WriteLine("✓ 默认管理员用户创建成功:");
        Console.WriteLine($"  - 用户名: {adminUser.Username}");
        Console.WriteLine($"  - 密码: admin123");
        Console.WriteLine($"  - 邮箱: {adminUser.Email}");
        Console.WriteLine($"  - ID: {adminUser.Id}");
    }

    private static string HashPassword(string password)
    {
        return BCrypt.Net.BCrypt.HashPassword(password);
    }
}
