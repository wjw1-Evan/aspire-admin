using MongoDB.Driver;
using Platform.ApiService.Models;

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
        
        // 检查是否已存在管理员用户
        var existingAdmin = await users.Find(u => u.Role == "admin").FirstOrDefaultAsync();
        if (existingAdmin != null)
        {
            Console.WriteLine($"管理员用户已存在: {existingAdmin.Username}");
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
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        await users.InsertOneAsync(adminUser);
        Console.WriteLine("默认管理员用户创建成功:");
        Console.WriteLine($"用户名: {adminUser.Username}");
        Console.WriteLine($"密码: admin123");
        Console.WriteLine($"邮箱: {adminUser.Email}");
    }

    private static string HashPassword(string password)
    {
        return BCrypt.Net.BCrypt.HashPassword(password);
    }
}
