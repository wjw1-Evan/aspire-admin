using Platform.ServiceDefaults.Services;
using Platform.ServiceDefaults.Models;
using Platform.ApiService.Constants;
using Platform.ApiService.Extensions;
using Platform.ApiService.Models;
using System.Linq.Expressions;

namespace Platform.ApiService.Services;

/// <summary>
/// 用户企业关联服务接口
/// </summary>
public interface IUserCompanyService
{
    /// <summary>
    /// 申请加入企业
    /// </summary>
    Task<bool> ApplyToJoinCompanyAsync(string userId, string companyId, string? reason);

    /// <summary>
    /// 获取用户的加入申请列表
    /// </summary>
    Task<List<JoinRequestDetail>> GetUserJoinRequestsAsync(string userId);

    /// <summary>
    /// 撤销加入申请
    /// </summary>
    Task<bool> CancelJoinRequestAsync(string userId, string requestId);

    /// <summary>
    /// 获取企业加入申请列表（管理员）
    /// </summary>
    Task<List<JoinRequestDetail>> GetJoinRequestsAsync(string companyId, string? status = null);

    /// <summary>
    /// 审核加入申请（管理员）
    /// </summary>
    Task<bool> ReviewJoinRequestAsync(string requestId, bool approved, string? rejectReason = null, List<string>? roleIds = null);

    /// <summary>
    /// 获取用户的企业列表
    /// </summary>
    /// <param name="userId">用户ID</param>
    /// <returns>用户企业列表</returns>
    Task<List<UserCompanyItem>> GetUserCompaniesAsync(string userId);

    /// <summary>
    /// 获取用户企业关联信息
    /// </summary>
    /// <param name="userId">用户ID</param>
    /// <param name="companyId">企业ID</param>
    /// <returns>用户企业关联信息，如果不存在则返回 null</returns>
    Task<UserCompany?> GetUserCompanyAsync(string userId, string companyId);

    /// <summary>
    /// 检查用户是否是企业管理员
    /// </summary>
    /// <param name="userId">用户ID</param>
    /// <param name="companyId">企业ID</param>
    /// <returns>是否是管理员</returns>
    Task<bool> IsUserAdminInCompanyAsync(string userId, string companyId);

    /// <summary>
    /// 切换当前企业
    /// </summary>
    /// <param name="targetCompanyId">目标企业ID</param>
    /// <returns>切换结果</returns>
    Task<SwitchCompanyResult> SwitchCompanyAsync(string targetCompanyId);

    /// <summary>
    /// 获取企业成员列表（管理员功能）
    /// </summary>
    /// <param name="companyId">企业ID</param>
    /// <returns>企业成员列表</returns>
    Task<List<CompanyMemberItem>> GetCompanyMembersAsync(string companyId);

    /// <summary>
    /// 更新成员角色（管理员功能）
    /// </summary>
    /// <param name="companyId">企业ID</param>
    /// <param name="userId">用户ID</param>
    /// <param name="roleIds">角色ID列表</param>
    /// <returns>是否成功更新</returns>
    Task<bool> UpdateMemberRolesAsync(string companyId, string userId, List<string> roleIds);

    /// <summary>
    /// 设置成员为管理员（管理员功能）
    /// </summary>
    /// <param name="companyId">企业ID</param>
    /// <param name="userId">用户ID</param>
    /// <param name="isAdmin">是否是管理员</param>
    /// <returns>是否成功设置</returns>
    Task<bool> SetMemberAsAdminAsync(string companyId, string userId, bool isAdmin);

    /// <summary>
    /// 移除企业成员（管理员功能）
    /// </summary>
    Task<bool> RemoveMemberAsync(string companyId, string userId);

    /// <summary>
    /// 退出企业（用户自主功能）
    /// </summary>
    Task<bool> LeaveCompanyAsync(string userId, string companyId);
}

