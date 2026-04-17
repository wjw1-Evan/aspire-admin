using User = Platform.ApiService.Models.AppUser;
using Platform.ApiService.Constants;
using Platform.ApiService.Extensions;
using Platform.ApiService.Models;
using Platform.ApiService.Models.Response;
using Platform.ServiceDefaults.Models;
using Platform.ServiceDefaults.Services;
using Platform.ServiceDefaults.Extensions;
using System.Linq.Expressions;
using System.Linq.Dynamic.Core;
using Microsoft.EntityFrameworkCore;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using System.Text.Json;

namespace Platform.ApiService.Services;

/// <summary>
/// 用户服务实现
/// </summary>
public class UserService : IUserService
{
    private readonly DbContext _context;
    private readonly IUniquenessChecker _uniquenessChecker;
    private readonly IFieldValidationService _validationService;
    private readonly IUserRoleService _userRoleService;
    private readonly IUserOrganizationService _userOrganizationService;
    private readonly IOrganizationService _organizationService;
    private readonly IUserActivityLogService _userActivityLogService;
    private readonly IMenuAccessService _menuAccessService;
    private readonly IPasswordEncryptionService _encryptionService;
    private readonly IPasswordHasher _passwordHasher;
    private readonly ITenantContext _tenantContext;

    public UserService(
        DbContext context,
        IUniquenessChecker uniquenessChecker,
        IFieldValidationService validationService,
        IUserRoleService userRoleService,
        IUserOrganizationService userOrganizationService,
        IOrganizationService organizationService,
        IUserActivityLogService userActivityLogService,
        IMenuAccessService menuAccessService,
        IPasswordEncryptionService encryptionService,
        IPasswordHasher passwordHasher,
        ITenantContext tenantContext)
    {
        _context = context;
        _uniquenessChecker = uniquenessChecker;
        _validationService = validationService;
        _userRoleService = userRoleService;
        _userOrganizationService = userOrganizationService;
        _organizationService = organizationService;
        _userActivityLogService = userActivityLogService;
        _menuAccessService = menuAccessService;
        _encryptionService = encryptionService;
        _passwordHasher = passwordHasher;
        _tenantContext = tenantContext;
    }

    /// <inheritdoc/>
    public async Task<List<AppUser>> GetAllUsersAsync()
    {
        var currentUserId = _tenantContext.GetCurrentUserId() ?? throw new UnauthorizedAccessException("USER_NOT_AUTHENTICATED");
        var currentUser = await _context.Set<User>().FirstOrDefaultAsync(u => u.Id == currentUserId);
        if (currentUser == null || string.IsNullOrEmpty(currentUser.CurrentCompanyId))
        {
            throw new UnauthorizedAccessException("CURRENT_COMPANY_NOT_FOUND");
        }
        var currentCompanyId = currentUser.CurrentCompanyId;

        var memberships = await _context.Set<UserCompany>()
            .Where(uc => uc.CompanyId == currentCompanyId && uc.Status == SystemConstants.UserStatus.Active)
            .ToListAsync();

        var memberUserIds = memberships.Select(uc => uc.UserId).Distinct().ToList();

        if (!memberUserIds.Any())
        {
            return new List<AppUser>();
        }

        return await _context.Set<User>().Where(u => memberUserIds.Contains(u.Id)).ToListAsync();
    }

    /// <inheritdoc/>
    public async Task<User?> GetUserByIdAsync(string id)
    {
        return await _context.Set<User>().FirstOrDefaultAsync(u => u.Id == id);
    }

    /// <inheritdoc/>
    public async Task<User?> GetUserByIdWithoutTenantFilterAsync(string id)
    {
        return await _context.Set<User>().IgnoreQueryFilters().FirstOrDefaultAsync(u => u.Id == id);
    }

    /// <inheritdoc/>
    public async Task<Dictionary<string, User>> GetUsersByIdsAsync(IEnumerable<string> ids)
    {
        var idList = ids.Where(id => !string.IsNullOrEmpty(id)).Distinct().ToList();
        if (idList.Count == 0)
        {
            return new Dictionary<string, User>();
        }

        var users = await _context.Set<User>().Where(u => idList.Contains(u.Id)).ToListAsync();
        return users.ToDictionary(u => u.Id!, u => u);
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

        await _context.Set<User>().AddAsync(user);
        await _context.SaveChangesAsync();
        return user;
    }

