using System.Linq.Expressions;
using Platform.ServiceDefaults.Services;
using Platform.ServiceDefaults.Models;
using Platform.ApiService.Constants;
using Platform.ApiService.Models;

namespace Platform.ApiService.Services;

/// <summary>
/// 企业加入申请服务接口
/// </summary>
public interface IJoinRequestService
{
    /// <summary>
    /// 申请加入企业
    /// </summary>
    /// <param name="request">申请加入企业请求</param>
    /// <returns>创建的申请记录</returns>
    Task<CompanyJoinRequest> ApplyToJoinCompanyAsync(ApplyToJoinCompanyRequest request);

    /// <summary>
    /// 获取我的申请列表
    /// </summary>
    /// <param name="keyword">搜索关键词（企业名称）</param>
    /// <returns>申请详情列表</returns>
    Task<List<JoinRequestDetail>> GetMyRequestsAsync(string? keyword = null);

    /// <summary>
    /// 取消申请
    /// </summary>
    /// <param name="requestId">申请ID</param>
    /// <returns>是否成功取消</returns>
    Task<bool> CancelRequestAsync(string requestId);

    /// <summary>
    /// 获取待审核的申请列表（管理员功能）
    /// </summary>
    /// <param name="companyId">企业ID</param>
    /// <param name="keyword">搜索关键词（用户名或邮箱）</param>
    /// <returns>申请详情列表</returns>
    Task<List<JoinRequestDetail>> GetPendingRequestsAsync(string companyId, string? keyword = null);

    /// <summary>
    /// 批准申请（管理员功能）
    /// </summary>
    /// <param name="requestId">申请ID</param>
    /// <param name="request">审核请求（可选）</param>
    /// <returns>是否成功批准</returns>
    Task<bool> ApproveRequestAsync(string requestId, ReviewJoinRequestRequest? request = null);

    /// <summary>
    /// 拒绝申请（管理员功能）
    /// </summary>
    /// <param name="requestId">申请ID</param>
    /// <param name="rejectReason">拒绝原因</param>
    /// <returns>是否成功拒绝</returns>
    Task<bool> RejectRequestAsync(string requestId, string rejectReason);
}

/// <summary>
/// 企业加入申请服务实现
/// </summary>
public class JoinRequestService : IJoinRequestService
{
    private readonly IDataFactory<CompanyJoinRequest> _joinRequestFactory;
    private readonly IDataFactory<UserCompany> _userCompanyFactory;
    private readonly IDataFactory<AppUser> _userFactory;
    private readonly IDataFactory<Company> _companyFactory;
    private readonly IDataFactory<Role> _roleFactory;
    private readonly IUserCompanyService _userCompanyService;
    private readonly INoticeService _noticeService;
    private readonly ITenantContext _tenantContext;
    private readonly ILogger<JoinRequestService> _logger;

    /// <summary>
    /// 初始化企业加入申请服务
    /// </summary>
    /// <param name="joinRequestFactory">企业加入申请数据操作工厂</param>
    /// <param name="userCompanyFactory">用户企业关联数据操作工厂</param>
    /// <param name="userFactory">用户数据操作工厂</param>
    /// <param name="companyFactory">企业数据操作工厂</param>
    /// <param name="roleFactory">角色数据操作工厂</param>
    /// <param name="userCompanyService">用户企业服务</param>
    /// <param name="noticeService">通知服务</param>
    /// <param name="tenantContext">租户上下文</param>
    /// <param name="logger">日志记录器</param>
    public JoinRequestService(
        IDataFactory<CompanyJoinRequest> joinRequestFactory,
        IDataFactory<UserCompany> userCompanyFactory,
        IDataFactory<AppUser> userFactory,
        IDataFactory<Company> companyFactory,
        IDataFactory<Role> roleFactory,
        IUserCompanyService userCompanyService,
        INoticeService noticeService,
        ITenantContext tenantContext,
        ILogger<JoinRequestService> logger)
    {
        _joinRequestFactory = joinRequestFactory;
        _userCompanyFactory = userCompanyFactory;
        _userFactory = userFactory;
        _companyFactory = companyFactory;
        _roleFactory = roleFactory;
        _userCompanyService = userCompanyService;
        _noticeService = noticeService;
        _tenantContext = tenantContext;
        _logger = logger;
    }