/// <summary>
/// 用户企业关联服务实现
/// </summary>
public class UserCompanyService : IUserCompanyService
{
    private readonly IDataFactory<UserCompany> _userCompanyFactory;
    private readonly IDataFactory<AppUser> _userFactory;
    private readonly IDataFactory<Company> _companyFactory;
    private readonly IDataFactory<Role> _roleFactory;
    private readonly IDataFactory<CompanyJoinRequest> _joinRequestFactory;
    private readonly IDataFactory<Menu> _menuFactory;
    private readonly IMenuService _menuService;
    private readonly ITenantContext _tenantContext;
    private readonly IJwtService _jwtService;
    private readonly ILogger<UserCompanyService> _logger;

    /// <summary>
    /// 初始化用户企业关联服务
    /// </summary>
    /// <param name="userCompanyFactory">用户企业关联数据操作工厂</param>
    /// <param name="userFactory">用户数据操作工厂</param>
    /// <param name="companyFactory">企业数据操作工厂</param>
    /// <param name="roleFactory">角色数据操作工厂</param>
    /// <param name="joinRequestFactory">企业加入申请数据操作工厂</param>
    /// <param name="menuFactory">菜单数据操作工厂</param>
    /// <param name="menuService">菜单服务</param>
    /// <param name="tenantContext">租户上下文</param>
    /// <param name="jwtService">JWT 服务</param>
    /// <param name="logger">日志记录器</param>
    public UserCompanyService(
        IDataFactory<UserCompany> userCompanyFactory,
        IDataFactory<AppUser> userFactory,
        IDataFactory<Company> companyFactory,
        IDataFactory<Role> roleFactory,
        IDataFactory<CompanyJoinRequest> joinRequestFactory,
        IDataFactory<Menu> menuFactory,
        IMenuService menuService,
        ITenantContext tenantContext,
        IJwtService jwtService,
        ILogger<UserCompanyService> logger)
    {
        _userCompanyFactory = userCompanyFactory;
        _userFactory = userFactory;
        _companyFactory = companyFactory;
        _roleFactory = roleFactory;
        _joinRequestFactory = joinRequestFactory;
        _menuFactory = menuFactory;
        _menuService = menuService;
        _tenantContext = tenantContext;
        _jwtService = jwtService;
        _logger = logger;
    }

    /// <summary>
    /// 申请加入企业
    /// </summary>
    public async Task<bool> ApplyToJoinCompanyAsync(string userId, string companyId, string? reason)
    {
        // 1. 验证企业是否存在
        var company = await _companyFactory.GetByIdAsync(companyId);
        if (company == null)
            throw new KeyNotFoundException("企业不存在");

        // 2. 检查是否已经是成员
        var existingMember = await GetUserCompanyAsync(userId, companyId);
        if (existingMember != null && !existingMember.IsDeleted && existingMember.Status == "active")
            throw new InvalidOperationException("您已经是该企业的成员");

        // 3. 检查是否有待处理的申请
        Expression<Func<CompanyJoinRequest, bool>> pendingFilter = r => r.UserId == userId && r.CompanyId == companyId && r.Status == "pending";
        var existingRequests = await _joinRequestFactory.FindAsync(pendingFilter);
        if (existingRequests.Any())
            throw new InvalidOperationException("您已提交过申请，请耐心等待审核");

        // 4. 创建申请
        var request = new CompanyJoinRequest
        {
            UserId = userId,
            CompanyId = companyId,
            Status = "pending",
            Reason = reason
        };

        await _joinRequestFactory.CreateAsync(request);
        return true;
    }

