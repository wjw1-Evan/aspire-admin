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

        _logger.LogInformation("=== 审批/人工输入通知 Node={NodeId}: 解析出审批人={Approvers} ===",
            node.Id, string.Join(", ", approvers));

        // humanInput 节点无 Approval 配置，跳过 Sequential 逻辑
        // Bug 4：Sequential 模式仅通知当前轮到的人
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

        // 计算超时时间（仅审批节点）
        if (node.Data.Config?.Approval?.TimeoutHours != null)
        {
            await _instanceFactory.UpdateAsync(instanceId, i =>
            {
                i.TimeoutAt = DateTime.UtcNow.AddHours(node.Data.Config.Approval.TimeoutHours.Value);
            });
        }

        if (approvers.Any())
        {
            var isHumanInput = node.Type == "humanInput";
            var message = isHumanInput
                ? $"请完成人工输入：{node.Data.Config?.HumanInput?.InputLabel ?? node.Data.Label ?? node.Id}"
                : $"您有一个待处理的审批节点：{node.Data.Label ?? node.Id}";
            await _notificationService.CreateWorkflowNotificationAsync(
                instanceId,
                document.Title,
                isHumanInput ? "workflow_pending_human_input" : "workflow_pending_approval",
                approvers,
                message,
                instance.CompanyId
            );
        }
    }

    /// <summary>
    /// 处理通知节点
    /// </summary>
    private async Task ProcessNotificationNodeAsync(string instanceId, WorkflowNode node)
    {
        if (node.Data.Config.Notification == null)
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
            foreach (var rule in node.Data.Config.Notification.Recipients)
            {
                var resolved = await ResolveApproverAsync(instance, rule);
                recipients.AddRange(resolved);
            }

            recipients = recipients.Distinct().ToList();

            if (recipients.Any())
            {
                var variables = await GetDocumentVariablesAsync(instanceId);
                var remarks = node.Data.Config.Notification.RemarksTemplate;
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
                    node.Data.Config.Notification.ActionType,
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

    /// <summary>
    /// Bug 24 修复：退回到开始节点时通知发起人重新提交
    /// </summary>
    private async Task SendReturnToStartNotificationAsync(string instanceId, WorkflowNode startNode, string startedBy)
    {
        try
        {
            var instance = await _instanceFactory.GetByIdAsync(instanceId);
            if (instance == null) return;

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