    /// <summary>
    /// 申请加入企业
    /// </summary>
    public async Task<CompanyJoinRequest> ApplyToJoinCompanyAsync(ApplyToJoinCompanyRequest request)
    {
        var userId = _joinRequestFactory.GetRequiredUserId();
        var companyId = request.CompanyId;

        // 1. 验证企业存在且活跃
        var company = await _companyFactory.GetByIdAsync(companyId);

        if (company == null || !company.IsActive)
        {
            throw new KeyNotFoundException("企业不存在或已停用");
        }

        // 2. 检查是否已是成员
        var existingMembership = await _userCompanyFactory.FindAsync(uc =>
            uc.UserId == userId && uc.CompanyId == companyId);
        var membership = existingMembership.FirstOrDefault();

        if (membership != null)
        {
            if (membership.Status == "active")
                throw new InvalidOperationException("您已是该企业的成员");
            if (membership.Status == "pending")
                throw new InvalidOperationException("您的加入申请正在审核中");
        }

        // 3. 检查是否有待审核的申请
        var existingRequest = await _joinRequestFactory.FindAsync(jr =>
            jr.UserId == userId &&
            jr.CompanyId == companyId &&
            jr.Status == "pending");
        var existingRequestRecord = existingRequest.FirstOrDefault();

        if (existingRequestRecord != null)
        {
            throw new InvalidOperationException("您已提交过申请，请等待审核");
        }

        // 4. 创建申请记录
        var joinRequest = new CompanyJoinRequest
        {
            UserId = userId,
            CompanyId = companyId,
            Reason = request.Reason,
            Status = "pending"
            // ✅ DatabaseOperationFactory.CreateAsync 会自动设置 IsDeleted = false, CreatedAt, UpdatedAt
        };

        await _joinRequestFactory.CreateAsync(joinRequest);

        _logger.LogInformation("用户 {UserId} 申请加入企业 {CompanyId}", userId, companyId);

        // 发送通知给企业管理员
        await NotifyCompanyAdminsAsync(companyId, userId, company.Name, joinRequest.Id!);

        return joinRequest;
    }

    /// <summary>
    /// 获取我的申请列表
    /// </summary>
    public async Task<List<JoinRequestDetail>> GetMyRequestsAsync(string? keyword = null)
    {
        var userId = _joinRequestFactory.GetRequiredUserId();

        var requests = await _joinRequestFactory.FindAsync(
            jr => jr.UserId == userId,
            orderBy: query => query.OrderByDescending(jr => jr.CreatedAt));

        var details = await BuildJoinRequestDetailsAsync(requests);

        // 如果有关键词，进行搜索过滤（搜索企业名称）
        if (!string.IsNullOrEmpty(keyword))
        {
            var lowerKeyword = keyword.ToLower();
            details = details.Where(d =>
                (d.CompanyName != null && d.CompanyName.ToLower().Contains(lowerKeyword))
            ).ToList();
        }

        return details;
    }

    /// <summary>
    /// 撤回申请
    /// </summary>
    public async Task<bool> CancelRequestAsync(string requestId)
    {
        var userId = _joinRequestFactory.GetRequiredUserId();

        var requests = await _joinRequestFactory.FindAsync(jr =>
            jr.Id == requestId &&
            jr.UserId == userId &&
            jr.Status == "pending");
        var request = requests.FirstOrDefault();

        if (request == null)
        {
            throw new KeyNotFoundException("申请不存在或已处理");
        }

        var result = await _joinRequestFactory.UpdateAsync(request.Id!, entity =>
        {
            entity.Status = "cancelled";
            entity.UpdatedAt = DateTime.UtcNow;
        });
        return result != null;
    }

