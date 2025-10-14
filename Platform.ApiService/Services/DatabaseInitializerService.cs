using MongoDB.Driver;
using Platform.ApiService.Scripts;

namespace Platform.ApiService.Services;

/// <summary>
/// 数据库初始化服务接口
/// </summary>
public interface IDatabaseInitializerService
{
    Task InitializeAsync();
}

/// <summary>
/// 数据库初始化服务
/// 负责执行所有必要的数据库初始化操作
/// 使用分布式锁确保多实例安全
/// </summary>
public class DatabaseInitializerService : IDatabaseInitializerService
{
    private readonly IMongoDatabase _database;
    private readonly IDistributedLockService _lockService;
    private readonly ILogger<DatabaseInitializerService> _logger;
    private readonly ILoggerFactory _loggerFactory;

    public DatabaseInitializerService(
        IMongoDatabase database,
        IDistributedLockService lockService,
        ILogger<DatabaseInitializerService> logger,
        ILoggerFactory loggerFactory)
    {
        _database = database;
        _lockService = lockService;
        _logger = logger;
        _loggerFactory = loggerFactory;
    }

    /// <summary>
    /// 执行数据库初始化
    /// </summary>
    public async Task InitializeAsync()
    {
        _logger.LogInformation("========== 开始数据库初始化 ==========");

        try
        {
            // 使用分布式锁保护初始化过程
            // 锁名：database-initialization
            // 超时：60秒（索引创建可能需要较长时间）
            await _lockService.ExecuteWithLockAsync("database-initialization", async () =>
            {
                await ExecuteInitializationAsync();
            }, timeoutSeconds: 60);

            _logger.LogInformation("========== 数据库初始化完成 ==========");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "数据库初始化失败");
            // 不抛出异常，允许应用继续启动
            // 后续请求可能会触发自动重试
        }
    }

    /// <summary>
    /// 执行实际的初始化操作
    /// </summary>
    private async Task ExecuteInitializationAsync()
    {
        _logger.LogInformation("当前实例获得初始化锁，开始执行初始化...");

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

            var menus = _database.GetCollection<Models.Menu>("menus");
            
            // 检查是否已经初始化过
            var existingCount = await menus.CountDocumentsAsync(Builders<Models.Menu>.Filter.Empty);
            if (existingCount > 0)
            {
                _logger.LogInformation("全局菜单已存在（{Count} 个），跳过创建", existingCount);
                return;
            }

            var now = DateTime.UtcNow;
            
            // 创建顶级菜单
            var welcomeMenu = new Models.Menu
            {
                Name = "welcome",
                Title = "欢迎",
                Path = "/welcome",
                Component = "./Welcome",
                Icon = "smile",
                SortOrder = 1,
                IsEnabled = true,
                CreatedAt = now,
                UpdatedAt = now
            };
            
            var systemMenu = new Models.Menu
            {
                Name = "system",
                Title = "系统管理",
                Path = "/system",
                Icon = "setting",
                SortOrder = 2,
                IsEnabled = true,
                CreatedAt = now,
                UpdatedAt = now
            };
            
            // 先插入顶级菜单以获取ID
            await menus.InsertManyAsync(new[] { welcomeMenu, systemMenu });
            
            // 创建系统管理子菜单
            var childMenus = new[]
            {
                new Models.Menu
                {
                    Name = "user-management",
                    Title = "用户管理",
                    Path = "/system/user-management",
                    Component = "./user-management",
                    Icon = "user",
                    ParentId = systemMenu.Id,
                    SortOrder = 1,
                    IsEnabled = true,
                    Permissions = new List<string> { "user:read" },
                    CreatedAt = now,
                    UpdatedAt = now
                },
                new Models.Menu
                {
                    Name = "role-management",
                    Title = "角色管理",
                    Path = "/system/role-management",
                    Component = "./role-management",
                    Icon = "team",
                    ParentId = systemMenu.Id,
                    SortOrder = 2,
                    IsEnabled = true,
                    Permissions = new List<string> { "role:read" },
                    CreatedAt = now,
                    UpdatedAt = now
                },
                new Models.Menu
                {
                    Name = "user-log",
                    Title = "用户日志",
                    Path = "/system/user-log",
                    Component = "./user-log",
                    Icon = "file-text",
                    ParentId = systemMenu.Id,
                    SortOrder = 3,
                    IsEnabled = true,
                    Permissions = new List<string> { "activity-log:read" },
                    CreatedAt = now,
                    UpdatedAt = now
                },
                new Models.Menu
                {
                    Name = "company-settings",
                    Title = "企业设置",
                    Path = "/system/company-settings",
                    Component = "./company/settings",
                    Icon = "bank",
                    ParentId = systemMenu.Id,
                    SortOrder = 4,
                    IsEnabled = true,
                    Permissions = new List<string> { "company:read" },
                    CreatedAt = now,
                    UpdatedAt = now
                }
            };
            
            await menus.InsertManyAsync(childMenus);
            
            _logger.LogInformation("全局系统菜单创建完成（{Count} 个）", 2 + childMenus.Length);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "创建全局系统菜单失败");
            // 不抛出异常，允许应用继续启动
        }
    }
}

