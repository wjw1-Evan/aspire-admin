using MongoDB.Driver;
using Platform.ApiService.Constants;
using Platform.ApiService.Extensions;
using Platform.ApiService.Models;

namespace Platform.ApiService.Services;

public class UserService : BaseService, IUserService
{
    private readonly BaseRepository<AppUser> _userRepository;
    private readonly IMongoCollection<UserActivityLog> _activityLogs;
    private readonly IMongoCollection<Role> _roles;
    private readonly IMongoCollection<UserCompany> _userCompanies;
    private readonly IUniquenessChecker _uniquenessChecker;
    private readonly IFieldValidationService _validationService;
    
    // 快捷访问器，用于需要直接访问集合的场景
    private IMongoCollection<AppUser> _users => _userRepository.Collection;

    public UserService(
        IMongoDatabase database, 
        IHttpContextAccessor httpContextAccessor,
        ITenantContext tenantContext,
        ILogger<UserService> logger,
        IUniquenessChecker uniquenessChecker,
        IFieldValidationService validationService)
        : base(database, httpContextAccessor, tenantContext, logger)
    {
        _userRepository = new BaseRepository<AppUser>(database, "users", httpContextAccessor, tenantContext);
        _activityLogs = GetCollection<UserActivityLog>("user_activity_logs");
        _roles = GetCollection<Role>("roles");
        _userCompanies = GetCollection<UserCompany>("user_companies");
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

    /// <summary>
    /// 根据ID获取用户（不使用多租户过滤）
    /// v3.1: 用于获取个人中心信息等跨企业场景
    /// </summary>
    /// <param name="id">用户ID</param>
    /// <returns>用户对象，不存在或已删除则返回 null</returns>
    public async Task<AppUser?> GetUserByIdWithoutTenantFilterAsync(string id)
    {
        var users = GetCollection<AppUser>("users");
        var filter = Builders<AppUser>.Filter.And(
            Builders<AppUser>.Filter.Eq(u => u.Id, id),
            Builders<AppUser>.Filter.Eq(u => u.IsDeleted, false)
        );
        return await users.Find(filter).FirstOrDefaultAsync();
    }

    public async Task<AppUser> CreateUserAsync(CreateUserRequest request)
    {
        var user = new AppUser
        {
            Username = request.Name,
            Email = request.Email,
            // v3.1: 角色信息现在存储在 UserCompany.RoleIds 中，而不是 AppUser.RoleIds
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

        // v3.0 多租户：检查企业用户配额
        var companyId = GetCurrentCompanyId();
        if (!string.IsNullOrEmpty(companyId))
        {
            var companies = Database.GetCollection<Company>("companies");
            var company = await companies.Find(c => c.Id == companyId && c.IsDeleted == false)
                .FirstOrDefaultAsync();
            
            if (company != null)
            {
                // 统计当前企业的用户数（不包括已删除）
                var currentUserCount = await _users.CountDocumentsAsync(
                    Builders<AppUser>.Filter.And(
                        Builders<AppUser>.Filter.Eq(u => u.CurrentCompanyId, companyId),
                        Builders<AppUser>.Filter.Eq(u => u.IsDeleted, false)
                    )
                );

                if (currentUserCount >= company.MaxUsers)
                {
                    throw new InvalidOperationException(ErrorMessages.MaxUsersReached);
                }
            }
        }

        // 创建密码哈希
        var passwordHash = BCrypt.Net.BCrypt.HashPassword(request.Password);

        // v3.0 多租户：验证角色归属
        var validatedRoleIds = new List<string>();
        if (request.RoleIds != null && request.RoleIds.Count > 0)
        {
            validatedRoleIds = await ValidateRoleOwnershipAsync(request.RoleIds);
        }

        var user = new AppUser
        {
            Username = request.Username,
            Email = request.Email,
            PasswordHash = passwordHash,
            // v3.1: 角色信息现在存储在 UserCompany.RoleIds 中，而不是 AppUser.RoleIds
            // 角色分配将在创建用户后通过 UserCompany 关系处理
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

        // v3.1: 角色管理已移至 UserCompany 表，通过 UserCompanyService 处理
        // 如果需要更新用户角色，请使用 UserCompanyService.UpdateMemberRolesAsync

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

        // v3.1: 角色过滤基于 UserCompany.RoleIds
        if (request.RoleIds != null && request.RoleIds.Count > 0)
        {
            // 首先从 UserCompany 表获取拥有指定角色的用户ID列表
            var userCompanyFilter = Builders<UserCompany>.Filter.And(
                Builders<UserCompany>.Filter.AnyIn(uc => uc.RoleIds, request.RoleIds),
                Builders<UserCompany>.Filter.Eq(uc => uc.Status, "active"),
                Builders<UserCompany>.Filter.Eq(uc => uc.IsDeleted, false)
            );
            var userCompaniesWithRoles = await _userCompanies.Find(userCompanyFilter).ToListAsync();
            var userIdsWithRoles = userCompaniesWithRoles.Select(uc => uc.UserId).Distinct().ToList();
            
            if (userIdsWithRoles.Count > 0)
            {
                filter = Builders<AppUser>.Filter.And(filter, Builders<AppUser>.Filter.In(user => user.Id, userIdsWithRoles));
            }
            else
            {
                // 如果没有用户拥有指定角色，返回空结果
                filter = Builders<AppUser>.Filter.And(filter, Builders<AppUser>.Filter.Eq(user => user.Id, "nonexistent"));
            }
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
        
        // v3.1: 从 UserCompany 表统计拥有管理员角色的用户数量
        var adminUsers = 0L;
        if (adminRoleIds.Any())
        {
            var adminUserCompanyFilter = Builders<UserCompany>.Filter.And(
                Builders<UserCompany>.Filter.AnyIn(uc => uc.RoleIds, adminRoleIds),
                Builders<UserCompany>.Filter.Eq(uc => uc.Status, "active"),
                Builders<UserCompany>.Filter.Eq(uc => uc.IsDeleted, false)
            );
            adminUsers = await _userCompanies.CountDocumentsAsync(adminUserCompanyFilter);
        }
        
        // 另外，直接统计标记为管理员的用户
        var directAdminFilter = Builders<UserCompany>.Filter.And(
            Builders<UserCompany>.Filter.Eq(uc => uc.IsAdmin, true),
            Builders<UserCompany>.Filter.Eq(uc => uc.Status, "active"),
            Builders<UserCompany>.Filter.Eq(uc => uc.IsDeleted, false)
        );
        var directAdminUsers = await _userCompanies.CountDocumentsAsync(directAdminFilter);
        
        // 取最大值（可能存在既有管理员角色又标记为管理员的情况）
        adminUsers = Math.Max(adminUsers, directAdminUsers);
        
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
        // v3.1: 使用不带多租户过滤的方式更新，因为用户可能属于多个企业
        var users = GetCollection<AppUser>("users");
        var filter = Builders<AppUser>.Filter.And(
            Builders<AppUser>.Filter.Eq(user => user.Id, userId),
            Builders<AppUser>.Filter.Eq(user => user.IsDeleted, false)
        );
        
        var update = Builders<AppUser>.Update
            .Set(user => user.UpdatedAt, DateTime.UtcNow);

        // 注意：用户名（Username）字段禁止修改，已在控制器层过滤

        if (!string.IsNullOrEmpty(request.Email))
        {
            // v3.0 多租户：使用统一的唯一性检查服务（企业内唯一）
            _validationService.ValidateEmail(request.Email);
            await _uniquenessChecker.EnsureEmailUniqueAsync(request.Email, excludeUserId: userId);
            update = update.Set(user => user.Email, request.Email);
        }

        if (!string.IsNullOrEmpty(request.Name))
            update = update.Set(user => user.Name, request.Name);

        if (request.Age.HasValue)
            update = update.Set(user => user.Age, request.Age.Value);

        var result = await users.UpdateOneAsync(filter, update);

        if (result.ModifiedCount > 0)
        {
            // v3.1: 使用不带多租户过滤的方式获取更新后的用户
            return await GetUserByIdWithoutTenantFilterAsync(userId);
        }

        return null;
    }

    public async Task<bool> ChangePasswordAsync(string userId, ChangePasswordRequest request)
    {
        // v3.1: 修改密码时不使用多租户过滤
        var user = await GetUserByIdWithoutTenantFilterAsync(userId);
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

    #region 私有辅助方法

    /// <summary>
    /// 验证角色是否属于当前企业
    /// </summary>
    /// <param name="roleIds">要验证的角色ID列表</param>
    /// <returns>验证通过的角色ID列表</returns>
    /// <exception cref="InvalidOperationException">部分角色不存在或不属于当前企业</exception>
    private async Task<List<string>> ValidateRoleOwnershipAsync(List<string> roleIds)
    {
        if (roleIds == null || roleIds.Count == 0)
        {
            return new List<string>();
        }

        var companyId = GetCurrentCompanyId();
        if (string.IsNullOrEmpty(companyId))
        {
            // 如果没有企业上下文（如企业注册时创建管理员），直接返回
            return roleIds;
        }

        // 查询属于当前企业的角色
        var roleFilter = Builders<Role>.Filter.And(
            Builders<Role>.Filter.In(r => r.Id, roleIds),
            Builders<Role>.Filter.Eq(r => r.CompanyId, companyId),
            Builders<Role>.Filter.Eq(r => r.IsDeleted, false)
        );
        var validRoles = await _roles.Find(roleFilter).ToListAsync();

        // 验证所有请求的角色都存在且属于当前企业
        if (validRoles.Count != roleIds.Count)
        {
            var invalidRoleIds = roleIds.Except(validRoles.Select(r => r.Id!)).ToList();
            throw new InvalidOperationException(
                $"部分角色不存在或不属于当前企业: {string.Join(", ", invalidRoleIds)}"
            );
        }

        return roleIds;
    }

    #endregion

    /// <summary>
    /// 获取用户的所有权限信息
    /// </summary>
    /// <param name="userId">用户ID</param>
    /// <returns>权限信息</returns>
    public async Task<object> GetUserPermissionsAsync(string userId)
    {
        // 获取用户信息
        var user = await _userRepository.GetByIdAsync(userId);
        if (user == null)
        {
            throw new KeyNotFoundException($"用户 {userId} 不存在");
        }

        // 获取用户在当前企业的角色
        var companyId = GetCurrentCompanyId();
        if (string.IsNullOrEmpty(companyId))
        {
            // 没有企业上下文，返回空权限
            return new
            {
                allPermissionCodes = new string[0],
                rolePermissions = new string[0],
                customPermissions = new string[0]
            };
        }

        var userCompanyFilter = Builders<UserCompany>.Filter.And(
            Builders<UserCompany>.Filter.Eq(uc => uc.UserId, userId),
            Builders<UserCompany>.Filter.Eq(uc => uc.CompanyId, companyId),
            Builders<UserCompany>.Filter.Eq(uc => uc.IsDeleted, false)
        );

        var userCompany = await _userCompanies.Find(userCompanyFilter).FirstOrDefaultAsync();
        
        var allPermissionCodes = new List<string>();
        var rolePermissions = new List<string>();

        if (userCompany?.RoleIds != null && userCompany.RoleIds.Count > 0)
        {
            // 获取用户角色对应的菜单权限
            var roleFilter = Builders<Role>.Filter.And(
                Builders<Role>.Filter.In(r => r.Id, userCompany.RoleIds),
                Builders<Role>.Filter.Eq(r => r.CompanyId, companyId),
                Builders<Role>.Filter.Eq(r => r.IsDeleted, false),
                Builders<Role>.Filter.Eq(r => r.IsActive, true)
            );

            var roles = await _roles.Find(roleFilter).ToListAsync();
            
            // 收集所有角色的菜单权限
            var menuIds = roles.SelectMany(r => r.MenuIds).Distinct().ToList();
            
            // 将菜单ID作为权限代码（简化的权限模型）
            rolePermissions.AddRange(menuIds);
            allPermissionCodes.AddRange(menuIds);
        }

        return new
        {
            allPermissionCodes = allPermissionCodes.Distinct().ToArray(),
            rolePermissions = rolePermissions.ToArray(),
            customPermissions = new string[0] // 当前版本暂不支持自定义权限
        };
    }
}