    /// <summary>
    /// 获取待审核的申请列表（管理员）
    /// </summary>
    public async Task<List<JoinRequestDetail>> GetPendingRequestsAsync(string companyId, string? keyword = null)
    {
        // 验证当前用户是否是该企业的管理员
        var currentUserId = _joinRequestFactory.GetRequiredUserId();
        if (!await _userCompanyService.IsUserAdminInCompanyAsync(currentUserId, companyId))
        {
            throw new UnauthorizedAccessException("只有企业管理员可以查看待审核申请");
        }

        var requests = await _joinRequestFactory.FindAsync(
            jr => jr.CompanyId == companyId && jr.Status == "pending",
            orderBy: query => query.OrderBy(jr => jr.CreatedAt));

        var details = await BuildJoinRequestDetailsAsync(requests);

        // 如果有关键词，进行搜索过滤（搜索用户名或邮箱）
        if (!string.IsNullOrEmpty(keyword))
        {
            var lowerKeyword = keyword.ToLower();
            details = details.Where(d =>
                (d.Username != null && d.Username.ToLower().Contains(lowerKeyword)) ||
                (d.UserEmail != null && d.UserEmail.ToLower().Contains(lowerKeyword))
            ).ToList();
        }

        return details;
    }

    /// <summary>
    /// 审核通过
    /// </summary>
    public async Task<bool> ApproveRequestAsync(string requestId, ReviewJoinRequestRequest? reviewRequest = null)
    {
        var adminUserId = _joinRequestFactory.GetRequiredUserId();

        // 1. 获取申请记录
        var request = await _joinRequestFactory.GetByIdAsync(requestId);

        if (request == null)
        {
            throw new KeyNotFoundException("申请不存在");
        }

        // 如果已经是批准状态，直接返回成功（或更新角色）
        if (request.Status == "approved")
        {
            return true;
        }

        // 2. 验证审核人是否是该企业的管理员
        if (!await _userCompanyService.IsUserAdminInCompanyAsync(adminUserId, request.CompanyId))
        {
            throw new UnauthorizedAccessException("只有企业管理员可以审核申请");
        }

        // 3. 检查企业用户配额
        var currentMemberCount = await _userCompanyFactory.CountAsync(uc =>
            uc.CompanyId == request.CompanyId && uc.Status == "active");

        var company = await _companyFactory.GetByIdAsync(request.CompanyId);

        if (company != null && currentMemberCount >= company.MaxUsers)
        {
            throw new InvalidOperationException(ErrorMessages.MaxUsersReached);
        }

        // 4. 获取默认角色
        var roleIds = reviewRequest?.DefaultRoleIds ?? new List<string>();
        if (!roleIds.Any())
        {
            // 如果没有指定角色，分配默认的"员工"角色
            var defaultRole = await _roleFactory.FindAsync(r =>
                r.CompanyId == request.CompanyId && r.Name == "员工");
            var role = defaultRole.FirstOrDefault();

            if (role != null)
            {
                roleIds.Add(role.Id!);
            }
            else
            {
                // ⚠️ 逻辑修复：如果默认角色不存在，记录警告但不阻塞流程
                // 允许用户加入企业但没有角色（可能需要后续手动分配角色）
                _logger.LogWarning(
                    "企业 {CompanyId} 不存在默认的'员工'角色，用户 {UserId} 将加入企业但没有角色",
                    request.CompanyId,
                    request.UserId
                );
            }
        }

        // 5. 创建或激活用户-企业关联
        var memberships = await _userCompanyFactory.FindWithoutTenantFilterAsync(uc =>
            uc.UserId == request.UserId && uc.CompanyId == request.CompanyId);
        var existingMembership = memberships.FirstOrDefault();

        if (existingMembership == null)
        {
            var userCompany = new UserCompany
            {
                UserId = request.UserId,
                CompanyId = request.CompanyId,
                RoleIds = roleIds,
                IsAdmin = false,
                Status = "active",
                JoinedAt = DateTime.UtcNow,
                ApprovedBy = adminUserId,
                ApprovedAt = DateTime.UtcNow
            };
            await _userCompanyFactory.CreateAsync(userCompany);
        }
        else if (existingMembership.Status != "active" || existingMembership.IsDeleted)
        {
            // 如果已经被软删除或处于非活跃状态，则重新激活
            await _userCompanyFactory.UpdateAsync(existingMembership.Id!, entity =>
            {
                entity.IsDeleted = false;
                entity.Status = "active";
                entity.RoleIds = roleIds;
                entity.UpdatedAt = DateTime.UtcNow;
            });
        }

        // 6. 更新申请状态
        var result = await _joinRequestFactory.UpdateAsync(request.Id!, entity =>
        {
            entity.Status = "approved";
            entity.ReviewedBy = adminUserId;
            entity.ReviewedAt = DateTime.UtcNow;
            entity.UpdatedAt = DateTime.UtcNow;
        });

        if (result != null)
        {
            _logger.LogInformation("管理员 {AdminId} 批准用户 {UserId} 加入企业 {CompanyId}",
                adminUserId, request.UserId, request.CompanyId);
        }

        return result != null;
    }

