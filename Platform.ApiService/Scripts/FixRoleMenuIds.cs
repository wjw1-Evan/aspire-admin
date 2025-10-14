using MongoDB.Driver;
using Platform.ApiService.Models;

namespace Platform.ApiService.Scripts;

/// <summary>
/// 修复角色的MenuIds字段
/// 为所有管理员角色分配全局菜单
/// </summary>
public class FixRoleMenuIds
{
    private readonly IMongoDatabase _database;
    private readonly ILogger<FixRoleMenuIds> _logger;

    public FixRoleMenuIds(IMongoDatabase database, ILogger<FixRoleMenuIds> logger)
    {
        _database = database;
        _logger = logger;
    }

    public async Task ExecuteAsync()
    {
        try
        {
            _logger.LogInformation("========== 开始修复角色MenuIds ==========");

            var roles = _database.GetCollection<Role>("roles");
            var menus = _database.GetCollection<Menu>("menus");

            // 1. 获取所有启用的全局菜单ID
            var allMenus = await menus.Find(m => m.IsEnabled && !m.IsDeleted).ToListAsync();
            var allMenuIds = allMenus.Select(m => m.Id!).ToList();

            _logger.LogInformation("找到 {Count} 个全局菜单", allMenuIds.Count);

            if (allMenuIds.Count == 0)
            {
                _logger.LogWarning("⚠️ 没有找到全局菜单，请先运行数据库初始化");
                return;
            }

            // 2. 查找所有MenuIds为空或不存在的管理员角色
            var filter = Builders<Role>.Filter.And(
                Builders<Role>.Filter.Eq(r => r.Name, "管理员"),
                Builders<Role>.Filter.Eq(r => r.IsDeleted, false)
            );

            var adminRoles = await roles.Find(filter).ToListAsync();
            _logger.LogInformation("找到 {Count} 个管理员角色", adminRoles.Count);

            // 3. 更新每个角色的MenuIds
            int updatedCount = 0;
            foreach (var role in adminRoles)
            {
                if (role.MenuIds == null || role.MenuIds.Count == 0)
                {
                    var update = Builders<Role>.Update
                        .Set(r => r.MenuIds, allMenuIds)
                        .Set(r => r.UpdatedAt, DateTime.UtcNow);

                    await roles.UpdateOneAsync(
                        Builders<Role>.Filter.Eq(r => r.Id, role.Id),
                        update
                    );

                    updatedCount++;
                    _logger.LogInformation("✅ 更新角色 {RoleName} (ID: {RoleId})，分配 {MenuCount} 个菜单",
                        role.Name, role.Id, allMenuIds.Count);
                }
                else
                {
                    _logger.LogInformation("⏭️ 跳过角色 {RoleName} (ID: {RoleId})，已有 {MenuCount} 个菜单",
                        role.Name, role.Id, role.MenuIds.Count);
                }
            }

            _logger.LogInformation("========== 修复完成：更新了 {UpdatedCount}/{TotalCount} 个角色 ==========",
                updatedCount, adminRoles.Count);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "修复角色MenuIds失败");
            throw;
        }
    }
}