    /// <inheritdoc/>
    public async Task EnsureUserAccessAsync(string currentUserId, string targetUserId)
    {
        if (currentUserId == targetUserId)
        {
            return;
        }

        var hasMenuAccess = await _menuAccessService.HasMenuAccessAsync(SystemConstants.Permissions.UserManagement, currentUserId);
        if (!hasMenuAccess)
        {
            throw new UnauthorizedAccessException("USER_VIEW_PERMISSION_DENIED");
        }
    }

    /// <inheritdoc/>
    public async Task<User> CreateUserManagementAsync(CreateUserManagementRequest request)
    {
        _validationService.ValidateUsername(request.Username);

        var currentUserId = _tenantContext.GetCurrentUserId() ?? throw new UnauthorizedAccessException("USER_NOT_AUTHENTICATED");
        var companyId = await _tenantContext.GetCurrentCompanyIdAsync();

        if (string.IsNullOrEmpty(companyId))
        {
            throw new UnauthorizedAccessException("CURRENT_COMPANY_NOT_FOUND");
        }

        var company = await _context.Set<Company>().FirstOrDefaultAsync(c => c.Id == companyId);
        if (company != null)
        {
            var currentUserCount = await _context.Set<UserCompany>().CountAsync(uc => uc.CompanyId == companyId && uc.Status == SystemConstants.UserStatus.Active);
            if (currentUserCount >= company.MaxUsers)
            {
                throw new InvalidOperationException(ErrorMessages.MaxUsersReached);
            }
        }

        var roleIds = request.RoleIds ?? new List<string>();
        if (roleIds.Any())
        {
            await _userRoleService.ValidateRoleOwnershipAsync(roleIds);
        }

        var existingUser = await _context.Set<User>().IgnoreQueryFilters().FirstOrDefaultAsync(u => u.Username == request.Username);
        if (existingUser != null)
        {
            var existingMembership = await _context.Set<UserCompany>().IgnoreQueryFilters().FirstOrDefaultAsync(uc => uc.UserId == existingUser.Id && uc.CompanyId == companyId && uc.IsDeleted != true);
            if (existingMembership != null)
            {
                throw new InvalidOperationException("该用户已经是当前企业的成员");
            }

            var userCompany = new UserCompany
            {
                UserId = existingUser.Id!,
                CompanyId = companyId,
                RoleIds = roleIds,
                IsAdmin = false,
                Status = SystemConstants.UserStatus.Active
            };
            await _context.Set<UserCompany>().AddAsync(userCompany);

            if (string.IsNullOrEmpty(existingUser.CurrentCompanyId))
            {
                existingUser.CurrentCompanyId = companyId;
            }
            await _context.SaveChangesAsync();
            return existingUser;
        }

        throw new InvalidOperationException("用户不存在，请先在系统中注册该用户。");
    }

    /// <inheritdoc/>
    public async Task<User?> UpdateUserAsync(string id, UpdateUserRequest request)
    {
        var user = await _context.Set<User>().FirstOrDefaultAsync(u => u.Id == id);
        if (user == null) return null;

        if (!string.IsNullOrEmpty(request.Name)) user.Username = request.Name;
        if (!string.IsNullOrEmpty(request.Email)) user.Email = request.Email;

        await _context.SaveChangesAsync();
        return user;
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

        var user = await _context.Set<User>().FirstOrDefaultAsync(u => u.Id == id);
        if (user == null) return null;

        if (!string.IsNullOrEmpty(request.Username)) user.Username = request.Username;
        if (!string.IsNullOrEmpty(request.Email)) user.Email = request.Email;
        if (request.IsActive.HasValue) user.IsActive = request.IsActive.Value;
        if (request.Remark != null) user.Remark = request.Remark;

        if (request.RoleIds != null)
        {
            var currentUserId = _tenantContext.GetCurrentUserId() ?? throw new UnauthorizedAccessException("USER_NOT_AUTHENTICATED");
            var companyId = await _tenantContext.GetCurrentCompanyIdAsync();
            if (string.IsNullOrEmpty(companyId))
            {
                throw new UnauthorizedAccessException("CURRENT_COMPANY_NOT_FOUND");
            }

            if (request.RoleIds.Any())
            {
                await _userRoleService.ValidateRoleOwnershipAsync(request.RoleIds);
            }

            var existingUc = await _context.Set<UserCompany>().IgnoreQueryFilters()
                .FirstOrDefaultAsync(uc => uc.UserId == id && uc.CompanyId == companyId && uc.IsDeleted != true);

            if (existingUc != null)
            {
                existingUc.RoleIds = request.RoleIds;
            }
            else
            {
                var newUserCompany = new UserCompany
                {
                    UserId = id,
                    CompanyId = companyId,
                    RoleIds = request.RoleIds,
                    IsAdmin = false,
                    Status = SystemConstants.UserStatus.Active
                };
                await _context.Set<UserCompany>().AddAsync(newUserCompany);
            }
        }

        await _context.SaveChangesAsync();
        return user;
    }

