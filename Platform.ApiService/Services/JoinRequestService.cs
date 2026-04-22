using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Platform.ApiService.Constants;
using Platform.ApiService.Models;
using Platform.ApiService.Models.Entities;
using Platform.ApiService.Models.Response;
using Platform.ServiceDefaults.Models;
using Platform.ServiceDefaults.Services;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Security.Authentication;
using System.Threading.Tasks;

namespace Platform.ApiService.Services;

/// <summary>
/// 企业加入申请服务实现
/// </summary>
public class JoinRequestService : IJoinRequestService
{
    private readonly DbContext _context;
    private readonly IUserCompanyService _userCompanyService;
    private readonly INotificationService _notificationService;
    private readonly ITenantContext _tenantContext;
    private readonly ILogger<JoinRequestService> _logger;

    public JoinRequestService(
        DbContext context,
        IUserCompanyService userCompanyService,
        INotificationService notificationService,
        ITenantContext tenantContext,
        ILogger<JoinRequestService> logger)
    {
        _context = context;
        _userCompanyService = userCompanyService;
        _notificationService = notificationService;
        _tenantContext = tenantContext;
        _logger = logger;
    }

    /// <inheritdoc/>
    public async Task<CompanyJoinRequest> ApplyToJoinCompanyAsync(ApplyToJoinCompanyRequest request)
    {
        var userId = _tenantContext.GetCurrentUserId() ?? throw new AuthenticationException(ErrorCode.UserNotAuthenticated);
        var companyId = request.CompanyId;

        var company = await _context.Set<Company>().FirstOrDefaultAsync(x => x.Id == companyId);
        if (company == null || !company.IsActive)
        {
            throw new KeyNotFoundException("企业不存在或已停用");
        }

        var membership = await _context.Set<UserCompany>()
            .FirstOrDefaultAsync(uc => uc.UserId == userId && uc.CompanyId == companyId);

        if (membership != null)
        {
            if (membership.Status == "active")
                throw new InvalidOperationException("您已是该企业的成员");
            if (membership.Status == "pending")
                throw new InvalidOperationException("您的加入申请正在审核中");
        }

        var existingRequestRecord = await _context.Set<CompanyJoinRequest>()
            .FirstOrDefaultAsync(jr => jr.UserId == userId && jr.CompanyId == companyId && jr.Status == "pending");

        if (existingRequestRecord != null)
        {
            throw new InvalidOperationException("您已提交过申请，请等待审核");
        }

        var joinRequest = new CompanyJoinRequest
        {
            UserId = userId,
            CompanyId = companyId,
            Reason = request.Reason,
            Status = "pending"
        };

        await _context.Set<CompanyJoinRequest>().AddAsync(joinRequest);
        await _context.SaveChangesAsync();

        await NotifyCompanyAdminsAsync(companyId, userId, company.Name, joinRequest.Id!);

        return joinRequest;
    }

    /// <inheritdoc/>
    public async Task<List<JoinRequestDetail>> GetMyRequestsAsync(string? keyword = null)
    {
        var userId = _tenantContext.GetCurrentUserId() ?? throw new AuthenticationException(ErrorCode.UserNotAuthenticated);

        var requests = await _context.Set<CompanyJoinRequest>()
            .Where(jr => jr.UserId == userId)
            .OrderByDescending(jr => jr.CreatedAt)
            .ToListAsync();

        var details = await BuildJoinRequestDetailsAsync(requests);

        if (!string.IsNullOrEmpty(keyword))
        {
            var lowerKeyword = keyword.ToLower();
            details = details.Where(d => d.CompanyName != null && d.CompanyName.ToLower().Contains(lowerKeyword)).ToList();
        }

        return details;
    }