    /// <summary>
    /// 获取企业加入申请列表
    /// </summary>
    public async Task<List<JoinRequestDetail>> GetJoinRequestsAsync(string companyId, string? status = null)
    {
        // 验证权限
        var currentUserId = _userCompanyFactory.GetRequiredUserId();
        await this.RequireAdminAsync(currentUserId, companyId, "只有管理员可以查看申请列表");

        // 构建过滤条件
        Expression<Func<CompanyJoinRequest, bool>> filter = r => r.CompanyId == companyId;

        if (!string.IsNullOrEmpty(status))
        {
            filter = r => r.CompanyId == companyId && r.Status == status;
        }

        var requests = await _joinRequestFactory.FindAsync(filter);
        var result = new List<JoinRequestDetail>();

        if (!requests.Any())
            return result;

        // 批量获取用户信息
        var userIds = requests.Select(r => r.UserId).Distinct().ToList();
        var reviewerIds = requests.Where(r => r.ReviewedBy != null).Select(r => r.ReviewedBy!).Distinct().ToList();
        userIds.AddRange(reviewerIds);
        userIds = userIds.Distinct().ToList();

        Expression<Func<AppUser, bool>> userFilter = u => userIds.Contains(u.Id);
        var users = await _userFactory.FindAsync(userFilter);
        var userDict = users.ToDictionary(u => u.Id!, u => u);

        // 获取企业信息
        var company = await _companyFactory.GetByIdAsync(companyId);

        foreach (var req in requests)
        {
            var user = userDict.GetValueOrDefault(req.UserId);
            var reviewer = req.ReviewedBy != null ? userDict.GetValueOrDefault(req.ReviewedBy) : null;

            result.Add(new JoinRequestDetail
            {
                Id = req.Id!,
                UserId = req.UserId,
                Username = user?.Username ?? "Unknown",
                UserEmail = user?.Email,
                CompanyId = req.CompanyId,
                CompanyName = company?.Name ?? "Unknown",
                Status = req.Status,
                Reason = req.Reason,
                ReviewedBy = req.ReviewedBy,
                ReviewedByName = reviewer?.Username ?? reviewer?.Name,
                ReviewedAt = req.ReviewedAt,
                RejectReason = req.RejectReason,
                CreatedAt = req.CreatedAt
            });
        }

        return result.OrderByDescending(r => r.CreatedAt).ToList();
    }



    /// <summary>
    /// 获取用户的加入申请列表
    /// </summary>
    public async Task<List<JoinRequestDetail>> GetUserJoinRequestsAsync(string userId)
    {
        // 1. 获取用户的所有申请
        Expression<Func<CompanyJoinRequest, bool>> filter = r => r.UserId == userId;

        var requests = await _joinRequestFactory.FindAsync(filter);
        var result = new List<JoinRequestDetail>();

        if (!requests.Any())
            return result;

        // 2. 批量获取企业信息
        var companyIds = requests.Select(r => r.CompanyId).Distinct().ToList();
        Expression<Func<Company, bool>> companyFilter = c => companyIds.Contains(c.Id);
        var companies = await _companyFactory.FindAsync(companyFilter);
        var companyDict = companies.ToDictionary(c => c.Id!, c => c);

        // 3. 批量获取审核人信息
        var reviewerIds = requests.Where(r => r.ReviewedBy != null).Select(r => r.ReviewedBy!).Distinct().ToList();
        var userDict = new Dictionary<string, AppUser>();

        if (reviewerIds.Any())
        {
            Expression<Func<AppUser, bool>> userFilter = u => reviewerIds.Contains(u.Id);
            var reviewers = await _userFactory.FindAsync(userFilter);
            userDict = reviewers.ToDictionary(u => u.Id!, u => u);
        }

        // 4. 获取当前用户信息（用户名）
        var currentUser = await _userFactory.GetByIdAsync(userId);

        foreach (var req in requests)
        {
            var company = companyDict.GetValueOrDefault(req.CompanyId);
            var reviewer = req.ReviewedBy != null ? userDict.GetValueOrDefault(req.ReviewedBy) : null;

            result.Add(new JoinRequestDetail
            {
                Id = req.Id!,
                UserId = req.UserId,
                Username = currentUser?.Username ?? "Unknown", // 当前用户
                UserEmail = currentUser?.Email,
                CompanyId = req.CompanyId,
                CompanyName = company?.Name ?? "Unknown",
                Status = req.Status,
                Reason = req.Reason,
                ReviewedBy = req.ReviewedBy,
                ReviewedByName = reviewer?.Username ?? reviewer?.Name,
                ReviewedAt = req.ReviewedAt,
                RejectReason = req.RejectReason,
                CreatedAt = req.CreatedAt
            });
        }

        return result.OrderByDescending(r => r.CreatedAt).ToList();
    }

