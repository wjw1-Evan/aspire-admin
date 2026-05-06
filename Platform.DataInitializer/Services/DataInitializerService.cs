using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Platform.ServiceDefaults.Models;
using Platform.ServiceDefaults.Services;

namespace Platform.DataInitializer.Services;

public interface IDataInitializerService
{
    Task InitializeAsync();
}

/// <summary>
/// 数据初始化服务 - 精简版
/// 职责：加载 JSON 菜单数据、执行索引脚本、同步菜单
/// </summary>
public class DataInitializerService(
    DbContext context,
    ILogger<DataInitializerService> logger,
    ILoggerFactory loggerFactory) : IDataInitializerService
{
    private readonly DbContext _context = context;
    private readonly ILogger<DataInitializerService> _logger = logger;
    private readonly ILoggerFactory _loggerFactory = loggerFactory;

    public async Task InitializeAsync()
    {
        _logger.LogInformation("========== 开始数据初始化 ==========");
        try
        {
            //  PlatformDbContext.SetContext("default", "system");

            await SyncMenusAsync();

            _logger.LogInformation("========== 数据初始化完成 ==========");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "❌ 数据初始化过程中发生错误");
            throw;
        }
    }

    private async Task SyncMenusAsync()
    {
        _logger.LogInformation("开始同步系统菜单...");

        var jsonPath = Path.Combine(AppContext.BaseDirectory, "Menus.json");
        if (!File.Exists(jsonPath)) jsonPath = "Menus.json";

        var json = await File.ReadAllTextAsync(jsonPath);
        var expectedMenus = JsonSerializer.Deserialize<List<Menu>>(json, new JsonSerializerOptions { PropertyNameCaseInsensitive = true }) ?? new();

        var menuMap = new Dictionary<string, string>();
        var now = DateTime.UtcNow;

        foreach (var menu in expectedMenus)
        {
            var parentName = menu.ParentId;
            menu.ParentId = null;

            var existing = await _context.Set<Menu>()
                .FirstOrDefaultAsync(m => m.Name == menu.Name && m.IsDeleted != true);

            if (existing == null)
            {
                _context.Set<Menu>().Add(menu);
                await _context.SaveChangesAsync();
                menuMap[menu.Name] = menu.Id;
                _logger.LogInformation("✅ 创建菜单: {Title}", menu.Title);
            }
            else
            {
                menuMap[menu.Name] = existing.Id;
                existing.Title = menu.Title;
                existing.Path = menu.Path;
                existing.Icon = menu.Icon;
                existing.SortOrder = menu.SortOrder;
                existing.UpdatedAt = now;

                await _context.SaveChangesAsync();
            }

            menu.ParentId = parentName;
        }

        foreach (var menu in expectedMenus)
        {
            if (string.IsNullOrEmpty(menu.ParentId)) continue;

            if (menuMap.TryGetValue(menu.ParentId, out var parentId))
            {
                var menuToUpdate = await _context.Set<Menu>()
                    .FirstOrDefaultAsync(m => m.Name == menu.Name && m.IsDeleted != true);

                if (menuToUpdate != null && menuToUpdate.ParentId != parentId)
                {
                    menuToUpdate.ParentId = parentId;
                    await _context.SaveChangesAsync();
                }
            }
        }

        _logger.LogInformation("系统菜单同步完成，总数: {Count}", expectedMenus.Count);
    }
}
