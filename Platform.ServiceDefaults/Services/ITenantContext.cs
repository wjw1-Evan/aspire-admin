using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Logging;
using MongoDB.Driver;
using MongoDB.Bson;

namespace Platform.ServiceDefaults.Services;

/// <summary>
/// 租户上下文接口 - 提供多租户支持
/// ⚠️ 重要变更：只有 userId 从 JWT token 读取，其他信息（角色、企业等）从数据库读取
/// ⚠️ v6.1 异步改造：所有方法改为异步，避免死锁风险，提高性能
/// </summary>
public interface ITenantContext
{
    /// <summary>
    /// 获取当前用户ID（从 JWT token 读取）
    /// </summary>
    string? GetCurrentUserId();

    /// <summary>
    /// 获取当前用户名（从数据库读取，带缓存）
    /// </summary>
    Task<string?> GetCurrentUsernameAsync();

    /// <summary>
    /// 获取当前企业ID（从数据库读取 user.CurrentCompanyId，带缓存）
    /// </summary>
    Task<string?> GetCurrentCompanyIdAsync();

    /// <summary>
    /// 获取当前企业名称（从数据库读取，带缓存）
    /// </summary>
    Task<string?> GetCurrentCompanyNameAsync();

    /// <summary>
    /// 是否为管理员（从数据库读取，带缓存）
    /// </summary>
    Task<bool> IsAdminAsync();

    /// <summary>
    /// 检查权限（从数据库读取，带缓存）
    /// </summary>
    Task<bool> HasPermissionAsync(string permission);

    /// <summary>
    /// 获取用户权限列表（从数据库读取，带缓存）
    /// </summary>
    Task<IEnumerable<string>> GetUserPermissionsAsync();

    /// <summary>
    /// 🚀 清除用户缓存（用于用户更新后）
    /// </summary>
    void ClearUserCache(string userId);
}