    /// <summary>
    /// 撤销加入申请
    /// </summary>
    public async Task<bool> CancelJoinRequestAsync(string userId, string requestId)
    {
        // 安全性检查：防止非法 ID 导致崩溃
        if (string.IsNullOrEmpty(requestId) || requestId == "undefined" || requestId.Length != 24)
        {
            throw new ArgumentException("非法的申请记录ID");
        }

        // 1. 获取申请
        var request = await _joinRequestFactory.GetByIdAsync(requestId);
        if (request == null)
            throw new KeyNotFoundException("申请记录不存在");

        // 2. 验证是否是本人的申请
        if (request.UserId != userId)
            throw new UnauthorizedAccessException("无权操作他人的申请");

        // 3. 验证状态
        if (request.Status != "pending")
            throw new InvalidOperationException($"申请状态为 {request.Status}，无法撤销");

        // 4. 更新状态为 cancelled
        await _joinRequestFactory.UpdateAsync(requestId, r =>
        {
            r.Status = "cancelled";
            r.RejectReason = "User Cancelled";
            r.UpdatedAt = DateTime.UtcNow;
        });
        return true;
    }

    /// <summary>
    /// 审核加入申请
    /// </summary>
    public async Task<bool> ReviewJoinRequestAsync(string requestId, bool approved, string? rejectReason = null, List<string>? roleIds = null)
    {
        // 1. 获取申请
        var request = await _joinRequestFactory.GetByIdAsync(requestId);
        if (request == null)
            throw new KeyNotFoundException("申请记录不存在");

        // 如果已经是目标状态，且不是为了更新角色，则跳过
        if (request.Status == (approved ? "approved" : "rejected") && !approved)
        {
            return true;
        }

        // 2. 验证权限 (管理员)
        var currentUserId = _userCompanyFactory.GetRequiredUserId();
        await this.RequireAdminAsync(currentUserId, request.CompanyId, "只有管理员可以审核申请");

        // 3. 处理状态变更
        var oldStatus = request.Status;

        // 4. 如果从“已批准”变更为“已拒绝”，需要移除企业成员身份
        if (oldStatus == "approved" && !approved)
        {
            var membership = await GetUserCompanyAsync(request.UserId, request.CompanyId);
            if (membership != null)
            {
                await _userCompanyFactory.SoftDeleteAsync(membership.Id!);
                _logger.LogInformation("由于申请状态变更为拒绝，已移除用户 {UserId} 在企业 {CompanyId} 的成员身份", request.UserId, request.CompanyId);
            }
        }

        // 5. 更新申请状态
        await _joinRequestFactory.UpdateAsync(requestId, r =>
        {
            r.Status = approved ? "approved" : "rejected";
            r.ReviewedBy = currentUserId;
            r.ReviewedAt = DateTime.UtcNow;
            r.RejectReason = approved ? null : (rejectReason ?? "管理员修改了审核结果");
            r.UpdatedAt = DateTime.UtcNow;
        });

        // 6. 如果现在是“已批准”状态，确保 UserCompany 关联存在
        if (approved)
        {
            var existingMember = await GetUserCompanyAsync(request.UserId, request.CompanyId);

            // 如果已经存在，则更新状态和角色
            if (existingMember != null)
            {
                // 如果是软删除状态，或者状态不是 active，需要恢复并更新
                if (existingMember.IsDeleted || existingMember.Status != "active")
                {
                    await _userCompanyFactory.UpdateAsync(existingMember.Id!, uc =>
                    {
                        uc.IsDeleted = false;
                        uc.Status = "active";
                        uc.RoleIds = roleIds ?? new List<string>();
                        uc.ApprovedBy = currentUserId;
                        uc.ApprovedAt = DateTime.UtcNow;
                        uc.UpdatedAt = DateTime.UtcNow;
                    });
                    _logger.LogInformation("用户 {UserId} 的企业成员身份已恢复并更新角色", request.UserId);
                }
                else if (roleIds != null && roleIds.Any())
                {
                    await UpdateMemberRolesAsync(request.CompanyId, request.UserId, roleIds);
                }
            }
            else
            {
                // 创建新关联
                var finalRoleIds = roleIds ?? new List<string>();
                if (!finalRoleIds.Any())
                {
                    Expression<Func<Role, bool>> roleFilter = r => r.CompanyId == request.CompanyId;
                    var roles = await _roleFactory.FindAsync(roleFilter);
                    var defaultRole = roles.FirstOrDefault(r => r.Name == "普通用户" || r.Name == "user")
                                     ?? roles.FirstOrDefault(r => r.Name != "管理员");

                    if (defaultRole != null)
                    {
                        finalRoleIds.Add(defaultRole.Id!);
                    }
                }

                var userCompany = new UserCompany
                {
                    UserId = request.UserId,
                    CompanyId = request.CompanyId,
                    RoleIds = finalRoleIds,
                    Status = "active",
                    IsAdmin = false,
                    JoinedAt = DateTime.UtcNow,
                    ApprovedBy = currentUserId,
                    ApprovedAt = DateTime.UtcNow
                };

                await _userCompanyFactory.CreateAsync(userCompany);
            }
        }

        return true;
    }