    /// <inheritdoc/>
    public async Task<bool> CancelRequestAsync(string requestId)
    {
        var userId = _tenantContext.GetCurrentUserId() ?? throw new AuthenticationException(ErrorCode.UserNotAuthenticated);

        var request = await _context.Set<CompanyJoinRequest>()
            .FirstOrDefaultAsync(jr => jr.Id == requestId && jr.UserId == userId && jr.Status == "pending");

        if (request == null)
        {
            throw new KeyNotFoundException("申请不存在或已处理");
        }

        request.Status = "cancelled";
        await _context.SaveChangesAsync();
        return true;
    }

    /// <inheritdoc/>
    public async Task<List<JoinRequestDetail>> GetPendingRequestsAsync(string companyId, string? keyword = null)
    {
        var currentUserId = _tenantContext.GetCurrentUserId() ?? throw new AuthenticationException(ErrorCode.UserNotAuthenticated);
        if (!await _userCompanyService.IsUserAdminInCompanyAsync(currentUserId, companyId))
        {
            throw new UnauthorizedAccessException("只有企业管理员可以查看待审核申请");
        }

        var requests = await _context.Set<CompanyJoinRequest>()
            .Where(jr => jr.CompanyId == companyId && jr.Status == "pending")
            .OrderBy(jr => jr.CreatedAt)
            .ToListAsync();

        var details = await BuildJoinRequestDetailsAsync(requests);

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

    /// <inheritdoc/>
    public async Task<bool> ApproveRequestAsync(string requestId, ReviewJoinRequestRequest? reviewRequest = null)
    {
        var adminUserId = _tenantContext.GetCurrentUserId() ?? throw new AuthenticationException(ErrorCode.UserNotAuthenticated);

        var request = await _context.Set<CompanyJoinRequest>().FirstOrDefaultAsync(x => x.Id == requestId);
        if (request == null) throw new KeyNotFoundException("申请不存在");
        if (request.Status == "approved") return true;

        if (!await _userCompanyService.IsUserAdminInCompanyAsync(adminUserId, request.CompanyId))
        {
            throw new UnauthorizedAccessException("只有企业管理员可以审核申请");
        }

        var currentMemberCount = await _context.Set<UserCompany>().LongCountAsync(uc => uc.CompanyId == request.CompanyId && uc.Status == "active");
        var company = await _context.Set<Company>().FirstOrDefaultAsync(c => c.Id == request.CompanyId);

        if (company != null && currentMemberCount >= company.MaxUsers)
        {
            throw new InvalidOperationException(ErrorCode.MaxUsersReached);
        }

        var roleIds = reviewRequest?.DefaultRoleIds ?? new List<string>();
        if (!roleIds.Any())
        {
            var role = await _context.Set<Role>().FirstOrDefaultAsync(r => r.CompanyId == request.CompanyId && r.Name == "员工");
            if (role != null) roleIds.Add(role.Id!);
        }

        var existingMembership = await _context.Set<UserCompany>().IgnoreQueryFilters()
            .FirstOrDefaultAsync(uc => uc.UserId == request.UserId && uc.CompanyId == request.CompanyId && uc.IsDeleted != true);

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
            await _context.Set<UserCompany>().AddAsync(userCompany);
        }
        else
        {
            existingMembership.IsDeleted = false;
            existingMembership.Status = "active";
            existingMembership.RoleIds = roleIds;
            existingMembership.ApprovedBy = adminUserId;
            existingMembership.ApprovedAt = DateTime.UtcNow;
        }

        request.Status = "approved";
        request.ReviewedBy = adminUserId;
        request.ReviewedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();
        return true;
    }

