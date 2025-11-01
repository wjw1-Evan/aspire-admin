using User = Platform.ApiService.Models.AppUser;
using MongoDB.Driver;
using Platform.ApiService.Constants;
using Platform.ApiService.Extensions;
using Platform.ApiService.Models;
using Platform.ServiceDefaults.Models;
using Platform.ServiceDefaults.Services;

namespace Platform.ApiService.Services;

public class UserService : IUserService
{
    private const string ACTIVE_STATUS = "active";
    
    private readonly IDatabaseOperationFactory<User> _userFactory;
    private readonly IDatabaseOperationFactory<UserActivityLog> _activityLogFactory;
    private readonly IDatabaseOperationFactory<Role> _roleFactory;
    private readonly IDatabaseOperationFactory<UserCompany> _userCompanyFactory;
    private readonly IDatabaseOperationFactory<Company> _companyFactory;
    private readonly IUniquenessChecker _uniquenessChecker;
    private readonly IFieldValidationService _validationService;

    public UserService(
        IDatabaseOperationFactory<User> userFactory,
        IDatabaseOperationFactory<UserActivityLog> activityLogFactory,
        IDatabaseOperationFactory<Role> roleFactory,
        IDatabaseOperationFactory<UserCompany> userCompanyFactory,
        IDatabaseOperationFactory<Company> companyFactory,
        IUniquenessChecker uniquenessChecker,
        IFieldValidationService validationService)
    {
        _userFactory = userFactory;
        _activityLogFactory = activityLogFactory;
        _roleFactory = roleFactory;
        _userCompanyFactory = userCompanyFactory;
        _companyFactory = companyFactory;
        _uniquenessChecker = uniquenessChecker;
        _validationService = validationService;
    }

    /// <summary>
    /// 获取所有未删除的用户
    /// ⚠️ 修复：添加多租户过滤，只返回当前企业的用户
    /// </summary>
    public async Task<List<User>> GetAllUsersAsync()
    {
        // ✅ 获取当前企业ID进行多租户过滤（从数据库获取，不使用 JWT token）
        var currentUserId = _userFactory.GetRequiredUserId();
        var currentUser = await _userFactory.GetByIdAsync(currentUserId);
        if (currentUser == null || string.IsNullOrEmpty(currentUser.CurrentCompanyId))
        {
            throw new UnauthorizedAccessException("未找到当前企业信息");
        }
        var currentCompanyId = currentUser.CurrentCompanyId;

        // ✅ 只返回当前企业的未删除用户
        var filter = _userFactory.CreateFilterBuilder()
            .Equal(u => u.CurrentCompanyId, currentCompanyId)
            .Build();
        
        return await _userFactory.FindAsync(filter);
    }

    /// <summary>
    /// 根据ID获取用户
    /// </summary>
    /// <param name="id">用户ID</param>
    /// <returns>用户对象，不存在或已删除则返回 null</returns>
    public async Task<User?> GetUserByIdAsync(string id)
    {
        return await _userFactory.GetByIdAsync(id);
    }

    /// <summary>
    /// 根据ID获取用户（不使用多租户过滤）
    /// v3.1: 用于获取个人中心信息等跨企业场景
    /// </summary>
    /// <param name="id">用户ID</param>
    /// <returns>用户对象，不存在或已删除则返回 null</returns>
    public async Task<User?> GetUserByIdWithoutTenantFilterAsync(string id)
    {
        return await _userFactory.GetByIdWithoutTenantFilterAsync(id);
    }

