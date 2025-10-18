using MongoDB.Driver;
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

public class JoinRequestService : BaseService, IJoinRequestService
{
    private readonly IMongoCollection<CompanyJoinRequest> _joinRequests;
    private readonly IMongoCollection<UserCompany> _userCompanies;
    private readonly IMongoCollection<AppUser> _users;
    private readonly IMongoCollection<Company> _companies;
    private readonly IMongoCollection<Role> _roles;
    private readonly IUserCompanyService _userCompanyService;

    public JoinRequestService(
        IMongoDatabase database,
        IHttpContextAccessor httpContextAccessor,
        ITenantContext tenantContext,
        ILogger<JoinRequestService> logger,
        IUserCompanyService userCompanyService)
        : base(database, httpContextAccessor, tenantContext, logger)
    {
        _joinRequests = database.GetCollection<CompanyJoinRequest>("company_join_requests");
        _userCompanies = database.GetCollection<UserCompany>("user_companies");
        _users = database.GetCollection<AppUser>("users");
        _companies = database.GetCollection<Company>("companies");
        _roles = database.GetCollection<Role>("roles");
        _userCompanyService = userCompanyService;
    }

    /// <summary>
    /// 申请加入企业
    /// </summary>
    public async Task<CompanyJoinRequest> ApplyToJoinCompanyAsync(ApplyToJoinCompanyRequest request)
    {
        var userId = GetRequiredUserId();
        var companyId = request.CompanyId;
        
        // 1. 验证企业存在且活跃
        var company = await _companies.Find(c => 
            c.Id == companyId && 
            c.IsActive == true &&
            c.IsDeleted == false
        ).FirstOrDefaultAsync();
        
        if (company == null)
        {
            throw new KeyNotFoundException("企业不存在或已停用");
        }
        
        // 2. 检查是否已是成员
        var existingMembership = await _userCompanies.Find(uc =>
            uc.UserId == userId &&
            uc.CompanyId == companyId &&
            uc.IsDeleted == false
        ).FirstOrDefaultAsync();
        
        if (existingMembership != null)
        {
            if (existingMembership.Status == "active")
                throw new InvalidOperationException("您已是该企业的成员");
            if (existingMembership.Status == "pending")
                throw new InvalidOperationException("您的加入申请正在审核中");
        }
        
        // 3. 检查是否有待审核的申请
        var existingRequest = await _joinRequests.Find(jr =>
            jr.UserId == userId &&
            jr.CompanyId == companyId &&
            jr.Status == "pending" &&
            jr.IsDeleted == false
        ).FirstOrDefaultAsync();
        
        if (existingRequest != null)
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
        
        await _joinRequests.InsertOneAsync(joinRequest);
        
        LogInformation("用户 {UserId} 申请加入企业 {CompanyId}", userId, companyId);
        
        // 发送通知给企业管理员
        await NotifyCompanyAdminsAsync(companyId, "新成员申请", 
            $"用户 {user.Username} 申请加入企业，请及时处理。");
        
        return joinRequest;
    }

    /// <summary>
    /// 获取我的申请列表
    /// </summary>
    public async Task<List<JoinRequestDetail>> GetMyRequestsAsync()
    {
        var userId = GetRequiredUserId();
        
        var filter = Builders<CompanyJoinRequest>.Filter.And(
            Builders<CompanyJoinRequest>.Filter.Eq(jr => jr.UserId, userId),
            Builders<CompanyJoinRequest>.Filter.Eq(jr => jr.IsDeleted, false)
        );
        
        var requests = await _joinRequests.Find(filter)
            .SortByDescending(jr => jr.CreatedAt)
            .ToListAsync();
        
        return await BuildJoinRequestDetailsAsync(requests);
    }

    /// <summary>
    /// 撤回申请
    /// </summary>
    public async Task<bool> CancelRequestAsync(string requestId)
    {
        var userId = GetRequiredUserId();
        
        var filter = Builders<CompanyJoinRequest>.Filter.And(
            Builders<CompanyJoinRequest>.Filter.Eq(jr => jr.Id, requestId),
            Builders<CompanyJoinRequest>.Filter.Eq(jr => jr.UserId, userId),
            Builders<CompanyJoinRequest>.Filter.Eq(jr => jr.Status, "pending"),
            Builders<CompanyJoinRequest>.Filter.Eq(jr => jr.IsDeleted, false)
        );
        
        var update = Builders<CompanyJoinRequest>.Update
            .Set(jr => jr.Status, "cancelled")
            .Set(jr => jr.UpdatedAt, DateTime.UtcNow);
        
        var result = await _joinRequests.UpdateOneAsync(filter, update);
        return result.ModifiedCount > 0;
    }

