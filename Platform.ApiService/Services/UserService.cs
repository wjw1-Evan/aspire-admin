using User = Platform.ApiService.Models.AppUser;
using MongoDB.Driver;
using Platform.ApiService.Constants;
using Platform.ApiService.Extensions;
using Platform.ApiService.Models;
using Platform.ApiService.Models.Response;
using Platform.ServiceDefaults.Models;
using Platform.ServiceDefaults.Services;

namespace Platform.ApiService.Services;

/// <summary>
/// 用户服务实现
/// </summary>
/// <param name="userFactory">用户数据库工厂</param>
/// <param name="userCompanyFactory">用户企业关联数据库工厂</param>
/// <param name="companyFactory">企业数据库工厂</param>
/// <param name="uniquenessChecker">唯一性检查器</param>
/// <param name="validationService">字段验证服务</param>
/// <param name="userRoleService">用户角色服务</param>
/// <param name="userOrganizationService">用户组织架构服务</param>
/// <param name="organizationService">组织架构服务</param>
/// <param name="userActivityLogService">用户活动日志服务</param>
/// <param name="menuAccessService">菜单访问权限服务</param>
public class UserService(
    IDatabaseOperationFactory<User> userFactory,
    IDatabaseOperationFactory<UserCompany> userCompanyFactory,
    IDatabaseOperationFactory<Company> companyFactory,
    IUniquenessChecker uniquenessChecker,
    IFieldValidationService validationService,
    IUserRoleService userRoleService,
    IUserOrganizationService userOrganizationService,
    IOrganizationService organizationService,
    IUserActivityLogService userActivityLogService,
    IMenuAccessService menuAccessService) : IUserService
{
    // private const string ACTIVE_STATUS = "active"; // Replaced by SystemConstants.UserStatus.Active

    private readonly IDatabaseOperationFactory<User> _userFactory = userFactory;
    private readonly IDatabaseOperationFactory<UserCompany> _userCompanyFactory = userCompanyFactory;
    private readonly IDatabaseOperationFactory<Company> _companyFactory = companyFactory;
    private readonly IUniquenessChecker _uniquenessChecker = uniquenessChecker;
    private readonly IFieldValidationService _validationService = validationService;

    // Injected new services
    private readonly IUserRoleService _userRoleService = userRoleService;
    private readonly IUserOrganizationService _userOrganizationService = userOrganizationService;
    private readonly IOrganizationService _organizationService = organizationService;
    private readonly IUserActivityLogService _userActivityLogService = userActivityLogService;
    private readonly IMenuAccessService _menuAccessService = menuAccessService;

    /// <inheritdoc/>
    public async Task<List<User>> GetAllUsersAsync()
    {
        var currentUserId = _userFactory.GetRequiredUserId();
        var currentUser = await _userFactory.GetByIdAsync(currentUserId);
        if (currentUser == null || string.IsNullOrEmpty(currentUser.CurrentCompanyId))
        {
            throw new UnauthorizedAccessException("CURRENT_COMPANY_NOT_FOUND");
        }
        var currentCompanyId = currentUser.CurrentCompanyId;

        // 获取该企业的所有成员ID
        var memberFilter = _userCompanyFactory.CreateFilterBuilder()
            .Equal(uc => uc.CompanyId, currentCompanyId)
            .Equal(uc => uc.Status, SystemConstants.UserStatus.Active)
            .Build();

        var memberships = await _userCompanyFactory.FindAsync(memberFilter);
        var memberUserIds = memberships.Select(uc => uc.UserId).Distinct().ToList();

        if (!memberUserIds.Any())
        {
            return new List<User>();
        }

        var filter = _userFactory.CreateFilterBuilder()
            .In(u => u.Id, memberUserIds)
            .Build();

        return await _userFactory.FindAsync(filter);
    }

    /// <inheritdoc/>
    public async Task<User?> GetUserByIdAsync(string id)
    {
        return await _userFactory.GetByIdAsync(id);
    }

    /// <inheritdoc/>
    public async Task<User?> GetUserByIdWithoutTenantFilterAsync(string id)
    {
        return await _userFactory.GetByIdWithoutTenantFilterAsync(id);
    }

    /// <inheritdoc/>
    public async Task<User> CreateUserAsync(CreateUserRequest request)
    {
        var user = new User
        {
            Username = request.Name,
            Email = request.Email,
            IsActive = true
        };

        return await _userFactory.CreateAsync(user);
    }

    /// <inheritdoc/>
    public async Task EnsureUserAccessAsync(string currentUserId, string targetUserId)
    {
        if (currentUserId == targetUserId)
        {
            return;
        }

        // 检查是否有用户管理权限
        var hasMenuAccess = await _menuAccessService
            .HasMenuAccessAsync(currentUserId!, SystemConstants.Permissions.UserManagement);

        if (!hasMenuAccess)
        {
            throw new UnauthorizedAccessException("USER_VIEW_PERMISSION_DENIED");
        }
    }

    /// <inheritdoc/>
    public async Task<User> CreateUserManagementAsync(CreateUserManagementRequest request)
    {
        // 1. 基本验证
        _validationService.ValidateUsername(request.Username);

        var currentUserId = _userFactory.GetRequiredUserId();
        var currentUser = await _userFactory.GetByIdAsync(currentUserId);
        var companyId = currentUser?.CurrentCompanyId;

        if (string.IsNullOrEmpty(companyId))
        {
            throw new UnauthorizedAccessException("CURRENT_COMPANY_NOT_FOUND");
        }

        // 2. 检查企业人数限制
        var companies = await _companyFactory.FindAsync(_companyFactory.CreateFilterBuilder().Equal(c => c.Id, companyId).Build());
        var company = companies.FirstOrDefault();

        if (company != null)
        {
            var currentUserCount = await _userCompanyFactory.CountAsync(
                _userCompanyFactory.CreateFilterBuilder()
                    .Equal(uc => uc.CompanyId, companyId)
                    .Equal(uc => uc.Status, SystemConstants.UserStatus.Active)
                    .Build()
            );

            if (currentUserCount >= company.MaxUsers)
            {
                throw new InvalidOperationException(ErrorMessages.MaxUsersReached);
            }
        }

        // 3. 验证角色
        var roleIds = request.RoleIds ?? new List<string>();
        if (roleIds.Any())
        {
            await _userRoleService.ValidateRoleOwnershipAsync(roleIds);
        }

        // 4. 跨租户查找现有用户（AppUser 不支持 IMultiTenant，所以 FindAsync 是全局的）
        var userFilter = _userFactory.CreateFilterBuilder()
            .Equal(u => u.Username, request.Username)
            .Build();
        var existingUsers = await _userFactory.FindAsync(userFilter);
        var existingUser = existingUsers.FirstOrDefault();

        if (existingUser != null)
        {
            // 已经是系统用户，检查是否已在当前企业
            var userCompanyFilter = _userCompanyFactory.CreateFilterBuilder()
                .Equal(uc => uc.UserId, existingUser.Id!)
                .Equal(uc => uc.CompanyId, companyId)
                .Equal(uc => uc.IsDeleted, false)
                .Build();

            var existingMembership = (await _userCompanyFactory.FindAsync(userCompanyFilter)).FirstOrDefault();
            if (existingMembership != null)
            {
                throw new InvalidOperationException("该用户已经是当前企业的成员");
            }

            // 创建关联记录
            var userCompany = new UserCompany
            {
                UserId = existingUser.Id!,
                CompanyId = companyId,
                RoleIds = roleIds,
                IsAdmin = false,
                Status = SystemConstants.UserStatus.Active,
                JoinedAt = DateTime.UtcNow
            };
            await _userCompanyFactory.CreateAsync(userCompany);

            // 更新用户当前企业（如果为空）
            if (string.IsNullOrEmpty(existingUser.CurrentCompanyId))
            {
                var update = _userFactory.CreateUpdateBuilder()
                    .Set(u => u.CurrentCompanyId, companyId)
                    .SetCurrentTimestamp()
                    .Build();
                await _userFactory.FindOneAndUpdateAsync(
                    _userFactory.CreateFilterBuilder().Equal(u => u.Id, existingUser.Id!).Build(),
                    update);
            }

            return existingUser;
        }

        // 5. 如果用户不存在，抛出异常（仅支持添加现有用户）
        // 修复：必须选择现有用户，不支持在此处创建新用户
        throw new InvalidOperationException($"用户 {request.Username} 不存在，请先选择现有用户或联系管理员创建用户。");
    }

    /// <inheritdoc/>
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
        return await _userFactory.FindOneAndUpdateAsync(filter, update);
    }

    /// <inheritdoc/>
    public async Task<User?> UpdateUserManagementAsync(string id, UpdateUserManagementRequest request)
    {
        if (!string.IsNullOrEmpty(request.Username))
        {
            await _uniquenessChecker.EnsureUsernameUniqueAsync(request.Username, excludeUserId: id);
        }

        if (!string.IsNullOrEmpty(request.Email))
        {
            _validationService.ValidateEmail(request.Email);
            await _uniquenessChecker.EnsureEmailUniqueAsync(request.Email, excludeUserId: id);
        }

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
        if (request.Remark != null)
            updateBuilder.Set(u => u.Remark, request.Remark);

        var update = updateBuilder.Build();
        var updatedUser = await _userFactory.FindOneAndUpdateAsync(filter, update);

        if (updatedUser != null && request.RoleIds != null)
        {
            var currentUserId = _userFactory.GetRequiredUserId();
            var currentUser = await _userFactory.GetByIdAsync(currentUserId);
            if (currentUser == null || string.IsNullOrEmpty(currentUser.CurrentCompanyId))
            {
                throw new UnauthorizedAccessException("CURRENT_COMPANY_NOT_FOUND");
            }
            var companyId = currentUser.CurrentCompanyId;

            if (request.RoleIds.Any())
            {
                await _userRoleService.ValidateRoleOwnershipAsync(request.RoleIds);
            }

            var userCompanyFilter = _userCompanyFactory.CreateFilterBuilder()
                .Equal(uc => uc.UserId, id)
                .Equal(uc => uc.CompanyId, companyId)
                .Equal(uc => uc.IsDeleted, false)
                .Build();

            var userCompanyUpdate = _userCompanyFactory.CreateUpdateBuilder()
                .Set(uc => uc.RoleIds, request.RoleIds)
                .SetCurrentTimestamp()
                .Build();

            var updatedUserCompany = await _userCompanyFactory.FindOneAndUpdateAsync(userCompanyFilter, userCompanyUpdate);
            if (updatedUserCompany == null)
            {
                // 如果关联不存在（可能是旧数据或数据不一致），则创建新的关联
                var newUserCompany = new UserCompany
                {
                    UserId = id,
                    CompanyId = companyId,
                    RoleIds = request.RoleIds,
                    IsAdmin = false,
                    Status = SystemConstants.UserStatus.Active,
                    JoinedAt = DateTime.UtcNow
                };
                await _userCompanyFactory.CreateAsync(newUserCompany);
            }
        }

        return updatedUser;
    }

    /// <inheritdoc/>
    public async Task<bool> DeleteUserAsync(string id, string? reason = null)
    {
        var currentUserId = _userFactory.GetRequiredUserId();
        var currentUser = await _userFactory.GetByIdAsync(currentUserId);
        var currentCompanyId = currentUser?.CurrentCompanyId;

        if (string.IsNullOrEmpty(currentCompanyId))
        {
            throw new UnauthorizedAccessException("CURRENT_COMPANY_NOT_FOUND");
        }

        // 核心修复：删除用户应该是从当前企业移除关联，而不是删除用户账号本身
        var filter = _userCompanyFactory.CreateFilterBuilder()
            .Equal(uc => uc.UserId, id)
            .Equal(uc => uc.CompanyId, currentCompanyId)
            .Build();

        // 检查是否是移除自己
        if (currentUserId == id)
        {
            throw new InvalidOperationException(ErrorMessages.CannotDeleteSelf);
        }

        var result = await _userCompanyFactory.FindOneAndSoftDeleteAsync(filter);

        if (result != null)
        {
            // 如果被删除的用户当前正处于此企业，清除其 CurrentCompanyId，防止登录后状态异常
            var userFilter = _userFactory.CreateFilterBuilder()
                .Equal(u => u.Id, id)
                .Equal(u => u.CurrentCompanyId, currentCompanyId)
                .Build();
            var userUpdate = _userFactory.CreateUpdateBuilder()
                .Set(u => u.CurrentCompanyId, string.Empty)
                .SetCurrentTimestamp()
                .Build();
            await _userFactory.FindOneAndUpdateAsync(userFilter, userUpdate);
        }

        return result != null;
    }

    /// <inheritdoc/>
    public async Task<List<User>> SearchUsersByNameAsync(string name)
    {
        var filter = _userFactory.CreateFilterBuilder()
            .Regex(u => u.Username, name)
            .Build();

        return await _userFactory.FindAsync(filter);
    }

    /// <inheritdoc/>
    public async Task<UserListResponse> GetUsersWithPaginationAsync(UserListRequest request)
    {
        var result = await GetUsersWithRolesAsync(request);

        var basicUsers = result.Users.Select(userWithRoles => new User
        {
            Id = userWithRoles.Id ?? string.Empty,
            Username = userWithRoles.Username,
            Name = userWithRoles.Name,
            Email = userWithRoles.Email,
            PhoneNumber = userWithRoles.PhoneNumber,
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

    /// <inheritdoc/>
    public async Task<UserListWithRolesResponse> GetUsersWithRolesAsync(UserListRequest request)
    {
        var currentUserId = _userFactory.GetRequiredUserId();
        var currentUser = await _userFactory.GetByIdAsync(currentUserId);
        if (currentUser == null || string.IsNullOrEmpty(currentUser.CurrentCompanyId))
        {
            throw new UnauthorizedAccessException("CURRENT_COMPANY_NOT_FOUND");
        }
        var currentCompanyId = currentUser.CurrentCompanyId;

        var filter = await BuildUserListFilterAsync(request, currentCompanyId);

        var sortBuilder = _userFactory.CreateSortBuilder();
        var sortBy = request.SortBy?.Trim();
        var isAscending = string.Equals(request.SortOrder, "asc", StringComparison.OrdinalIgnoreCase);

        switch (sortBy?.ToLowerInvariant())
        {
            case "username":
                if (isAscending) sortBuilder.Ascending(u => u.Username); else sortBuilder.Descending(u => u.Username); break;
            case "email":
                if (isAscending) sortBuilder.Ascending(u => u.Email); else sortBuilder.Descending(u => u.Email); break;
            case "lastloginat":
                if (isAscending) sortBuilder.Ascending(u => u.LastLoginAt); else sortBuilder.Descending(u => u.LastLoginAt); break;
            case "updatedat":
                if (isAscending) sortBuilder.Ascending(u => u.UpdatedAt); else sortBuilder.Descending(u => u.UpdatedAt); break;
            case "name":
                if (isAscending) sortBuilder.Ascending(u => u.Name); else sortBuilder.Descending(u => u.Name); break;
            case "isactive":
                if (isAscending) sortBuilder.Ascending(u => u.IsActive); else sortBuilder.Descending(u => u.IsActive); break;
            case "createdat":
            default:
                if (isAscending) sortBuilder.Ascending(u => u.CreatedAt); else sortBuilder.Descending(u => u.CreatedAt); break;
        }

        var projection = _userFactory.CreateProjectionBuilder()
            .Include(u => u.Id)
            .Include(u => u.Username)
            .Include(u => u.Name)
            .Include(u => u.Email)
            .Include(u => u.PhoneNumber)
            .Include(u => u.Age)
            .Include(u => u.IsActive)
            .Include(u => u.LastLoginAt)
            .Include(u => u.CreatedAt)
            .Include(u => u.UpdatedAt)
            .Include(u => u.UpdatedAt)
            .Include(u => u.CurrentCompanyId)
            .Include(u => u.Remark)
            .Build();

        var (users, total) = await _userFactory.FindPagedAsync(filter, sortBuilder.Build(), request.Page, request.PageSize, projection);

        var usersWithRoles = await EnrichUsersWithRolesAsync(users, currentCompanyId);

        return new UserListWithRolesResponse
        {
            Users = usersWithRoles,
            Total = (int)total,
            Page = request.Page,
            PageSize = request.PageSize
        };
    }

    private async Task<FilterDefinition<User>> BuildUserListFilterAsync(UserListRequest request, string currentCompanyId)
    {
        // 核心修复：不再根据用户的 CurrentCompanyId 过滤，而是根据 UserCompany 表中的成员身份过滤
        // 只有属于该企业的用户才应出现在列表中
        var memberFilter = _userCompanyFactory.CreateFilterBuilder()
            .Equal(uc => uc.CompanyId, currentCompanyId)
            .Equal(uc => uc.Status, SystemConstants.UserStatus.Active)
            .Build();

        var filterBuilder = _userFactory.CreateFilterBuilder();

        // 如果没有指定角色，我们需要获取该企业的所有成员ID
        // 如果指定了角色，_userRoleService.GetUserIdsByRolesAsync 已经处理了企业过滤
        if (request.RoleIds != null && request.RoleIds.Count > 0)
        {
            var userIdsWithRoles = await _userRoleService.GetUserIdsByRolesAsync(request.RoleIds, currentCompanyId);
            if (userIdsWithRoles.Any())
            {
                filterBuilder.In(u => u.Id, userIdsWithRoles);
            }
            else
            {
                // 如果指定了角色但没找到用户，直接返回空结果
                filterBuilder.Equal(u => u.Id, "000000000000000000000000"); // 永远不匹配的 ID
            }
        }
        else
        {
            // 获取该企业的所有成员ID
            var memberships = await _userCompanyFactory.FindAsync(memberFilter);
            var memberUserIds = memberships.Select(uc => uc.UserId).Distinct().ToList();

            if (memberUserIds.Any())
            {
                filterBuilder.In(u => u.Id, memberUserIds);
            }
            else
            {
                // 如果企业没有任何成员（理论上不可能，至少有创建者），返回空结果
                filterBuilder.Equal(u => u.Id, "000000000000000000000000");
            }
        }

        if (!string.IsNullOrEmpty(request.Search))
        {
            var searchFilter = _userFactory.CreateFilterBuilder()
                .Regex(u => u.Username, request.Search, "i")
                .Regex(u => u.Email!, request.Search, "i")
                .BuildOr();
            filterBuilder.Custom(searchFilter);
        }

        // 已在上方统一处理 RoleIds 过滤逻辑，此处不再重复

        if (request.StartDate.HasValue)
            filterBuilder.GreaterThanOrEqual(u => u.CreatedAt, request.StartDate.Value);
        if (request.EndDate.HasValue)
            filterBuilder.LessThanOrEqual(u => u.CreatedAt, request.EndDate.Value);
        if (request.IsActive.HasValue)
            filterBuilder.Equal(u => u.IsActive, request.IsActive.Value);

        return filterBuilder.Build();
    }

    private async Task<List<UserWithRolesResponse>> EnrichUsersWithRolesAsync(List<User> users, string companyId)
    {
        var userIds = users.Select(u => u.Id!).ToList();

        var userCompanyFilter = _userCompanyFactory.CreateFilterBuilder()
            .In(uc => uc.UserId, userIds)
            .Equal(uc => uc.CompanyId, companyId)
            .Equal(uc => uc.Status, SystemConstants.UserStatus.Active)
            .Build();

        var userCompanies = await _userCompanyFactory.FindAsync(userCompanyFilter);

        var allRoleIds = userCompanies.SelectMany(uc => uc.RoleIds).Distinct().ToList();
        var roleIdToNameMap = await _userRoleService.GetRoleNameMapAsync(allRoleIds, companyId);
        var userOrganizationMap = await _userOrganizationService.GetUserOrganizationMapAsync(userIds, companyId);

        var userIdToCompanyMap = userCompanies.ToDictionary(uc => uc.UserId, uc => uc);

        return users.Select(user =>
        {
            var userCompany = userIdToCompanyMap.GetValueOrDefault(user.Id!);
            var roleIds = userCompany?.RoleIds ?? new List<string>();
            var roleNames = roleIds
                .Where(roleId => roleIdToNameMap.ContainsKey(roleId))
                .Select(roleId => roleIdToNameMap[roleId]) // Assuming roleNameMap is Dictionary<string, string>
                .ToList();

            return new UserWithRolesResponse
            {
                Id = user.Id,
                Username = user.Username,
                Name = user.Name,
                Email = user.Email,
                PhoneNumber = user.PhoneNumber,
                Age = user.Age,
                IsActive = user.IsActive,
                LastLoginAt = user.LastLoginAt,
                CreatedAt = user.CreatedAt,
                UpdatedAt = user.UpdatedAt,
                Remark = user.Remark,
                RoleIds = roleIds,
                RoleNames = roleNames,
                IsAdmin = userCompany?.IsAdmin ?? false,
                Organizations = userOrganizationMap.GetValueOrDefault(user.Id!, new List<UserOrganizationInfo>())
            };
        }).ToList();
    }

    /// <inheritdoc/>
    public async Task<UserStatisticsResponse> GetUserStatisticsAsync()
    {
        var currentUserId = _userFactory.GetRequiredUserId();
        var currentUser = await _userFactory.GetByIdAsync(currentUserId);
        if (currentUser == null || string.IsNullOrEmpty(currentUser.CurrentCompanyId))
        {
            throw new UnauthorizedAccessException("CURRENT_COMPANY_NOT_FOUND");
        }
        var currentCompanyId = currentUser.CurrentCompanyId;

        // 获取该企业的所有活跃成员ID，用于统计
        var memberFilter = _userCompanyFactory.CreateFilterBuilder()
            .Equal(uc => uc.CompanyId, currentCompanyId)
            .Equal(uc => uc.Status, SystemConstants.UserStatus.Active)
            .Build();
        var memberships = await _userCompanyFactory.FindAsync(memberFilter);
        var memberUserIds = memberships.Select(uc => uc.UserId).Distinct().ToList();

        if (!memberUserIds.Any())
        {
            return new UserStatisticsResponse();
        }

        var baseFilter = _userFactory.CreateFilterBuilder()
            .In(u => u.Id, memberUserIds)
            .Build();

        var totalUsers = await _userFactory.CountAsync(baseFilter);

        var activeFilter = _userFactory.CreateFilterBuilder()
            .In(u => u.Id, memberUserIds)
            .Equal(u => u.IsActive, true)
            .Build();
        var activeUsers = await _userFactory.CountAsync(activeFilter);
        var inactiveUsers = totalUsers - activeUsers;

        // 管理员统计直接基于 UserCompany 记录，这部分原本就是正确的
        var directAdminFilter = _userCompanyFactory.CreateFilterBuilder()
            .Equal(uc => uc.IsAdmin, true)
            .Equal(uc => uc.CompanyId, currentCompanyId)
            .Equal(uc => uc.Status, SystemConstants.UserStatus.Active)
            .Build();
        var adminUsers = await _userCompanyFactory.CountAsync(directAdminFilter);

        var regularUsers = totalUsers - adminUsers;

        var today = DateTime.UtcNow.Date;
        var thisWeek = today.AddDays(-(int)today.DayOfWeek);
        var thisMonth = new DateTime(today.Year, today.Month, 1, 0, 0, 0, DateTimeKind.Utc);

        var todayFilter = _userFactory.CreateFilterBuilder()
            .In(u => u.Id, memberUserIds)
            .GreaterThanOrEqual(user => user.CreatedAt, today)
            .Build();
        var newUsersToday = await _userFactory.CountAsync(todayFilter);

        var weekFilter = _userFactory.CreateFilterBuilder()
            .In(u => u.Id, memberUserIds)
            .GreaterThanOrEqual(user => user.CreatedAt, thisWeek)
            .Build();
        var newUsersThisWeek = await _userFactory.CountAsync(weekFilter);

        var monthFilter = _userFactory.CreateFilterBuilder()
            .In(u => u.Id, memberUserIds)
            .GreaterThanOrEqual(user => user.CreatedAt, thisMonth)
            .Build();
        var newUsersThisMonth = await _userFactory.CountAsync(monthFilter);

        var totalRoles = await _userRoleService.CountAsync();
        var totalOrganizations = await _organizationService.CountAsync();

        return new UserStatisticsResponse
        {
            TotalUsers = (int)totalUsers,
            ActiveUsers = (int)activeUsers,
            InactiveUsers = (int)inactiveUsers,
            AdminUsers = (int)adminUsers,
            RegularUsers = (int)regularUsers,
            NewUsersToday = (int)newUsersToday,
            NewUsersThisWeek = (int)newUsersThisWeek,
            NewUsersThisMonth = (int)newUsersThisMonth,
            TotalRoles = totalRoles,
            TotalOrganizations = totalOrganizations
        };
    }

    /// <inheritdoc/>
    public async Task<bool> BulkUpdateUsersAsync(BulkUserActionRequest request, string? reason = null)
    {
        var currentUserId = _userFactory.GetRequiredUserId();
        var currentUser = await _userFactory.GetByIdAsync(currentUserId);
        if (currentUser == null || string.IsNullOrEmpty(currentUser.CurrentCompanyId))
        {
            throw new UnauthorizedAccessException("CURRENT_COMPANY_NOT_FOUND");
        }
        var currentCompanyId = currentUser.CurrentCompanyId;

        // 验证这些用户确实属于该企业
        var memberFilter = _userCompanyFactory.CreateFilterBuilder()
            .Equal(uc => uc.CompanyId, currentCompanyId)
            .In(uc => uc.UserId, request.UserIds)
            .Build();
        var memberships = await _userCompanyFactory.FindAsync(memberFilter);
        var validUserIds = memberships.Select(uc => uc.UserId).ToList();

        if (!validUserIds.Any())
        {
            return false;
        }

        var filter = _userFactory.CreateFilterBuilder()
            .In(user => user.Id, validUserIds)
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
                // 核心修复：从当前企业批量移除成员，而不是软删除用户账号
                var userCompanyFilter = _userCompanyFactory.CreateFilterBuilder()
                    .In(uc => uc.UserId, validUserIds)
                    .Equal(uc => uc.CompanyId, currentCompanyId)
                    .Build();

                // 检查是否包含自己
                if (validUserIds.Contains(currentUserId))
                {
                    throw new InvalidOperationException("批量操作中包含当前登录账号，请取消勾选后再操作");
                }

                // 构造软删除更新
                var softDeleteUpdate = _userCompanyFactory.CreateUpdateBuilder()
                    .Set(u => u.IsDeleted, true)
                    .Set(u => u.Status, "inactive")
                    .SetCurrentTimestamp()
                    .Build();

                var deleteCount = await _userCompanyFactory.UpdateManyAsync(userCompanyFilter, softDeleteUpdate);

                if (deleteCount > 0)
                {
                    // 批量清除受影响用户的 CurrentCompanyId（如果他们当前正处于此企业）
                    var usersUpdateFilter = _userFactory.CreateFilterBuilder()
                        .In(u => u.Id, validUserIds)
                        .Equal(u => u.CurrentCompanyId, currentCompanyId)
                        .Build();
                    var usersUpdate = _userFactory.CreateUpdateBuilder()
                        .Set(u => u.CurrentCompanyId, string.Empty)
                        .SetCurrentTimestamp()
                        .Build();
                    await _userFactory.UpdateManyAsync(usersUpdateFilter, usersUpdate);
                }

                return deleteCount > 0;
            default:
                return false;
        }

        await _userFactory.UpdateManyAsync(filter, update);
        return true;
    }

    /// <inheritdoc/>
    public async Task<bool> DeactivateUserAsync(string id)
    {
        var filter = _userFactory.CreateFilterBuilder().Equal(u => u.Id, id).Build();
        var update = _userFactory.CreateUpdateBuilder().Set(u => u.IsActive, false).Build();
        var updatedUser = await _userFactory.FindOneAndUpdateAsync(filter, update);
        return updatedUser != null;
    }

    /// <inheritdoc/>
    public async Task<bool> ActivateUserAsync(string id)
    {
        var filter = _userFactory.CreateFilterBuilder().Equal(u => u.Id, id).Build();
        var update = _userFactory.CreateUpdateBuilder().Set(u => u.IsActive, true).Build();
        var updatedUser = await _userFactory.FindOneAndUpdateAsync(filter, update);
        return updatedUser != null;
    }

    // Delegating to UserActivityLogService
    /// <inheritdoc/>
    public async Task LogUserActivityAsync(string userId, string action, string description, string? ipAddress = null, string? userAgent = null)
    {
        await _userActivityLogService.LogUserActivityAsync(userId, action, description, ipAddress, userAgent);
    }

    /// <inheritdoc/>
    public async Task<List<UserActivityLog>> GetUserActivityLogsAsync(string userId, int limit = 50)
    {
        return await _userActivityLogService.GetUserActivityLogsAsync(userId, limit);
    }

    /// <inheritdoc/>
    public async Task<UserActivityPagedWithStatsResponse> GetCurrentUserActivityLogsAsync(
        int page = 1, int pageSize = 20, string? action = null, string? httpMethod = null, int? statusCode = null,
        string? ipAddress = null, DateTime? startDate = null, DateTime? endDate = null, string? sortBy = null, string? sortOrder = null)
    {
        return await _userActivityLogService.GetCurrentUserActivityLogsAsync(page, pageSize, action, httpMethod, statusCode, ipAddress, startDate, endDate, sortBy, sortOrder);
    }

    /// <inheritdoc/>
    public async Task<UserActivityLog?> GetCurrentUserActivityLogByIdAsync(string logId)
    {
        return await _userActivityLogService.GetCurrentUserActivityLogByIdAsync(logId);
    }

    /// <inheritdoc/>
    public async Task<UserActivityLog?> GetActivityLogByIdAsync(string logId)
    {
        return await _userActivityLogService.GetActivityLogByIdAsync(logId);
    }

    /// <inheritdoc/>
    public async Task<(List<UserActivityLog> logs, long total)> GetAllActivityLogsAsync(
        int page = 1, int pageSize = 20, string? userId = null, string? action = null, string? httpMethod = null,
        int? statusCode = null, string? ipAddress = null, DateTime? startDate = null, DateTime? endDate = null)
    {
        return await _userActivityLogService.GetAllActivityLogsAsync(page, pageSize, userId, action, httpMethod, statusCode, ipAddress, startDate, endDate);
    }

    /// <inheritdoc/>
    public async Task<(List<UserActivityLog> logs, long total, Dictionary<string, string> userMap)> GetAllActivityLogsWithUsersAsync(
        int page = 1, int pageSize = 20, string? userId = null, string? action = null, string? httpMethod = null,
        int? statusCode = null, string? ipAddress = null, DateTime? startDate = null, DateTime? endDate = null)
    {
        return await _userActivityLogService.GetAllActivityLogsWithUsersAsync(page, pageSize, userId, action, httpMethod, statusCode, ipAddress, startDate, endDate);
    }

    // Delegating to UserRoleService
    /// <inheritdoc/>
    public async Task<object> GetUserPermissionsAsync(string userId)
    {
        return await _userRoleService.GetUserPermissionsAsync(userId);
    }

    /// <inheritdoc/>
    public async Task<User?> UpdateUserProfileAsync(string userId, UpdateProfileRequest request)
    {
        if (!string.IsNullOrEmpty(request.Email))
        {
            _validationService.ValidateEmail(request.Email);
            await _uniquenessChecker.EnsureEmailUniqueAsync(request.Email, excludeUserId: userId);
        }

        var filter = _userFactory.CreateFilterBuilder().Equal(u => u.Id, userId).Build();
        var updateBuilder = _userFactory.CreateUpdateBuilder();

        if (!string.IsNullOrEmpty(request.Email)) updateBuilder.Set(u => u.Email, request.Email);
        if (!string.IsNullOrEmpty(request.Name)) updateBuilder.Set(u => u.Name, request.Name);
        if (request.Age.HasValue) updateBuilder.Set(u => u.Age, request.Age.Value);

        if (request.Avatar != null)
        {
            var avatarPayload = request.Avatar.Trim();
            if (!string.IsNullOrEmpty(avatarPayload))
            {
                if (avatarPayload.Length > 2_500_000) throw new ArgumentException("AVATAR_TOO_LARGE", nameof(request.Avatar));
                updateBuilder.Set(u => u.Avatar, avatarPayload);
            }
            else
            {
                updateBuilder.Set(u => u.Avatar, string.Empty);
            }
        }

        if (request.PhoneNumber != null)
        {
            var phoneNumber = request.PhoneNumber.Trim();
            if (phoneNumber == string.Empty) updateBuilder.Unset(u => u.PhoneNumber);
            else updateBuilder.Set(u => u.PhoneNumber, phoneNumber);
        }

        var update = updateBuilder.Build();
        var updatedUser = await _userFactory.FindOneAndUpdateAsync(filter, update);

        if (updatedUser == null) throw new KeyNotFoundException($"USER_NOT_FOUND");

        return await GetUserByIdWithoutTenantFilterAsync(userId);
    }

    /// <inheritdoc/>
    /// <inheritdoc/>
    public async Task<bool> ChangePasswordAsync(string userId, ChangePasswordRequest request)
    {
        var user = await GetUserByIdWithoutTenantFilterAsync(userId);
        if (user == null) return false;

        if (!BCrypt.Net.BCrypt.Verify(request.CurrentPassword, user.PasswordHash)) return false;

        var newPasswordHash = BCrypt.Net.BCrypt.HashPassword(request.NewPassword);
        var filter = _userFactory.CreateFilterBuilder().Equal(u => u.Id, user.Id).Build();
        var update = _userFactory.CreateUpdateBuilder().Set(u => u.PasswordHash, newPasswordHash).Build();
        return await _userFactory.FindOneAndUpdateAsync(filter, update) != null;
    }

    /// <inheritdoc/>
    /// <inheritdoc/>
    public async Task<bool> CheckEmailExistsAsync(string email, string? excludeUserId = null)
    {
        var filterBuilder = _userFactory.CreateFilterBuilder().Equal(user => user.Email, email);
        if (!string.IsNullOrEmpty(excludeUserId)) filterBuilder.NotEqual(user => user.Id, excludeUserId);
        return await _userFactory.CountAsync(filterBuilder.Build()) > 0;
    }

    /// <inheritdoc/>
    /// <inheritdoc/>
    public async Task<bool> CheckUsernameExistsAsync(string username, string? excludeUserId = null)
    {
        var filterBuilder = _userFactory.CreateFilterBuilder().Equal(user => user.Username, username);
        if (!string.IsNullOrEmpty(excludeUserId)) filterBuilder.NotEqual(user => user.Id, excludeUserId);
        return await _userFactory.CountAsync(filterBuilder.Build()) > 0;
    }

    /// <inheritdoc/>
    public Task<string> GetAiRoleDefinitionAsync(string userId)
    {
        // Placeholder implementation
        return Task.FromResult("");
    }

    /// <inheritdoc/>
    public Task<bool> UpdateAiRoleDefinitionAsync(string userId, string roleDefinition)
    {
        return Task.FromResult(true);
    }
}
