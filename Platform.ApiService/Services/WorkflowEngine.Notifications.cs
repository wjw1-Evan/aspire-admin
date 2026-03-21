using Platform.ApiService.Models;
using Platform.ApiService.Models.Workflow;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using System;

namespace Platform.ApiService.Services;

public partial class WorkflowEngine
{
    /// <summary>
    /// Bug 6 修复：发送审批通知时同步更新 CurrentApproverIds
    /// </summary>
    private async Task SendApprovalNotificationsAsync(string instanceId, WorkflowNode node)
    {
        _logger.LogInformation("=== SendApprovalNotificationsAsync START: instanceId={InstanceId}, nodeId={NodeId}", instanceId, node.Id);
        
        var instance = await _instanceFactory.GetByIdAsync(instanceId);
        if (instance == null || string.IsNullOrEmpty(instance.DocumentId)) return;

        var document = await _documentFactory.GetByIdAsync(instance.DocumentId);
        if (document == null) return;

        var approvers = await GetNodeApproversAsync(instanceId, node.Id);

        _logger.LogInformation("=== 审批通知 Node={NodeId}: 解析出审批人={Approvers} ===",
            node.Id, string.Join(", ", approvers));

        // Sequential 模式仅通知当前轮到的人
        if (node.Data.Config?.Approval != null && node.Data.Config.Approval.Type == ApprovalType.Sequential)
        {
            var history = await GetApprovalHistoryAsync(instanceId);
            var nextApprover = approvers.FirstOrDefault(a => 
                !history.Any(r => r.NodeId == node.Id && r.ApproverId == a && r.Action == ApprovalAction.Approve));
            approvers = nextApprover != null ? new List<string> { nextApprover } : new List<string>();
        }

        // Bug 6 修复：同步更新 CurrentApproverIds 用于待办查询
        await UpdateCurrentApproverIdsAsync(instanceId, node.Id, approvers);

        _logger.LogInformation("=== 审批通知 Node={NodeId}: 已更新 ActiveApprovals, 审批人数={Count} ===",
            node.Id, approvers.Count);

        // 计算超时时间
        if (node.Data.Config?.Approval?.TimeoutHours != null)
        {
            await _instanceFactory.UpdateAsync(instanceId, i =>
            {
                i.TimeoutAt = DateTime.UtcNow.AddHours(node.Data.Config.Approval.TimeoutHours.Value);
            });
        }

        try 
        {
            if (approvers.Any())
            {
                var message = $"您有一个待处理的审批节点：{node.Data.Label ?? node.Id}";
                await _notificationService.CreateWorkflowNotificationAsync(
                    instanceId,
                    document.Title,
                    "workflow_pending_approval",
                    approvers,
                    message,
                    instance.CompanyId
                );
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "发送审批通知失败: NodeId={NodeId}, InstanceId={InstanceId}", node.Id, instanceId);
            // 通知失败不应阻断流程主流程，但我们需要记录
        }
    }

    /// <summary>
    /// Bug 24 修复：退回到开始节点时通知发起人重新提交
    /// </summary>
    private async Task SendReturnToStartNotificationAsync(string instanceId, WorkflowNode startNode, string startedBy)
    {
        try
        {
            var instance = await _instanceFactory.GetByIdAsync(instanceId);
            if (instance == null || string.IsNullOrEmpty(instance.DocumentId)) return;

            var document = await _documentFactory.GetByIdAsync(instance.DocumentId);
            if (document == null) return;

            await _notificationService.CreateWorkflowNotificationAsync(
                instanceId,
                document.Title,
                "workflow_returned_to_start",
                new List<string> { startedBy },
                $"您的流程已被退回至起始节点，请重新填写并提交：{startNode.Data.Label ?? startNode.Id}",
                instance.CompanyId
            );
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "发送退回开始节点通知失败: InstanceId={InstanceId}", instanceId);
        }
    }
}