    /// <summary>
    /// 拒绝申请
    /// </summary>
    public async Task<bool> RejectRequestAsync(string requestId, string rejectReason)
    {
        var adminUserId = _joinRequestFactory.GetRequiredUserId();

        // 1. 获取申请记录
        var request = await _joinRequestFactory.GetByIdAsync(requestId);

        if (request == null)
        {
            throw new KeyNotFoundException("申请不存在");
        }

        if (request.Status == "rejected")
        {
            return true;
        }

        // 2. 验证审核人是否是该企业的管理员
        if (!await _userCompanyService.IsUserAdminInCompanyAsync(adminUserId, request.CompanyId))
        {
            throw new UnauthorizedAccessException("只有企业管理员可以审核申请");
        }

        // 3. 处理状态回退：如果之前是“已批准”，需要停用或删除 UserCompany 记录
        if (request.Status == "approved")
        {
            var memberships = await _userCompanyFactory.FindAsync(uc =>
                uc.UserId == request.UserId && uc.CompanyId == request.CompanyId);
            foreach (var m in memberships)
            {
                await _userCompanyFactory.SoftDeleteAsync(m.Id!);
            }
        }

        // 4. 更新申请状态
        var result = await _joinRequestFactory.UpdateAsync(request.Id!, entity =>
        {
            entity.Status = "rejected";
            entity.ReviewedBy = adminUserId;
            entity.ReviewedAt = DateTime.UtcNow;
            entity.RejectReason = rejectReason;
            entity.UpdatedAt = DateTime.UtcNow;
        });

        if (result != null)
        {
            _logger.LogInformation("管理员 {AdminId} 拒绝用户 {UserId} 加入企业 {CompanyId}，原因: {Reason}",
                adminUserId, request.UserId, request.CompanyId, rejectReason);
        }

        return result != null;
    }

    #region 私有辅助方法

    /// <summary>
    /// 获取企业的所有管理员用户ID
    /// </summary>
    private async Task<List<string>> GetCompanyAdminUserIdsAsync(string companyId)
    {
        // 查询企业的所有管理员（IsAdmin = true 且 Status = active）
        var adminMemberships = await _userCompanyFactory.FindAsync(uc =>
            uc.CompanyId == companyId &&
            uc.IsAdmin == true &&
            uc.Status == "active");
        return adminMemberships.Select(m => m.UserId).Distinct().ToList();
    }

