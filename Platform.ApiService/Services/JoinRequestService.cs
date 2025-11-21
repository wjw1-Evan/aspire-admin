using Platform.ServiceDefaults.Services;
using Platform.ServiceDefaults.Models;
using Platform.ApiService.Constants;
using Platform.ApiService.Extensions;
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
    /// <returns>申请详情列表</returns>
    Task<List<JoinRequestDetail>> GetMyRequestsAsync();
    
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
    /// <returns>申请详情列表</returns>
    Task<List<JoinRequestDetail>> GetPendingRequestsAsync(string companyId);
    
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
    private readonly IDatabaseOperationFactory<CompanyJoinRequest> _joinRequestFactory;
    private readonly IDatabaseOperationFactory<UserCompany> _userCompanyFactory;
    private readonly IDatabaseOperationFactory<AppUser> _userFactory;
    private readonly IDatabaseOperationFactory<Company> _companyFactory;
    private readonly IDatabaseOperationFactory<Role> _roleFactory;
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
        IDatabaseOperationFactory<CompanyJoinRequest> joinRequestFactory,
        IDatabaseOperationFactory<UserCompany> userCompanyFactory,
        IDatabaseOperationFactory<AppUser> userFactory,
        IDatabaseOperationFactory<Company> companyFactory,
        IDatabaseOperationFactory<Role> roleFactory,
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
        var existingMembershipFilter = _userCompanyFactory.CreateFilterBuilder()
            .Equal(uc => uc.UserId, userId)
            .Equal(uc => uc.CompanyId, companyId)
            .Build();
        var existingMembership = await _userCompanyFactory.FindAsync(existingMembershipFilter);
        var membership = existingMembership.FirstOrDefault();
        
        if (membership != null)
        {
            if (membership.Status == "active")
                throw new InvalidOperationException("您已是该企业的成员");
            if (membership.Status == "pending")
                throw new InvalidOperationException("您的加入申请正在审核中");
        }
        
        // 3. 检查是否有待审核的申请
        var existingRequestFilter = _joinRequestFactory.CreateFilterBuilder()
            .Equal(jr => jr.UserId, userId)
            .Equal(jr => jr.CompanyId, companyId)
            .Equal(jr => jr.Status, "pending")
            .Build();
        var existingRequest = await _joinRequestFactory.FindAsync(existingRequestFilter);
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
    public async Task<List<JoinRequestDetail>> GetMyRequestsAsync()
    {
        var userId = _joinRequestFactory.GetRequiredUserId();
        
        var filter = _joinRequestFactory.CreateFilterBuilder()
            .Equal(jr => jr.UserId, userId)
            .Build();
        
        var sortBuilder = _joinRequestFactory.CreateSortBuilder()
            .Descending(jr => jr.CreatedAt);
        var requests = await _joinRequestFactory.FindAsync(filter, sort: sortBuilder.Build());
        
        return await BuildJoinRequestDetailsAsync(requests);
    }

    /// <summary>
    /// 撤回申请
    /// </summary>
    public async Task<bool> CancelRequestAsync(string requestId)
    {
        var userId = _joinRequestFactory.GetRequiredUserId();
        
        var filter = _joinRequestFactory.CreateFilterBuilder()
            .Equal(jr => jr.Id, requestId)
            .Equal(jr => jr.UserId, userId)
            .Equal(jr => jr.Status, "pending")
            .Build();
        
        var requests = await _joinRequestFactory.FindAsync(filter);
        var request = requests.FirstOrDefault();
        
        if (request == null)
        {
            throw new KeyNotFoundException("申请不存在或已处理");
        }
        
        var cancelFilter = _joinRequestFactory.CreateFilterBuilder().Equal(jr => jr.Id, request.Id).Build();
        var cancelUpdate = _joinRequestFactory.CreateUpdateBuilder()
            .Set(jr => jr.Status, "cancelled")
            .Set(jr => jr.UpdatedAt, DateTime.UtcNow)
            .Build();
        
        var result = await _joinRequestFactory.FindOneAndUpdateAsync(cancelFilter, cancelUpdate);
        return result != null;
    }

    /// <summary>
    /// 获取待审核的申请列表（管理员）
    /// </summary>
    public async Task<List<JoinRequestDetail>> GetPendingRequestsAsync(string companyId)
    {
        // 验证当前用户是否是该企业的管理员
        var currentUserId = _joinRequestFactory.GetRequiredUserId();
        if (!await _userCompanyService.IsUserAdminInCompanyAsync(currentUserId, companyId))
        {
            throw new UnauthorizedAccessException("只有企业管理员可以查看待审核申请");
        }
        
        var filter = _joinRequestFactory.CreateFilterBuilder()
            .Equal(jr => jr.CompanyId, companyId)
            .Equal(jr => jr.Status, "pending")
            .Build();
        
        var sortBuilder = _joinRequestFactory.CreateSortBuilder()
            .Ascending(jr => jr.CreatedAt);
        var requests = await _joinRequestFactory.FindAsync(filter, sort: sortBuilder.Build());
        
        return await BuildJoinRequestDetailsAsync(requests);
    }

    /// <summary>
    /// 审核通过
    /// </summary>
    public async Task<bool> ApproveRequestAsync(string requestId, ReviewJoinRequestRequest? reviewRequest = null)
    {
        var adminUserId = _joinRequestFactory.GetRequiredUserId();
        
        // 1. 获取申请记录
        var request = await _joinRequestFactory.GetByIdAsync(requestId);
        
        if (request == null || request.Status != "pending")
        {
            throw new KeyNotFoundException("申请不存在或已处理");
        }
        
        // 2. 验证审核人是否是该企业的管理员
        if (!await _userCompanyService.IsUserAdminInCompanyAsync(adminUserId, request.CompanyId))
        {
            throw new UnauthorizedAccessException("只有企业管理员可以审核申请");
        }
        
        // 3. 检查企业用户配额
        var currentMemberCountFilter = _userCompanyFactory.CreateFilterBuilder()
            .Equal(uc => uc.CompanyId, request.CompanyId)
            .Equal(uc => uc.Status, "active")
            .Build();
        var currentMemberCount = await _userCompanyFactory.CountAsync(currentMemberCountFilter);
        
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
            var defaultRoleFilter = _roleFactory.CreateFilterBuilder()
                .Equal(r => r.CompanyId, request.CompanyId)
                .Equal(r => r.Name, "员工")
                .Build();
            var defaultRole = await _roleFactory.FindAsync(defaultRoleFilter);
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
        
        // 5. 创建用户-企业关联
        var userCompany = new UserCompany
        {
            UserId = request.UserId,
            CompanyId = request.CompanyId,
            RoleIds = roleIds,
            IsAdmin = false,
            Status = "active",
            JoinedAt = DateTime.UtcNow,  // 业务字段，需要手动设置
            ApprovedBy = adminUserId,
            ApprovedAt = DateTime.UtcNow  // 业务字段，需要手动设置
            // ✅ DatabaseOperationFactory.CreateAsync 会自动设置 IsDeleted = false, CreatedAt, UpdatedAt
        };
        await _userCompanyFactory.CreateAsync(userCompany);
        
        // 6. 更新申请状态
        var filter = _joinRequestFactory.CreateFilterBuilder().Equal(jr => jr.Id, request.Id).Build();
        var update = _joinRequestFactory.CreateUpdateBuilder()
            .Set(jr => jr.Status, "approved")
            .Set(jr => jr.ReviewedBy, adminUserId)
            .Set(jr => jr.ReviewedAt, DateTime.UtcNow)
            .Set(jr => jr.UpdatedAt, DateTime.UtcNow)
            .Build();
        
        var result = await _joinRequestFactory.FindOneAndUpdateAsync(filter, update);
        
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
        
        if (request == null || request.Status != "pending")
        {
            throw new KeyNotFoundException("申请不存在或已处理");
        }
        
        // 2. 验证审核人是否是该企业的管理员
        if (!await _userCompanyService.IsUserAdminInCompanyAsync(adminUserId, request.CompanyId))
        {
            throw new UnauthorizedAccessException("只有企业管理员可以审核申请");
        }
        
        // 3. 更新申请状态
        var filter = _joinRequestFactory.CreateFilterBuilder().Equal(jr => jr.Id, request.Id).Build();
        var update = _joinRequestFactory.CreateUpdateBuilder()
            .Set(jr => jr.Status, "rejected")
            .Set(jr => jr.ReviewedBy, adminUserId)
            .Set(jr => jr.ReviewedAt, DateTime.UtcNow)
            .Set(jr => jr.RejectReason, rejectReason)
            .Set(jr => jr.UpdatedAt, DateTime.UtcNow)
            .Build();
        
        var result = await _joinRequestFactory.FindOneAndUpdateAsync(filter, update);
        
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
        var adminFilter = _userCompanyFactory.CreateFilterBuilder()
            .Equal(uc => uc.CompanyId, companyId)
            .Equal(uc => uc.IsAdmin, true)
            .Equal(uc => uc.Status, "active")
            .Build();
        
        var adminMemberships = await _userCompanyFactory.FindWithoutTenantFilterAsync(adminFilter);
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
        var userFilter = _userFactory.CreateFilterBuilder()
            .In(u => u.Id, userIds)
            .Build();
        var userProjection = _userFactory.CreateProjectionBuilder()
            .Include(u => u.Id)
            .Include(u => u.Username)
            .Include(u => u.Email)
            .Build();
        var users = await _userFactory.FindAsync(userFilter, projection: userProjection);
        var userDict = users.ToDictionary(u => u.Id!, u => u);
        
        // 批量查询企业信息（只需要 Name）
        var companyFilter = _companyFactory.CreateFilterBuilder()
            .In(c => c.Id, companyIds)
            .Build();
        var companyProjection = _companyFactory.CreateProjectionBuilder()
            .Include(c => c.Id)
            .Include(c => c.Name)
            .Build();
        var companies = await _companyFactory.FindAsync(companyFilter, projection: companyProjection);
        var companyDict = companies.ToDictionary(c => c.Id!, c => c);
        
        // 批量查询审核人信息（只需要 Username）
        var reviewerDict = new Dictionary<string, AppUser>();
        if (reviewerIds.Any())
        {
            var reviewerFilter = _userFactory.CreateFilterBuilder()
                .In(u => u.Id, reviewerIds)
                .Build();
            var reviewerProjection = _userFactory.CreateProjectionBuilder()
                .Include(u => u.Id)
                .Include(u => u.Username)
                .Build();
            var reviewers = await _userFactory.FindAsync(reviewerFilter, projection: reviewerProjection);
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