    /// <summary>
    /// 获取用户所属的所有企业
    /// </summary>
    public async Task<List<UserCompanyItem>> GetUserCompaniesAsync(string userId)
    {
        // UserCompany 不实现 IMultiTenant，CompanyId 是业务字段，可以查询用户在所有企业的关联记录
        Expression<Func<UserCompany, bool>> filter = uc => uc.UserId == userId && uc.Status == "active";

        var memberships = await _userCompanyFactory.FindAsync(filter);
        var result = new List<UserCompanyItem>();

        if (!memberships.Any())
            return result;

        // 获取用户的当前企业和个人企业
        var user = await _userFactory.GetByIdAsync(userId);

        // 批量查询优化：避免N+1查询问题
        var companyIds = memberships.Select(m => m.CompanyId).Distinct().ToList();
        var allRoleIds = memberships.SelectMany(m => m.RoleIds).Distinct().ToList();

        // ✅ 优化：使用字段投影，只返回需要的字段
        // 批量查询企业信息（跨企业查询，需要查询多个企业的信息）
        // 只需要 Name 和 Code
        Expression<Func<Company, bool>> companyFilter = c => companyIds.Contains(c.Id);
        var companies = await _companyFactory.FindAsync(companyFilter);
        var companyDict = companies.ToDictionary(c => c.Id!, c => c);

        // 批量查询角色信息（跨企业查询，需要按企业分组）
        // 注意：由于 Role 实现了 IMultiTenant，会自动过滤当前企业，但这里需要查询多个企业的角色
        // 解决方案：使用 FindWithoutTenantFilterAsync 并手动按企业分组查询
        // ✅ 优化：只需要角色 Name
        var roleDict = new Dictionary<string, Role>();
        if (allRoleIds.Any())
        {
            // 按企业分组角色ID，避免跨企业查询时的自动过滤问题
            var companyRoleMap = new Dictionary<string, List<string>>();
            foreach (var membership in memberships)
            {
                if (!companyRoleMap.ContainsKey(membership.CompanyId))
                {
                    companyRoleMap[membership.CompanyId] = new List<string>();
                }
                foreach (var roleId in membership.RoleIds)
                {
                    if (!companyRoleMap[membership.CompanyId].Contains(roleId))
                    {
                        companyRoleMap[membership.CompanyId].Add(roleId);
                    }
                }
            }

            // 为每个企业查询角色（明确指定企业ID）
            foreach (var (companyId, roleIds) in companyRoleMap)
            {
                if (roleIds.Any())
                {
                    Expression<Func<Role, bool>> roleFilter = r => roleIds.Contains(r.Id) && r.CompanyId == companyId && r.IsActive == true;
                    var roles = await _roleFactory.FindAsync(roleFilter);
                    foreach (var role in roles)
                    {
                        if (role.Id != null && !roleDict.ContainsKey(role.Id))
                        {
                            roleDict[role.Id] = role;
                        }
                    }
                }
            }
        }

        // 构建结果 - 按 CompanyId 去重，每个企业只返回一条记录
        // 如果同一个用户在同一个企业中有多条记录（可能是数据重复），合并它们
        var membershipDict = new Dictionary<string, UserCompany>();
        foreach (var membership in memberships)
        {
            if (!membershipDict.ContainsKey(membership.CompanyId))
            {
                membershipDict[membership.CompanyId] = membership;
            }
            else
            {
                // 如果已存在，合并角色和权限，保留最早的 joinedAt
                var existing = membershipDict[membership.CompanyId];

                // 合并角色ID（去重）
                var mergedRoleIds = existing.RoleIds.Union(membership.RoleIds).Distinct().ToList();
                existing.RoleIds = mergedRoleIds;

                // 如果任一记录是管理员，则为管理员
                if (membership.IsAdmin)
                    existing.IsAdmin = true;

                // 保留最早的加入时间
                if (membership.JoinedAt < existing.JoinedAt)
                    existing.JoinedAt = membership.JoinedAt;
            }
        }

        foreach (var membership in membershipDict.Values)
        {
            var company = companyDict.GetValueOrDefault(membership.CompanyId);
            if (company == null) continue;

            // 获取角色名称
            var roleNames = membership.RoleIds
                .Where(roleId => roleDict.ContainsKey(roleId))
                .Select(roleId => roleDict[roleId].Name)
                .ToList();

            result.Add(new UserCompanyItem
            {
                CompanyId = company.Id!,
                CompanyName = company.Name,
                CompanyCode = company.Code,
                IsAdmin = membership.IsAdmin,
                IsCurrent = company.Id == user?.CurrentCompanyId,
                IsPersonal = company.Id == user?.PersonalCompanyId,
                JoinedAt = membership.JoinedAt,
                RoleNames = roleNames
            });
        }

        return result.OrderByDescending(x => x.IsCurrent)
                    .ThenByDescending(x => x.IsPersonal)
                    .ThenBy(x => x.CompanyName)
                    .ToList();
    }

