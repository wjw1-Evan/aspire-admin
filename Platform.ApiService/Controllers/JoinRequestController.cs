using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Platform.ApiService.Models;
using Platform.ApiService.Services;
using Platform.ServiceDefaults.Controllers;

namespace Platform.ApiService.Controllers;

/// <summary>
/// v3.1: 企业加入申请管理控制器
/// </summary>
[ApiController]
[Route("api/join-request")]
[Authorize]
public class JoinRequestController : BaseApiController
{
    private readonly IJoinRequestService _joinRequestService;

    /// <summary>
    /// 初始化企业加入申请控制器
    /// </summary>
    /// <param name="joinRequestService">企业加入申请服务</param>
    public JoinRequestController(IJoinRequestService joinRequestService)
    {
        _joinRequestService = joinRequestService;
    }

    /// <summary>
    /// 申请加入企业
    /// </summary>
    [HttpPost]
    [Authorize]
    public async Task<IActionResult> ApplyToJoinCompany([FromBody] ApplyToJoinCompanyRequest request)
    {
        var result = await _joinRequestService.ApplyToJoinCompanyAsync(request);
        return Success(result, "申请已提交，请等待企业管理员审核");
    }

    /// <summary>
    /// 获取我的申请列表
    /// </summary>
    [HttpGet("my-requests")]
    [Authorize]
    public async Task<IActionResult> GetMyRequests()
    {
        var requests = await _joinRequestService.GetMyRequestsAsync();
        return Success(requests);
    }

    /// <summary>
    /// 撤回申请
    /// </summary>
    [HttpDelete("{id}")]
    [Authorize]
    public async Task<IActionResult> CancelRequest(string id)
    {
        var success = await _joinRequestService.CancelRequestAsync(id);
        if (!success)
            throw new KeyNotFoundException("申请不存在或已处理");
        
        return Success("申请已撤回");
    }

    /// <summary>
    /// 获取待审核的申请列表（管理员）
    /// </summary>
    [HttpGet("pending")]
    [Authorize]
    public async Task<IActionResult> GetPendingRequests([FromQuery] string? companyId = null)
    {
        // 如果没有指定企业ID，使用当前企业（从数据库获取）
        if (string.IsNullOrEmpty(companyId))
        {
            var userId = GetRequiredUserId();
            var userService = HttpContext.RequestServices.GetRequiredService<Platform.ServiceDefaults.Services.IDatabaseOperationFactory<AppUser>>();
            var user = await userService.GetByIdAsync(userId);
            if (user == null || string.IsNullOrEmpty(user.CurrentCompanyId))
            {
                throw new UnauthorizedAccessException("未找到企业信息");
            }
            companyId = user.CurrentCompanyId;
        }
        
        var requests = await _joinRequestService.GetPendingRequestsAsync(companyId);
        return Success(requests);
    }

    /// <summary>
    /// 审核通过申请
    /// </summary>
    [HttpPost("{id}/approve")]
    [Authorize]
    public async Task<IActionResult> ApproveRequest(string id, [FromBody] ReviewJoinRequestRequest? request = null)
    {
        var success = await _joinRequestService.ApproveRequestAsync(id, request);
        return Success(success, "申请已通过，用户已加入企业");
    }

    /// <summary>
    /// 拒绝申请
    /// </summary>
    [HttpPost("{id}/reject")]
    [Authorize]
    public async Task<IActionResult> RejectRequest(string id, [FromBody] ReviewJoinRequestRequest request)
    {
        if (string.IsNullOrEmpty(request.RejectReason))
            throw new ArgumentException("请填写拒绝原因");
        
        var success = await _joinRequestService.RejectRequestAsync(id, request.RejectReason);
        return Success(success, "申请已拒绝");
    }
}

