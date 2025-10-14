using MongoDB.Driver;
using Platform.ApiService.Constants;
using Platform.ApiService.Extensions;
using Platform.ApiService.Models;

namespace Platform.ApiService.Services;

/// <summary>
/// 菜单访问权限服务实现
/// </summary>
public class MenuAccessService : BaseService, IMenuAccessService
{
    private readonly IMongoCollection<AppUser> _users;
    private readonly IMongoCollection<Role> _roles;
    private readonly IMongoCollection<Menu> _menus;
    private readonly IMongoCollection<UserCompany> _userCompanies;
    private readonly ILogger<MenuAccessService> _logger;

    public MenuAccessService(
        IMongoDatabase database,
        IHttpContextAccessor httpContextAccessor,
        ITenantContext tenantContext,
        ILogger<MenuAccessService> logger)
        : base(database, httpContextAccessor, tenantContext, logger)
    {
        _users = database.GetCollection<AppUser>("users");
        _roles = database.GetCollection<Role>("roles");
        _menus = database.GetCollection<Menu>("menus");
        _userCompanies = database.GetCollection<UserCompany>("userCompanies");
        _logger = logger;
    }

    public async Task<bool> HasMenuAccessAsync(string userId, string menuName)
    {
        var userMenuNames = await GetUserMenuNamesAsync(userId);
        return userMenuNames.Contains(menuName.ToLower());
    }

    public async Task<bool> HasAnyMenuAccessAsync(string userId, params string[] menuNames)
    {
        var userMenuNames = await GetUserMenuNamesAsync(userId);
        var lowerMenuNames = menuNames.Select(m => m.ToLower()).ToArray();
        return lowerMenuNames.Any(m => userMenuNames.Contains(m));
    }

    public async Task<List<string>> GetUserMenuNamesAsync(string userId)
    {
        try
        {
            // 获取用户信息
            var user = await _users.Find(u => u.Id == userId && !u.IsDeleted).FirstOrDefaultAsync();
            if (user == null || !user.IsActive)
            {
                return new List<string>();
            }

            var menuIds = new List<string>();

            // 获取用户在当前企业的角色
            var companyId = GetCurrentCompanyId();
            if (!string.IsNullOrEmpty(companyId))
            {
                var userCompanyFilter = Builders<UserCompany>.Filter.And(
                    Builders<UserCompany>.Filter.Eq(uc => uc.UserId, userId),
                    Builders<UserCompany>.Filter.Eq(uc => uc.CompanyId, companyId),
                    MongoFilterExtensions.NotDeleted<UserCompany>()
                );

                var userCompany = await _userCompanies.Find(userCompanyFilter).FirstOrDefaultAsync();
                
                if (userCompany?.RoleIds != null && userCompany.RoleIds.Any())
                {
                    // 获取用户的所有角色
                    var roleFilter = Builders<Role>.Filter.And(
                        Builders<Role>.Filter.In(r => r.Id, userCompany.RoleIds),
                        SoftDeleteExtensions.NotDeleted<Role>()
                    );
                    var roles = await _roles.Find(roleFilter).ToListAsync();

                    // 收集所有角色的菜单ID
                    foreach (var role in roles)
                    {
                        if (role.MenuIds != null)
                        {
                            menuIds.AddRange(role.MenuIds);
                        }
                    }
                }
            }

            // 去重菜单ID
            var uniqueMenuIds = menuIds.Distinct().ToList();
            if (!uniqueMenuIds.Any())
            {
                return new List<string>();
            }

            // 获取菜单详情
            var menuFilter = Builders<Menu>.Filter.And(
                Builders<Menu>.Filter.In(m => m.Id, uniqueMenuIds),
                Builders<Menu>.Filter.Eq(m => m.IsEnabled, true),
                MongoFilterExtensions.NotDeleted<Menu>()
            );
            var menus = await _menus.Find(menuFilter).ToListAsync();

            // 返回菜单名称列表（小写）
            return menus.Select(m => m.Name.ToLower()).Distinct().ToList();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "获取用户菜单名称失败: UserId={UserId}", userId);
            return new List<string>();
        }
    }
}