    /// <inheritdoc/>
    public async Task<bool> RejectRequestAsync(string requestId, string rejectReason)
    {
        var adminUserId = _tenantContext.GetCurrentUserId() ?? throw new AuthenticationException(ErrorCode.UserNotAuthenticated);

        var request = await _context.Set<CompanyJoinRequest>().FirstOrDefaultAsync(x => x.Id == requestId);
        if (request == null) throw new KeyNotFoundException("申请不存在");
        if (request.Status == "rejected") return true;

        if (!await _userCompanyService.IsUserAdminInCompanyAsync(adminUserId, request.CompanyId))
        {
            throw new UnauthorizedAccessException("只有企业管理员可以审核申请");
        }

        if (request.Status == "approved")
        {
            var memberships = await _context.Set<UserCompany>().Where(uc => uc.UserId == request.UserId && uc.CompanyId == request.CompanyId).ToListAsync();
            _context.Set<UserCompany>().RemoveRange(memberships);
        }

        request.Status = "rejected";
        request.ReviewedBy = adminUserId;
        request.ReviewedAt = DateTime.UtcNow;
        request.RejectReason = rejectReason;

        await _context.SaveChangesAsync();
        return true;
    }

    private async Task<List<string>> GetCompanyAdminUserIdsAsync(string companyId)
    {
        var adminMemberships = await _context.Set<UserCompany>()
            .Where(uc => uc.CompanyId == companyId && uc.IsAdmin == true && uc.Status == "active")
            .ToListAsync();
        return adminMemberships.Select(m => m.UserId).Distinct().ToList();
    }

    private async Task NotifyCompanyAdminsAsync(string companyId, string applicantUserId, string companyName, string requestId)
    {
        try
        {
            var applicant = await _context.Set<AppUser>().FirstOrDefaultAsync(x => x.Id == applicantUserId);
            var applicantName = applicant?.Username ?? applicant?.Email ?? "未知用户";
            var adminUserIds = await GetCompanyAdminUserIdsAsync(companyId);

            if (!adminUserIds.Any()) return;

            foreach (var adminId in adminUserIds)
            {
                await _notificationService.PublishAsync(
                    adminId,
                    "新的加入企业申请",
                    $"{applicantName} 申请加入企业 {companyName}" + (string.IsNullOrEmpty(applicant?.Email) ? "" : $" ({applicant.Email})"),
                    NotificationCategory.System,
                    NotificationLevel.Info,
                    actionUrl: $"/organization/join-requests?companyId={companyId}",
                    metadata: new Dictionary<string, string> { { "RequestId", requestId } }
                );
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "发送加入申请通知失败，企业: {CompanyId}, 申请人: {ApplicantUserId}", companyId, applicantUserId);
        }
    }

    private async Task<List<JoinRequestDetail>> BuildJoinRequestDetailsAsync(List<CompanyJoinRequest> requests)
    {
        var result = new List<JoinRequestDetail>();
        if (!requests.Any()) return result;

        var userIds = requests.Select(r => r.UserId).Distinct().ToList();
        var companyIds = requests.Select(r => r.CompanyId).Distinct().ToList();
        var reviewerIds = requests.Where(r => !string.IsNullOrEmpty(r.ReviewedBy)).Select(r => r.ReviewedBy!).Distinct().ToList();

        var userDict = await _context.Set<AppUser>().Where(u => userIds.Contains(u.Id)).ToDictionaryAsync(u => u.Id!, u => u);
        var companyDict = await _context.Set<Company>().Where(c => companyIds.Contains(c.Id)).ToDictionaryAsync(c => c.Id!, c => c);
        var reviewerDict = reviewerIds.Any() ? await _context.Set<AppUser>().Where(u => reviewerIds.Contains(u.Id)).ToDictionaryAsync(r => r.Id!, r => r) : new Dictionary<string, AppUser>();

        foreach (var request in requests)
        {
            var user = userDict.GetValueOrDefault(request.UserId);
            var company = companyDict.GetValueOrDefault(request.CompanyId);
            var reviewer = !string.IsNullOrEmpty(request.ReviewedBy) ? reviewerDict.GetValueOrDefault(request.ReviewedBy) : null;

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
                ReviewedByName = reviewer?.Username,
                ReviewedAt = request.ReviewedAt,
                RejectReason = request.RejectReason
            });
        }

        return result;
    }
}
