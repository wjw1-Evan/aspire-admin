using Platform.ApiService.Models;
using Platform.ServiceDefaults.Services;
using Microsoft.Extensions.Logging;

namespace Platform.ApiService.Services.Mcp.Handlers;

/// <summary>
/// 企业加入申请 MCP 工具处理器
/// </summary>
public class JoinRequestMcpToolHandler : McpToolHandlerBase
{
    private readonly IJoinRequestService _joinRequestService;
    private readonly ILogger<JoinRequestMcpToolHandler> _logger;

    /// <summary>
    /// 初始化企业加入申请 MCP 处理器
    /// </summary>
    /// <param name="joinRequestService">申请加入服务</param>
    /// <param name="logger">日志处理器</param>
    public JoinRequestMcpToolHandler(IJoinRequestService joinRequestService, ILogger<JoinRequestMcpToolHandler> logger)
    {
        _joinRequestService = joinRequestService;
        _logger = logger;

        RegisterTool("apply_to_join_company", "申请加入指定的企业。关键词：加入申请,申请入职",
            ObjectSchema(new Dictionary<string, object>
            {
                ["companyId"] = new Dictionary<string, object> { ["type"] = "string" },
                ["reason"] = new Dictionary<string, object> { ["type"] = "string" }
            }, ["companyId"]),
            async (args, uid) => await _joinRequestService.ApplyToJoinCompanyAsync(new ApplyToJoinCompanyRequest
            {
                CompanyId = args.GetValueOrDefault("companyId")?.ToString() ?? "",
                Reason = args.GetValueOrDefault("reason")?.ToString()
            }));

        RegisterTool("get_my_join_requests", "获取我提交的所有加入企业申请。关键词：我的申请,历史申请",
            ObjectSchema(new Dictionary<string, object> { ["keyword"] = new Dictionary<string, object> { ["type"] = "string" } }),
            async (args, uid) => await _joinRequestService.GetMyRequestsAsync(args.GetValueOrDefault("keyword")?.ToString()));

        RegisterTool("cancel_join_request", "取消我提交的待处理加入申请。关键词：取消申请",
            ObjectSchema(new Dictionary<string, object> { ["requestId"] = new Dictionary<string, object> { ["type"] = "string" } }, ["requestId"]),
            async (args, uid) => { var requestId = args.GetValueOrDefault("requestId")?.ToString(); return string.IsNullOrEmpty(requestId) ? new { error = "requestId is required" } : await _joinRequestService.CancelRequestAsync(requestId); });

        RegisterTool("get_pending_join_requests", "获取企业待审核的加入申请。关键词：待处理申请,审核申请",
            ObjectSchema(new Dictionary<string, object>
            {
                ["companyId"] = new Dictionary<string, object> { ["type"] = "string" },
                ["keyword"] = new Dictionary<string, object> { ["type"] = "string" }
            }, ["companyId"]),
            async (args, uid) => { var companyId = args.GetValueOrDefault("companyId")?.ToString(); return string.IsNullOrEmpty(companyId) ? new { error = "companyId is required" } : await _joinRequestService.GetPendingRequestsAsync(companyId, args.GetValueOrDefault("keyword")?.ToString()); });

        RegisterTool("approve_join_request", "批准加入企业申请。关键词：通过申请,同意加入",
            ObjectSchema(new Dictionary<string, object> { ["requestId"] = new Dictionary<string, object> { ["type"] = "string" } }, ["requestId"]),
            async (args, uid) => { var requestId = args.GetValueOrDefault("requestId")?.ToString(); return string.IsNullOrEmpty(requestId) ? new { error = "requestId is required" } : await _joinRequestService.ApproveRequestAsync(requestId); });

        RegisterTool("reject_join_request", "拒绝加入企业申请。关键词：拒绝申请",
            ObjectSchema(new Dictionary<string, object>
            {
                ["requestId"] = new Dictionary<string, object> { ["type"] = "string" },
                ["reason"] = new Dictionary<string, object> { ["type"] = "string" }
            }, ["requestId", "reason"]),
            async (args, uid) =>
            {
                var requestId = args.GetValueOrDefault("requestId")?.ToString();
                var reason = args.GetValueOrDefault("reason")?.ToString() ?? "";
                if (string.IsNullOrEmpty(requestId)) return new { error = "requestId is required" };
                return await _joinRequestService.RejectRequestAsync(requestId, reason);
            });
    }
}
