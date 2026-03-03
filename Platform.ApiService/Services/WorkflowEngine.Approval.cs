using Platform.ApiService.Models;
using Platform.ApiService.Models.Workflow;
using Microsoft.Extensions.Logging;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using System;

namespace Platform.ApiService.Services;

public partial class WorkflowEngine
{
    /// <summary>
    /// 处理审批操作
    /// </summary>
    public async Task<bool> ProcessApprovalAsync(string instanceId, string nodeId, ApprovalAction action, string? comment = null, string? delegateToUserId = null)
    {
        var userId = _tenantContext.GetCurrentUserId() ?? throw new UnauthorizedAccessException("USER_NOT_AUTHENTICATED");

        var instance = await _instanceFactory.GetByIdAsync(instanceId);
        if (instance == null || instance.Status != WorkflowStatus.Running)
        {
            throw new InvalidOperationException("流程实例不存在或已结束");
        }

        var definition = instance.WorkflowDefinitionSnapshot ?? await _definitionFactory.GetByIdAsync(instance.WorkflowDefinitionId);
        if (definition == null)
        {
            throw new InvalidOperationException("流程定义不存在");
        }

        var currentNode = definition.Graph.Nodes.FirstOrDefault(n => n.Id == nodeId);
        if (currentNode == null || (instance.CurrentNodeId != nodeId && currentNode.Type != "approval"))
        {
            throw new InvalidOperationException("当前节点无效");
        }

        if (!await CanApproveAsync(instance, currentNode, userId))
        {
            throw new UnauthorizedAccessException("无权执行此审批操作");
        }

        var user = await _userService.GetUserByIdAsync(userId);
        var userName = user?.Username ?? userId;
        var companyId = await _tenantContext.GetCurrentCompanyIdAsync();

        if (action == ApprovalAction.Delegate)
        {
            if (string.IsNullOrEmpty(delegateToUserId))
            {
                throw new ArgumentException("转办必须指定目标用户");
            }
        }

        var record = new ApprovalRecord
        {
            Id = GenerateSafeId(),
            WorkflowInstanceId = instanceId,
            NodeId = nodeId,
            ApproverId = userId,
            ApproverName = userName,
            Action = action,
            Comment = comment,
            DelegateToUserId = delegateToUserId,
            ApprovedAt = DateTime.UtcNow,
            Sequence = instance.ApprovalRecords.Count + 1,
            CompanyId = companyId ?? string.Empty
        };

        await _approvalRecordFactory.CreateAsync(record);

        await _instanceFactory.UpdateAsync(instanceId, i =>
        {
            i.ApprovalRecords.Add(record);
            i.UpdatedAt = DateTime.UtcNow;
        });

        switch (action)
        {
            case ApprovalAction.Approve:
                await ProcessNodeApproversAsync(instanceId, nodeId, record);
                break;
            case ApprovalAction.Reject:
                await CompleteWorkflowAsync(instanceId, WorkflowStatus.Rejected);
                break;
            case ApprovalAction.Delegate:
                // Bug 5 修复：转办后更新 CurrentApproverIds 并发送通知
                await HandleDelegateAsync(instanceId, nodeId, delegateToUserId!, instance);
                break;
            case ApprovalAction.Return:
                // Bug 20 修复：退回操作不在此处处理（已在 ReturnToNodeAsync 中完成）
                // 此处仅记录了审批记录，实际退回由 ReturnToNodeAsync 方法处理
                break;
        }

        return true;
    }

