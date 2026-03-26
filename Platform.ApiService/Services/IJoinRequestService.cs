using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using Platform.ApiService.Models;
using Platform.ApiService.Models.Response;

namespace Platform.ApiService.Services;

/// <summary>
/// 企业加入申请服务接口
/// </summary>
public interface IJoinRequestService
{
    /// <summary>
    /// 申请加入企业
    /// </summary>
    Task<CompanyJoinRequest> ApplyToJoinCompanyAsync(ApplyToJoinCompanyRequest request);

    /// <summary>
    /// 获取我的申请记录
    /// </summary>
    Task<List<JoinRequestDetail>> GetMyRequestsAsync(string? keyword = null);

    /// <summary>
    /// 取消申请
    /// </summary>
    Task<bool> CancelRequestAsync(string requestId);

    /// <summary>
    /// 获取待审核申请列表（仅管理员）
    /// </summary>
    Task<List<JoinRequestDetail>> GetPendingRequestsAsync(string companyId, string? keyword = null);

    /// <summary>
    /// 批准申请
    /// </summary>
    Task<bool> ApproveRequestAsync(string requestId, ReviewJoinRequestRequest? reviewRequest = null);

    /// <summary>
    /// 拒绝申请
    /// </summary>
    Task<bool> RejectRequestAsync(string requestId, string rejectReason);
}
