using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Logging;
using MongoDB.Driver;
using MongoDB.Bson;

namespace Platform.ServiceDefaults.Services;

/// <summary>
/// 租户上下文接口 - 提供多租户支持
/// ⚠️ 重要变更：只有 userId 从 JWT token 读取，其他信息（角色、企业等）从数据库读取
/// </summary>
public interface ITenantContext
{
    /// <summary>
    /// 获取当前用户ID（从 JWT token 读取）
    /// </summary>
    string? GetCurrentUserId();

    /// <summary>
    /// 获取当前用户名（从数据库读取）
    /// </summary>
    string? GetCurrentUsername();

    /// <summary>
    /// 获取当前企业ID（从数据库读取 user.CurrentCompanyId）
    /// </summary>
    string? GetCurrentCompanyId();

    /// <summary>
    /// 获取当前企业名称（从数据库读取）
    /// </summary>
    string? GetCurrentCompanyName();

    /// <summary>
    /// 是否为管理员（从数据库读取）
    /// </summary>
    bool IsAdmin();

    /// <summary>
    /// 检查权限（从数据库读取）
    /// </summary>
    bool HasPermission(string permission);

    /// <summary>
    /// 获取用户权限列表（从数据库读取）
    /// </summary>
    IEnumerable<string> GetUserPermissions();
}

/// <summary>
/// 租户上下文实现 - userId 从 JWT token 读取，其他信息从数据库读取
/// </summary>
public class TenantContext : ITenantContext
{
    private readonly IHttpContextAccessor _httpContextAccessor;
    private readonly IMongoDatabase _database;
    private readonly ILogger<TenantContext> _logger;

    public TenantContext(
        IHttpContextAccessor httpContextAccessor,
        IMongoDatabase database,
        ILogger<TenantContext> logger)
    {
        _httpContextAccessor = httpContextAccessor;
        _database = database;
        _logger = logger;
    }

    /// <summary>
    /// 获取当前用户ID（仅从 JWT token 读取）
    /// </summary>
    public string? GetCurrentUserId()
    {
        return _httpContextAccessor.HttpContext?.User?.FindFirst("userId")?.Value;
    }

    /// <summary>
    /// 获取当前用户名（从数据库读取）
    /// </summary>
    public string? GetCurrentUsername()
    {
        var userInfo = LoadUserInfo();
        return userInfo?.Username;
    }

    /// <summary>
    /// 获取当前企业ID（从数据库读取 user.CurrentCompanyId）
    /// </summary>
    public string? GetCurrentCompanyId()
    {
        var userInfo = LoadUserInfo();
        return userInfo?.CompanyId;
    }

    /// <summary>
    /// 获取当前企业名称（从数据库读取）
    /// </summary>
    public string? GetCurrentCompanyName()
    {
        var userInfo = LoadUserInfo();
        return userInfo?.CompanyName;
    }

    /// <summary>
    /// 是否为管理员（从数据库读取）
    /// </summary>
    public bool IsAdmin()
    {
        var userInfo = LoadUserInfo();
        return userInfo?.IsAdmin ?? false;
    }

    /// <summary>
    /// 检查权限（从数据库读取）
    /// </summary>
    public bool HasPermission(string permission)
    {
        // 获取用户信息（避免重复查询）
        var userInfo = LoadUserInfo();
        if (userInfo == null)
            return false;
        
        // 管理员拥有所有权限
        if (userInfo.IsAdmin) return true;
        
        // 检查用户权限
        return userInfo.Permissions.Contains(permission);
    }

    /// <summary>
    /// 获取用户权限列表（从数据库读取）
    /// </summary>
    public IEnumerable<string> GetUserPermissions()
    {
        var userInfo = LoadUserInfo();
        return userInfo?.Permissions ?? Enumerable.Empty<string>();
    }

