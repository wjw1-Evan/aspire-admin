using System.Text.Json;
using MongoDB.Bson;
using MongoDB.Driver;
using Platform.ServiceDefaults.Models;

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
            await SyncMenusAsync();
            await EnsureDefaultXiaokeConfigAsync();

            _logger.LogInformation("========== 数据初始化完成 ==========");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "❌ 数据初始化过程中发生错误");
            throw;
        }
    }

    private async Task EnsureDefaultXiaokeConfigAsync()
    {
        _logger.LogInformation("检查默认小科配置...");

        var defaultCompanyId = "default";
        var collection = _database.GetCollection<XiaokeConfigInput>("XiaokeConfig");

        var existing = await collection.Find(c => c.IsDefault == true && c.CompanyId == defaultCompanyId).FirstOrDefaultAsync();
        if (existing != null)
        {
            _logger.LogInformation("默认小科配置已存在，跳过创建");
            return;
        }

        var config = new XiaokeConfigInput
        {
            Id = ObjectId.GenerateNewId().ToString(),
            CompanyId = defaultCompanyId,
            Name = "默认配置",
            Model = "gpt-4o-mini",
            SystemPrompt = "你是小科，请使用简体中文提供简洁、专业且友好的回复。",
            Temperature = 0.7,
            MaxTokens = 2000,
            TopP = 1.0,
            FrequencyPenalty = 0.0,
            PresencePenalty = 0.0,
            IsEnabled = true,
            IsDefault = true,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow,
            IsDeleted = false
        };

        await collection.InsertOneAsync(config);
        _logger.LogInformation("✅ 已创建默认小科配置: {Model}", config.Model);
    }

    private class XiaokeConfigInput
    {
        public string Id { get; set; } = string.Empty;
        public string CompanyId { get; set; } = string.Empty;
        public string Name { get; set; } = string.Empty;
        public string Model { get; set; } = string.Empty;
        public string SystemPrompt { get; set; } = string.Empty;
        public double Temperature { get; set; }
        public int MaxTokens { get; set; }
        public double TopP { get; set; }
        public double FrequencyPenalty { get; set; }
        public double PresencePenalty { get; set; }
        public bool IsEnabled { get; set; }
        public bool IsDefault { get; set; }
        public DateTime CreatedAt { get; set; }
        public DateTime UpdatedAt { get; set; }
        public bool IsDeleted { get; set; }
    }

    private async Task SyncMenusAsync()
    {
        _logger.LogInformation("开始同步系统菜单...");
        var menusCollection = _database.GetCollection<Menu>("Menu");

        // 加载 JSON 数据
        var jsonPath = Path.Combine(AppContext.BaseDirectory, "Menus.json");
        if (!File.Exists(jsonPath)) jsonPath = "Menus.json"; // 兜底

        var json = await File.ReadAllTextAsync(jsonPath);
        var expectedMenus = JsonSerializer.Deserialize<List<Menu>>(json, new JsonSerializerOptions { PropertyNameCaseInsensitive = true }) ?? new();

        var menuMap = new Dictionary<string, string>(); // Name -> Id
        var now = DateTime.UtcNow;

        // 第一遍：创建或获取菜单，建立 ID 映射
        foreach (var menu in expectedMenus)
        {
            // 🔒 修复：暂时保存并清空 ParentId。
            // JSON 中的 ParentId 是父菜单的 Name 字符串，直接插入会导致 MongoDB ObjectId 序列化失败
            var parentName = menu.ParentId;
            menu.ParentId = null;

            var existing = await menusCollection.Find(m => m.Name == menu.Name && m.IsDeleted != true).FirstOrDefaultAsync();
            if (existing == null)
            {
                menu.CreatedAt = now;
                await menusCollection.InsertOneAsync(menu);
                menuMap[menu.Name] = menu.Id;
                _logger.LogInformation("✅ 创建菜单: {Title}", menu.Title);
            }
            else
            {
                menuMap[menu.Name] = existing.Id;
                // 更新菜单基本信息
                var update = Builders<Menu>.Update
                    .Set(m => m.Title, menu.Title)
                    .Set(m => m.Path, menu.Path)
                    .Set(m => m.Icon, menu.Icon)
                    .Set(m => m.SortOrder, menu.SortOrder)
                    .Set(m => m.UpdatedAt, now);
                await menusCollection.UpdateOneAsync(m => m.Id == existing.Id, update);
            }

            // 还原 ParentId 用于第二遍关联映射
            menu.ParentId = parentName;
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
