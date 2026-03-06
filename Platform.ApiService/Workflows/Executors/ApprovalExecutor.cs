using Microsoft.Agents.AI.Workflows;
using Platform.ApiService.Models.Workflow;
using Platform.ServiceDefaults.Services;

namespace Platform.ApiService.Workflows.Executors;

/// <summary>
/// 审批节点执行器 - 处理人工审批流程
/// </summary>
internal sealed partial class ApprovalExecutor : Executor
{
    private readonly ApprovalConfig _config;
    private readonly IDataFactory<WorkflowInstance> _instanceFactory;

    public ApprovalExecutor(ApprovalConfig config, IDataFactory<WorkflowInstance> instanceFactory) : base("ApprovalExecutor")
    {
        _config = config;
        _instanceFactory = instanceFactory;
    }

    protected override ProtocolBuilder ConfigureProtocol(ProtocolBuilder builder)
    {
        return builder;
    }

    [MessageHandler]
    private async ValueTask HandleAsync(string input, IWorkflowContext context, CancellationToken cancellationToken = default)
    {
        // 审批节点通常需要挂起等待人工干预
        // 这里我们可以设置流程实例的状态为 "WaitingForApproval"
        // 并通过 context.YieldOutputAsync 或类似机制通知系统
        
        await context.YieldOutputAsync($"Approval required for node: {_config.Approvers}");
        
        // 注意：在实际实现中，这里可能需要调用 context.QueueStateUpdateAsync 
        // 记录当前节点状态，然后结束当前 superstep。
    }
}