    /// <summary>
    /// 加载用户信息（每次调用都从数据库读取，无缓存）
    /// </summary>
    private UserInfo? LoadUserInfo()
    {
        // 获取用户ID
        var userId = GetCurrentUserId();
        if (string.IsNullOrEmpty(userId))
        {
            return null;
        }

        // 同步加载用户信息
        try
        {
            return LoadUserInfoAsync(userId).GetAwaiter().GetResult();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "加载用户信息失败: {UserId}", userId);
            return null;
        }
    }

    /// <summary>
    /// 异步加载用户信息（使用 BsonDocument 避免跨项目依赖）
    /// </summary>
    private async Task<UserInfo?> LoadUserInfoAsync(string userId)
    {
        try
        {
            // 1. 从数据库获取用户信息
            if (!ObjectId.TryParse(userId, out var userIdObjectId))
            {
                _logger.LogWarning("无效的用户ID格式: {UserId}", userId);
                return null;
            }

            var usersCollection = _database.GetCollection<BsonDocument>("appusers");
            var userFilter = Builders<BsonDocument>.Filter.And(
                Builders<BsonDocument>.Filter.Eq("_id", userIdObjectId),
                Builders<BsonDocument>.Filter.Eq("isDeleted", false)
            );
            var userDoc = await usersCollection.Find(userFilter).FirstOrDefaultAsync();

            if (userDoc == null)
            {
                return null;
            }

            var isActive = userDoc.GetValue("isActive", BsonValue.Create(false)).AsBoolean;
            if (!isActive)
            {
                return null;
            }

            var username = userDoc.GetValue("username", BsonString.Empty).AsString;
            var companyId = userDoc.GetValue("currentCompanyId", BsonNull.Value);
            
            if (companyId.IsBsonNull || string.IsNullOrEmpty(companyId.AsString))
            {
                // 没有当前企业，返回基本信息
                return CreateEmptyUserInfo(userId, username);
            }

            var currentCompanyId = companyId.AsString;

            // 2. 获取企业信息
            if (!ObjectId.TryParse(currentCompanyId, out var companyIdObjectId))
            {
                _logger.LogWarning("无效的企业ID格式: {CompanyId}", currentCompanyId);
                return CreateEmptyUserInfo(userId, username);
            }

            var companiesCollection = _database.GetCollection<BsonDocument>("companies");
            var companyFilter = Builders<BsonDocument>.Filter.And(
                Builders<BsonDocument>.Filter.Eq("_id", companyIdObjectId),
                Builders<BsonDocument>.Filter.Eq("isDeleted", false)
            );
            var companyDoc = await companiesCollection.Find(companyFilter).FirstOrDefaultAsync();
            var companyName = companyDoc?.GetValue("name", BsonString.Empty).AsString;

            // 3. 获取用户在企业中的角色信息
            var userCompaniesCollection = _database.GetCollection<BsonDocument>("user_companies");
            var userCompanyFilter = Builders<BsonDocument>.Filter.And(
                Builders<BsonDocument>.Filter.Eq("userId", userId),
                Builders<BsonDocument>.Filter.Eq("companyId", currentCompanyId),
                Builders<BsonDocument>.Filter.Eq("status", "active"),
                Builders<BsonDocument>.Filter.Eq("isDeleted", false)
            );
            var userCompanyDoc = await userCompaniesCollection.Find(userCompanyFilter).FirstOrDefaultAsync();

            var permissions = new List<string>();
            var isAdmin = false;

            if (userCompanyDoc != null)
            {
                isAdmin = userCompanyDoc.GetValue("isAdmin", BsonBoolean.False).AsBoolean;
                var roleIdsBson = userCompanyDoc.GetValue("roleIds", BsonNull.Value);

                if (!roleIdsBson.IsBsonNull && roleIdsBson.IsBsonArray)
                {
                    var roleIds = roleIdsBson.AsBsonArray.Select(r => r.AsString).ToList();

                    if (roleIds.Any())
                    {
                        // 4. 获取角色信息（仅用于获取菜单权限，不需要角色名称）
                        var roleObjectIds = new List<ObjectId>();
                        foreach (var roleId in roleIds)
                        {
                            if (ObjectId.TryParse(roleId, out var roleObjectId))
                            {
                                roleObjectIds.Add(roleObjectId);
                            }
                        }

                        if (roleObjectIds.Any())
                        {
                            var rolesCollection = _database.GetCollection<BsonDocument>("roles");
                            var roleFilter = Builders<BsonDocument>.Filter.And(
                                Builders<BsonDocument>.Filter.In("_id", roleObjectIds),
                                Builders<BsonDocument>.Filter.Eq("companyId", currentCompanyId),
                                Builders<BsonDocument>.Filter.Eq("isDeleted", false)
                            );
                            var roleDocs = await rolesCollection.Find(roleFilter).ToListAsync();

                            // 5. 收集所有角色的权限（从菜单中获取）
                            var menuIds = roleDocs
                                .SelectMany(r =>
                                {
                                    var menuIdsBson = r.GetValue("menuIds", BsonNull.Value);
                                    if (menuIdsBson.IsBsonNull || !menuIdsBson.IsBsonArray)
                                        return Enumerable.Empty<string>();
                                    return menuIdsBson.AsBsonArray.Select(m => m.AsString);
                                })
                                .Distinct()
                                .ToList();

                            if (menuIds.Any())
                            {
                                var menuObjectIds = new List<ObjectId>();
                                foreach (var menuId in menuIds)
                                {
                                    if (ObjectId.TryParse(menuId, out var menuObjectId))
                                    {
                                        menuObjectIds.Add(menuObjectId);
                                    }
                                }

                                if (menuObjectIds.Any())
                                {
                                    var menusCollection = _database.GetCollection<BsonDocument>("menus");
                                    var menuFilter = Builders<BsonDocument>.Filter.And(
                                        Builders<BsonDocument>.Filter.In("_id", menuObjectIds),
                                        Builders<BsonDocument>.Filter.Eq("isDeleted", false),
                                        Builders<BsonDocument>.Filter.Eq("isEnabled", true)
                                    );
                                    var menuDocs = await menusCollection.Find(menuFilter).ToListAsync();

                                    // 收集菜单的权限代码
                                    permissions = menuDocs
                                        .SelectMany(m =>
                                        {
                                            var permsBson = m.GetValue("permissions", BsonNull.Value);
                                            if (permsBson.IsBsonNull || !permsBson.IsBsonArray)
                                                return Enumerable.Empty<string>();
                                            return permsBson.AsBsonArray.Select(p => p.AsString);
                                        })
                                        .Distinct()
                                        .ToList();
                                }
                            }
                        }
                    }
                }
            }

            return new UserInfo
            {
                UserId = userId,
                Username = username,
                CompanyId = currentCompanyId,
                CompanyName = companyName,
                IsAdmin = isAdmin,
                Permissions = permissions
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "加载用户信息异常: {UserId}", userId);
            return null;
        }
    }

    /// <summary>
    /// 创建空的用户信息（用于无企业场景）
    /// </summary>
    private static UserInfo CreateEmptyUserInfo(string userId, string username)
    {
        return new UserInfo
        {
            UserId = userId,
            Username = username,
            CompanyId = null,
            CompanyName = null,
            IsAdmin = false,
            Permissions = new List<string>()
        };
    }

    /// <summary>
    /// 用户信息模型
    /// </summary>
    private class UserInfo
    {
        public string UserId { get; set; } = string.Empty;
        public string Username { get; set; } = string.Empty;
        public string? CompanyId { get; set; }
        public string? CompanyName { get; set; }
        public bool IsAdmin { get; set; }
        public List<string> Permissions { get; set; } = new();
    }
}