    /// <summary>
    /// 获取用户在指定企业的关联信息
    /// </summary>
    public async Task<UserCompany?> GetUserCompanyAsync(string userId, string companyId)
    {
        Expression<Func<UserCompany, bool>> filter = uc => uc.UserId == userId && uc.CompanyId == companyId;
        var userCompanies = await _userCompanyFactory.FindAsync(filter);
        return userCompanies.FirstOrDefault();
    }

    /// <summary>
    /// 检查用户是否是企业管理员
    /// </summary>
    public async Task<bool> IsUserAdminInCompanyAsync(string userId, string companyId)
    {
        var membership = await GetUserCompanyAsync(userId, companyId);
        return membership != null && membership.IsAdmin && membership.Status == "active";
    }

    /// <summary>
    /// 切换当前企业
    /// </summary>
    public async Task<SwitchCompanyResult> SwitchCompanyAsync(string targetCompanyId)
    {
        var userId = _userCompanyFactory.GetRequiredUserId();

        // 1. 验证用户是该企业的成员
        var membership = await GetUserCompanyAsync(userId, targetCompanyId);
        if (membership == null || membership.Status != "active")
        {
            throw new UnauthorizedAccessException("您不是该企业的成员");
        }

        // 2. 获取企业信息
        var company = await _companyFactory.GetByIdAsync(targetCompanyId);
        if (company == null)
        {
            throw new KeyNotFoundException("企业不存在");
        }

        // 3. 更新用户当前企业（使用原子操作）
        await _userFactory.UpdateAsync(userId, u =>
        {
            u.CurrentCompanyId = targetCompanyId;
            u.UpdatedAt = DateTime.UtcNow;
        });

        var updatedUser = await _userFactory.GetByIdAsync(userId);
        if (updatedUser == null)
        {
            throw new KeyNotFoundException($"用户 {userId} 不存在");
        }

        // 4. 获取用户在该企业的菜单
        var menus = await _menuService.GetUserMenusAsync(membership.RoleIds);

        // 5. 生成新的JWT Token（包含新的企业信息）
        var newToken = _jwtService.GenerateToken(updatedUser);

        return new SwitchCompanyResult
        {
            CompanyId = targetCompanyId,
            CompanyName = company.Name,
            Menus = menus,
            Token = newToken
        };
    }