/// <summary>
/// 租户上下文实现 - userId 从 JWT token 读取，其他信息从数据库读取
/// </summary>
public class TenantContext : ITenantContext
{
    private readonly IHttpContextAccessor _httpContextAccessor;
    private readonly IMongoDatabase _database;
    private readonly ILogger<TenantContext> _logger;
    private UserInfo? _cachedUserInfo;

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
        try
        {
            var user = _httpContextAccessor.HttpContext?.User;
            if (user == null)
            {
                return null;
            }

            // 优先读取自定义 userId，其次兼容常见的标识声明类型
            var uid = user.FindFirst("userId")?.Value
                      ?? user.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value
                      ?? user.FindFirst("sub")?.Value;

            if (string.IsNullOrEmpty(uid))
            {
                _logger.LogWarning("TenantContext: 未在 JWT 中找到用户标识声明（userId/nameid/sub）");
            }
            return uid;
        }
        catch (ObjectDisposedException)
        {
            // HttpContext 已被释放（常见于后台线程场景）
            // 返回 null，调用方应该提供备用值
            return null;
        }
    }

    /// <summary>
    /// 获取当前用户名（从数据库读取）
    /// </summary>
    public async Task<string?> GetCurrentUsernameAsync()
    {
        var userInfo = await LoadUserInfoAsync();
        return userInfo?.Username;
    }

    /// <summary>
    /// 获取当前企业ID（从数据库读取 user.CurrentCompanyId）
    /// </summary>
    public async Task<string?> GetCurrentCompanyIdAsync()
    {
        var userInfo = await LoadUserInfoAsync();
        return userInfo?.CompanyId;
    }

    /// <summary>
    /// 获取当前企业名称（从数据库读取）
    /// </summary>
    public async Task<string?> GetCurrentCompanyNameAsync()
    {
        var userInfo = await LoadUserInfoAsync();
        return userInfo?.CompanyName;
    }

    /// <summary>
    /// 是否为管理员（从数据库读取）
    /// </summary>
    public async Task<bool> IsAdminAsync()
    {
        var userInfo = await LoadUserInfoAsync();
        return userInfo?.IsAdmin ?? false;
    }

    /// <summary>
    /// 检查权限（从数据库读取）
    /// </summary>
    public async Task<bool> HasPermissionAsync(string permission)
    {
        var userId = GetCurrentUserId();
        if (string.IsNullOrEmpty(userId))
            return false;

        // 获取用户信息
        var userInfo = await LoadUserInfoAsync();
        if (userInfo == null)
            return false;

        // 管理员拥有所有权限
        if (userInfo.IsAdmin)
        {
            return true;
        }

        // 检查用户权限
        return userInfo.Permissions.Contains(permission);
    }

    /// <summary>
    /// 获取用户权限列表（从数据库读取）
    /// </summary>
    public async Task<IEnumerable<string>> GetUserPermissionsAsync()
    {
        var userId = GetCurrentUserId();
        if (string.IsNullOrEmpty(userId))
            return Enumerable.Empty<string>();

        var userInfo = await LoadUserInfoAsync();
        return userInfo?.Permissions ?? new List<string>();
    }

    /// <summary>
    /// 加载用户信息（从数据库读取）
    /// </summary>
    private async Task<UserInfo?> LoadUserInfoAsync()
    {
        // 🚀 性能优化：返回 Scoped 级别的缓存结果
        if (_cachedUserInfo != null)
        {
            return _cachedUserInfo;
        }

        // 获取用户ID
        var userId = GetCurrentUserId();
        if (string.IsNullOrEmpty(userId))
        {
            return null;
        }

        try
        {
            _cachedUserInfo = await LoadUserInfoInternalAsync(userId);
            return _cachedUserInfo;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "加载用户信息失败: {UserId}", userId);
            return null;
        }
    }

    /// <summary>
    /// 🚀 异步加载用户信息（使用 BsonDocument 避免跨项目依赖，优化数据库查询）
    /// </summary>
    private async Task<UserInfo?> LoadUserInfoInternalAsync(string userId)
    {
        try
        {
            // 1. 从数据库获取用户信息
            var usersCollection = _database.GetCollection<BsonDocument>("appusers");
            var userFilter = Builders<BsonDocument>.Filter.And(
                Builders<BsonDocument>.Filter.Or(
                    Builders<BsonDocument>.Filter.Eq("_id", userId),
                    Builders<BsonDocument>.Filter.Eq("_id", ObjectId.TryParse(userId, out var uid) ? uid : ObjectId.Empty)
                ),
                Builders<BsonDocument>.Filter.Ne("isDeleted", true)
            );

            // 🚀 只投影需要的字段，减少数据传输
            var userProjection = Builders<BsonDocument>.Projection.Include("username")
                .Include("isActive")
                .Include("currentCompanyId")
                .Include("personalCompanyId");

            var userDoc = await usersCollection.Find(userFilter)
                .Project(userProjection)
                .FirstOrDefaultAsync();

            if (userDoc == null)
            {
                _logger.LogWarning("未找到用户文档: {UserId}", userId);
                return null;
            }

            var isActive = userDoc.GetValue("isActive", BsonBoolean.False).AsBoolean;
            if (!isActive)
            {
                _logger.LogWarning("用户未激活: {UserId}", userId);
                return null;
            }

            var username = userDoc.GetValue("username", BsonString.Empty).AsString;
            var companyId = userDoc.GetValue("currentCompanyId", BsonNull.Value);

            // 🚀 如果 currentCompanyId 为空，尝试使用 personalCompanyId 作为后备
            string? currentCompanyId = GetBsonIdString(companyId);
            if (string.IsNullOrEmpty(currentCompanyId))
            {
                var personalCompanyId = userDoc.GetValue("personalCompanyId", BsonNull.Value);
                currentCompanyId = GetBsonIdString(personalCompanyId);
                if (!string.IsNullOrEmpty(currentCompanyId))
                {
                    // ⚠️ 注意：此处 userId 是用户 ID，currentCompanyId 是从 personalCompanyId 字段读取的企业 ID
                    _logger.LogInformation("TenantContext: [后备] 用户 {UserId} 缺少 currentCompanyId，启用后备策略使用个人企业 ID: {CompanyId}", userId, currentCompanyId);
                }
            }
            else
            {
                // ⚠️ 明确区分：userId = 用户唯一标识 (如 6989...49), currentCompanyId = 当前选中的企业 ID (如 6989...4a)
                _logger.LogInformation("TenantContext: [获取] 成功获取用户 {UserId} 的当前选中企业 currentCompanyId: {CurrentCompanyId}", userId, currentCompanyId);
            }

            if (string.IsNullOrEmpty(currentCompanyId))
            {
                // 没有当前企业，返回基本信息
                _logger.LogWarning("TenantContext: [缺失] 用户没有设置 currentCompanyId 或 personalCompanyId: {UserId}", userId);
                return CreateEmptyUserInfo(userId, username);
            }

            // 🚀 并行查询企业信息和用户企业关系
            _logger.LogInformation("TenantContext: [加载] 开始并行加载企业和成员关系: {UserId}, CompanyId: {CompanyId}", userId, currentCompanyId);
            var companyTask = GetCompanyInfoAsync(currentCompanyId);
            var userCompanyTask = GetUserCompanyInfoAsync(userId, currentCompanyId);

            await Task.WhenAll(companyTask, userCompanyTask);

            var (companyName, companyExists) = await companyTask;
            var (isAdmin, roleIds) = await userCompanyTask;

            // 🚀 特殊逻辑：如果是个人企业，强制拥有管理员权限（解决数据一致性导致的 403 错误）
            var userPersonalCompanyId = GetBsonIdString(userDoc.GetValue("personalCompanyId", BsonNull.Value));
            if (!isAdmin && !string.IsNullOrEmpty(userPersonalCompanyId) && currentCompanyId == userPersonalCompanyId)
            {
                _logger.LogInformation("TenantContext: [自动授权] 用户 {UserId} 正在访问个人企业 {CompanyId}，自动授予管理员权限", userId, currentCompanyId);
                isAdmin = true;
            }

            if (!companyExists)
            {
                return CreateEmptyUserInfo(userId, username);
            }

            // 🚀 获取权限（如果有角色）
            var permissions = new List<string>();
            if (roleIds.Count > 0 && !isAdmin) // 管理员不需要查询权限
            {
                permissions = await GetPermissionsFromRolesAsync(roleIds, currentCompanyId);
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
    /// 🚀 获取企业信息
    /// </summary>
    private async Task<(string? companyName, bool exists)> GetCompanyInfoAsync(string companyId)
    {
        var companiesCollection = _database.GetCollection<BsonDocument>("companies");
        var companyFilter = Builders<BsonDocument>.Filter.And(
            Builders<BsonDocument>.Filter.Or(
                Builders<BsonDocument>.Filter.Eq("_id", companyId),
                Builders<BsonDocument>.Filter.Eq("_id", ObjectId.TryParse(companyId, out var cid) ? cid : ObjectId.Empty)
            ),
            Builders<BsonDocument>.Filter.Ne("isDeleted", true)
        );

        var projection = Builders<BsonDocument>.Projection.Include("name");
        var companyDoc = await companiesCollection.Find(companyFilter)
            .Project(projection)
            .FirstOrDefaultAsync();

        if (companyDoc == null)
        {
            return (null, false);
        }

        var companyName = companyDoc.GetValue("name", BsonString.Empty).AsString;
        return (companyName, true);
    }

    /// <summary>
    /// 🚀 获取用户企业关系信息
    /// </summary>
    private async Task<(bool isAdmin, List<string> roleIds)> GetUserCompanyInfoAsync(string userId, string companyId)
    {
        var userCompaniesCollection = _database.GetCollection<BsonDocument>("user_companies");
        var userCompanyFilter = Builders<BsonDocument>.Filter.And(
            Builders<BsonDocument>.Filter.Or(
                Builders<BsonDocument>.Filter.Eq("userId", userId),
                Builders<BsonDocument>.Filter.Eq("userId", ObjectId.TryParse(userId, out var uid) ? uid : ObjectId.Empty)
            ),
            Builders<BsonDocument>.Filter.Or(
                Builders<BsonDocument>.Filter.Eq("companyId", companyId),
                Builders<BsonDocument>.Filter.Eq("companyId", ObjectId.TryParse(companyId, out var cid) ? cid : ObjectId.Empty)
            ),
            Builders<BsonDocument>.Filter.Eq("status", "active"),
            Builders<BsonDocument>.Filter.Ne("isDeleted", true)
        );

        var projection = Builders<BsonDocument>.Projection.Include("isAdmin").Include("roleIds");
        var userCompanyDoc = await userCompaniesCollection.Find(userCompanyFilter)
            .Project(projection)
            .FirstOrDefaultAsync();

        if (userCompanyDoc == null)
        {
            return (false, new List<string>());
        }

        var isAdmin = userCompanyDoc.GetValue("isAdmin", BsonBoolean.False).AsBoolean;
        var roleIds = new List<string>();

        var roleIdsBson = userCompanyDoc.GetValue("roleIds", BsonNull.Value);
        if (!roleIdsBson.IsBsonNull && roleIdsBson.IsBsonArray)
        {
            roleIds = roleIdsBson.AsBsonArray
                .Select(r => r.AsString)
                .Where(r => !string.IsNullOrEmpty(r))
                .ToList();
        }

        return (isAdmin, roleIds);
    }

    /// <summary>
    /// 🚀 兼容 ObjectId/string 的企业ID解析
    /// </summary>
    private static string? GetBsonIdString(BsonValue value)
    {
        if (value == null || value.IsBsonNull)
        {
            return null;
        }

        if (value.IsString)
        {
            return string.IsNullOrWhiteSpace(value.AsString) ? null : value.AsString;
        }

        if (value.IsObjectId)
        {
            var objectId = value.AsObjectId;
            return objectId == ObjectId.Empty ? null : objectId.ToString();
        }

        return value.ToString();
    }

    /// <summary>
    /// 🚀 从角色获取权限
    /// </summary>
    private async Task<List<string>> GetPermissionsFromRolesAsync(List<string> roleIds, string companyId)
    {
        var roleObjectIds = roleIds
            .Select(r => ObjectId.TryParse(r, out var id) ? (ObjectId?)id : null)
            .Where(id => id.HasValue)
            .Select(id => id!.Value)
            .ToList();

        if (roleObjectIds.Count == 0)
        {
            return new List<string>();
        }

        var rolesCollection = _database.GetCollection<BsonDocument>("roles");
        var roleFilter = Builders<BsonDocument>.Filter.And(
            Builders<BsonDocument>.Filter.In("_id", roleObjectIds),
            Builders<BsonDocument>.Filter.Or(
                Builders<BsonDocument>.Filter.Eq("companyId", companyId),
                Builders<BsonDocument>.Filter.Eq("companyId", ObjectId.TryParse(companyId, out var rid) ? rid : ObjectId.Empty)
            ),
            Builders<BsonDocument>.Filter.Ne("isDeleted", true)
        );

        var projection = Builders<BsonDocument>.Projection.Include("menuIds");
        var roleDocs = await rolesCollection.Find(roleFilter)
            .Project(projection)
            .ToListAsync();

        // 收集所有菜单ID
        var menuIds = roleDocs
            .SelectMany(r =>
            {
                var menuIdsBson = r.GetValue("menuIds", BsonNull.Value);
                if (menuIdsBson.IsBsonNull || !menuIdsBson.IsBsonArray)
                    return Enumerable.Empty<string>();
                return menuIdsBson.AsBsonArray.Select(m => m.AsString);
            })
            .Where(m => !string.IsNullOrEmpty(m))
            .Distinct()
            .ToList();

        if (menuIds.Count == 0)
        {
            return new List<string>();
        }

        // 查询菜单权限
        var menuObjectIds = menuIds
            .Select(m => ObjectId.TryParse(m, out var id) ? (ObjectId?)id : null)
            .Where(id => id.HasValue)
            .Select(id => id!.Value)
            .ToList();

        if (menuObjectIds.Count == 0)
        {
            return new List<string>();
        }

        var menusCollection = _database.GetCollection<BsonDocument>("menus");
        var menuFilter = Builders<BsonDocument>.Filter.And(
            Builders<BsonDocument>.Filter.In("_id", menuObjectIds),
            Builders<BsonDocument>.Filter.Ne("isDeleted", true),
            Builders<BsonDocument>.Filter.Eq("isEnabled", true)
        );

        var menuProjection = Builders<BsonDocument>.Projection.Include("permissions");
        var menuDocs = await menusCollection.Find(menuFilter)
            .Project(menuProjection)
            .ToListAsync();

        // 收集权限
        return menuDocs
            .SelectMany(m =>
            {
                var permsBson = m.GetValue("permissions", BsonNull.Value);
                if (permsBson.IsBsonNull || !permsBson.IsBsonArray)
                    return Enumerable.Empty<string>();
                return permsBson.AsBsonArray.Select(p => p.AsString);
            })
            .Where(p => !string.IsNullOrEmpty(p))
            .Distinct()
            .ToList();
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
    /// 🚀 清除用户缓存
    /// </summary>
    public void ClearUserCache(string userId)
    {
        // 清除 Scoped 缓存
        _cachedUserInfo = null;
        _logger.LogDebug("TenantContext: 缓存已清除: {UserId}", userId);
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