    public async Task<User> CreateUserAsync(CreateUserRequest request)
    {
        var user = new User
        {
            Username = request.Name,
            Email = request.Email,
            // v3.1: 角色信息现在存储在 UserCompany.RoleIds 中，而不是 User.RoleIds
            IsActive = true,
            IsDeleted = false,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        return await _userFactory.CreateAsync(user);
    }

    /// <summary>
    /// 创建用户（用户管理）
    /// </summary>
    /// <param name="request">创建用户请求</param>
    /// <returns>创建的用户对象</returns>
    /// <exception cref="InvalidOperationException">用户名或邮箱已存在时抛出</exception>
    public async Task<User> CreateUserManagementAsync(CreateUserManagementRequest request)
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
        // ⚠️ 已移除 JWT token 中的 CurrentCompanyId，从当前用户获取
        var currentUserId = _userFactory.GetRequiredUserId();
        var currentUser = await _userFactory.GetByIdAsync(currentUserId);
        var companyId = currentUser?.CurrentCompanyId;
        if (!string.IsNullOrEmpty(companyId))
        {
            var companies = await _companyFactory.FindAsync(_companyFactory.CreateFilterBuilder().Equal(c => c.Id, companyId).Build());
            var company = companies.FirstOrDefault();
            
            if (company != null)
            {
                // 统计当前企业的用户数（不包括已删除）
                var currentUserCount = await _userFactory.CountAsync(
                    _userFactory.CreateFilterBuilder()
                        .Equal(u => u.CurrentCompanyId, companyId)
                        .Build()
                );

                if (currentUserCount >= company.MaxUsers)
                {
                    throw new InvalidOperationException(ErrorMessages.MaxUsersReached);
                }
            }
        }

        // 获取当前企业ID（从当前用户获取，不使用 JWT token）
        if (string.IsNullOrEmpty(companyId))
        {
            throw new UnauthorizedAccessException("未找到当前企业信息");
        }

        // 创建密码哈希
        var passwordHash = BCrypt.Net.BCrypt.HashPassword(request.Password);

        // v3.0 多租户：验证角色归属
        var roleIds = request.RoleIds ?? new List<string>();
        if (roleIds.Any())
        {
            // 验证所有角色都属于该企业
            var roleFilter = _roleFactory.CreateFilterBuilder()
                .In(r => r.Id, roleIds)
                .Equal(r => r.CompanyId, companyId)
                .Build();
            var validRoles = await _roleFactory.FindAsync(roleFilter);
            
            if (validRoles.Count != roleIds.Count)
            {
                throw new InvalidOperationException("部分角色不存在或不属于该企业");
            }
        }

        var user = new User
        {
            Username = request.Username,
            Email = request.Email,
            PasswordHash = passwordHash,
            CurrentCompanyId = companyId,  // 设置当前企业ID
            IsActive = request.IsActive,
            IsDeleted = false,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        var createdUser = await _userFactory.CreateAsync(user);

        // 创建用户-企业关联，并分配角色
        var userCompany = new UserCompany
        {
            UserId = createdUser.Id!,
            CompanyId = companyId,
            RoleIds = roleIds,
            IsAdmin = false,  // 新创建的用户默认不是管理员
            Status = ACTIVE_STATUS,
            JoinedAt = DateTime.UtcNow,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow,
            IsDeleted = false
        };

        await _userCompanyFactory.CreateAsync(userCompany);

        return createdUser;
    }

    /// <summary>
    /// 更新用户（使用原子操作）
    /// </summary>
    public async Task<User?> UpdateUserAsync(string id, UpdateUserRequest request)
    {
        var filter = _userFactory.CreateFilterBuilder()
            .Equal(u => u.Id, id)
            .Build();

        var updateBuilder = _userFactory.CreateUpdateBuilder();
        
        if (!string.IsNullOrEmpty(request.Name))
            updateBuilder.Set(u => u.Username, request.Name);
        if (!string.IsNullOrEmpty(request.Email))
            updateBuilder.Set(u => u.Email, request.Email);
        
        var update = updateBuilder.Build();

        var options = new FindOneAndUpdateOptions<User>
        {
            ReturnDocument = ReturnDocument.After,
            IsUpsert = false
        };

        return await _userFactory.FindOneAndUpdateAsync(filter, update, options);
    }

    /// <summary>
    /// 更新用户（用户管理，使用原子操作）
    /// 包含基本信息更新和角色更新
    /// </summary>
    /// <param name="id">用户ID</param>
    /// <param name="request">更新用户请求</param>
    /// <returns>更新后的用户对象，不存在则返回 null</returns>
    /// <exception cref="InvalidOperationException">用户名或邮箱已存在时抛出</exception>
    public async Task<User?> UpdateUserManagementAsync(string id, UpdateUserManagementRequest request)
    {
        // 验证唯一性（如果提供了新值）
        if (!string.IsNullOrEmpty(request.Username))
        {
            await _uniquenessChecker.EnsureUsernameUniqueAsync(request.Username, excludeUserId: id);
        }

        if (!string.IsNullOrEmpty(request.Email))
        {
            _validationService.ValidateEmail(request.Email);
            await _uniquenessChecker.EnsureEmailUniqueAsync(request.Email, excludeUserId: id);
        }

        // 更新用户基本信息
        var filter = _userFactory.CreateFilterBuilder()
            .Equal(u => u.Id, id)
            .Build();

        var updateBuilder = _userFactory.CreateUpdateBuilder();
        
        if (!string.IsNullOrEmpty(request.Username))
            updateBuilder.Set(u => u.Username, request.Username);
        if (!string.IsNullOrEmpty(request.Email))
            updateBuilder.Set(u => u.Email, request.Email);
        if (request.IsActive.HasValue)
            updateBuilder.Set(u => u.IsActive, request.IsActive.Value);
        
        var update = updateBuilder.Build();

        var options = new FindOneAndUpdateOptions<User>
        {
            ReturnDocument = ReturnDocument.After,
            IsUpsert = false
        };

        var updatedUser = await _userFactory.FindOneAndUpdateAsync(filter, update, options);

        // 如果提供了角色ID列表，更新用户在当前企业的角色
        if (updatedUser != null && request.RoleIds != null)
        {
            // 获取当前用户的企业ID（从当前用户获取，不使用 JWT token）
            var currentUserId = _userFactory.GetRequiredUserId();
            var currentUser = await _userFactory.GetByIdAsync(currentUserId);
            if (currentUser == null || string.IsNullOrEmpty(currentUser.CurrentCompanyId))
            {
                throw new UnauthorizedAccessException("未找到当前企业信息");
            }
            var companyId = currentUser.CurrentCompanyId;

            // 验证所有角色都属于该企业
            if (request.RoleIds.Any())
            {
                var roleFilter = _roleFactory.CreateFilterBuilder()
                    .In(r => r.Id, request.RoleIds)
                    .Equal(r => r.CompanyId, companyId)
                    .Build();
                var validRoles = await _roleFactory.FindAsync(roleFilter);
                
                if (validRoles.Count != request.RoleIds.Count)
                {
                    throw new InvalidOperationException("部分角色不存在或不属于该企业");
                }
            }

            // 更新用户在企业中的角色
            // ✅ 修复：添加软删除过滤，避免更新已删除的记录
            var userCompanyFilter = _userCompanyFactory.CreateFilterBuilder()
                .Equal(uc => uc.UserId, id)
                .Equal(uc => uc.CompanyId, companyId)
                .Equal(uc => uc.IsDeleted, false)
                .Build();

            var userCompanyUpdate = _userCompanyFactory.CreateUpdateBuilder()
                .Set(uc => uc.RoleIds, request.RoleIds)
                .SetCurrentTimestamp()
                .Build();

            var userCompanyOptions = new FindOneAndUpdateOptions<UserCompany>
            {
                ReturnDocument = ReturnDocument.After,
                IsUpsert = false
            };

            // ✅ 修复：检查更新结果，如果 UserCompany 记录不存在则抛出异常
            var updatedUserCompany = await _userCompanyFactory.FindOneAndUpdateAsync(userCompanyFilter, userCompanyUpdate, userCompanyOptions);
            if (updatedUserCompany == null)
            {
                throw new InvalidOperationException($"用户 {id} 在企业 {companyId} 中的关联记录不存在，无法更新角色");
            }
        }

        return updatedUser;
    }

    /// <summary>
    /// 软删除用户
    /// </summary>
    public async Task<bool> DeleteUserAsync(string id, string? reason = null)
    {
        var filter = _userFactory.CreateFilterBuilder().Equal(u => u.Id, id).Build();
        var result = await _userFactory.FindOneAndSoftDeleteAsync(filter);
        return result != null;
    }

    public async Task<List<User>> SearchUsersByNameAsync(string name)
    {
        var filter = _userFactory.CreateFilterBuilder()
            .Regex(u => u.Username, name)
            .Build();
        
        return await _userFactory.FindAsync(filter);
    }

    /// <summary>
    /// 停用用户（使用原子操作）
    /// </summary>
    public async Task<bool> DeactivateUserAsync(string id)
    {
        var filter = _userFactory.CreateFilterBuilder()
            .Equal(u => u.Id, id)
            .Build();

        var update = _userFactory.CreateUpdateBuilder()
            .Set(u => u.IsActive, false)
            .Build();

        var options = new FindOneAndUpdateOptions<User>
        {
            ReturnDocument = ReturnDocument.After,
            IsUpsert = false
        };

        var updatedUser = await _userFactory.FindOneAndUpdateAsync(filter, update, options);
        return updatedUser != null;
    }

    /// <summary>
    /// 激活用户（使用原子操作）
    /// </summary>
    public async Task<bool> ActivateUserAsync(string id)
    {
        var filter = _userFactory.CreateFilterBuilder()
            .Equal(u => u.Id, id)
            .Build();

        var update = _userFactory.CreateUpdateBuilder()
            .Set(u => u.IsActive, true)
            .Build();

        var options = new FindOneAndUpdateOptions<User>
        {
            ReturnDocument = ReturnDocument.After,
            IsUpsert = false
        };

        var updatedUser = await _userFactory.FindOneAndUpdateAsync(filter, update, options);
        return updatedUser != null;
    }

    /// <summary>
    /// 获取用户列表（分页、搜索、过滤）
    /// 修复：确保多租户数据隔离，只返回当前企业用户
    /// v6.1: 重构为调用 GetUsersWithRolesAsync 方法，避免重复代码
    /// </summary>
    public async Task<UserListResponse> GetUsersWithPaginationAsync(UserListRequest request)
    {
        // 调用包含角色信息的方法，然后转换为基础响应格式
        var result = await GetUsersWithRolesAsync(request);
        
        // 转换为基础用户列表响应
        var basicUsers = result.Users.Select(userWithRoles => new User
        {
            Id = userWithRoles.Id ?? string.Empty,
            Username = userWithRoles.Username,
            Name = userWithRoles.Name,
            Email = userWithRoles.Email,
            Age = userWithRoles.Age,
            IsActive = userWithRoles.IsActive,
            LastLoginAt = userWithRoles.LastLoginAt,
            CreatedAt = userWithRoles.CreatedAt,
            UpdatedAt = userWithRoles.UpdatedAt
        }).ToList();

        return new UserListResponse
        {
            Users = basicUsers,
            Total = result.Total,
            Page = result.Page,
            PageSize = result.PageSize
        };
    }

    /// <summary>
    /// 获取用户列表（分页、搜索、过滤）- 包含角色信息
    /// v6.0: 新增方法，解决前端需要roleIds字段的问题
    /// </summary>
    public async Task<UserListWithRolesResponse> GetUsersWithRolesAsync(UserListRequest request)
    {
        // 验证当前企业（从数据库获取，不使用 JWT token）
        // ⚠️ 已移除 JWT token 中的 CurrentCompanyId，从当前用户获取
        var currentUserId = _userFactory.GetRequiredUserId();
        var currentUser = await _userFactory.GetByIdAsync(currentUserId);
        if (currentUser == null || string.IsNullOrEmpty(currentUser.CurrentCompanyId))
        {
            throw new UnauthorizedAccessException("未找到当前企业信息");
        }
        var currentCompanyId = currentUser.CurrentCompanyId;

        // 构建查询过滤器
        var filter = await BuildUserListFilterAsync(request, currentCompanyId);
        
        // 构建排序（支持多字段，默认按创建时间倒序）
        var sortBuilder = _userFactory.CreateSortBuilder();
        var sortBy = request.SortBy?.Trim();
        var isAscending = string.Equals(request.SortOrder, "asc", StringComparison.OrdinalIgnoreCase);

        switch (sortBy?.ToLowerInvariant())
        {
            case "username":
                if (isAscending)
                    sortBuilder.Ascending(u => u.Username);
                else
                    sortBuilder.Descending(u => u.Username);
                break;
            case "email":
                if (isAscending)
                    sortBuilder.Ascending(u => u.Email);
                else
                    sortBuilder.Descending(u => u.Email);
                break;
            case "lastloginat":
                if (isAscending)
                    sortBuilder.Ascending(u => u.LastLoginAt);
                else
                    sortBuilder.Descending(u => u.LastLoginAt);
                break;
            case "updatedat":
                if (isAscending)
                    sortBuilder.Ascending(u => u.UpdatedAt);
                else
                    sortBuilder.Descending(u => u.UpdatedAt);
                break;
            case "name":
                if (isAscending)
                    sortBuilder.Ascending(u => u.Name);
                else
                    sortBuilder.Descending(u => u.Name);
                break;
            case "isactive":
                if (isAscending)
                    sortBuilder.Ascending(u => u.IsActive);
                else
                    sortBuilder.Descending(u => u.IsActive);
                break;
            case "createdat":
            default:
                if (isAscending)
                    sortBuilder.Ascending(u => u.CreatedAt);
                else
                    sortBuilder.Descending(u => u.CreatedAt);
                break;
        }

        // 分页查询用户
        var (users, total) = await _userFactory.FindPagedAsync(filter, sortBuilder.Build(), request.Page, request.PageSize);

        // 批量加载用户角色信息
        var usersWithRoles = await EnrichUsersWithRolesAsync(users, currentCompanyId);

        return new UserListWithRolesResponse
        {
            Users = usersWithRoles,
            Total = (int)total,
            Page = request.Page,
            PageSize = request.PageSize
        };
    }

    /// <summary>
    /// 构建用户列表查询过滤器
    /// </summary>
    private async Task<FilterDefinition<User>> BuildUserListFilterAsync(UserListRequest request, string currentCompanyId)
    {
        var filterBuilder = _userFactory.CreateFilterBuilder()
            .Equal(u => u.CurrentCompanyId, currentCompanyId);

        // 搜索过滤
        if (!string.IsNullOrEmpty(request.Search))
        {
            filterBuilder.Regex(u => u.Username, request.Search, "i");
            filterBuilder.Regex(u => u.Email, request.Search, "i");
        }

        // 角色过滤
        if (request.RoleIds != null && request.RoleIds.Any())
        {
            var userIdsWithRoles = await GetUserIdsByRolesAsync(request.RoleIds, currentCompanyId);
            if (userIdsWithRoles.Any())
            {
                filterBuilder.In(u => u.Id, userIdsWithRoles);
            }
            else
            {
                // 如果没有匹配的角色，返回空结果
                filterBuilder.Equal(u => u.Id, "nonexistent");
            }
        }
        
        // 日期范围过滤
        if (request.StartDate.HasValue)
        {
            filterBuilder.GreaterThanOrEqual(u => u.CreatedAt, request.StartDate.Value);
        }
        if (request.EndDate.HasValue)
        {
            filterBuilder.LessThanOrEqual(u => u.CreatedAt, request.EndDate.Value);
        }

        // 状态过滤
        if (request.IsActive.HasValue)
        {
            filterBuilder.Equal(u => u.IsActive, request.IsActive.Value);
        }

        return filterBuilder.Build();
    }

    /// <summary>
    /// 根据角色ID获取用户ID列表
    /// </summary>
    private async Task<List<string>> GetUserIdsByRolesAsync(List<string> roleIds, string companyId)
    {
        var filter = _userCompanyFactory.CreateFilterBuilder()
            .Equal(uc => uc.CompanyId, companyId)
            .Equal(uc => uc.Status, ACTIVE_STATUS)
            .Build();
        
        // 使用 MongoDB 的 AnyIn 操作符
        var anyInFilter = Builders<UserCompany>.Filter.AnyIn(uc => uc.RoleIds, roleIds);
        var combinedFilter = Builders<UserCompany>.Filter.And(filter, anyInFilter);
        
        var userCompanies = await _userCompanyFactory.FindAsync(combinedFilter);
        return userCompanies.Select(uc => uc.UserId).Distinct().ToList();
    }

    /// <summary>
    /// 批量为用户加载角色信息
    /// </summary>
    private async Task<List<UserWithRolesResponse>> EnrichUsersWithRolesAsync(
        List<User> users, 
        string companyId)
    {
        var userIds = users.Select(u => u.Id!).ToList();
        
        // 批量查询用户企业关联
        var userCompanyFilter = _userCompanyFactory.CreateFilterBuilder()
            .In(uc => uc.UserId, userIds)
            .Equal(uc => uc.CompanyId, companyId)
            .Equal(uc => uc.Status, ACTIVE_STATUS)
            .Build();
        
        var userCompanies = await _userCompanyFactory.FindAsync(userCompanyFilter);
        
        // 批量查询角色信息
        var allRoleIds = userCompanies.SelectMany(uc => uc.RoleIds).Distinct().ToList();
        var roleIdToNameMap = await GetRoleNameMapAsync(allRoleIds, companyId);
        
        // 构建用户-角色映射
        var userIdToCompanyMap = userCompanies.ToDictionary(uc => uc.UserId, uc => uc);

        // 组装返回数据
        return users.Select(user =>
        {
            var userCompany = userIdToCompanyMap.GetValueOrDefault(user.Id!);
            var roleIds = userCompany?.RoleIds ?? new List<string>();
            var roleNames = roleIds
                .Where(roleId => roleIdToNameMap.ContainsKey(roleId))
                .Select(roleId => roleIdToNameMap[roleId])
                .ToList();

            return new UserWithRolesResponse
            {
                Id = user.Id,
                Username = user.Username,
                Name = user.Name,
                Email = user.Email,
                Age = user.Age,
                IsActive = user.IsActive,
                LastLoginAt = user.LastLoginAt,
                CreatedAt = user.CreatedAt,
                UpdatedAt = user.UpdatedAt,
                RoleIds = roleIds,
                RoleNames = roleNames,
                IsAdmin = userCompany?.IsAdmin ?? false
            };
        }).ToList();
    }

    /// <summary>
    /// 获取角色ID到角色名称的映射
    /// </summary>
    private async Task<Dictionary<string, string>> GetRoleNameMapAsync(List<string> roleIds, string companyId)
    {
        if (!roleIds.Any()) return new Dictionary<string, string>();

        var roleFilter = _roleFactory.CreateFilterBuilder()
            .In(r => r.Id, roleIds)
            .Equal(r => r.CompanyId, companyId)
            .Build();
        
        var roles = await _roleFactory.FindAsync(roleFilter);
        return roles.ToDictionary(r => r.Id!, r => r.Name);
    }

    /// <summary>
    /// 获取用户统计信息
    /// 修复：确保多租户数据隔离，只统计当前企业用户
    /// </summary>
    public async Task<UserStatisticsResponse> GetUserStatisticsAsync()
    {
        // ✅ 获取当前企业ID进行多租户过滤（从数据库获取，不使用 JWT token）
        // ⚠️ 已移除 JWT token 中的 CurrentCompanyId，从当前用户获取
        var currentUserId = _userFactory.GetRequiredUserId();
        var currentUser = await _userFactory.GetByIdAsync(currentUserId);
        if (currentUser == null || string.IsNullOrEmpty(currentUser.CurrentCompanyId))
        {
            throw new UnauthorizedAccessException("未找到当前企业信息");
        }
        var currentCompanyId = currentUser.CurrentCompanyId;

        // ✅ 基础过滤：只统计当前企业的未删除用户
        var baseFilter = _userFactory.CreateFilterBuilder()
            .Equal(u => u.CurrentCompanyId, currentCompanyId) // ✅ 修复：使用CurrentCompanyId
            .Build();
        
        var totalUsers = await _userFactory.CountAsync(baseFilter);
        
        var activeFilter = _userFactory.CreateFilterBuilder()
            .Equal(u => u.CurrentCompanyId, currentCompanyId)
            .Equal(u => u.IsActive, true)
            .Build();
        var activeUsers = await _userFactory.CountAsync(activeFilter);
        var inactiveUsers = totalUsers - activeUsers;
        
        // ✅ 查询当前企业的管理员角色（添加企业过滤）
        var adminRoleNames = new[] { "admin", "super-admin" };
        var adminRoleFilter = _roleFactory.CreateFilterBuilder()
            .In(r => r.Name, adminRoleNames)
            .Equal(r => r.CompanyId, currentCompanyId) // ✅ 企业隔离
            .Build();
        var adminRoles = await _roleFactory.FindAsync(adminRoleFilter);
        var adminRoleIds = adminRoles.Select(r => r.Id).Where(id => !string.IsNullOrEmpty(id)).ToList();
        
        // v3.1: 从 UserCompany 表统计当前企业内拥有管理员角色的用户数量
        var adminUsers = 0L;
        if (adminRoleIds.Any())
        {
            var adminUserCompanyFilter = _userCompanyFactory.CreateFilterBuilder()
                .Equal(uc => uc.CompanyId, currentCompanyId)
                .Equal(uc => uc.Status, ACTIVE_STATUS)
                .Build();
            
            // 使用 MongoDB 的 AnyIn 操作符
            var anyInFilter = Builders<UserCompany>.Filter.AnyIn(uc => uc.RoleIds, adminRoleIds);
            var combinedFilter = Builders<UserCompany>.Filter.And(adminUserCompanyFilter, anyInFilter);
            
            adminUsers = await _userCompanyFactory.CountAsync(combinedFilter);
        }
        
        // 另外，直接统计当前企业内标记为管理员的用户
        var directAdminFilter = _userCompanyFactory.CreateFilterBuilder()
            .Equal(uc => uc.IsAdmin, true)
            .Equal(uc => uc.CompanyId, currentCompanyId)
            .Equal(uc => uc.Status, ACTIVE_STATUS)
            .Build();
        var directAdminUsers = await _userCompanyFactory.CountAsync(directAdminFilter);
        
        // 取最大值（可能存在既有管理员角色又标记为管理员的情况）
        adminUsers = Math.Max(adminUsers, directAdminUsers);
        
        var regularUsers = totalUsers - adminUsers;

        var today = DateTime.UtcNow.Date;
        var thisWeek = today.AddDays(-(int)today.DayOfWeek);
        var thisMonth = new DateTime(today.Year, today.Month, 1, 0, 0, 0, DateTimeKind.Utc);

        // ✅ 新增用户统计：添加企业过滤
        var todayFilter = _userFactory.CreateFilterBuilder()
            .Equal(u => u.CurrentCompanyId, currentCompanyId)
            .GreaterThanOrEqual(user => user.CreatedAt, today)
            .Build();
        var newUsersToday = await _userFactory.CountAsync(todayFilter);
        
        var weekFilter = _userFactory.CreateFilterBuilder()
            .Equal(u => u.CurrentCompanyId, currentCompanyId)
            .GreaterThanOrEqual(user => user.CreatedAt, thisWeek)
            .Build();
        var newUsersThisWeek = await _userFactory.CountAsync(weekFilter);
        
        var monthFilter = _userFactory.CreateFilterBuilder()
            .Equal(u => u.CurrentCompanyId, currentCompanyId)
            .GreaterThanOrEqual(user => user.CreatedAt, thisMonth)
            .Build();
        var newUsersThisMonth = await _userFactory.CountAsync(monthFilter);

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
    /// 修复：确保多租户数据隔离，只能操作当前企业用户
    /// </summary>
    public async Task<bool> BulkUpdateUsersAsync(BulkUserActionRequest request, string? reason = null)
    {
        // ✅ 获取当前企业ID进行多租户过滤（从数据库获取，不使用 JWT token）
        // ⚠️ 已移除 JWT token 中的 CurrentCompanyId，从当前用户获取
        var currentUserId = _userFactory.GetRequiredUserId();
        var currentUser = await _userFactory.GetByIdAsync(currentUserId);
        if (currentUser == null || string.IsNullOrEmpty(currentUser.CurrentCompanyId))
        {
            throw new UnauthorizedAccessException("未找到当前企业信息");
        }
        var currentCompanyId = currentUser.CurrentCompanyId;

        // ✅ 过滤器：只能操作当前企业的未删除用户
        var filter = _userFactory.CreateFilterBuilder()
            .In(user => user.Id, request.UserIds)
            .Equal(user => user.CurrentCompanyId, currentCompanyId)
            .Build();
        
        var update = Builders<User>.Update.Set(user => user.UpdatedAt, DateTime.UtcNow);

        switch (request.Action.ToLower())
        {
            case "activate":
                update = update.Set(user => user.IsActive, true);
                break;
            case "deactivate":
                update = update.Set(user => user.IsActive, false);
                break;
            case "delete":
                // ✅ 修复：使用包含企业过滤的过滤器进行软删除，确保只能删除当前企业的用户
                // 不能直接使用 SoftDeleteManyAsync(request.UserIds)，因为它没有多租户过滤
                var softDeleteUpdate = _userFactory.CreateUpdateBuilder()
                    .Set(u => u.IsDeleted, true)
                    .SetCurrentTimestamp()
                    .Build();
                var deleteCount = await _userFactory.UpdateManyAsync(filter, softDeleteUpdate);
                return deleteCount > 0;
            default:
                return false;
        }

        await _userFactory.UpdateManyAsync(filter, update);
        return true;
    }

    public Task<bool> UpdateUserRoleAsync(string id, string role)
    {
        // 注意：此方法已废弃，使用 RoleIds 代替
        throw new InvalidOperationException("此方法已废弃，请使用 UpdateUserManagementAsync 更新用户的 RoleIds");
    }

    public async Task LogUserActivityAsync(string userId, string action, string description, string? ipAddress = null, string? userAgent = null)
    {
        // 获取当前企业ID（从数据库获取，不使用 JWT token）
        string? companyId = null;
        try
        {
            var currentUserId = _userFactory.GetCurrentUserId();
            if (!string.IsNullOrEmpty(currentUserId))
            {
                var currentUser = await _userFactory.GetByIdAsync(currentUserId);
                companyId = currentUser?.CurrentCompanyId;
            }
        }
        catch
        {
            // 如果无法获取（如用户未登录），使用空字符串
        }

        var log = new UserActivityLog
        {
            UserId = userId,
            Action = action,
            Description = description,
            IpAddress = ipAddress,
            UserAgent = userAgent,
            CompanyId = companyId ?? string.Empty,
            IsDeleted = false,
            CreatedAt = DateTime.UtcNow
        };

        await _activityLogFactory.CreateAsync(log);
    }

    public async Task<List<UserActivityLog>> GetUserActivityLogsAsync(string userId, int limit = 50)
    {
        var filter = _activityLogFactory.CreateFilterBuilder()
            .Equal(log => log.UserId, userId)
            .Build();
        
        var sort = _activityLogFactory.CreateSortBuilder()
            .Descending(log => log.CreatedAt)
            .Build();
        
        return await _activityLogFactory.FindAsync(filter, sort: sort, limit: limit);
    }

    /// <summary>
    /// 获取当前用户的活动日志（分页）
    /// </summary>
    public async Task<(List<UserActivityLog> logs, long total)> GetCurrentUserActivityLogsAsync(
        int page = 1,
        int pageSize = 20,
        string? action = null,
        DateTime? startDate = null,
        DateTime? endDate = null)
    {
        // 获取当前用户ID
        var currentUserId = _userFactory.GetRequiredUserId();
        
        var filterBuilder = _activityLogFactory.CreateFilterBuilder();
        
        // 固定过滤当前用户
        filterBuilder.Equal(log => log.UserId, currentUserId);
        
        // 按操作类型过滤
        if (!string.IsNullOrEmpty(action))
        {
            filterBuilder.Equal(log => log.Action, action);
        }
        
        // 按日期范围过滤
        if (startDate.HasValue)
        {
            filterBuilder.GreaterThanOrEqual(log => log.CreatedAt, startDate.Value);
        }
        if (endDate.HasValue)
        {
            filterBuilder.LessThanOrEqual(log => log.CreatedAt, endDate.Value);
        }
        
        var filter = filterBuilder.Build();
        
        // 获取总数
        var total = await _activityLogFactory.CountAsync(filter);
        
        // 获取分页数据
        var sort = _activityLogFactory.CreateSortBuilder()
            .Descending(log => log.CreatedAt)
            .Build();
        
        var (logs, totalFromPaged) = await _activityLogFactory.FindPagedAsync(filter, sort, page, pageSize);
        
        return (logs, total);
    }

    /// <summary>
    /// 获取所有用户的活动日志（分页）- 兼容性方法
    /// v6.1: 委托给优化版本的方法
    /// </summary>
    public async Task<(List<UserActivityLog> logs, long total)> GetAllActivityLogsAsync(
        int page = 1, 
        int pageSize = 20, 
        string? userId = null,
        string? action = null,
        DateTime? startDate = null,
        DateTime? endDate = null)
    {
        var (logs, total, _) = await GetAllActivityLogsWithUsersAsync(page, pageSize, userId, action, startDate, endDate);
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
        var filterBuilder = _activityLogFactory.CreateFilterBuilder();

        // 按用户ID过滤
        if (!string.IsNullOrEmpty(userId))
        {
            filterBuilder.Equal(log => log.UserId, userId);
        }

        // 按操作类型过滤
        if (!string.IsNullOrEmpty(action))
        {
            filterBuilder.Equal(log => log.Action, action);
        }

        // 按日期范围过滤
        if (startDate.HasValue)
        {
            filterBuilder.GreaterThanOrEqual(log => log.CreatedAt, startDate.Value);
        }
        if (endDate.HasValue)
        {
            filterBuilder.LessThanOrEqual(log => log.CreatedAt, endDate.Value);
        }

        var filter = filterBuilder.Build();

        // 获取总数
        var total = await _activityLogFactory.CountAsync(filter);

        // 获取分页数据
        var sort = _activityLogFactory.CreateSortBuilder()
            .Descending(log => log.CreatedAt)
            .Build();
        
        var logs = await _activityLogFactory.FindAsync(filter, sort, limit: pageSize);

        // 批量获取用户信息（解决 N+1 问题）
        // 过滤掉无效的用户ID（比如 "anonymous" 这种非ObjectId格式的ID）
        var validUserIds = logs
            .Select(log => log.UserId)
            .Distinct()
            .Where(userId => !string.IsNullOrEmpty(userId) && IsValidObjectId(userId))
            .ToList();

        var users = new List<User>();
        if (validUserIds.Any())
        {
            var userFilter = _userFactory.CreateFilterBuilder()
                .In(u => u.Id, validUserIds)
                .Build();
            users = await _userFactory.FindAsync(userFilter);
        }
        
        // 构建用户 ID 到用户名的映射
        var userMap = users.ToDictionary(u => u.Id!, u => u.Username);

        // 为无效用户ID添加默认映射（比如 "anonymous" 用户）
        var invalidUserIds = logs
            .Select(log => log.UserId)
            .Distinct()
            .Where(userId => !string.IsNullOrEmpty(userId) && !IsValidObjectId(userId))
            .Where(userId => !userMap.ContainsKey(userId))
            .ToList();

        foreach (var invalidUserId in invalidUserIds)
        {
            // 根据不同的无效ID提供不同的默认用户名
            string defaultUsername = invalidUserId switch
            {
                "anonymous" => "匿名用户",
                _ => $"用户({invalidUserId})"
            };
            userMap[invalidUserId] = defaultUsername;
        }

        return (logs, total, userMap);
    }

    /// <summary>
    /// 验证字符串是否为有效的MongoDB ObjectId格式（24位十六进制字符串）
    /// </summary>
    private static bool IsValidObjectId(string? value)
    {
        if (string.IsNullOrEmpty(value))
            return false;

        // MongoDB ObjectId 是24位十六进制字符串
        if (value.Length != 24)
            return false;

        // 检查是否只包含十六进制字符
        return value.All(c => (c >= '0' && c <= '9') || (c >= 'a' && c <= 'f') || (c >= 'A' && c <= 'F'));
    }

    public async Task<bool> CheckEmailExistsAsync(string email, string? excludeUserId = null)
    {
        var filterBuilder = _userFactory.CreateFilterBuilder()
            .Equal(user => user.Email, email);
        
        if (!string.IsNullOrEmpty(excludeUserId))
        {
            filterBuilder.NotEqual(user => user.Id, excludeUserId);
        }

        var filter = filterBuilder.Build();

        return await _userFactory.CountAsync(filter) > 0;
    }

    public async Task<bool> CheckUsernameExistsAsync(string username, string? excludeUserId = null)
    {
        var filterBuilder = _userFactory.CreateFilterBuilder()
            .Equal(user => user.Username, username);
        
        if (!string.IsNullOrEmpty(excludeUserId))
        {
            filterBuilder.NotEqual(user => user.Id, excludeUserId);
        }

        var filter = filterBuilder.Build();

        return await _userFactory.CountAsync(filter) > 0;
    }

    /// <summary>
    /// 更新用户个人资料（使用原子操作）
    /// </summary>
    public async Task<User?> UpdateUserProfileAsync(string userId, UpdateProfileRequest request)
    {
        // 注意：用户名（Username）字段禁止修改，已在控制器层过滤

        // 验证唯一性（如果提供了新邮箱）
        if (!string.IsNullOrEmpty(request.Email))
        {
            _validationService.ValidateEmail(request.Email);
            await _uniquenessChecker.EnsureEmailUniqueAsync(request.Email, excludeUserId: userId);
        }

        var filter = _userFactory.CreateFilterBuilder()
            .Equal(u => u.Id, userId)
            .Build();

        var updateBuilder = _userFactory.CreateUpdateBuilder();
        
        if (!string.IsNullOrEmpty(request.Email))
            updateBuilder.Set(u => u.Email, request.Email);
        
        if (!string.IsNullOrEmpty(request.Name))
            updateBuilder.Set(u => u.Name, request.Name);
        
        if (request.Age.HasValue)
            updateBuilder.Set(u => u.Age, request.Age.Value);
        
        var update = updateBuilder.Build();

        var options = new FindOneAndUpdateOptions<User>
        {
            ReturnDocument = ReturnDocument.After,
            IsUpsert = false
        };

        var updatedUser = await _userFactory.FindOneAndUpdateAsync(filter, update, options);
        
        if (updatedUser == null)
        {
            throw new KeyNotFoundException($"用户 {userId} 不存在");
        }

        // v3.1: 使用不带多租户过滤的方式获取更新后的用户
        return await GetUserByIdWithoutTenantFilterAsync(userId);
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
        
        var filter = _userFactory.CreateFilterBuilder().Equal(u => u.Id, user.Id).Build();
        var update = _userFactory.CreateUpdateBuilder()
            .Set(u => u.PasswordHash, newPasswordHash)
            .Build();
        
        var result = await _userFactory.FindOneAndUpdateAsync(filter, update);
        return result != null;
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
        if (roleIds == null || !roleIds.Any())
        {
            return new List<string>();
        }

        // ⚠️ 已移除 JWT token 中的 CurrentCompanyId，从当前用户获取
        var currentUserId = _userFactory.GetRequiredUserId();
        var currentUser = await _userFactory.GetByIdAsync(currentUserId);
        var companyId = currentUser?.CurrentCompanyId;
        if (string.IsNullOrEmpty(companyId))
        {
            // 如果没有企业上下文（如企业注册时创建管理员），直接返回
            return roleIds;
        }

        // 查询属于当前企业的角色
        var roleFilter = _roleFactory.CreateFilterBuilder()
            .In(r => r.Id, roleIds)
            .Equal(r => r.CompanyId, companyId)
            .Build();
        var validRoles = await _roleFactory.FindAsync(roleFilter);

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
        var user = await _userFactory.GetByIdAsync(userId);
        if (user == null)
        {
            throw new KeyNotFoundException($"用户 {userId} 不存在");
        }

        // 获取用户在当前企业的角色（从数据库获取，不使用 JWT token）
        // ⚠️ 已移除 JWT token 中的 CurrentCompanyId，统一从数据库获取
        var companyId = user.CurrentCompanyId;
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

        var userCompanyFilter = _userCompanyFactory.CreateFilterBuilder()
            .Equal(uc => uc.UserId, userId)
            .Equal(uc => uc.CompanyId, companyId)
            .Build();

        var userCompanies = await _userCompanyFactory.FindAsync(userCompanyFilter);
        var userCompany = userCompanies.FirstOrDefault();
        
        var allPermissionCodes = new List<string>();
        var rolePermissions = new List<string>();

        if (userCompany?.RoleIds != null && userCompany.RoleIds.Any())
        {
            // 获取用户角色对应的菜单权限
            // ⚠️ 关键修复：使用 FindWithoutTenantFilterAsync 因为我们已手动添加了 CompanyId 过滤
            // 避免 DatabaseOperationFactory 使用 JWT token 中的旧企业ID自动过滤
            var roleFilter = _roleFactory.CreateFilterBuilder()
                .In(r => r.Id, userCompany.RoleIds)
                .Equal(r => r.CompanyId, companyId)  // ✅ 使用数据库中的 CurrentCompanyId
                .Equal(r => r.IsActive, true)
                .Build();

            var roles = await _roleFactory.FindWithoutTenantFilterAsync(roleFilter);
            
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

