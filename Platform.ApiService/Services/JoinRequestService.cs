using Platform.ServiceDefaults.Services;
using Platform.ServiceDefaults.Models;
using Platform.ApiService.Constants;
using Platform.ApiService.Extensions;
using Platform.ApiService.Models;

namespace Platform.ApiService.Services;

public interface IJoinRequestService
{
    // 申请管理
    Task<CompanyJoinRequest> ApplyToJoinCompanyAsync(ApplyToJoinCompanyRequest request);
    Task<List<JoinRequestDetail>> GetMyRequestsAsync();
    Task<bool> CancelRequestAsync(string requestId);
    
    // 审核管理（管理员）
    Task<List<JoinRequestDetail>> GetPendingRequestsAsync(string companyId);
    Task<bool> ApproveRequestAsync(string requestId, ReviewJoinRequestRequest? request = null);
    Task<bool> RejectRequestAsync(string requestId, string rejectReason);
}

public class JoinRequestService : IJoinRequestService
{
    private readonly IDatabaseOperationFactory<CompanyJoinRequest> _joinRequestFactory;
    private readonly IDatabaseOperationFactory<UserCompany> _userCompanyFactory;
    private readonly IDatabaseOperationFactory<AppUser> _userFactory;
    private readonly IDatabaseOperationFactory<Company> _companyFactory;
    private readonly IDatabaseOperationFactory<Role> _roleFactory;
    private readonly IUserCompanyService _userCompanyService;
    private readonly ITenantContext _tenantContext;
    private readonly ILogger<JoinRequestService> _logger;

    public JoinRequestService(
        IDatabaseOperationFactory<CompanyJoinRequest> joinRequestFactory,
        IDatabaseOperationFactory<UserCompany> userCompanyFactory,
        IDatabaseOperationFactory<AppUser> userFactory,
        IDatabaseOperationFactory<Company> companyFactory,
        IDatabaseOperationFactory<Role> roleFactory,
        IUserCompanyService userCompanyService,
        ITenantContext tenantContext,
        ILogger<JoinRequestService> logger)
    {
        _joinRequestFactory = joinRequestFactory;
        _userCompanyFactory = userCompanyFactory;
        _userFactory = userFactory;
        _companyFactory = companyFactory;
        _roleFactory = roleFactory;
        _userCompanyService = userCompanyService;
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
            Status = "pending",
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };
        
        await _joinRequestFactory.CreateAsync(joinRequest);
        
        _logger.LogInformation("用户 {UserId} 申请加入企业 {CompanyId}", userId, companyId);
        
        // TODO: 发送通知给企业管理员
        
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
            JoinedAt = DateTime.UtcNow,
            ApprovedBy = adminUserId,
            ApprovedAt = DateTime.UtcNow,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
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
        
        // 批量查询用户信息
        var userFilter = _userFactory.CreateFilterBuilder()
            .In(u => u.Id, userIds)
            .Build();
        var users = await _userFactory.FindAsync(userFilter);
        var userDict = users.ToDictionary(u => u.Id!, u => u);
        
        // 批量查询企业信息
        var companyFilter = _companyFactory.CreateFilterBuilder()
            .In(c => c.Id, companyIds)
            .Build();
        var companies = await _companyFactory.FindAsync(companyFilter);
        var companyDict = companies.ToDictionary(c => c.Id!, c => c);
        
        // 批量查询审核人信息
        var reviewerDict = new Dictionary<string, AppUser>();
        if (reviewerIds.Any())
        {
            var reviewerFilter = _userFactory.CreateFilterBuilder()
                .In(u => u.Id, reviewerIds)
                .Build();
            var reviewers = await _userFactory.FindAsync(reviewerFilter);
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

