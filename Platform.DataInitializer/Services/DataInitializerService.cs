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
    /// </summary>
    private async Task CreateSystemMenusAsync()
    {
        try
        {
            _logger.LogInformation("开始创建全局系统菜单...");

            var menus = _database.GetCollection<Menu>("menus");
            
            // 检查是否已经初始化过
            var existingCount = await menus.CountDocumentsAsync(Builders<Menu>.Filter.Empty);
            if (existingCount > 0)
            {
                _logger.LogInformation("全局菜单已存在（{Count} 个），跳过创建", existingCount);
                return;
            }

            var now = DateTime.UtcNow;
            
            // 创建顶级菜单
            var welcomeMenu = new Menu
            {
                Name = "welcome",
                Title = "欢迎",
                Path = "/welcome",
                Component = "./Welcome",
                Icon = "smile",
                SortOrder = 1,
                IsEnabled = true,
                IsDeleted = false,  // 明确设置未删除
                CreatedAt = now,
                UpdatedAt = now
            };
            
            var systemMenu = new Menu
            {
                Name = "system",
                Title = "系统管理",
                Path = "/system",
                Icon = "setting",
                SortOrder = 2,
                IsEnabled = true,
                IsDeleted = false,  // 明确设置未删除
                CreatedAt = now,
                UpdatedAt = now
            };
            
            // 先插入顶级菜单以获取ID
            await menus.InsertManyAsync(new[] { welcomeMenu, systemMenu });
            
            // 创建系统管理子菜单
            var childMenus = new[]
            {
                new Menu
                {
                    Name = "user-management",
                    Title = "用户管理",
                    Path = "/system/user-management",
                    Component = "./System/UserManagement",
                    Icon = "user",
                    ParentId = systemMenu.Id!,
                    SortOrder = 1,
                    IsEnabled = true,
                    IsDeleted = false,  // 明确设置未删除
                    Permissions = new List<string> { "user:read" },
                    CreatedAt = now,
                    UpdatedAt = now
                },
                new Menu
                {
                    Name = "role-management",
                    Title = "角色管理",
                    Path = "/system/role-management",
                    Component = "./System/RoleManagement",
                    Icon = "team",
                    ParentId = systemMenu.Id!,
                    SortOrder = 2,
                    IsEnabled = true,
                    IsDeleted = false,  // 明确设置未删除
                    Permissions = new List<string> { "role:read" },
                    CreatedAt = now,
                    UpdatedAt = now
                },
                new Menu
                {
                    Name = "company-management",
                    Title = "企业管理",
                    Path = "/system/company-management",
                    Component = "./System/CompanyManagement",
                    Icon = "bank",
                    ParentId = systemMenu.Id!,
                    SortOrder = 3,
                    IsEnabled = true,
                    IsDeleted = false,  // 明确设置未删除
                    Permissions = new List<string> { "company:read" },
                    CreatedAt = now,
                    UpdatedAt = now
                }
            };
            
            await menus.InsertManyAsync(childMenus);
            
            _logger.LogInformation("全局系统菜单创建完成，共创建 {Count} 个菜单", childMenus.Length + 2);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "创建全局系统菜单失败");
            throw;
        }
    }
}