    /// <summary>
    /// 通知企业管理员有新加入申请
    /// </summary>
    private async Task NotifyCompanyAdminsAsync(string companyId, string applicantUserId, string companyName, string requestId)
    {
        try
        {
            // 获取申请人信息
            var applicant = await _userFactory.GetByIdAsync(applicantUserId);
            var applicantName = applicant?.Username ?? applicant?.Email ?? "未知用户";

            // 获取企业的所有管理员
            var adminUserIds = await GetCompanyAdminUserIdsAsync(companyId);

            if (!adminUserIds.Any())
            {
                _logger.LogWarning("企业 {CompanyId} 没有管理员，无法发送通知", companyId);
                return;
            }

            // 为每个管理员创建通知
            var noticeTitle = "新的加入企业申请";
            var noticeDescription = $"{applicantName} 申请加入企业 {companyName}";
            if (!string.IsNullOrEmpty(applicant?.Email))
            {
                noticeDescription += $" ({applicant.Email})";
            }

            // 创建通知请求
            var noticeRequest = new CreateNoticeRequest
            {
                Title = noticeTitle,
                Description = noticeDescription,
                Type = NoticeIconItemType.Event,
                Status = "processing",
                Extra = requestId,  // 将申请ID存储在 Extra 字段中，方便前端跳转
                ClickClose = false,
                Datetime = DateTime.UtcNow
            };

            // 为指定企业创建通知（通知会显示在该企业的所有管理员的通知列表中）
            await _noticeService.CreateNoticeForCompanyAsync(companyId, noticeRequest);

            _logger.LogInformation(
                "已为企业 {CompanyId} 的 {AdminCount} 位管理员发送加入申请通知，申请人: {ApplicantName}",
                companyId, adminUserIds.Count, applicantName);
        }
        catch (Exception ex)
        {
            // 通知失败不影响申请流程，只记录日志
            _logger.LogError(ex, "发送加入申请通知失败，企业: {CompanyId}, 申请人: {ApplicantUserId}",
                companyId, applicantUserId);
        }
    }

    /// <summary>
    /// 构建申请详情列表
    /// </summary>
    private async Task<List<JoinRequestDetail>> BuildJoinRequestDetailsAsync(List<CompanyJoinRequest> requests)
    {
        var result = new List<JoinRequestDetail>();

        if (!requests.Any())
            return result;

        // 批量查询优化：避免N+1查询问题
        var userIds = requests.Select(r => r.UserId).Distinct().ToList();
        var companyIds = requests.Select(r => r.CompanyId).Distinct().ToList();
        var reviewerIds = requests.Where(r => !string.IsNullOrEmpty(r.ReviewedBy))
                                 .Select(r => r.ReviewedBy!)
                                 .Distinct()
                                 .ToList();

        // ✅ 优化：使用字段投影，只返回需要的字段
        // 批量查询用户信息（只需要 Username 和 Email）
        var users = await _userFactory.FindAsync(u => userIds.Contains(u.Id));
        var userDict = users.ToDictionary(u => u.Id!, u => u);

        // 批量查询企业信息（只需要 Name）
        var companies = await _companyFactory.FindAsync(c => companyIds.Contains(c.Id));
        var companyDict = companies.ToDictionary(c => c.Id!, c => c);

        // 批量查询审核人信息（只需要 Username）
        var reviewerDict = new Dictionary<string, AppUser>();
        if (reviewerIds.Any())
        {
            var reviewers = await _userFactory.FindAsync(u => reviewerIds.Contains(u.Id));
            reviewerDict = reviewers.ToDictionary(r => r.Id!, r => r);
        }

        // 构建结果
        foreach (var request in requests)
        {
            var user = userDict.GetValueOrDefault(request.UserId);
            var company = companyDict.GetValueOrDefault(request.CompanyId);

            string? reviewedByName = null;
            if (!string.IsNullOrEmpty(request.ReviewedBy))
            {
                var reviewer = reviewerDict.GetValueOrDefault(request.ReviewedBy);
                reviewedByName = reviewer?.Username;
            }

            result.Add(new JoinRequestDetail
            {
                Id = request.Id!,
                UserId = request.UserId,
                Username = user?.Username ?? "未知用户",
                UserEmail = user?.Email,
                CompanyId = request.CompanyId,
                CompanyName = company?.Name ?? "未知企业",
                Status = request.Status,
                Reason = request.Reason,
                ReviewedBy = request.ReviewedBy,
                ReviewedByName = reviewedByName,
                ReviewedAt = request.ReviewedAt,
                RejectReason = request.RejectReason,
                CreatedAt = request.CreatedAt
            });
        }

        return result;
    }

    #endregion
}