    /// <inheritdoc/>
    public async Task<bool> DeleteUserAsync(string id, string? reason = null)
    {
        var currentCompanyId = await _tenantContext.GetCurrentCompanyIdAsync();
        if (string.IsNullOrEmpty(currentCompanyId))
        {
            throw new UnauthorizedAccessException("CURRENT_COMPANY_NOT_FOUND");
        }

        var membership = await _context.Set<UserCompany>()
            .FirstOrDefaultAsync(uc => uc.UserId == id && uc.CompanyId == currentCompanyId);

        if (membership != null)
        {
            _context.Set<UserCompany>().Remove(membership);

            var user = await _context.Set<User>().FirstOrDefaultAsync(u => u.Id == id && u.CurrentCompanyId == currentCompanyId);
            if (user != null)
            {
                user.CurrentCompanyId = string.Empty;
            }

            await _context.SaveChangesAsync();
            return true;
        }

        return false;
    }

    /// <inheritdoc/>
    public async Task<List<User>> SearchUsersByNameAsync(string name)
    {
        return await _context.Set<User>().Where(u => u.Username.Contains(name)).ToListAsync();
    }

    /// <inheritdoc/>
    public async Task<System.Linq.Dynamic.Core.PagedResult<User>> GetUsersWithPaginationAsync(Platform.ServiceDefaults.Models.ProTableRequest request)
    {
        var query = _context.Set<User>().Where(u => u.IsActive);

        return query.ToPagedList(request);
    }

    public async Task<System.Linq.Dynamic.Core.PagedResult<UserWithRolesResponse>> GetUsersWithRolesAsync(Platform.ServiceDefaults.Models.ProTableRequest request)
    {
        var pagedResult = await GetUsersWithPaginationAsync(request);
        var users = await pagedResult.Queryable.ToListAsync();
        var enrichedUsers = await EnrichUsersWithRolesAsync(users);
        return new System.Linq.Dynamic.Core.PagedResult<UserWithRolesResponse>
        {
            Queryable = enrichedUsers.AsQueryable(),
            CurrentPage = pagedResult.CurrentPage,
            PageSize = pagedResult.PageSize,
            RowCount = pagedResult.RowCount,
            PageCount = pagedResult.PageCount,
        };
    }

    private static Expression<Func<T, bool>> CombineFilters<T>(Expression<Func<T, bool>> first, Expression<Func<T, bool>> second)
    {
        var parameter = Expression.Parameter(typeof(T), "x");
        var leftVisitor = new ParameterReplaceVisitor(first.Parameters[0], parameter);
        var left = leftVisitor.Visit(first.Body);
        var rightVisitor = new ParameterReplaceVisitor(second.Parameters[0], parameter);
        var right = rightVisitor.Visit(second.Body);

        return Expression.Lambda<Func<T, bool>>(Expression.AndAlso(left!, right!), parameter);
    }

