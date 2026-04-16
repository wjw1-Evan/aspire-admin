using Microsoft.EntityFrameworkCore;
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
        var instance = await _context.Set<WorkflowInstance>().FirstOrDefaultAsync(x => x.Id == instanceId);
        if (instance == null || string.IsNullOrEmpty(instance.DocumentId)) return;

        var document = await _context.Set<Document>().FirstOrDefaultAsync(x => x.Id == instance.DocumentId);
        if (document == null) return;

        var approvers = await GetNodeApproversAsync(instanceId, node.Id);

        if (node.Data.Config?.Approval != null && node.Data.Config.Approval.Type == ApprovalType.Sequential)
        {
            var history = await GetApprovalHistoryAsync(instanceId);
            var nextApprover = approvers.FirstOrDefault(a => 
                !history.Any(r => r.NodeId == node.Id && r.ApproverId == a && r.Action == ApprovalAction.Approve));
            approvers = nextApprover != null ? new List<string> { nextApprover } : new List<string>();
        }

        await UpdateCurrentApproverIdsAsync(instanceId, node.Id, approvers);

        if (node.Data.Config?.Approval?.TimeoutHours != null)
        {
            var workflowInstance = await _context.Set<WorkflowInstance>().FirstOrDefaultAsync(x => x.Id == instanceId);
            if (workflowInstance != null)
            {
                workflowInstance.TimeoutAt = DateTime.UtcNow.AddHours(node.Data.Config.Approval.TimeoutHours.Value);
                await _context.SaveChangesAsync();
            }
        }

        if (approvers.Any())
        {
            var message = $"您有一个待处理的审批节点：{node.Data.Label ?? node.Id}";
            await _notificationService.CreateWorkflowNotificationAsync(
                instanceId,
                document.Title,
                "workflow_pending_approval",
                approvers,
                message
            );
        }
    }

    /// <summary>
    /// Bug 24 修复：退回到开始节点时通知发起人重新提交
    /// </summary>
    private async Task SendReturnToStartNotificationAsync(string instanceId, WorkflowNode startNode, string startedBy)
    {
        var instance = await _context.Set<WorkflowInstance>().FirstOrDefaultAsync(x => x.Id == instanceId);
        if (instance == null || string.IsNullOrEmpty(instance.DocumentId)) return;

        var document = await _context.Set<Document>().FirstOrDefaultAsync(x => x.Id == instance.DocumentId);
        if (document == null) return;

        await _notificationService.CreateWorkflowNotificationAsync(
            instanceId,
            document.Title,
            "workflow_returned_to_start",
            new List<string> { startedBy },
            $"您的流程已被退回至起始节点，请重新填写并提交：{startNode.Data.Label ?? startNode.Id}"
        );
    }

    /// <summary>
    /// 发送抄送通知
    /// 根据节点配置的 CcRules 解析抄送人并发送通知
    /// </summary>
    private async Task SendCcNotificationsAsync(string instanceId, WorkflowNode node, string notificationType, string message)
    {
        var instance = await _context.Set<WorkflowInstance>().FirstOrDefaultAsync(x => x.Id == instanceId);
        if (instance == null || string.IsNullOrEmpty(instance.DocumentId)) return;

        var ccConfig = node.Data.Config?.Approval?.CcRules;
        if (ccConfig == null || !ccConfig.Any()) return;

        var document = await _context.Set<Document>().FirstOrDefaultAsync(x => x.Id == instance.DocumentId);
        if (document == null) return;

        var ccUserIds = new List<string>();
        foreach (var ccRule in ccConfig)
        {
            var resolved = await _approverResolverFactory.ResolveAsync(ccRule, instance.CompanyId, instance);
            ccUserIds.AddRange(resolved);
        }

        ccUserIds = ccUserIds.Distinct().ToList();

        var initiator = await _userService.GetUserByIdAsync(instance.StartedBy);
        var approvers = await GetNodeApproversAsync(instanceId, node.Id);
        var approverNames = approvers.Any()
            ? string.Join(", ", await Task.WhenAll(approvers.Select(async u =>
            {
                var user = await _userService.GetUserByIdAsync(u);
                return user?.Username ?? u;
            })))
            : "无";

        var ccMessage = $"{initiator?.Username ?? instance.StartedBy} 的 {node.Data.Label ?? node.Id} 流程抄送：" +
                        $"\n节点审批人: {approverNames}" +
                        $"\n状态: {(notificationType == "workflow_approval_completed" ? "已通过" : "已拒绝")}" +
                        $"\n备注: {message}";

        if (ccUserIds.Any())
        {
            await _notificationService.CreateWorkflowNotificationAsync(
                instanceId,
                document.Title,
                "workflow_cc",
                ccUserIds,
                ccMessage
            );
        }
    }
}