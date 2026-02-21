using User = Platform.ApiService.Models.AppUser;
using Platform.ApiService.Constants;
using Platform.ApiService.Extensions;
using Platform.ApiService.Models;
using Platform.ApiService.Models.Response;
using Platform.ServiceDefaults.Models;
using Platform.ServiceDefaults.Services;
using System.Linq.Expressions;
using Microsoft.EntityFrameworkCore;

namespace Platform.ApiService.Services;

/// <summary>
/// 用户服务实现
/// </summary>
public class UserService(
    IDataFactory<User> userFactory,
    IDataFactory<UserCompany> userCompanyFactory,
    IDataFactory<Company> companyFactory,
    IUniquenessChecker uniquenessChecker,
    IFieldValidationService validationService,
    IUserRoleService userRoleService,
    IUserOrganizationService userOrganizationService,
    IOrganizationService organizationService,
    IUserActivityLogService userActivityLogService,
    IMenuAccessService menuAccessService,
    IPasswordEncryptionService encryptionService,
    ITenantContext tenantContext) : IUserService
{
    // private const string ACTIVE_STATUS = "active"; // Replaced by SystemConstants.UserStatus.Active

    private readonly IDataFactory<User> _userFactory = userFactory;
    private readonly IDataFactory<UserCompany> _userCompanyFactory = userCompanyFactory;
    private readonly IDataFactory<Company> _companyFactory = companyFactory;
    private readonly IUniquenessChecker _uniquenessChecker = uniquenessChecker;
    private readonly IFieldValidationService _validationService = validationService;

    // Injected new services
    private readonly IUserRoleService _userRoleService = userRoleService;
    private readonly IUserOrganizationService _userOrganizationService = userOrganizationService;
    private readonly IOrganizationService _organizationService = organizationService;
    private readonly IUserActivityLogService _userActivityLogService = userActivityLogService;
    private readonly IMenuAccessService _menuAccessService = menuAccessService;
    private readonly IPasswordEncryptionService _encryptionService = encryptionService;
    private readonly ITenantContext _tenantContext = tenantContext;

    /// <inheritdoc/>
    public async Task<List<AppUser>> GetAllUsersAsync()
    {
        var currentUserId = _tenantContext.GetCurrentUserId() ?? throw new UnauthorizedAccessException("USER_NOT_AUTHENTICATED");
        var currentUser = await _userFactory.GetByIdAsync(currentUserId);
        if (currentUser == null || string.IsNullOrEmpty(currentUser.CurrentCompanyId))
        {
            throw new UnauthorizedAccessException("CURRENT_COMPANY_NOT_FOUND");
        }
        var currentCompanyId = currentUser.CurrentCompanyId;

        // 获取该企业的所有成员ID
        var memberships = await _userCompanyFactory.FindAsync(uc =>
            uc.CompanyId == currentCompanyId &&
            uc.Status == SystemConstants.UserStatus.Active);

        var memberUserIds = memberships.Select(uc => uc.UserId).Distinct().ToList();

        if (!memberUserIds.Any())
        {
            return new List<AppUser>();
        }

        return await _userFactory.FindAsync(u => memberUserIds.Contains(u.Id));
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

        var currentUserId = _tenantContext.GetCurrentUserId() ?? throw new UnauthorizedAccessException("USER_NOT_AUTHENTICATED");
        var currentUser = await _userFactory.GetByIdAsync(currentUserId);
        var companyId = await _tenantContext.GetCurrentCompanyIdAsync();

        if (string.IsNullOrEmpty(companyId))
        {
            throw new UnauthorizedAccessException("CURRENT_COMPANY_NOT_FOUND");
        }

        // 2. 检查企业人数限制
        var company = await _companyFactory.GetByIdAsync(companyId);

        if (company != null)
        {
            var currentUserCount = await _userCompanyFactory.CountAsync(uc =>
                uc.CompanyId == companyId &&
                uc.Status == SystemConstants.UserStatus.Active
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

        // 4. 跨租户查找现有用户
        var existingUser = (await _userFactory.FindAsync(u => u.Username == request.Username)).FirstOrDefault();

        if (existingUser != null)
        {
            // 已经是系统用户，检查是否已在当前企业
            var existingMembership = (await _userCompanyFactory.FindAsync(uc =>
                uc.UserId == existingUser.Id &&
                uc.CompanyId == companyId &&
                !uc.IsDeleted)).FirstOrDefault();

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
                await _userFactory.UpdateAsync(existingUser.Id!, u => u.CurrentCompanyId = companyId);
            }

            return existingUser;
        }

        // 5. 如果用户不存在，则不支持直接创建（根据最新要求：只允许添加现有系统用户）
        throw new InvalidOperationException("用户不存在，请先在系统中注册该用户。");
    }

    /// <inheritdoc/>
    public async Task<User?> UpdateUserAsync(string id, UpdateUserRequest request)
    {
        return await _userFactory.UpdateAsync(id, u =>
        {
            if (!string.IsNullOrEmpty(request.Name)) u.Username = request.Name; // Assuming Name maps to Username
            if (!string.IsNullOrEmpty(request.Email)) u.Email = request.Email;
        });
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

        // Update User entity
        var updatedUser = await _userFactory.UpdateAsync(id, u =>
        {
            if (!string.IsNullOrEmpty(request.Username)) u.Username = request.Username;
            if (!string.IsNullOrEmpty(request.Email)) u.Email = request.Email;
            if (request.IsActive.HasValue) u.IsActive = request.IsActive.Value;
            if (request.Remark != null) u.Remark = request.Remark;
        });

        if (updatedUser != null && request.RoleIds != null)
        {
            var currentUserId = _tenantContext.GetCurrentUserId() ?? throw new UnauthorizedAccessException("USER_NOT_AUTHENTICATED");
            var currentUser = await _userFactory.GetByIdAsync(currentUserId);
            if (currentUser == null)
            {
                throw new UnauthorizedAccessException("CURRENT_USER_NOT_FOUND");
            }
            var companyId = await _tenantContext.GetCurrentCompanyIdAsync();
            if (string.IsNullOrEmpty(companyId))
            {
                throw new UnauthorizedAccessException("CURRENT_COMPANY_NOT_FOUND");
            }

            if (request.RoleIds.Any())
            {
                await _userRoleService.ValidateRoleOwnershipAsync(request.RoleIds);
            }

            var ucResult = await _userCompanyFactory.FindAsync(uc =>
                uc.UserId == id &&
                uc.CompanyId == companyId &&
                uc.IsDeleted != true, limit: 1);
            var existingUc = ucResult.FirstOrDefault();
            UserCompany? updatedUserCompany = null;
            if (existingUc != null)
            {
                updatedUserCompany = await _userCompanyFactory.UpdateAsync(existingUc.Id, uc => uc.RoleIds = request.RoleIds);
            }

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
        var currentCompanyId = await _tenantContext.GetCurrentCompanyIdAsync();

        if (string.IsNullOrEmpty(currentCompanyId))
        {
            throw new UnauthorizedAccessException("CURRENT_COMPANY_NOT_FOUND");
        }

        // 核心修复：删除用户应该是从当前企业移除关联，而不是删除用户账号本身
        var result = await _userCompanyFactory.FindAsync(uc =>
            uc.UserId == id && uc.CompanyId == currentCompanyId);

        var membership = result.FirstOrDefault();
        if (membership != null)
        {
            await _userCompanyFactory.SoftDeleteAsync(membership.Id);

            // 如果被删除的用户当前正处于此企业，清除其 CurrentCompanyId，防止登录后状态异常
            await _userFactory.UpdateManyAsync(
                u => u.Id == id && u.CurrentCompanyId == currentCompanyId,
                u => u.CurrentCompanyId = string.Empty);
        }

        return membership != null;
    }

    /// <inheritdoc/>
    public async Task<List<User>> SearchUsersByNameAsync(string name)
    {
        return await _userFactory.FindAsync(u => u.Username.Contains(name));
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
        var currentUserId = _tenantContext.GetCurrentUserId() ?? throw new UnauthorizedAccessException("USER_NOT_AUTHENTICATED");
        var currentCompanyId = await _tenantContext.GetCurrentCompanyIdAsync();

        if (string.IsNullOrEmpty(currentCompanyId))
        {
            throw new UnauthorizedAccessException("CURRENT_COMPANY_NOT_FOUND");
        }
        var filter = await BuildUserListFilterAsync(request, currentCompanyId);

        Func<IQueryable<User>, IOrderedQueryable<User>>? orderBy = null;
        var sortBy = request.SortBy?.Trim().ToLowerInvariant();
        var isAscending = string.Equals(request.SortOrder, "asc", StringComparison.OrdinalIgnoreCase);

        orderBy = sortBy switch
        {
            "username" => q => isAscending ? q.OrderBy(u => u.Username) : q.OrderByDescending(u => u.Username),
            "email" => q => isAscending ? q.OrderBy(u => u.Email) : q.OrderByDescending(u => u.Email),
            "lastloginat" => q => isAscending ? q.OrderBy(u => u.LastLoginAt) : q.OrderByDescending(u => u.LastLoginAt),
            "updatedat" => q => isAscending ? q.OrderBy(u => u.UpdatedAt) : q.OrderByDescending(u => u.UpdatedAt),
            "name" => q => isAscending ? q.OrderBy(u => u.Name) : q.OrderByDescending(u => u.Name),
            "isactive" => q => isAscending ? q.OrderBy(u => u.IsActive) : q.OrderByDescending(u => u.IsActive),
            _ => q => isAscending ? q.OrderBy(u => u.CreatedAt) : q.OrderByDescending(u => u.CreatedAt)
        };

        var (users, total) = await _userFactory.FindPagedAsync(filter, orderBy, request.Page, request.PageSize);

        var usersWithRoles = await EnrichUsersWithRolesAsync(users, currentCompanyId);

        return new UserListWithRolesResponse
        {
            Users = usersWithRoles,
            Total = (int)total,
            Page = request.Page,
            PageSize = request.PageSize
        };
    }

    private async Task<Expression<Func<User, bool>>> BuildUserListFilterAsync(UserListRequest request, string currentCompanyId)
    {
        List<string> memberUserIds;
        if (request.RoleIds != null && request.RoleIds.Count > 0)
        {
            memberUserIds = await _userRoleService.GetUserIdsByRolesAsync(request.RoleIds, currentCompanyId);
        }
        else
        {
            var memberships = await _userCompanyFactory.FindAsync(uc =>
                uc.CompanyId == currentCompanyId &&
                uc.Status == SystemConstants.UserStatus.Active);
            memberUserIds = memberships.Select(uc => uc.UserId).Distinct().ToList();
        }

        if (!memberUserIds.Any())
        {
            return u => false;
        }

        // 构建 Lambda 表达式链
        Expression<Func<User, bool>> filter = u => memberUserIds.Contains(u.Id);

        if (!string.IsNullOrEmpty(request.Search))
        {
            var search = request.Search.ToLower();
            filter = CombineFilters(filter, u => u.Username.Contains(search) || (u.Email != null && u.Email.Contains(search)));
        }

        if (request.StartDate.HasValue)
            filter = CombineFilters(filter, u => u.CreatedAt >= request.StartDate.Value);
        if (request.EndDate.HasValue)
            filter = CombineFilters(filter, u => u.CreatedAt <= request.EndDate.Value);
        if (request.IsActive.HasValue)
            filter = CombineFilters(filter, u => u.IsActive == request.IsActive.Value);

        return filter;
    }

    private static Expression<Func<T, bool>> CombineFilters<T>(Expression<Func<T, bool>> first, Expression<Func<T, bool>> second)
    {
        var parameter = Expression.Parameter(typeof(T));
        var combined = Expression.AndAlso(
            Expression.Invoke(first, parameter),
            Expression.Invoke(second, parameter)
        );
        return Expression.Lambda<Func<T, bool>>(combined, parameter);
    }

    private async Task<List<UserWithRolesResponse>> EnrichUsersWithRolesAsync(List<User> users, string companyId)
    {
        var userIds = users.Select(u => u.Id!).ToList();

        var userCompanies = await _userCompanyFactory.FindAsync(uc =>
            userIds.Contains(uc.UserId) &&
            uc.CompanyId == companyId &&
            uc.Status == SystemConstants.UserStatus.Active);

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
        var currentCompanyId = await _tenantContext.GetCurrentCompanyIdAsync();
        if (string.IsNullOrEmpty(currentCompanyId))
        {
            throw new UnauthorizedAccessException("CURRENT_COMPANY_NOT_FOUND");
        }
        // 获取该企业的所有活跃成员ID，用于统计
        var memberships = await _userCompanyFactory.FindAsync(uc => uc.CompanyId == currentCompanyId && uc.Status == SystemConstants.UserStatus.Active);
        var memberUserIds = memberships.Select(uc => uc.UserId).Distinct().ToList();

        if (!memberUserIds.Any())
        {
            return new UserStatisticsResponse();
        }

        var totalUsers = await _userFactory.CountAsync(u => memberUserIds.Contains(u.Id));
        var activeUsers = await _userFactory.CountAsync(u => memberUserIds.Contains(u.Id) && u.IsActive);
        var inactiveUsers = totalUsers - activeUsers;

        var adminUsers = await _userCompanyFactory.CountAsync(uc =>
            uc.IsAdmin && uc.CompanyId == currentCompanyId && uc.Status == SystemConstants.UserStatus.Active);

        var regularUsers = totalUsers - adminUsers;

        var today = DateTime.UtcNow.Date;
        var thisWeek = today.AddDays(-(int)today.DayOfWeek);
        var thisMonth = new DateTime(today.Year, today.Month, 1, 0, 0, 0, DateTimeKind.Utc);

        var newUsersToday = await _userFactory.CountAsync(u => memberUserIds.Contains(u.Id) && u.CreatedAt >= today);
        var newUsersThisWeek = await _userFactory.CountAsync(u => memberUserIds.Contains(u.Id) && u.CreatedAt >= thisWeek);
        var newUsersThisMonth = await _userFactory.CountAsync(u => memberUserIds.Contains(u.Id) && u.CreatedAt >= thisMonth);

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
        var currentUserId = _tenantContext.GetCurrentUserId() ?? throw new UnauthorizedAccessException("USER_NOT_AUTHENTICATED");
        var currentCompanyId = await _tenantContext.GetCurrentCompanyIdAsync();
        if (string.IsNullOrEmpty(currentCompanyId))
        {
            throw new UnauthorizedAccessException("CURRENT_COMPANY_NOT_FOUND");
        }
        // 验证这些用户确实属于该企业
        var memberships = await _userCompanyFactory.FindAsync(uc =>
            uc.CompanyId == currentCompanyId &&
            request.UserIds.Contains(uc.UserId));
        var validUserIds = memberships.Select(uc => uc.UserId).ToList();

        if (!validUserIds.Any())
        {
            return false;
        }

        switch (request.Action.ToLower())
        {
            case "activate":
                var activeCount = await _userFactory.UpdateManyAsync(
                    u => validUserIds.Contains(u.Id),
                    u => u.IsActive = true);
                return activeCount > 0;
            case "deactivate":
                var deactiveCount = await _userFactory.UpdateManyAsync(
                    u => validUserIds.Contains(u.Id),
                    u => u.IsActive = false);
                return deactiveCount > 0;
            case "delete":
                // 核心修复：从当前企业批量移除成员，而不是软删除用户账号
                // 检查是否包含自己
                if (validUserIds.Contains(currentUserId))
                {
                    throw new InvalidOperationException("批量操作中包含当前登录账号，请取消勾选后再操作");
                }

                // 构造并执行软删除
                var deletedCount = await _userCompanyFactory.UpdateManyAsync(
                    uc => validUserIds.Contains(uc.UserId) && uc.CompanyId == currentCompanyId,
                    uc =>
                    {
                        uc.IsDeleted = true;
                        uc.Status = SystemConstants.UserStatus.Inactive;
                    });

                if (deletedCount > 0)
                {
                    // 批量清除受影响用户的 CurrentCompanyId（如果他们当前正处于此企业）
                    await _userFactory.UpdateManyAsync(
                        u => validUserIds.Contains(u.Id) && u.CurrentCompanyId == currentCompanyId,
                        u => u.CurrentCompanyId = string.Empty);
                }

                return deletedCount > 0;
            default:
                return false;
        }
    }

    /// <inheritdoc/>
    public async Task<bool> DeactivateUserAsync(string id)
    {
        var updatedUser = await _userFactory.UpdateAsync(id, u => u.IsActive = false);
        return updatedUser != null;
    }

    /// <inheritdoc/>
    public async Task<bool> ActivateUserAsync(string id)
    {
        var updatedUser = await _userFactory.UpdateAsync(id, u => u.IsActive = true);
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

        var updatedUser = await _userFactory.UpdateAsync(userId, u =>
        {
            if (!string.IsNullOrEmpty(request.Email)) u.Email = request.Email;
            if (!string.IsNullOrEmpty(request.Name)) u.Name = request.Name;
            if (request.Age.HasValue) u.Age = request.Age.Value;

            if (request.Avatar != null)
            {
                u.Avatar = request.Avatar.Trim();
            }

            if (request.PhoneNumber != null)
            {
                u.PhoneNumber = request.PhoneNumber.Trim();
            }
        });

        if (updatedUser == null) throw new KeyNotFoundException($"USER_NOT_FOUND");

        return updatedUser;
    }

    /// <inheritdoc/>
    /// <inheritdoc/>
    public async Task<bool> ChangePasswordAsync(string userId, ChangePasswordRequest request)
    {
        var user = await GetUserByIdWithoutTenantFilterAsync(userId);
        if (user == null) return false;

        // 🔒 安全增强：解密前端加密的密码
        var rawCurrentPassword = _encryptionService.TryDecryptPassword(request.CurrentPassword);
        var rawNewPassword = _encryptionService.TryDecryptPassword(request.NewPassword);

        if (!BCrypt.Net.BCrypt.Verify(rawCurrentPassword, user.PasswordHash)) return false;

        var newPasswordHash = BCrypt.Net.BCrypt.HashPassword(rawNewPassword);
        var updatedUser = await _userFactory.UpdateAsync(user.Id!, u => u.PasswordHash = newPasswordHash);
        return updatedUser != null;
    }

    /// <inheritdoc/>
    /// <inheritdoc/>
    public async Task<bool> CheckEmailExistsAsync(string email, string? excludeUserId = null)
    {
        return await _userFactory.ExistsAsync(u => u.Email == email && (excludeUserId == null || u.Id != excludeUserId));
    }

    /// <inheritdoc/>
    /// <inheritdoc/>
    public async Task<bool> CheckUsernameExistsAsync(string username, string? excludeUserId = null)
    {
        return await _userFactory.ExistsAsync(u => u.Username == username && (excludeUserId == null || u.Id != excludeUserId));
    }

    /// <inheritdoc/>
    public async Task<string> GetAiRoleDefinitionAsync(string userId)
    {
        var user = await _userFactory.GetByIdWithoutTenantFilterAsync(userId);
        return user?.AiRoleDefinition ?? string.Empty;
    }

    /// <inheritdoc/>
    public async Task<bool> UpdateAiRoleDefinitionAsync(string userId, string roleDefinition)
    {
        // 允许设置为空字符串以清除定义
        var updatedUser = await _userFactory.UpdateAsync(userId, u => u.AiRoleDefinition = roleDefinition);
        return updatedUser != null;
    }
}
