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
        var instance = await _instanceFactory.GetByIdAsync(instanceId);
        if (instance == null) return;

        var document = await _documentFactory.GetByIdAsync(instance.DocumentId);
        if (document == null) return;

        var approvers = await GetNodeApproversAsync(instanceId, node.Id);

        // Bug 4：Sequential 模式仅通知当前轮到的人
        if (node.Config.Approval?.Type == ApprovalType.Sequential)
        {
            var nextApprover = approvers.FirstOrDefault(a =>
                !instance.ApprovalRecords.Any(r => r.NodeId == node.Id && r.ApproverId == a && r.Action == ApprovalAction.Approve));
            approvers = nextApprover != null ? new List<string> { nextApprover } : new List<string>();
        }

        // Bug 6 修复：同步更新 CurrentApproverIds 用于待办查询
        await UpdateCurrentApproverIdsAsync(instanceId, approvers);

        // 计算超时时间
        if (node.Config.Approval?.TimeoutHours != null)
        {
            await _instanceFactory.UpdateAsync(instanceId, i =>
            {
                i.TimeoutAt = DateTime.UtcNow.AddHours(node.Config.Approval.TimeoutHours.Value);
            });
        }

        if (approvers.Any())
        {
            await _notificationService.CreateWorkflowNotificationAsync(
                instanceId,
                document.Title,
                "workflow_pending_approval",
                approvers,
                $"您有一个待处理的审批节点：{node.Label ?? node.Id}",
                instance.CompanyId
            );
        }
    }

    /// <summary>
    /// 处理通知节点
    /// </summary>
    private async Task ProcessNotificationNodeAsync(string instanceId, WorkflowNode node)
    {
        if (node.Config.Notification == null)
        {
            await MoveToNextNodeAsync(instanceId, node.Id);
            return;
        }

        try
        {
            var instance = await _instanceFactory.GetByIdAsync(instanceId);
            if (instance == null) return;

            var document = await _documentFactory.GetByIdAsync(instance.DocumentId);
            if (document == null) return;

            var recipients = new List<string>();
            foreach (var rule in node.Config.Notification.Recipients)
            {
                var resolved = await ResolveApproverAsync(instance, rule);
                recipients.AddRange(resolved);
            }

            recipients = recipients.Distinct().ToList();

            if (recipients.Any())
            {
                var variables = await GetDocumentVariablesAsync(instanceId);
                var remarks = node.Config.Notification.RemarksTemplate;
                if (!string.IsNullOrEmpty(remarks))
                {
                    foreach (var v in variables)
                    {
                        remarks = remarks.Replace($"{{{v.Key}}}", v.Value?.ToString());
                    }
                }

                await _notificationService.CreateWorkflowNotificationAsync(
                    instanceId,
                    document.Title,
                    node.Config.Notification.ActionType,
                    recipients,
                    remarks ?? "系统流程通知",
                    instance.CompanyId
                );
            }

            await MoveToNextNodeAsync(instanceId, node.Id);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "处理通知节点失败: InstanceId={InstanceId}, NodeId={NodeId}", instanceId, node.Id);
            await MoveToNextNodeAsync(instanceId, node.Id);
        }
    }
}
