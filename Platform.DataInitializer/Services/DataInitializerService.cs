using System.Text.Json;
using MongoDB.Driver;
using Platform.ServiceDefaults.Models;
using Platform.DataInitializer.Scripts;

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
    IMongoDatabase database,
    ILogger<DataInitializerService> logger,
    ILoggerFactory loggerFactory) : IDataInitializerService
{
    private readonly IMongoDatabase _database = database;
    private readonly ILogger<DataInitializerService> _logger = logger;
    private readonly ILoggerFactory _loggerFactory = loggerFactory;

    public async Task InitializeAsync()
    {
        _logger.LogInformation("========== 开始数据初始化 ==========");
        try
        {
            // 1. 创建索引
            await new CreateAllIndexes(_database, _loggerFactory.CreateLogger<CreateAllIndexes>()).ExecuteAsync();

            // 2. 同步菜单
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
        var menusCollection = _database.GetCollection<Menu>("menus");
        
        // 加载 JSON 数据
        var jsonPath = Path.Combine(AppContext.BaseDirectory, "Menus.json");
        if (!File.Exists(jsonPath)) jsonPath = "Menus.json"; // 兜底
        
        var json = await File.ReadAllTextAsync(jsonPath);
        var expectedMenus = JsonSerializer.Deserialize<List<Menu>>(json, new JsonSerializerOptions { PropertyNameCaseInsensitive = true }) ?? new();

        var menuMap = new Dictionary<string, string>(); // Name -> Id
        var now = DateTime.UtcNow;

        // 第一遍：创建或获取顶级菜单，建立 ID 映射
        foreach (var menu in expectedMenus)
        {
            var existing = await menusCollection.Find(m => m.Name == menu.Name && !m.IsDeleted).FirstOrDefaultAsync();
            if (existing == null)
            {
                menu.CreatedAt = menu.UpdatedAt = now;
                await menusCollection.InsertOneAsync(menu);
                menuMap[menu.Name] = menu.Id;
                _logger.LogInformation("✅ 创建顶级菜单: {Title}", menu.Title);
            }
            else
            {
                menuMap[menu.Name] = existing.Id;
                // 可选：更新菜单基本信息
                var update = Builders<Menu>.Update
                    .Set(m => m.Title, menu.Title)
                    .Set(m => m.Path, menu.Path)
                    .Set(m => m.Icon, menu.Icon)
                    .Set(m => m.SortOrder, menu.SortOrder)
                    .Set(m => m.UpdatedAt, now);
                await menusCollection.UpdateOneAsync(m => m.Id == existing.Id, update);
            }
        }

        // 第二遍：建立父子关联（ParentId 在数据库中存的是 ObjectId，但在 JSON 中是父菜单 Name）
        foreach (var menu in expectedMenus)
        {
            if (string.IsNullOrEmpty(menu.ParentId)) continue;

            if (menuMap.TryGetValue(menu.ParentId, out var parentId))
            {
                var update = Builders<Menu>.Update.Set(m => m.ParentId, parentId);
                await menusCollection.UpdateOneAsync(m => m.Name == menu.Name, update);
            }
        }

        _logger.LogInformation("系统菜单同步完成，总数: {Count}", expectedMenus.Count);
    }
}