    private async Task<List<UserWithRolesResponse>> EnrichUsersWithRolesAsync(List<User> users)
    {
        var userIds = users.Select(u => u.Id!).ToList();
        var userCompanies = await _context.Set<UserCompany>()
            .Where(uc => userIds.Contains(uc.UserId) && uc.Status == SystemConstants.UserStatus.Active)
            .ToListAsync();

        var allRoleIds = userCompanies.SelectMany(uc => uc.RoleIds).Distinct().ToList();
        var roleIdToNameMap = await _userRoleService.GetRoleNameMapAsync(allRoleIds);
        var userOrganizationMap = await _userOrganizationService.GetUserOrganizationMapAsync(userIds);
        var userIdToCompanyMap = userCompanies.GroupBy(uc => uc.UserId).ToDictionary(g => g.Key, g => g.First());

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
                PhoneNumber = user.PhoneNumber,
                Age = user.Age,
                IsActive = user.IsActive,
                LastLoginAt = user.LastLoginAt,
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
        if (string.IsNullOrEmpty(currentCompanyId)) throw new UnauthorizedAccessException("CURRENT_COMPANY_NOT_FOUND");

        var memberships = await _context.Set<UserCompany>().Where(uc => uc.CompanyId == currentCompanyId && uc.Status == SystemConstants.UserStatus.Active).ToListAsync();
        var memberUserIds = memberships.Select(uc => uc.UserId).Distinct().ToList();

        if (!memberUserIds.Any()) return new UserStatisticsResponse();

        var totalUsers = await _context.Set<User>().CountAsync(u => memberUserIds.Contains(u.Id));
        var activeUsers = await _context.Set<User>().CountAsync(u => memberUserIds.Contains(u.Id) && u.IsActive);
        var inactiveUsers = totalUsers - activeUsers;

        var adminUsers = await _context.Set<UserCompany>().CountAsync(uc => uc.IsAdmin && uc.CompanyId == currentCompanyId && uc.Status == SystemConstants.UserStatus.Active);
        var regularUsers = totalUsers - (int)adminUsers;

        var today = DateTime.UtcNow.Date;
        var thisWeek = today.AddDays(-(int)today.DayOfWeek);
        var thisMonth = new DateTime(today.Year, today.Month, 1, 0, 0, 0, DateTimeKind.Utc);

        var newUsersToday = await _context.Set<User>().CountAsync(u => memberUserIds.Contains(u.Id) && u.CreatedAt >= today);
        var newUsersThisWeek = await _context.Set<User>().CountAsync(u => memberUserIds.Contains(u.Id) && u.CreatedAt >= thisWeek);
        var newUsersThisMonth = await _context.Set<User>().CountAsync(u => memberUserIds.Contains(u.Id) && u.CreatedAt >= thisMonth);

        var totalRoles = await _userRoleService.CountAsync();
        var totalOrganizations = await _organizationService.CountAsync();

        return new UserStatisticsResponse
        {
            TotalUsers = (int)totalUsers,
            ActiveUsers = (int)activeUsers,
            InactiveUsers = (int)inactiveUsers,
            AdminUsers = (int)adminUsers,
            RegularUsers = regularUsers,
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
        if (string.IsNullOrEmpty(currentCompanyId)) throw new UnauthorizedAccessException("CURRENT_COMPANY_NOT_FOUND");

        var memberships = await _context.Set<UserCompany>().Where(uc => uc.CompanyId == currentCompanyId && request.UserIds.Contains(uc.UserId)).ToListAsync();
        var validUserIds = memberships.Select(uc => uc.UserId).ToList();

        if (!validUserIds.Any()) return false;

        switch (request.Action.ToLower())
        {
            case "activate":
                var activeUsers = await _context.Set<User>().Where(u => validUserIds.Contains(u.Id)).ToListAsync();
                foreach (var u in activeUsers) u.IsActive = true;
                break;
            case "deactivate":
                var deactiveUsers = await _context.Set<User>().Where(u => validUserIds.Contains(u.Id)).ToListAsync();
                foreach (var u in deactiveUsers) u.IsActive = false;
                break;
            case "delete":
                if (validUserIds.Contains(currentUserId)) throw new InvalidOperationException("批量操作中包含当前登录账号");
                foreach (var m in memberships)
                {
                    _context.Set<UserCompany>().Remove(m);
                }
                var usersToClear = await _context.Set<User>().Where(u => validUserIds.Contains(u.Id) && u.CurrentCompanyId == currentCompanyId).ToListAsync();
                foreach (var u in usersToClear) u.CurrentCompanyId = string.Empty;
                break;
            default:
                return false;
        }

        await _context.SaveChangesAsync();
        return true;
    }

    /// <inheritdoc/>
    public async Task<bool> DeactivateUserAsync(string id)
    {
        var user = await _context.Set<User>().FirstOrDefaultAsync(u => u.Id == id);
        if (user == null) return false;
        user.IsActive = false;
        await _context.SaveChangesAsync();
        return true;
    }

    /// <inheritdoc/>
    public async Task<bool> ActivateUserAsync(string id)
    {
        var user = await _context.Set<User>().FirstOrDefaultAsync(u => u.Id == id);
        if (user == null) return false;
        user.IsActive = true;
        await _context.SaveChangesAsync();
        return true;
    }

    /// <inheritdoc/>
    public async Task LogUserActivityAsync(string userId, string action, string description, string? ipAddress = null, string? userAgent = null)
    {
        await _userActivityLogService.LogUserActivityAsync(userId, action, description, ipAddress, userAgent);
    }

    /// <inheritdoc/>
    public async Task<List<UserActivityLog>> GetUserActivityLogsAsync(string createdBy, int limit = 50)
    {
        return await _userActivityLogService.GetUserActivityLogsAsync(createdBy, limit);
    }

    /// <inheritdoc/>
    public async Task<System.Linq.Dynamic.Core.PagedResult<ActivityLogListItemResponse>> GetCurrentUserActivityLogsAsync(
        Platform.ServiceDefaults.Models.ProTableRequest request, string? action = null, string? httpMethod = null, int? statusCode = null,
        string? ipAddress = null, DateTime? startDate = null, DateTime? endDate = null)
    {
        return await _userActivityLogService.GetCurrentUserActivityLogsAsync(request, action, httpMethod, statusCode, ipAddress, startDate, endDate);
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
    public async Task<System.Linq.Dynamic.Core.PagedResult<UserActivityLog>> GetAllActivityLogsAsync(
        int page = 1, int pageSize = 20, string? createdBy = null, string? action = null, string? httpMethod = null,
        int? statusCode = null, string? ipAddress = null, DateTime? startDate = null, DateTime? endDate = null)
    {
        return await _userActivityLogService.GetAllActivityLogsAsync(new ProTableRequest { Page = page, PageSize = pageSize, Search = action });
    }

    /// <inheritdoc/>
    public async Task<System.Linq.Dynamic.Core.PagedResult<ActivityLogListItemResponse>> GetAllActivityLogsWithUsersAsync(
        int page = 1, int pageSize = 20, string? createdBy = null, string? action = null, string? httpMethod = null,
        int? statusCode = null, string? ipAddress = null, DateTime? startDate = null, DateTime? endDate = null)
    {
        return await _userActivityLogService.GetAllActivityLogsWithUsersAsync(new ProTableRequest { Page = page, PageSize = pageSize, Search = action });
    }

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

        var user = await _context.Set<User>().FirstOrDefaultAsync(u => u.Id == userId);
        if (user == null) throw new KeyNotFoundException($"USER_NOT_FOUND");

        if (!string.IsNullOrEmpty(request.Email)) user.Email = request.Email;
        if (!string.IsNullOrEmpty(request.Name)) user.Name = request.Name;
        if (request.Age.HasValue) user.Age = request.Age.Value;
        if (request.Avatar != null) user.Avatar = request.Avatar.Trim();
        if (request.PhoneNumber != null) user.PhoneNumber = request.PhoneNumber.Trim();

        await _context.SaveChangesAsync();
        return user;
    }

    /// <inheritdoc/>
    public async Task<bool> ChangePasswordAsync(string userId, ChangePasswordRequest request)
    {
        var user = await GetUserByIdWithoutTenantFilterAsync(userId);
        if (user == null) return false;

        var rawCurrentPassword = _encryptionService.TryDecryptPassword(request.CurrentPassword);
        var rawNewPassword = _encryptionService.TryDecryptPassword(request.NewPassword);

        if (!_passwordHasher.VerifyPassword(rawCurrentPassword, user.PasswordHash)) return false;

        user.PasswordHash = _passwordHasher.HashPassword(rawNewPassword);
        await _context.SaveChangesAsync();
        return true;
    }

    /// <inheritdoc/>
    public async Task<bool> CheckEmailExistsAsync(string email, string? excludeUserId = null)
    {
        return await _context.Set<User>().AnyAsync(u => u.Email == email && (excludeUserId == null || u.Id != excludeUserId));
    }

    /// <inheritdoc/>
    public async Task<bool> CheckUsernameExistsAsync(string username, string? excludeUserId = null)
    {
        return await _context.Set<User>().AnyAsync(u => u.Username == username && (excludeUserId == null || u.Id != excludeUserId));
    }

    /// <inheritdoc/>
    public async Task<string> GetAiRoleDefinitionAsync(string userId)
    {
        var user = await GetUserByIdWithoutTenantFilterAsync(userId);
        return user?.AiRoleDefinition ?? string.Empty;
    }

    /// <inheritdoc/>
    public async Task<bool> UpdateAiRoleDefinitionAsync(string userId, string roleDefinition)
    {
        var user = await _context.Set<User>().FirstOrDefaultAsync(u => u.Id == userId);
        if (user == null) return false;
        user.AiRoleDefinition = roleDefinition;
        await _context.SaveChangesAsync();
        return true;
    }

    /// <inheritdoc/>
    public async Task<WelcomeLayoutResponse> GetWelcomeLayoutAsync(string userId)
    {
        var currentUser = await _context.Set<User>().FirstOrDefaultAsync(u => u.Id == userId);
        if (currentUser == null) return new WelcomeLayoutResponse { Layouts = new List<CardLayoutConfig>(), UpdatedAt = DateTime.UtcNow };

        if (!string.IsNullOrEmpty(currentUser.WelcomeLayoutConfig))
        {
            try
            {
                var layouts = JsonSerializer.Deserialize<List<CardLayoutConfig>>(currentUser.WelcomeLayoutConfig);
                if (layouts != null && layouts.Any()) return new WelcomeLayoutResponse { Layouts = layouts, UpdatedAt = currentUser.UpdatedAt ?? DateTime.UtcNow };
            }
            catch { /* 忽略配置解析错误，使用默认布局 */ }
        }

        var defaultLayouts = new List<CardLayoutConfig>
        {
            new() { CardId = "task-overview", Order = 0, Column = "left", Visible = true },
            new() { CardId = "project-list", Order = 1, Column = "left", Visible = true },
            new() { CardId = "statistics-overview", Order = 2, Column = "left", Visible = true },
            new() { CardId = "approval-overview", Order = 0, Column = "right", Visible = true },
            new() { CardId = "iot-events", Order = 1, Column = "right", Visible = true },
            new() { CardId = "system-resources", Order = 2, Column = "right", Visible = true }
        };

        return new WelcomeLayoutResponse { Layouts = defaultLayouts, UpdatedAt = currentUser.UpdatedAt ?? DateTime.UtcNow };
    }

    /// <inheritdoc/>
    public async Task<bool> SaveWelcomeLayoutAsync(string userId, SaveWelcomeLayoutRequest request)
    {
        if (request?.Layouts == null || !request.Layouts.Any()) return false;
        var user = await _context.Set<User>().FirstOrDefaultAsync(u => u.Id == userId);
        if (user == null) return false;
        user.WelcomeLayoutConfig = JsonSerializer.Serialize(request.Layouts);
        await _context.SaveChangesAsync();
        return true;
    }

    // 辅助类：用于参数替换
    private class ParameterReplaceVisitor : ExpressionVisitor
    {
        private readonly ParameterExpression _oldParameter;
        private readonly ParameterExpression _newParameter;

        public ParameterReplaceVisitor(ParameterExpression oldParameter, ParameterExpression newParameter)
        {
            _oldParameter = oldParameter;
            _newParameter = newParameter;
        }

        protected override Expression VisitParameter(ParameterExpression node)
        {
            return node == _oldParameter ? _newParameter : base.VisitParameter(node);
        }
    }
}