    /// <summary>
    /// Bug 5 修复：处理转办逻辑
    /// </summary>
    private async Task HandleDelegateAsync(string instanceId, string nodeId, string delegateToUserId, WorkflowInstance instance)
    {
        // 更新待审批人：移除原审批人，添加被转办人
        var currentApprovers = instance.CurrentApproverIds.ToList();
        var userId = _tenantContext.GetCurrentUserId()!;
        currentApprovers.Remove(userId);
        if (!currentApprovers.Contains(delegateToUserId))
        {
            currentApprovers.Add(delegateToUserId);
        }
        await UpdateCurrentApproverIdsAsync(instanceId, currentApprovers);

        // 发送通知给被转办人
        try
        {
            var document = await _documentFactory.GetByIdAsync(instance.DocumentId);
            if (document != null)
            {
                await _notificationService.CreateWorkflowNotificationAsync(
                    instanceId,
                    document.Title,
                    "workflow_delegated",
                    new List<string> { delegateToUserId },
                    $"您收到一个转办的审批任务",
                    instance.CompanyId
                );
            }
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "发送转办通知失败: InstanceId={InstanceId}", instanceId);
        }
    }

    /// <summary>
    /// Bug 3 修复：检查用户是否有权审批（所有类型都阻止重复审批）
    /// </summary>
    private async Task<bool> CanApproveAsync(WorkflowInstance instance, WorkflowNode node, string userId)
    {
        if (node.Type == "start")
        {
            return instance.StartedBy == userId;
        }

        if (node.Config.Approval == null) return false;

        // Bug 3 修复：所有审批类型都阻止重复审批
        var hasApproved = instance.ApprovalRecords.Any(r =>
            r.NodeId == node.Id && r.ApproverId == userId && r.Action == ApprovalAction.Approve);
        if (hasApproved)
        {
            return false;
        }

        var approvers = await GetNodeApproversAsync(instance.Id, node.Id);

        // Bug 4：Sequential 模式下，只有轮到的人才能审批
        if (node.Config.Approval.Type == ApprovalType.Sequential)
        {
            var nextApprover = await GetNextSequentialApproverAsync(instance, node, approvers);
            return nextApprover == userId;
        }

        return approvers.Contains(userId);
    }

    /// <summary>
    /// Bug 4：获取顺序审批中下一个应审批的人
    /// </summary>
    private Task<string?> GetNextSequentialApproverAsync(WorkflowInstance instance, WorkflowNode node, List<string> allApprovers)
    {
        var completedApprovers = instance.ApprovalRecords
            .Where(r => r.NodeId == node.Id && r.Action == ApprovalAction.Approve)
            .Select(r => r.ApproverId)
            .ToList();

        // 按原始顺序找到第一个还没审批的人
        return Task.FromResult(allApprovers.FirstOrDefault(a => !completedApprovers.Contains(a)));
    }

    /// <summary>
    /// Bug 4 修复：处理节点审批人，支持 Sequential 类型
    /// </summary>
    private async Task ProcessNodeApproversAsync(string instanceId, string nodeId, ApprovalRecord record)
    {
        var instance = await _instanceFactory.GetByIdAsync(instanceId);
        if (instance == null) return;

        var definition = instance.WorkflowDefinitionSnapshot ?? await _definitionFactory.GetByIdAsync(instance.WorkflowDefinitionId);
        if (definition == null) return;

        var node = definition.Graph.Nodes.FirstOrDefault(n => n.Id == nodeId);
        if (node == null || node.Config.Approval == null)
        {
            await MoveToNextNodeAsync(instanceId, nodeId);
            return;
        }

        var config = node.Config.Approval;
        var allApprovers = await GetNodeApproversAsync(instanceId, nodeId);

        var completedApprovals = instance.ApprovalRecords
            .Where(r => r.NodeId == nodeId && r.Action == ApprovalAction.Approve)
            .Select(r => r.ApproverId)
            .Distinct()
            .ToList();

        bool isNodeComplete = false;
        switch (config.Type)
        {
            case ApprovalType.Any:
                // 或签：任意一人通过即完成
                isNodeComplete = true;
                break;

            case ApprovalType.All:
                // 会签：所有人都通过才完成
                isNodeComplete = allApprovers.All(a => completedApprovals.Contains(a));
                break;

            case ApprovalType.Sequential:
                // Bug 4 修复：顺序审批 - 所有人按顺序审完才完成
                var nextApprover = await GetNextSequentialApproverAsync(instance, node, allApprovers);
                if (nextApprover == null)
                {
                    // 所有人都审批完成
                    isNodeComplete = true;
                }
                else
                {
                    // 还有下一人，更新 CurrentApproverIds 为下一个审批人
                    await UpdateCurrentApproverIdsAsync(instanceId, new List<string> { nextApprover });

                    // 发送通知给下一个审批人
                    await SendApprovalNotificationsAsync(instanceId, node);
                }
                break;
        }

        if (isNodeComplete)
        {
            await MoveToNextNodeAsync(instanceId, nodeId);
        }
    }

    /// <summary>
    /// Bug 9 修复：退回到指定节点后重新触发节点处理
    /// </summary>
    public async Task<bool> ReturnToNodeAsync(string instanceId, string targetNodeId, string comment)
    {
        var userId = _tenantContext.GetCurrentUserId() ?? throw new UnauthorizedAccessException("USER_NOT_AUTHENTICATED");

        var instance = await _instanceFactory.GetByIdAsync(instanceId);
        if (instance == null || instance.Status != WorkflowStatus.Running)
        {
            throw new InvalidOperationException("流程实例不存在或已结束");
        }

        var definition = instance.WorkflowDefinitionSnapshot ?? await _definitionFactory.GetByIdAsync(instance.WorkflowDefinitionId);
        if (definition == null)
        {
            throw new InvalidOperationException("流程定义不存在");
        }

        var currentNode = definition.Graph.Nodes.FirstOrDefault(n => n.Id == instance.CurrentNodeId);
        if (currentNode == null)
        {
            throw new InvalidOperationException("当前节点不存在");
        }

        if (!await CanApproveAsync(instance, currentNode, userId))
        {
            throw new UnauthorizedAccessException("无权在当前节点执行退回操作");
        }

        var targetNode = definition.Graph.Nodes.FirstOrDefault(n => n.Id == targetNodeId);
        if (targetNode == null)
        {
            throw new InvalidOperationException("目标节点不存在");
        }

        var hasPassedTargetNode = instance.ApprovalRecords.Any(r => r.NodeId == targetNodeId);
        if (!hasPassedTargetNode && targetNode.Type != "start")
        {
            throw new InvalidOperationException("只能退回到已经经过的节点或开始节点");
        }

        var user = await _userService.GetUserByIdAsync(userId);
        var userName = user?.Username ?? userId;
        var companyId = await _tenantContext.GetCurrentCompanyIdAsync();
        var approvalRecord = new ApprovalRecord
        {
            Id = GenerateSafeId(),
            WorkflowInstanceId = instanceId,
            NodeId = instance.CurrentNodeId,
            ApproverId = userId,
            ApproverName = userName,
            Action = ApprovalAction.Return,
            Comment = comment,
            ApprovedAt = DateTime.UtcNow,
            Sequence = instance.ApprovalRecords.Count + 1,
            CompanyId = companyId ?? string.Empty
        };
        await _approvalRecordFactory.CreateAsync(approvalRecord);

        await _instanceFactory.UpdateAsync(instanceId, i =>
        {
            i.CurrentNodeId = targetNodeId;
            i.ApprovalRecords.Add(approvalRecord);
            i.ParallelBranches = new Dictionary<string, List<string>>();
            i.CurrentApproverIds = new List<string>(); // 清空审批人
            i.UpdatedAt = DateTime.UtcNow;
        });

        // 发送退回通知
        try
        {
            var document = await _documentFactory.GetByIdAsync(instance.DocumentId);
            if (document != null)
            {
                var relatedUsers = new List<string> { instance.StartedBy, userId };
                await _notificationService.CreateWorkflowNotificationAsync(
                    instanceId,
                    document.Title,
                    "workflow_returned",
                    relatedUsers,
                    comment,
                    instance.CompanyId
                );
            }
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "发送退回通知失败: InstanceId={InstanceId}", instanceId);
        }

        // Bug 9 修复：退回后重新触发目标节点处理
        await ProcessNodeAsync(instanceId, targetNodeId);

        return true;
    }
}
