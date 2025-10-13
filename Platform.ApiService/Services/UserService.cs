using MongoDB.Driver;
using Platform.ApiService.Constants;
using Platform.ApiService.Extensions;
using Platform.ApiService.Models;

namespace Platform.ApiService.Services;

public class UserService : BaseService, IUserService
{
    private readonly BaseRepository<AppUser> _userRepository;
    private readonly IMongoCollection<UserActivityLog> _activityLogs;
    private readonly IMongoCollection<Permission> _permissions;
    private readonly IMongoCollection<Role> _roles;
    private readonly IUniquenessChecker _uniquenessChecker;
    private readonly IFieldValidationService _validationService;
    
    // 快捷访问器，用于需要直接访问集合的场景
    private IMongoCollection<AppUser> _users => _userRepository.Collection;

    public UserService(
        IMongoDatabase database, 
        IHttpContextAccessor httpContextAccessor,
        ILogger<UserService> logger,
        IUniquenessChecker uniquenessChecker,
        IFieldValidationService validationService)
        : base(database, httpContextAccessor, logger)
    {
        _userRepository = new BaseRepository<AppUser>(database, "users", httpContextAccessor);
        _activityLogs = GetCollection<UserActivityLog>("user_activity_logs");
        _permissions = GetCollection<Permission>("permissions");
        _roles = GetCollection<Role>("roles");
        _uniquenessChecker = uniquenessChecker;
        _validationService = validationService;
    }

    /// <summary>
    /// 获取所有未删除的用户
    /// </summary>
    public async Task<List<AppUser>> GetAllUsersAsync()
    {
        return await _userRepository.GetAllAsync();
    }

    /// <summary>
    /// 根据ID获取用户
    /// </summary>
    /// <param name="id">用户ID</param>
    /// <returns>用户对象，不存在或已删除则返回 null</returns>
    public async Task<AppUser?> GetUserByIdAsync(string id)
    {
        return await _userRepository.GetByIdAsync(id);
    }

