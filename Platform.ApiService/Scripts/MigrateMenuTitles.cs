using MongoDB.Driver;
using Platform.ApiService.Models;

namespace Platform.ApiService.Scripts;

/// <summary>
/// 菜单标题数据迁移工具
/// 为已存在但缺少 title 字段的菜单添加中文标题
/// </summary>
public class MigrateMenuTitles
{
    private readonly IMongoCollection<Menu> _menus;
    private readonly ILogger<MigrateMenuTitles> _logger;

    public MigrateMenuTitles(IMongoDatabase database, ILogger<MigrateMenuTitles> logger)
    {
        _menus = database.GetCollection<Menu>("menus");
        _logger = logger;
    }

    /// <summary>
    /// 执行菜单标题迁移
    /// </summary>
    public async Task MigrateAsync()
    {
        _logger.LogInformation("开始菜单标题数据迁移...");

        // 获取所有没有 title 或 title 为空的菜单
        var filter = Builders<Menu>.Filter.Or(
            Builders<Menu>.Filter.Eq(m => m.Title, null),
            Builders<Menu>.Filter.Eq(m => m.Title, "")
        );

        var menusToUpdate = await _menus.Find(filter).ToListAsync();

        if (menusToUpdate.Count == 0)
        {
            _logger.LogInformation("没有需要迁移的菜单");
            return;
        }

        _logger.LogInformation($"找到 {menusToUpdate.Count} 个需要迁移的菜单");

        // 菜单名称到中文标题的映射
        var titleMappings = new Dictionary<string, string>
        {
            { "welcome", "欢迎" },
            { "system", "系统管理" },
            { "user-management", "用户管理" },
            { "role-management", "角色管理" },
            { "menu-management", "菜单管理" },
            { "user-log", "用户日志" },
            { "account", "个人页" },
            { "center", "个人中心" },
            { "permission-management", "权限管理" },
        };

        int updatedCount = 0;
        int skippedCount = 0;

        foreach (var menu in menusToUpdate)
        {
            if (titleMappings.TryGetValue(menu.Name, out var title))
            {
                var update = Builders<Menu>.Update
                    .Set(m => m.Title, title)
                    .Set(m => m.UpdatedAt, DateTime.UtcNow);

                var result = await _menus.UpdateOneAsync(
                    m => m.Id == menu.Id,
                    update
                );

                if (result.ModifiedCount > 0)
                {
                    _logger.LogInformation($"✅ 更新菜单: {menu.Name} -> {title}");
                    updatedCount++;
                }
            }
            else
            {
                _logger.LogWarning($"⚠️  跳过未知菜单: {menu.Name}（请手动设置标题）");
                skippedCount++;
            }
        }

        _logger.LogInformation($"菜单标题迁移完成！更新: {updatedCount}, 跳过: {skippedCount}");
    }
}
