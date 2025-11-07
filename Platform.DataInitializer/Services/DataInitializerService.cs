using MongoDB.Driver;
using Platform.ServiceDefaults.Models;
using Platform.DataInitializer.Scripts;

namespace Platform.DataInitializer.Services;

/// <summary>
/// 数据初始化服务接口
/// </summary>
public interface IDataInitializerService
{
    Task InitializeAsync();
}

/// <summary>
/// 数据初始化服务
/// 负责执行所有必要的数据库初始化操作
/// 单实例运行，无需分布式锁
/// </summary>
public class DataInitializerService : IDataInitializerService
{
    private readonly IMongoDatabase _database;
    private readonly ILogger<DataInitializerService> _logger;
    private readonly ILoggerFactory _loggerFactory;

    public DataInitializerService(
        IMongoDatabase database,
        ILogger<DataInitializerService> logger,
        ILoggerFactory loggerFactory)
    {
        _database = database;
        _logger = logger;
        _loggerFactory = loggerFactory;
    }

    /// <summary>
    /// 执行数据初始化
    /// </summary>
    public async Task InitializeAsync()
    {
        _logger.LogInformation("========== 开始数据初始化 ==========");

        try
        {
            await ExecuteInitializationAsync();
            _logger.LogInformation("========== 数据初始化完成 ==========");
            _logger.LogInformation("🎉 所有数据库索引和系统菜单已成功创建");
            _logger.LogInformation("📊 初始化统计：");
            _logger.LogInformation("   - 数据库索引：已创建/更新");
            _logger.LogInformation("   - 系统菜单：已创建/验证");
            _logger.LogInformation("✅ DataInitializer 任务完成，服务可以安全停止");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "❌ 数据初始化失败");
            _logger.LogError("🛑 DataInitializer 将停止运行，请检查错误日志");
            throw; // 重新抛出异常，让 Program.cs 处理
        }
    }

    /// <summary>
    /// 执行实际的初始化操作
    /// </summary>
    private async Task ExecuteInitializationAsync()
    {
        _logger.LogInformation("开始执行数据初始化...");

        // 1. 创建所有数据库索引
        await CreateIndexesAsync();

        // 2. 创建全局系统菜单
        await CreateSystemMenusAsync();

        _logger.LogInformation("所有初始化操作执行完成");
    }

    /// <summary>
    /// 创建所有数据库索引
    /// </summary>
    private async Task CreateIndexesAsync()
    {
        try
        {
            _logger.LogInformation("开始创建数据库索引...");

            var indexCreator = new CreateAllIndexes(_database, 
                _loggerFactory.CreateLogger<CreateAllIndexes>());
            await indexCreator.ExecuteAsync();

            _logger.LogInformation("数据库索引创建完成");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "创建数据库索引失败");
            throw;
        }
    }

    /// <summary>
    /// 创建全局系统菜单（所有企业共享）
    /// 支持增量同步：检查每个菜单是否存在，不存在则创建
    /// </summary>
    private async Task CreateSystemMenusAsync()
    {
        try
        {
            _logger.LogInformation("开始同步全局系统菜单...");

            var menus = _database.GetCollection<Menu>("menus");
            var now = DateTime.UtcNow;

            // 定义所有预期的菜单（按依赖关系排序：先顶级菜单，再子菜单）
            var expectedMenus = GetExpectedMenus(now);

            int createdCount = 0;
            int skippedCount = 0;

            // 先处理顶级菜单（无 ParentId）
            var topLevelMenus = expectedMenus.Where(m => string.IsNullOrEmpty(m.ParentId)).ToList();
            var parentMenuIdMap = new Dictionary<string, string>();  // name -> id

            foreach (var menu in topLevelMenus)
            {
                var existingMenu = await menus.Find(m => m.Name == menu.Name && !m.IsDeleted)
                    .FirstOrDefaultAsync();

                if (existingMenu == null)
                {
                    await menus.InsertOneAsync(menu);
                    _logger.LogInformation("✅ 创建菜单: {Name} ({Title})", menu.Name, menu.Title);
                    createdCount++;
                    if (!string.IsNullOrEmpty(menu.Id))
                    {
                        parentMenuIdMap[menu.Name] = menu.Id;
                    }
                }
                else
                {
                    _logger.LogDebug("⏭️  菜单已存在: {Name} ({Title})", menu.Name, menu.Title);
                    skippedCount++;
                    if (!string.IsNullOrEmpty(existingMenu.Id))
                    {
                        parentMenuIdMap[menu.Name] = existingMenu.Id;
                    }
                }
            }

            // 再处理子菜单（需要父菜单的 ID）
            var childMenus = expectedMenus.Where(m => !string.IsNullOrEmpty(m.ParentId)).ToList();

            foreach (var menu in childMenus)
            {
                // 根据 ParentId 的名称查找父菜单的实际 ID
                var parentMenuName = GetParentMenuNameByChildName(menu.Name);
                if (!string.IsNullOrEmpty(parentMenuName) && parentMenuIdMap.TryGetValue(parentMenuName, out var parentId))
                {
                    menu.ParentId = parentId;
                }
                else if (!string.IsNullOrEmpty(parentMenuName))
                {
                    _logger.LogWarning("⚠️  未找到父菜单: {ParentName}，跳过子菜单: {Name}", parentMenuName, menu.Name);
                    skippedCount++;
                    continue;
                }

                var existingMenu = await menus.Find(m => m.Name == menu.Name && !m.IsDeleted)
                    .FirstOrDefaultAsync();

                if (existingMenu == null)
                {
                    await menus.InsertOneAsync(menu);
                    _logger.LogInformation("✅ 创建菜单: {Name} ({Title})", menu.Name, menu.Title);
                    createdCount++;
                }
                else
                {
                    _logger.LogDebug("⏭️  菜单已存在: {Name} ({Title})", menu.Name, menu.Title);
                    skippedCount++;
                }
            }

            _logger.LogInformation("全局系统菜单同步完成 - 新建: {Created} 个，已存在: {Skipped} 个，总计: {Total} 个",
                createdCount, skippedCount, expectedMenus.Count);

        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "创建全局系统菜单失败");
            throw;
        }
    }

    /// <summary>
    /// 获取所有预期的菜单定义
    /// 在此方法中添加新的菜单，系统会自动同步到数据库
    /// </summary>
    private List<Menu> GetExpectedMenus(DateTime now)
    {
        var menus = new List<Menu>();
        
        // 顶级菜单
        menus.Add(new Menu
        {
            Name = "welcome",
            Title = "欢迎",
            Path = "/welcome",
            Component = "./Welcome",
            Icon = "smile",
            SortOrder = 1,
            IsEnabled = true,
            IsDeleted = false,
            CreatedAt = now,
            UpdatedAt = now
        });
        
        menus.Add(new Menu
        {
            Name = "system",
            Title = "系统管理",
            Path = "/system",
            Icon = "setting",
            SortOrder = 2,
            IsEnabled = true,
            IsDeleted = false,
            CreatedAt = now,
            UpdatedAt = now
        });
        
        // 系统管理子菜单（注意：ParentId 需要在处理时动态设置）
        menus.Add(new Menu
        {
            Name = "user-management",
            Title = "用户管理",
            Path = "/system/user-management",
            Component = "./System/UserManagement",
            Icon = "user",
            ParentId = "system",  // 临时使用名称，后续会替换为实际 ID
            SortOrder = 1,
            IsEnabled = true,
            IsDeleted = false,
            Permissions = new List<string> { "user:read" },
            CreatedAt = now,
            UpdatedAt = now
        });
        
        menus.Add(new Menu
        {
            Name = "role-management",
            Title = "角色管理",
            Path = "/system/role-management",
            Component = "./System/RoleManagement",
            Icon = "team",
            ParentId = "system",  // 临时使用名称，后续会替换为实际 ID
            SortOrder = 2,
            IsEnabled = true,
            IsDeleted = false,
            Permissions = new List<string> { "role:read" },
            CreatedAt = now,
            UpdatedAt = now
        });
        
        menus.Add(new Menu
        {
            Name = "company-management",
            Title = "企业管理",
            Path = "/system/company-management",
            Component = "./System/CompanyManagement",
            Icon = "bank",
            ParentId = "system",  // 临时使用名称，后续会替换为实际 ID
            SortOrder = 3,
            IsEnabled = true,
            IsDeleted = false,
            Permissions = new List<string> { "company:read" },
            CreatedAt = now,
            UpdatedAt = now
        });
        
        menus.Add(new Menu
        {
            Name = "my-activity",
            Title = "我的活动",
            Path = "/system/my-activity",
            Component = "./System/MyActivity",
            Icon = "history",
            ParentId = "system",  // 临时使用名称，后续会替换为实际 ID
            SortOrder = 4,
            IsEnabled = true,
            IsDeleted = false,
            Permissions = new List<string>(),  // 无需权限，所有登录用户都可以查看自己的活动
            CreatedAt = now,
            UpdatedAt = now
        });
        
        // ⭐ 在此处添加新菜单，系统会自动同步到数据库
        
        return menus;
    }
    
    /// <summary>
    /// 根据子菜单名称获取父菜单名称
    /// </summary>
    private string? GetParentMenuNameByChildName(string childMenuName)
    {
        // 根据子菜单名称返回父菜单名称
        // 当前所有子菜单都属于 "system"
        return childMenuName switch
        {
            "user-management" => "system",
            "role-management" => "system",
            "company-management" => "system",
            "my-activity" => "system",
            _ => null
        };
    }
}