    /// <summary>
    /// 获取待审核的申请列表（管理员）
    /// </summary>
    public async Task<List<JoinRequestDetail>> GetPendingRequestsAsync(string companyId)
    {
        // 验证当前用户是否是该企业的管理员
        var currentUserId = GetRequiredUserId();
        if (!await _userCompanyService.IsUserAdminInCompanyAsync(currentUserId, companyId))
        {
            throw new UnauthorizedAccessException("只有企业管理员可以查看待审核申请");
        }
        
        var filter = Builders<CompanyJoinRequest>.Filter.And(
            Builders<CompanyJoinRequest>.Filter.Eq(jr => jr.CompanyId, companyId),
            Builders<CompanyJoinRequest>.Filter.Eq(jr => jr.Status, "pending"),
            Builders<CompanyJoinRequest>.Filter.Eq(jr => jr.IsDeleted, false)
        );
        
        var requests = await _joinRequests.Find(filter)
            .SortBy(jr => jr.CreatedAt)
            .ToListAsync();
        
        return await BuildJoinRequestDetailsAsync(requests);
    }

    /// <summary>
    /// 审核通过
    /// </summary>
    public async Task<bool> ApproveRequestAsync(string requestId, ReviewJoinRequestRequest? reviewRequest = null)
    {
        var adminUserId = GetRequiredUserId();
        
        // 1. 获取申请记录
        var request = await _joinRequests.Find(jr => 
            jr.Id == requestId &&
            jr.Status == "pending" &&
            jr.IsDeleted == false
        ).FirstOrDefaultAsync();
        
        if (request == null)
        {
            throw new KeyNotFoundException("申请不存在或已处理");
        }
        
        // 2. 验证审核人是否是该企业的管理员
        if (!await _userCompanyService.IsUserAdminInCompanyAsync(adminUserId, request.CompanyId))
        {
            throw new UnauthorizedAccessException("只有企业管理员可以审核申请");
        }
        
        // 3. 检查企业用户配额
        var currentMemberCount = await _userCompanies.CountDocumentsAsync(uc =>
            uc.CompanyId == request.CompanyId &&
            uc.Status == "active" &&
            uc.IsDeleted == false
        );
        
        var company = await _companies.Find(c => c.Id == request.CompanyId)
            .FirstOrDefaultAsync();
        
        if (company != null && currentMemberCount >= company.MaxUsers)
        {
            throw new InvalidOperationException(ErrorMessages.MaxUsersReached);
        }
        
        // 4. 获取默认角色
        var roleIds = reviewRequest?.DefaultRoleIds ?? new List<string>();
        if (roleIds.Count == 0)
        {
            // 如果没有指定角色，分配默认的"员工"角色
            var defaultRole = await _roles.Find(r =>
                r.CompanyId == request.CompanyId &&
                r.Name == "员工" &&
                r.IsDeleted == false
            ).FirstOrDefaultAsync();
            
            if (defaultRole != null)
            {
                roleIds.Add(defaultRole.Id!);
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
        await _userCompanies.InsertOneAsync(userCompany);
        
        // 6. 更新申请状态
        var update = Builders<CompanyJoinRequest>.Update
            .Set(jr => jr.Status, "approved")
            .Set(jr => jr.ReviewedBy, adminUserId)
            .Set(jr => jr.ReviewedAt, DateTime.UtcNow)
            .Set(jr => jr.UpdatedAt, DateTime.UtcNow);
        
        await _joinRequests.UpdateOneAsync(jr => jr.Id == requestId, update);
        
        LogInformation("管理员 {AdminId} 批准用户 {UserId} 加入企业 {CompanyId}", 
            adminUserId, request.UserId, request.CompanyId);
        
        // 通知用户申请已通过
        await NotifyUserAsync(request.UserId, "申请通过", 
            $"您的企业加入申请已通过，现在可以访问企业资源。");
        
        return true;
    }

    /// <summary>
    /// 拒绝申请
    /// </summary>
    public async Task<bool> RejectRequestAsync(string requestId, string rejectReason)
    {
        var adminUserId = GetRequiredUserId();
        
        // 1. 获取申请记录
        var request = await _joinRequests.Find(jr => 
            jr.Id == requestId &&
            jr.Status == "pending" &&
            jr.IsDeleted == false
        ).FirstOrDefaultAsync();
        
        if (request == null)
        {
            throw new KeyNotFoundException("申请不存在或已处理");
        }
        
        // 2. 验证审核人是否是该企业的管理员
        if (!await _userCompanyService.IsUserAdminInCompanyAsync(adminUserId, request.CompanyId))
        {
            throw new UnauthorizedAccessException("只有企业管理员可以审核申请");
        }
        
        // 3. 更新申请状态
        var update = Builders<CompanyJoinRequest>.Update
            .Set(jr => jr.Status, "rejected")
            .Set(jr => jr.ReviewedBy, adminUserId)
            .Set(jr => jr.ReviewedAt, DateTime.UtcNow)
            .Set(jr => jr.RejectReason, rejectReason)
            .Set(jr => jr.UpdatedAt, DateTime.UtcNow);
        
        var result = await _joinRequests.UpdateOneAsync(jr => jr.Id == requestId, update);
        
        LogInformation("管理员 {AdminId} 拒绝用户 {UserId} 加入企业 {CompanyId}，原因: {Reason}", 
            adminUserId, request.UserId, request.CompanyId, rejectReason);
        
        // 通知用户申请被拒绝
        await NotifyUserAsync(request.UserId, "申请被拒绝", 
            $"您的企业加入申请被拒绝，原因：{rejectReason}");
        
        return result.ModifiedCount > 0;
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
        var userFilter = Builders<AppUser>.Filter.In(u => u.Id, userIds);
        var users = await _users.Find(userFilter).ToListAsync();
        var userDict = users.ToDictionary(u => u.Id!, u => u);
        
        // 批量查询企业信息
        var companyFilter = Builders<Company>.Filter.In(c => c.Id, companyIds);
        var companies = await _companies.Find(companyFilter).ToListAsync();
        var companyDict = companies.ToDictionary(c => c.Id!, c => c);
        
        // 批量查询审核人信息
        var reviewerDict = new Dictionary<string, AppUser>();
        if (reviewerIds.Any())
        {
            var reviewerFilter = Builders<AppUser>.Filter.In(u => u.Id, reviewerIds);
            var reviewers = await _users.Find(reviewerFilter).ToListAsync();
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

    /// <summary>
    /// 通知企业管理员
    /// </summary>
    private async Task NotifyCompanyAdminsAsync(string companyId, string title, string message)
    {
        try
        {
            // 获取企业管理员
            var adminFilter = Builders<UserCompany>.Filter.And(
                Builders<UserCompany>.Filter.Eq(uc => uc.CompanyId, companyId),
                Builders<UserCompany>.Filter.Eq(uc => uc.IsAdmin, true),
                Builders<UserCompany>.Filter.Eq(uc => uc.Status, "active"),
                Builders<UserCompany>.Filter.Eq(uc => uc.IsDeleted, false)
            );
            
            var admins = await _userCompanies.Find(adminFilter).ToListAsync();
            
            // 为每个管理员创建通知
            var notices = admins.Select(admin => new Notice
            {
                Title = title,
                Content = message,
                CompanyId = companyId,
                UserId = admin.UserId,
                Type = "system",
                IsRead = false,
                IsDeleted = false,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            }).ToList();
            
            if (notices.Any())
            {
                var noticesCollection = GetCollection<Notice>("notices");
                await noticesCollection.InsertManyAsync(notices);
                LogInformation("已向 {Count} 位企业管理员发送通知", notices.Count);
            }
        }
        catch (Exception ex)
        {
            LogError(ex, "发送企业管理员通知失败");
        }
    }

    /// <summary>
    /// 通知用户
    /// </summary>
    private async Task NotifyUserAsync(string userId, string title, string message)
    {
        try
        {
            // 获取用户当前企业ID
            var user = await _users.Find(u => u.Id == userId).FirstOrDefaultAsync();
            if (user?.CurrentCompanyId == null) return;
            
            var notice = new Notice
            {
                Title = title,
                Content = message,
                CompanyId = user.CurrentCompanyId,
                UserId = userId,
                Type = "system",
                IsRead = false,
                IsDeleted = false,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };
            
            var noticesCollection = GetCollection<Notice>("notices");
            await noticesCollection.InsertOneAsync(notice);
            LogInformation("已向用户 {UserId} 发送通知", userId);
        }
        catch (Exception ex)
        {
            LogError(ex, "发送用户通知失败");
        }
    }

    #endregion
}

