using MongoDB.Driver;
using Platform.ApiService.Models;

namespace Platform.ApiService.Services;

public class UserService : IUserService
{
    private readonly IMongoCollection<AppUser> _users;
    private readonly IMongoCollection<UserActivityLog> _activityLogs;
    private readonly IMongoCollection<Permission> _permissions;
    private readonly IMongoCollection<Role> _roles;
    private readonly IHttpContextAccessor _httpContextAccessor;
    private readonly ILogger<UserService> _logger;

    public UserService(
        IMongoDatabase database, 
        IHttpContextAccessor httpContextAccessor,
        ILogger<UserService> logger)
    {
        _users = database.GetCollection<AppUser>("users");
        _activityLogs = database.GetCollection<UserActivityLog>("user_activity_logs");
        _permissions = database.GetCollection<Permission>("permissions");
        _roles = database.GetCollection<Role>("roles");
        _httpContextAccessor = httpContextAccessor;
        _logger = logger;
    }

    /// <summary>
    /// 获取当前操作用户ID
    /// </summary>
    private string? GetCurrentUserId()
    {
        return _httpContextAccessor.HttpContext?.User?.FindFirst("userId")?.Value;
    }

    public async Task<List<AppUser>> GetAllUsersAsync()
    {
        var filter = SoftDeleteExtensions.NotDeleted<AppUser>();
        return await _users.Find(filter).ToListAsync();
    }

    public async Task<AppUser?> GetUserByIdAsync(string id)
    {
        var filter = Builders<AppUser>.Filter.And(
            Builders<AppUser>.Filter.Eq(user => user.Id, id),
            SoftDeleteExtensions.NotDeleted<AppUser>()
        );
        return await _users.Find(filter).FirstOrDefaultAsync();
    }