    /// <summary>
    /// 获取企业的所有成员
    /// </summary>
    public async Task<List<CompanyMemberItem>> GetCompanyMembersAsync(string companyId)
    {
        // 验证当前用户是否是该企业的管理员
        var currentUserId = _userCompanyFactory.GetRequiredUserId();
        await this.RequireAdminAsync(currentUserId, companyId, "只有企业管理员可以查看成员列表");

        Expression<Func<UserCompany, bool>> filter = uc => uc.CompanyId == companyId && uc.Status == "active";

        var memberships = await _userCompanyFactory.FindAsync(filter);
        var result = new List<CompanyMemberItem>();

        if (!memberships.Any())
            return result;

        // 批量查询优化：避免N+1查询问题
        var userIds = memberships.Select(m => m.UserId).Distinct().ToList();
        var allRoleIds = memberships.SelectMany(m => m.RoleIds).Distinct().ToList();

        // 批量查询用户信息
        Expression<Func<AppUser, bool>> userFilter = u => userIds.Contains(u.Id);
        var users = await _userFactory.FindAsync(userFilter);
        var userDict = users.ToDictionary(u => u.Id!, u => u);

        // 批量查询角色信息
        var roleDict = new Dictionary<string, Role>();
        if (allRoleIds.Any())
        {
            Expression<Func<Role, bool>> roleFilter = r => allRoleIds.Contains(r.Id);
            var roles = await _roleFactory.FindAsync(roleFilter);
            roleDict = roles.ToDictionary(r => r.Id!, r => r);
        }

        // 构建结果
        foreach (var membership in memberships)
        {
            var user = userDict.GetValueOrDefault(membership.UserId);
            if (user == null) continue;

            // 获取角色名称
            var roleNames = membership.RoleIds
                .Where(roleId => roleDict.ContainsKey(roleId))
                .Select(roleId => roleDict[roleId].Name)
                .ToList();

            result.Add(new CompanyMemberItem
            {
                UserId = user.Id!,
                Username = user.Username,
                Email = user.Email,
                IsAdmin = membership.IsAdmin,
                RoleIds = membership.RoleIds,
                RoleNames = roleNames,
                JoinedAt = membership.JoinedAt,
                IsActive = user.IsActive
            });
        }

        return result;
    }

    /// <summary>
    /// 更新成员角色（使用原子操作）
    /// </summary>
    public async Task<bool> UpdateMemberRolesAsync(string companyId, string userId, List<string> roleIds)
    {
        // 验证当前用户是否是该企业的管理员
        var currentUserId = _userCompanyFactory.GetRequiredUserId();
        await this.RequireAdminAsync(currentUserId, companyId, "只有企业管理员可以分配角色");

        // 验证所有角色都属于该企业
        if (roleIds.Any())
        {
            Expression<Func<Role, bool>> roleFilter = r => roleIds.Contains(r.Id) && r.CompanyId == companyId;
            var validRoles = await _roleFactory.FindAsync(roleFilter);

            if (validRoles.Count != roleIds.Count)
            {
                throw new InvalidOperationException("部分角色不存在或不属于该企业");
            }
        }

        var updatedUserCompany = await _userCompanyFactory.UpdateAsync(companyId, uc =>
        {
            uc.RoleIds = roleIds;
            uc.UpdatedAt = DateTime.UtcNow;
        });
        return updatedUserCompany != null;
    }

    /// <summary>
    /// 设置/取消成员管理员权限（使用原子操作）
    /// </summary>
    public async Task<bool> SetMemberAsAdminAsync(string companyId, string userId, bool isAdmin)
    {
        // 验证当前用户是否是该企业的管理员
        var currentUserId = _userCompanyFactory.GetRequiredUserId();
        await this.RequireAdminAsync(currentUserId, companyId, "只有企业管理员可以设置管理员");

        // 不能修改自己的管理员权限
        if (currentUserId == userId)
        {
            throw new InvalidOperationException("不能修改自己的管理员权限");
        }

        var updatedUserCompany = await _userCompanyFactory.UpdateAsync(companyId, uc =>
        {
            uc.IsAdmin = isAdmin;
            uc.UpdatedAt = DateTime.UtcNow;
        });
        return updatedUserCompany != null;
    }

