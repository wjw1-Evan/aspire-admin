using MongoDB.Driver;
using Platform.ApiService.Models;

namespace Platform.ApiService.Scripts;

/// <summary>
/// v3.0 → v3.1 数据迁移脚本
/// 从单企业所属模型迁移到多企业隶属模型
/// </summary>
public static class MigrateToMultiCompany
{
    public static async Task MigrateAsync(IMongoDatabase database)
    {
        Console.WriteLine("=== 开始 v3.0 → v3.1 数据迁移 ===");
        
        try
        {
            var users = database.GetCollection<AppUser>("users");
            var userCompanies = database.GetCollection<UserCompany>("user_companies");
            var roles = database.GetCollection<Role>("roles");
            
            // 获取所有未删除的用户
            var allUsers = await users.Find(u => u.IsDeleted == false).ToListAsync();
            
            Console.WriteLine($"找到 {allUsers.Count} 个用户需要迁移");
            
            int migratedCount = 0;
            int skippedCount = 0;
            
            foreach (var user in allUsers)
            {
                // 检查是否已迁移（有 CurrentCompanyId）
                if (!string.IsNullOrEmpty(user.CurrentCompanyId))
                {
                    skippedCount++;
                    continue;
                }
                
                // 检查是否有旧的 CompanyId
                if (string.IsNullOrEmpty(user.CompanyId))
                {
                    Console.WriteLine($"⚠️  用户 {user.Username} 没有 CompanyId，跳过");
                    skippedCount++;
                    continue;
                }
                
                try
                {
                    // 1. 创建 UserCompany 记录
                    var existingMembership = await userCompanies.Find(uc =>
                        uc.UserId == user.Id &&
                        uc.CompanyId == user.CompanyId &&
                        uc.IsDeleted == false
                    ).FirstOrDefaultAsync();
                    
                    if (existingMembership == null)
                    {
                        // 判断是否是管理员
                        var isAdmin = false;
                        if (user.RoleIds != null && user.RoleIds.Count > 0)
                        {
                            var userRoles = await roles.Find(r =>
                                user.RoleIds.Contains(r.Id!) &&
                                r.IsDeleted == false
                            ).ToListAsync();
                            
                            isAdmin = userRoles.Any(r => 
                                r.Name?.Contains("管理员") == true ||
                                r.Name?.ToLower() == "admin"
                            );
                        }
                        
                        var userCompany = new UserCompany
                        {
                            UserId = user.Id!,
                            CompanyId = user.CompanyId,
                            RoleIds = user.RoleIds ?? new List<string>(),
                            IsAdmin = isAdmin,
                            Status = "active",
                            JoinedAt = user.CreatedAt,
                            ApprovedBy = null,  // 历史数据，无审核人
                            ApprovedAt = user.CreatedAt
                        };
                        
                        await userCompanies.InsertOneAsync(userCompany);
                        Console.WriteLine($"  创建 UserCompany: {user.Username} → {user.CompanyId}");
                    }
                    
                    // 2. 更新用户记录
                    var update = Builders<AppUser>.Update
                        .Set(u => u.CurrentCompanyId, user.CompanyId)
                        .Set(u => u.PersonalCompanyId, user.CompanyId)  // 暂时设为当前企业
                        .Set(u => u.UpdatedAt, DateTime.UtcNow);
                    
                    await users.UpdateOneAsync(u => u.Id == user.Id, update);
                    
                    migratedCount++;
                }
                catch (Exception ex)
                {
                    Console.WriteLine($"❌ 迁移用户 {user.Username} 失败: {ex.Message}");
                }
            }
            
            Console.WriteLine($"✅ 迁移完成: 成功 {migratedCount} 个，跳过 {skippedCount} 个");
            Console.WriteLine("=== v3.0 → v3.1 数据迁移完成 ===");
        }
        catch (Exception ex)
        {
            Console.WriteLine($"❌ 数据迁移失败: {ex.Message}");
            Console.WriteLine($"Stack trace: {ex.StackTrace}");
            // 不抛异常，允许应用继续启动
        }
    }
}