    public async Task<AppUser> CreateUserAsync(CreateUserRequest request)
    {
        var user = new AppUser
        {
            Username = request.Name,
            Email = request.Email,
            Role = "user", // 默认为普通用户
            IsActive = true,
            IsDeleted = false,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        await _users.InsertOneAsync(user);
        return user;
    }

    public async Task<AppUser> CreateUserManagementAsync(CreateUserManagementRequest request)
    {
        // 检查用户名是否已存在
        var usernameFilter = Builders<AppUser>.Filter.And(
            Builders<AppUser>.Filter.Eq(u => u.Username, request.Username),
            SoftDeleteExtensions.NotDeleted<AppUser>()
        );
        var existingUser = await _users.Find(usernameFilter).FirstOrDefaultAsync();
        if (existingUser != null)
        {
            throw new InvalidOperationException("用户名已存在");
        }

        // 检查邮箱是否已存在
        if (!string.IsNullOrEmpty(request.Email))
        {
            var emailFilter = Builders<AppUser>.Filter.And(
                Builders<AppUser>.Filter.Eq(u => u.Email, request.Email),
                SoftDeleteExtensions.NotDeleted<AppUser>()
            );
            var existingEmail = await _users.Find(emailFilter).FirstOrDefaultAsync();
            if (existingEmail != null)
            {
                throw new InvalidOperationException("邮箱已存在");
            }
        }

        // 创建密码哈希
        var passwordHash = BCrypt.Net.BCrypt.HashPassword(request.Password);

        var user = new AppUser
        {
            Username = request.Username,
            Email = request.Email,
            PasswordHash = passwordHash,
            Role = request.Role ?? "user", // 如果未提供，默认为 user
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

    public async Task<AppUser?> UpdateUserManagementAsync(string id, UpdateUserManagementRequest request)
    {
        var filter = Builders<AppUser>.Filter.Eq(user => user.Id, id);
        var update = Builders<AppUser>.Update
            .Set(user => user.UpdatedAt, DateTime.UtcNow);

        if (!string.IsNullOrEmpty(request.Username))
        {
            // 检查用户名是否已存在（排除当前用户）
            var usernameFilter = Builders<AppUser>.Filter.And(
                Builders<AppUser>.Filter.Eq(u => u.Username, request.Username),
                Builders<AppUser>.Filter.Ne(u => u.Id, id),
                SoftDeleteExtensions.NotDeleted<AppUser>()
            );
            var existingUser = await _users.Find(usernameFilter).FirstOrDefaultAsync();
            if (existingUser != null)
            {
                throw new InvalidOperationException("用户名已存在");
            }
            update = update.Set(user => user.Username, request.Username);
        }
        
        if (!string.IsNullOrEmpty(request.Email))
        {
            // 检查邮箱是否已存在（排除当前用户）
            var emailFilter = Builders<AppUser>.Filter.And(
                Builders<AppUser>.Filter.Eq(u => u.Email, request.Email),
                Builders<AppUser>.Filter.Ne(u => u.Id, id),
                SoftDeleteExtensions.NotDeleted<AppUser>()
            );
            var existingEmail = await _users.Find(emailFilter).FirstOrDefaultAsync();
            if (existingEmail != null)
            {
                throw new InvalidOperationException("邮箱已存在");
            }
            update = update.Set(user => user.Email, request.Email);
        }

        if (!string.IsNullOrEmpty(request.Role))
            update = update.Set(user => user.Role, request.Role);

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
        var currentUserId = GetCurrentUserId();
        var filter = Builders<AppUser>.Filter.And(
            Builders<AppUser>.Filter.Eq(user => user.Id, id),
            SoftDeleteExtensions.NotDeleted<AppUser>()
        );
        return await _users.SoftDeleteOneAsync(filter, currentUserId, reason);
    }

    public async Task<List<AppUser>> SearchUsersByNameAsync(string name)
    {
        var filter = Builders<AppUser>.Filter.And(
            Builders<AppUser>.Filter.Regex(user => user.Username, new MongoDB.Bson.BsonRegularExpression(name, "i")),
            SoftDeleteExtensions.NotDeleted<AppUser>()
        );
        return await _users.Find(filter).ToListAsync();
    }

    public async Task<bool> DeactivateUserAsync(string id)
    {
        var filter = Builders<AppUser>.Filter.Eq(user => user.Id, id);
        var update = Builders<AppUser>.Update
            .Set(user => user.IsActive, false)
            .Set(user => user.UpdatedAt, DateTime.UtcNow);

        var result = await _users.UpdateOneAsync(filter, update);
        return result.ModifiedCount > 0;
    }

    public async Task<bool> ActivateUserAsync(string id)
    {
        var filter = Builders<AppUser>.Filter.Eq(user => user.Id, id);
        var update = Builders<AppUser>.Update
            .Set(user => user.IsActive, true)
            .Set(user => user.UpdatedAt, DateTime.UtcNow);

        var result = await _users.UpdateOneAsync(filter, update);
        return result.ModifiedCount > 0;
    }

    // 新增的用户管理功能
    public async Task<UserListResponse> GetUsersWithPaginationAsync(UserListRequest request)
    {
        var filter = SoftDeleteExtensions.NotDeleted<AppUser>();

        // 搜索过滤
        if (!string.IsNullOrEmpty(request.Search))
        {
            var searchFilter = Builders<AppUser>.Filter.Or(
                Builders<AppUser>.Filter.Regex(user => user.Username, new MongoDB.Bson.BsonRegularExpression(request.Search, "i")),
                Builders<AppUser>.Filter.Regex(user => user.Email, new MongoDB.Bson.BsonRegularExpression(request.Search, "i"))
            );
            filter = Builders<AppUser>.Filter.And(filter, searchFilter);
        }

        // 角色过滤
        if (!string.IsNullOrEmpty(request.Role))
        {
            filter = Builders<AppUser>.Filter.And(filter, Builders<AppUser>.Filter.Eq(user => user.Role, request.Role));
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
        
        var adminFilter = Builders<AppUser>.Filter.And(notDeletedFilter,
            Builders<AppUser>.Filter.Eq(user => user.Role, "admin"));
        var adminUsers = await _users.CountDocumentsAsync(adminFilter);
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
    public async Task<bool> BulkUpdateUsersAsync(BulkUserActionRequest request, string? deleteReason = null)
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
                var deleteCount = await _users.SoftDeleteManyAsync(filter, currentUserId, deleteReason);
                return deleteCount > 0;
            default:
                return false;
        }

        var result = await _users.UpdateManyAsync(filter, update);
        return result.ModifiedCount > 0;
    }

    public async Task<bool> UpdateUserRoleAsync(string id, string role)
    {
        var filter = Builders<AppUser>.Filter.Eq(user => user.Id, id);
        var update = Builders<AppUser>.Update
            .Set(user => user.Role, role)
            .Set(user => user.UpdatedAt, DateTime.UtcNow);

        var result = await _users.UpdateOneAsync(filter, update);
        return result.ModifiedCount > 0;
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
    /// 获取所有用户的活动日志（分页）
    /// </summary>
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

    public async Task<bool> CheckEmailExistsAsync(string email, string? excludeUserId = null)
    {
        var filter = Builders<AppUser>.Filter.And(
            Builders<AppUser>.Filter.Eq(user => user.Email, email),
            SoftDeleteExtensions.NotDeleted<AppUser>()
        );
        
        if (!string.IsNullOrEmpty(excludeUserId))
        {
            filter = Builders<AppUser>.Filter.And(
                filter,
                Builders<AppUser>.Filter.Ne(user => user.Id, excludeUserId)
            );
        }

        var count = await _users.CountDocumentsAsync(filter);
        return count > 0;
    }

    public async Task<bool> CheckUsernameExistsAsync(string username, string? excludeUserId = null)
    {
        var filter = Builders<AppUser>.Filter.And(
            Builders<AppUser>.Filter.Eq(user => user.Username, username),
            SoftDeleteExtensions.NotDeleted<AppUser>()
        );
        
        if (!string.IsNullOrEmpty(excludeUserId))
        {
            filter = Builders<AppUser>.Filter.And(
                filter,
                Builders<AppUser>.Filter.Ne(user => user.Id, excludeUserId)
            );
        }

        var count = await _users.CountDocumentsAsync(filter);
        return count > 0;
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

        _logger.LogInformation("Assigned {Count} custom permissions to user {UserId}", permissionIds.Count, userId);
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