    /// <summary>
    /// 移除企业成员
    /// </summary>
    public async Task<bool> RemoveMemberAsync(string companyId, string userId)
    {
        // 验证当前用户是否是该企业的管理员
        var currentUserId = _userCompanyFactory.GetRequiredUserId();
        await this.RequireAdminAsync(currentUserId, companyId, "只有企业管理员可以移除成员");

        // 不能移除自己
        if (currentUserId == userId)
        {
            throw new InvalidOperationException("不能移除自己，请使用退出企业功能或转让管理员权限后再操作");
        }

        var membership = await GetUserCompanyAsync(userId, companyId);
        if (membership != null)
        {
            var result = await _userCompanyFactory.SoftDeleteAsync(membership.Id!);
            return result != null;
        }
        return false;
    }

    /// <summary>
    /// 退出企业
    /// </summary>
    public async Task<bool> LeaveCompanyAsync(string userId, string companyId)
    {
        // 1. 验证是否是该企业的成员
        var membership = await GetUserCompanyAsync(userId, companyId);
        if (membership == null || membership.Status != "active")
        {
            throw new KeyNotFoundException("COMPANY_NOT_MEMBER");
        }

        // 2. 检查是否是企业创建者（不允许退出，只能注销）
        var user = await _userFactory.GetByIdAsync(userId);
        var company = await _companyFactory.GetByIdAsync(companyId);
        if (company?.CreatedBy == userId)
        {
            throw new InvalidOperationException("COMPANY_CREATOR_CANNOT_LEAVE");
        }

        // 3. 检查是否是企业创建者或唯一管理员（简单检查：如果是管理员，且企业只有这一个管理员）
        if (membership.IsAdmin)
        {
            Expression<Func<UserCompany, bool>> adminFilter = uc => uc.CompanyId == companyId && uc.IsAdmin == true && uc.Status == "active";
            var adminCount = await _userCompanyFactory.CountAsync(adminFilter);
            if (adminCount <= 1)
            {
                throw new InvalidOperationException("COMPANY_SOLE_ADMIN_CANNOT_LEAVE");
            }
        }

        // 4. 执行软删除
        var membershipToDelete = await GetUserCompanyAsync(userId, companyId);
        var result = await _userCompanyFactory.SoftDeleteAsync(membershipToDelete!.Id!);

        // 5. 如果当前正在使用该企业，需要重置 CurrentCompanyId
        if (user != null && user.CurrentCompanyId == companyId)
        {
            await _userFactory.UpdateAsync(userId, u =>
            {
                u.CurrentCompanyId = user.PersonalCompanyId ?? "";
            });
        }

        return result != null;
    }

    #region 私有辅助方法

    #endregion
}

/// <summary>
/// 企业成员列表项
/// </summary>
public class CompanyMemberItem
{
    /// <summary>
    /// 用户ID
    /// </summary>
    public string UserId { get; set; } = string.Empty;

    /// <summary>
    /// 用户名
    /// </summary>
    public string Username { get; set; } = string.Empty;

    /// <summary>
    /// 邮箱地址
    /// </summary>
    public string? Email { get; set; }

    /// <summary>
    /// 是否为企业管理员
    /// </summary>
    public bool IsAdmin { get; set; }

    /// <summary>
    /// 角色ID列表
    /// </summary>
    public List<string> RoleIds { get; set; } = new();

    /// <summary>
    /// 角色名称列表
    /// </summary>
    public List<string> RoleNames { get; set; } = new();

    /// <summary>
    /// 加入时间
    /// </summary>
    public DateTime JoinedAt { get; set; }

    /// <summary>
    /// 是否活跃
    /// </summary>
    public bool IsActive { get; set; }
}