    public async Task<AppUser> CreateUserAsync(CreateUserRequest request)
    {
        var user = new AppUser
        {
            Username = request.Name,
            Email = request.Email,
            RoleIds = new List<string>(), // 空角色列表，需要管理员分配
            IsActive = true,
            IsDeleted = false,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        await _users.InsertOneAsync(user);
        return user;
    }

    /// <summary>
    /// 创建用户（用户管理）
    /// </summary>
    /// <param name="request">创建用户请求</param>
    /// <returns>创建的用户对象</returns>
    /// <exception cref="InvalidOperationException">用户名或邮箱已存在时抛出</exception>
    public async Task<AppUser> CreateUserManagementAsync(CreateUserManagementRequest request)
    {
        // 使用通用验证服务
        _validationService.ValidateUsername(request.Username);
        _validationService.ValidatePassword(request.Password);
        _validationService.ValidateEmail(request.Email);

        // 使用唯一性检查服务
        await _uniquenessChecker.EnsureUsernameUniqueAsync(request.Username);
        if (!string.IsNullOrEmpty(request.Email))
        {
            await _uniquenessChecker.EnsureEmailUniqueAsync(request.Email);
        }

        // 创建密码哈希
        var passwordHash = BCrypt.Net.BCrypt.HashPassword(request.Password);

        var user = new AppUser
        {
            Username = request.Username,
            Email = request.Email,
            PasswordHash = passwordHash,
            RoleIds = request.RoleIds ?? new List<string>(),
            IsActive = request.IsActive,
            IsDeleted = false,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        await _users.InsertOneAsync(user);
        return user;
    }

    public async Task<AppUser?> UpdateUserAsync(string id, UpdateUserRequest request)
    {
        var filter = Builders<AppUser>.Filter.Eq(user => user.Id, id);
        var update = Builders<AppUser>.Update
            .Set(user => user.UpdatedAt, DateTime.UtcNow);

        if (!string.IsNullOrEmpty(request.Name))
            update = update.Set(user => user.Username, request.Name);
        
        if (!string.IsNullOrEmpty(request.Email))
            update = update.Set(user => user.Email, request.Email);

        var result = await _users.UpdateOneAsync(filter, update);
        
        if (result.ModifiedCount > 0)
        {
            return await GetUserByIdAsync(id);
        }
        
        return null;
    }

    /// <summary>
    /// 更新用户（用户管理）
    /// </summary>
    /// <param name="id">用户ID</param>
    /// <param name="request">更新用户请求</param>
    /// <returns>更新后的用户对象，不存在则返回 null</returns>
    /// <exception cref="InvalidOperationException">用户名或邮箱已存在时抛出</exception>
    public async Task<AppUser?> UpdateUserManagementAsync(string id, UpdateUserManagementRequest request)
    {
        var filter = Builders<AppUser>.Filter.Eq(user => user.Id, id);
        var update = Builders<AppUser>.Update
            .Set(user => user.UpdatedAt, DateTime.UtcNow);

        if (!string.IsNullOrEmpty(request.Username))
        {
            // 使用唯一性检查服务
            await _uniquenessChecker.EnsureUsernameUniqueAsync(request.Username, excludeUserId: id);
            update = update.Set(user => user.Username, request.Username);
        }

        if (!string.IsNullOrEmpty(request.Email))
        {
            // 使用唯一性检查服务
            _validationService.ValidateEmail(request.Email);
            await _uniquenessChecker.EnsureEmailUniqueAsync(request.Email, excludeUserId: id);
            update = update.Set(user => user.Email, request.Email);
        }

        if (request.RoleIds != null)
            update = update.Set(user => user.RoleIds, request.RoleIds);

        if (request.IsActive.HasValue)
            update = update.Set(user => user.IsActive, request.IsActive.Value);

        var result = await _users.UpdateOneAsync(filter, update);
        
        if (result.ModifiedCount > 0)
        {
            return await GetUserByIdAsync(id);
        }
        
        return null;
    }

    /// <summary>
    /// 软删除用户
    /// </summary>
    public async Task<bool> DeleteUserAsync(string id, string? reason = null)
    {
        return await _userRepository.SoftDeleteAsync(id, reason);
    }

    public async Task<List<AppUser>> SearchUsersByNameAsync(string name)
    {
        var filter = Builders<AppUser>.Filter.Regex(user => user.Username, new MongoDB.Bson.BsonRegularExpression(name, "i"));
        return await _userRepository.FindAsync(filter);
    }

    public async Task<bool> DeactivateUserAsync(string id)
    {
        var update = Builders<AppUser>.Update.Set(user => user.IsActive, false);
        return await _userRepository.UpdateAsync(id, update);
    }

    public async Task<bool> ActivateUserAsync(string id)
    {
        var update = Builders<AppUser>.Update.Set(user => user.IsActive, true);
        return await _userRepository.UpdateAsync(id, update);
    }

    // 新增的用户管理功能
    public async Task<UserListResponse> GetUsersWithPaginationAsync(UserListRequest request)
    {
        var filter = MongoFilterExtensions.NotDeleted<AppUser>();

        // 搜索过滤
        if (!string.IsNullOrEmpty(request.Search))
        {
            var searchFilter = Builders<AppUser>.Filter.Or(
                Builders<AppUser>.Filter.Regex(user => user.Username, new MongoDB.Bson.BsonRegularExpression(request.Search, "i")),
                Builders<AppUser>.Filter.Regex(user => user.Email, new MongoDB.Bson.BsonRegularExpression(request.Search, "i"))
            );
            filter = Builders<AppUser>.Filter.And(filter, searchFilter);
        }

        // 角色过滤（按 RoleIds）
        if (request.RoleIds != null && request.RoleIds.Count > 0)
        {
            filter = Builders<AppUser>.Filter.And(filter, Builders<AppUser>.Filter.AnyIn(user => user.RoleIds, request.RoleIds));
        }
        
        // 日期范围过滤
        if (request.StartDate.HasValue)
        {
            filter = Builders<AppUser>.Filter.And(filter, Builders<AppUser>.Filter.Gte(user => user.CreatedAt, request.StartDate.Value));
        }
        if (request.EndDate.HasValue)
        {
            filter = Builders<AppUser>.Filter.And(filter, Builders<AppUser>.Filter.Lte(user => user.CreatedAt, request.EndDate.Value));
        }

        // 状态过滤
        if (request.IsActive.HasValue)
        {
            filter = Builders<AppUser>.Filter.And(filter, Builders<AppUser>.Filter.Eq(user => user.IsActive, request.IsActive.Value));
        }

        // 排序
        var sortDefinition = request.SortOrder?.ToLower() == "asc" 
            ? Builders<AppUser>.Sort.Ascending(request.SortBy)
            : Builders<AppUser>.Sort.Descending(request.SortBy);

        // 分页
        var skip = (request.Page - 1) * request.PageSize;
        var users = await _users.Find(filter)
            .Sort(sortDefinition)
            .Skip(skip)
            .Limit(request.PageSize)
            .ToListAsync();

        var total = await _users.CountDocumentsAsync(filter);

        return new UserListResponse
        {
            Users = users,
            Total = (int)total,
            Page = request.Page,
            PageSize = request.PageSize
        };
    }

    public async Task<UserStatisticsResponse> GetUserStatisticsAsync()
    {
        var notDeletedFilter = SoftDeleteExtensions.NotDeleted<AppUser>();
        
        var totalUsers = await _users.CountDocumentsAsync(notDeletedFilter);
        
        var activeFilter = Builders<AppUser>.Filter.And(notDeletedFilter, 
            Builders<AppUser>.Filter.Eq(user => user.IsActive, true));
        var activeUsers = await _users.CountDocumentsAsync(activeFilter);
        var inactiveUsers = totalUsers - activeUsers;
        
        // 查询所有管理员角色（admin 和 super-admin）
        var adminRoleNames = new[] { "admin", "super-admin" };
        var adminRoleFilter = Builders<Role>.Filter.And(
            Builders<Role>.Filter.In(r => r.Name, adminRoleNames),
            SoftDeleteExtensions.NotDeleted<Role>()
        );
        var adminRoles = await _roles.Find(adminRoleFilter).ToListAsync();
        var adminRoleIds = adminRoles.Select(r => r.Id).Where(id => !string.IsNullOrEmpty(id)).ToList();
        
        // 统计拥有管理员角色的用户数量
        var adminUsers = 0L;
        if (adminRoleIds.Any())
        {
            var adminUserFilter = Builders<AppUser>.Filter.And(
                notDeletedFilter,
                Builders<AppUser>.Filter.AnyIn(u => u.RoleIds, adminRoleIds)
            );
            adminUsers = await _users.CountDocumentsAsync(adminUserFilter);
        }
        
        var regularUsers = totalUsers - adminUsers;

        var today = DateTime.UtcNow.Date;
        var thisWeek = today.AddDays(-(int)today.DayOfWeek);
        var thisMonth = new DateTime(today.Year, today.Month, 1, 0, 0, 0, DateTimeKind.Utc);

        var todayFilter = Builders<AppUser>.Filter.And(notDeletedFilter,
            Builders<AppUser>.Filter.Gte(user => user.CreatedAt, today));
        var newUsersToday = await _users.CountDocumentsAsync(todayFilter);
        
        var weekFilter = Builders<AppUser>.Filter.And(notDeletedFilter,
            Builders<AppUser>.Filter.Gte(user => user.CreatedAt, thisWeek));
        var newUsersThisWeek = await _users.CountDocumentsAsync(weekFilter);
        
        var monthFilter = Builders<AppUser>.Filter.And(notDeletedFilter,
            Builders<AppUser>.Filter.Gte(user => user.CreatedAt, thisMonth));
        var newUsersThisMonth = await _users.CountDocumentsAsync(monthFilter);

        return new UserStatisticsResponse
        {
            TotalUsers = (int)totalUsers,
            ActiveUsers = (int)activeUsers,
            InactiveUsers = (int)inactiveUsers,
            AdminUsers = (int)adminUsers,
            RegularUsers = (int)regularUsers,
            NewUsersToday = (int)newUsersToday,
            NewUsersThisWeek = (int)newUsersThisWeek,
            NewUsersThisMonth = (int)newUsersThisMonth
        };
    }

    /// <summary>
    /// 批量操作用户（激活、停用、软删除）
    /// </summary>
    public async Task<bool> BulkUpdateUsersAsync(BulkUserActionRequest request, string? reason = null)
    {
        var filter = Builders<AppUser>.Filter.And(
            Builders<AppUser>.Filter.In(user => user.Id, request.UserIds),
            SoftDeleteExtensions.NotDeleted<AppUser>()
        );
        var update = Builders<AppUser>.Update.Set(user => user.UpdatedAt, DateTime.UtcNow);

        switch (request.Action.ToLower())
        {
            case "activate":
                update = update.Set(user => user.IsActive, true);
                break;
            case "deactivate":
                update = update.Set(user => user.IsActive, false);
                break;
            case "delete":
                var currentUserId = GetCurrentUserId();
                var deleteCount = await _users.SoftDeleteManyAsync(filter, currentUserId, reason);
                return deleteCount > 0;
            default:
                return false;
        }

        var result = await _users.UpdateManyAsync(filter, update);
        return result.ModifiedCount > 0;
    }

    public Task<bool> UpdateUserRoleAsync(string id, string role)
    {
        // 注意：此方法已废弃，使用 RoleIds 代替
        throw new InvalidOperationException("此方法已废弃，请使用 UpdateUserManagementAsync 更新用户的 RoleIds");
    }

    public async Task LogUserActivityAsync(string userId, string action, string description, string? ipAddress = null, string? userAgent = null)
    {
        var log = new UserActivityLog
        {
            UserId = userId,
            Action = action,
            Description = description,
            IpAddress = ipAddress,
            UserAgent = userAgent,
            IsDeleted = false,
            CreatedAt = DateTime.UtcNow
        };

        await _activityLogs.InsertOneAsync(log);
    }

    public async Task<List<UserActivityLog>> GetUserActivityLogsAsync(string userId, int limit = 50)
    {
        return await _activityLogs
            .Find(log => log.UserId == userId)
            .Sort(Builders<UserActivityLog>.Sort.Descending(log => log.CreatedAt))
            .Limit(limit)
            .ToListAsync();
    }

    /// <summary>
    /// 获取所有用户的活动日志（分页）- 旧版本，存在 N+1 问题
    /// </summary>
    [Obsolete("此方法存在 N+1 查询问题，请使用 GetAllActivityLogsWithUsersAsync 代替")]
    public async Task<(List<UserActivityLog> logs, long total)> GetAllActivityLogsAsync(
        int page = 1, 
        int pageSize = 20, 
        string? userId = null,
        string? action = null,
        DateTime? startDate = null,
        DateTime? endDate = null)
    {
        var filterBuilder = Builders<UserActivityLog>.Filter;
        var filter = filterBuilder.Empty;

        // 按用户ID过滤
        if (!string.IsNullOrEmpty(userId))
        {
            filter &= filterBuilder.Eq(log => log.UserId, userId);
        }

        // 按操作类型过滤
        if (!string.IsNullOrEmpty(action))
        {
            filter &= filterBuilder.Eq(log => log.Action, action);
        }

        // 按日期范围过滤
        if (startDate.HasValue)
        {
            filter &= filterBuilder.Gte(log => log.CreatedAt, startDate.Value);
        }
        if (endDate.HasValue)
        {
            filter &= filterBuilder.Lte(log => log.CreatedAt, endDate.Value);
        }

        // 获取总数
        var total = await _activityLogs.CountDocumentsAsync(filter);

        // 获取分页数据
        var logs = await _activityLogs
            .Find(filter)
            .Sort(Builders<UserActivityLog>.Sort.Descending(log => log.CreatedAt))
            .Skip((page - 1) * pageSize)
            .Limit(pageSize)
            .ToListAsync();

        return (logs, total);
    }
    
    /// <summary>
    /// 获取所有用户的活动日志（分页）- 优化版本，使用批量查询
    /// </summary>
    public async Task<(List<UserActivityLog> logs, long total, Dictionary<string, string> userMap)> GetAllActivityLogsWithUsersAsync(
        int page = 1, 
        int pageSize = 20, 
        string? userId = null,
        string? action = null,
        DateTime? startDate = null,
        DateTime? endDate = null)
    {
        var filterBuilder = Builders<UserActivityLog>.Filter;
        var filter = filterBuilder.Empty;

        // 按用户ID过滤
        if (!string.IsNullOrEmpty(userId))
        {
            filter &= filterBuilder.Eq(log => log.UserId, userId);
        }

        // 按操作类型过滤
        if (!string.IsNullOrEmpty(action))
        {
            filter &= filterBuilder.Eq(log => log.Action, action);
        }

        // 按日期范围过滤
        if (startDate.HasValue)
        {
            filter &= filterBuilder.Gte(log => log.CreatedAt, startDate.Value);
        }
        if (endDate.HasValue)
        {
            filter &= filterBuilder.Lte(log => log.CreatedAt, endDate.Value);
        }

        // 获取总数
        var total = await _activityLogs.CountDocumentsAsync(filter);

        // 获取分页数据
        var logs = await _activityLogs
            .Find(filter)
            .Sort(Builders<UserActivityLog>.Sort.Descending(log => log.CreatedAt))
            .Skip((page - 1) * pageSize)
            .Limit(pageSize)
            .ToListAsync();

        // 批量获取用户信息（解决 N+1 问题）
        var userIds = logs.Select(log => log.UserId).Distinct().ToList();
        var userFilter = Builders<AppUser>.Filter.And(
            Builders<AppUser>.Filter.In(u => u.Id, userIds),
            SoftDeleteExtensions.NotDeleted<AppUser>()
        );
        var users = await _users.Find(userFilter).ToListAsync();
        
        // 构建用户 ID 到用户名的映射
        var userMap = users.ToDictionary(u => u.Id!, u => u.Username);

        return (logs, total, userMap);
    }

    public async Task<bool> CheckEmailExistsAsync(string email, string? excludeUserId = null)
    {
        var filter = Builders<AppUser>.Filter.Eq(user => user.Email, email);
        
        if (!string.IsNullOrEmpty(excludeUserId))
        {
            filter = Builders<AppUser>.Filter.And(filter, Builders<AppUser>.Filter.Ne(user => user.Id, excludeUserId));
        }

        return await _userRepository.ExistsAsync(filter);
    }

    public async Task<bool> CheckUsernameExistsAsync(string username, string? excludeUserId = null)
    {
        var filter = Builders<AppUser>.Filter.Eq(user => user.Username, username);
        
        if (!string.IsNullOrEmpty(excludeUserId))
        {
            filter = Builders<AppUser>.Filter.And(filter, Builders<AppUser>.Filter.Ne(user => user.Id, excludeUserId));
        }

        return await _userRepository.ExistsAsync(filter);
    }

    // 个人中心相关方法
    public async Task<AppUser?> UpdateUserProfileAsync(string userId, UpdateProfileRequest request)
    {
        var filter = Builders<AppUser>.Filter.Eq(user => user.Id, userId);
        var update = Builders<AppUser>.Update
            .Set(user => user.UpdatedAt, DateTime.UtcNow);

        // 注意：用户名（Username）字段禁止修改，已在控制器层过滤

        if (!string.IsNullOrEmpty(request.Email))
        {
            // 检查邮箱是否已存在（排除当前用户）
            var emailFilter = Builders<AppUser>.Filter.And(
                Builders<AppUser>.Filter.Eq(u => u.Email, request.Email),
                Builders<AppUser>.Filter.Ne(u => u.Id, userId),
                SoftDeleteExtensions.NotDeleted<AppUser>()
            );
            var existingEmail = await _users.Find(emailFilter).FirstOrDefaultAsync();
            if (existingEmail != null)
            {
                throw new InvalidOperationException("邮箱已存在");
            }
            update = update.Set(user => user.Email, request.Email);
        }

        if (!string.IsNullOrEmpty(request.Name))
            update = update.Set(user => user.Name, request.Name);

        if (request.Age.HasValue)
            update = update.Set(user => user.Age, request.Age.Value);

        var result = await _users.UpdateOneAsync(filter, update);

        if (result.ModifiedCount > 0)
        {
            return await GetUserByIdAsync(userId);
        }

        return null;
    }

    public async Task<bool> ChangePasswordAsync(string userId, ChangePasswordRequest request)
    {
        var user = await GetUserByIdAsync(userId);
        if (user == null)
            return false;

        // 验证当前密码
        if (!BCrypt.Net.BCrypt.Verify(request.CurrentPassword, user.PasswordHash))
            return false;

        // 更新密码
        var newPasswordHash = BCrypt.Net.BCrypt.HashPassword(request.NewPassword);
        var filter = Builders<AppUser>.Filter.Eq(u => u.Id, userId);
        var update = Builders<AppUser>.Update
            .Set(u => u.PasswordHash, newPasswordHash)
            .Set(u => u.UpdatedAt, DateTime.UtcNow);

        var result = await _users.UpdateOneAsync(filter, update);
        return result.ModifiedCount > 0;
    }

    /// <summary>
    /// 为用户分配自定义权限
    /// </summary>
    public async Task<bool> AssignCustomPermissionsAsync(string userId, List<string> permissionIds)
    {
        var result = await _users.UpdateOneAsync(
            u => u.Id == userId,
            Builders<AppUser>.Update
                .Set(u => u.CustomPermissionIds, permissionIds)
                .Set(u => u.UpdatedAt, DateTime.UtcNow)
        );

        return result.ModifiedCount > 0;
    }

    /// <summary>
    /// 获取用户的自定义权限
    /// </summary>
    public async Task<List<Permission>> GetUserCustomPermissionsAsync(string userId)
    {
        var user = await GetUserByIdAsync(userId);
        if (user == null || user.CustomPermissionIds == null || user.CustomPermissionIds.Count == 0)
        {
            return new List<Permission>();
        }

        var filter = Builders<Permission>.Filter.And(
            Builders<Permission>.Filter.In(p => p.Id, user.CustomPermissionIds),
            SoftDeleteExtensions.NotDeleted<Permission>()
        );
        return await _permissions.Find(filter).ToListAsync();
    }

    /// <summary>
    /// 获取用户的所有权限（角色权限 + 自定义权限）
    /// </summary>
    public async Task<UserPermissionsResponse> GetUserAllPermissionsAsync(string userId)
    {
        // 直接实现权限获取逻辑，避免循环依赖
        var user = await GetUserByIdAsync(userId);
        if (user == null)
        {
            return new UserPermissionsResponse();
        }

        var rolePermissions = new List<Permission>();
        var customPermissions = new List<Permission>();

        // 获取角色权限
        if (user.RoleIds != null && user.RoleIds.Count > 0)
        {
            var roleFilter = Builders<Role>.Filter.And(
                Builders<Role>.Filter.In(r => r.Id, user.RoleIds),
                Builders<Role>.Filter.Eq(r => r.IsActive, true),
                SoftDeleteExtensions.NotDeleted<Role>()
            );
            var roles = await _roles.Find(roleFilter).ToListAsync();

            var rolePermissionIds = roles.SelectMany(r => r.PermissionIds).Distinct().ToList();
            if (rolePermissionIds.Count > 0)
            {
                var permFilter = Builders<Permission>.Filter.And(
                    Builders<Permission>.Filter.In(p => p.Id, rolePermissionIds),
                    SoftDeleteExtensions.NotDeleted<Permission>()
                );
                rolePermissions = await _permissions.Find(permFilter).ToListAsync();
            }
        }

        // 获取用户自定义权限
        if (user.CustomPermissionIds != null && user.CustomPermissionIds.Count > 0)
        {
            var customPermFilter = Builders<Permission>.Filter.And(
                Builders<Permission>.Filter.In(p => p.Id, user.CustomPermissionIds),
                SoftDeleteExtensions.NotDeleted<Permission>()
            );
            customPermissions = await _permissions.Find(customPermFilter).ToListAsync();
        }

        // 合并所有权限代码（去重）
        var allPermissionCodes = rolePermissions.Select(p => p.Code)
            .Concat(customPermissions.Select(p => p.Code))
            .Distinct()
            .ToList();

        return new UserPermissionsResponse
        {
            RolePermissions = rolePermissions,
            CustomPermissions = customPermissions,
            AllPermissionCodes = allPermissionCodes
        };
    }
}
