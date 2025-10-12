using MongoDB.Driver;
using Platform.ApiService.Models;

namespace Platform.ApiService.Scripts;

/// <summary>
/// 数据库迁移脚本：将 Role 字段迁移到 RoleIds
/// 执行时机：在部署新代码之前执行
/// </summary>
public static class MigrateRoleToRoleIds
{
    public static async Task ExecuteAsync(IMongoDatabase database)
    {
        var users = database.GetCollection<AppUser>("users");
        var roles = database.GetCollection<Role>("roles");
        
        Console.WriteLine("开始迁移 Role 字段到 RoleIds...");
        
        // 创建默认角色（如果不存在）
        var adminRole = await roles.Find(r => r.Name == "admin" && r.IsDeleted == false).FirstOrDefaultAsync();
        if (adminRole == null)
        {
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
            Console.WriteLine($"创建管理员角色: {adminRole.Id}");
        }
        
        var userRole = await roles.Find(r => r.Name == "user" && r.IsDeleted == false).FirstOrDefaultAsync();
        if (userRole == null)
        {
            userRole = new Role
            {
                Name = "user",
                Description = "普通用户角色",
                MenuIds = new List<string>(),
                PermissionIds = new List<string>(),
                IsActive = true,
                IsDeleted = false,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };
            await roles.InsertOneAsync(userRole);
            Console.WriteLine($"创建普通用户角色: {userRole.Id}");
        }
        
        // 迁移所有用户
        var allUsers = await users.Find(Builders<AppUser>.Filter.Empty).ToListAsync();
        var migratedCount = 0;
        
        foreach (var user in allUsers)
        {
            // 检查是否已经有 RoleIds
            if (user.RoleIds != null && user.RoleIds.Count > 0)
            {
                Console.WriteLine($"用户 {user.Username} 已有 RoleIds，跳过");
                continue;
            }
            
            // 根据旧的 Role 字段确定角色
            List<string> newRoleIds;
            
            // 使用反射获取 Role 字段（因为模型中已删除）
            var roleProperty = typeof(AppUser).GetProperty("Role");
            var roleValue = roleProperty?.GetValue(user) as string;
            
            if (roleValue == "admin")
            {
                newRoleIds = new List<string> { adminRole.Id! };
            }
            else
            {
                newRoleIds = new List<string> { userRole.Id! };
            }
            
            // 更新用户的 RoleIds
            var update = Builders<AppUser>.Update
                .Set(u => u.RoleIds, newRoleIds)
                .Set(u => u.UpdatedAt, DateTime.UtcNow);
            
            await users.UpdateOneAsync(u => u.Id == user.Id, update);
            migratedCount++;
            
            Console.WriteLine($"迁移用户: {user.Username} -> RoleIds: [{string.Join(", ", newRoleIds)}]");
        }
        
        Console.WriteLine($"迁移完成！共迁移 {migratedCount} 个用户");
        Console.WriteLine($"管理员角色 ID: {adminRole.Id}");
        Console.WriteLine($"普通用户角色 ID: {userRole.Id}");
        Console.WriteLine();
        Console.WriteLine("注意：Role 字段数据仍保留在数据库中，可以手动清理");
        Console.WriteLine("MongoDB 命令：db.users.updateMany({}, { $unset: { role: \"\" } })");
    }
}

