using Platform.ApiService.Models.Workflow;
using Platform.ApiService.Services;
using Platform.ServiceDefaults.Services;
using System.Linq;
using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;

namespace Platform.ApiService.Workflows.Executors;

/// <summary>
/// 审批节点执行器 - 处理人工审批流程
/// </summary>
internal sealed partial class ApprovalExecutor : Executor
{
    private readonly ApprovalConfig _config;
    private readonly IDataFactory<WorkflowInstance> _instanceFactory;
    private readonly IWorkflowExpressionEvaluator _expressionEvaluator;

    public ApprovalExecutor(ApprovalConfig config, IDataFactory<WorkflowInstance> instanceFactory, IWorkflowExpressionEvaluator expressionEvaluator) : base("ApprovalExecutor")
    {
        _config = config;
        _instanceFactory = instanceFactory;
        _expressionEvaluator = expressionEvaluator;
    }

    [MessageHandler]
    public async Task<object?> HandleAsync(string input, IWorkflowContext context, CancellationToken cancellationToken = default)
    {
        // 审批节点通常需要挂起等待人工干预
        // 引擎会识别 __sourceHandle = "waiting" 并处理挂起逻辑

        var approvers = string.Join(", ", _config.Approvers.Select(a => a.UserId ?? a.RoleId ?? "Unknown"));

        // 返回特殊指令，由引擎后续调用 SendApprovalNotificationsAsync
        return await Task.FromResult<object?>(new Dictionary<string, object?>
        {
            ["__sourceHandle"] = "waiting",
            ["__status"] = "WaitingForApproval",
            ["__trigger_notifications"] = true, // 指示引擎发送通知
            ["approvers"] = approvers,
            ["message"] = $"Approval required for {approvers}"
        });
    }
}
