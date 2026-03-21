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
    /// <param name="instanceId">工作流实例ID</param>
    /// <param name="nodeId">节点ID</param>
    /// <param name="action">审批动作</param>
    /// <param name="currentUserId">当前操作人用户ID</param>
    /// <param name="comment">审批意见</param>
    /// <param name="delegateToUserId">转办目标用户ID</param>
    public async Task<bool> ProcessApprovalAsync(string instanceId, string nodeId, ApprovalAction action, string currentUserId, string? comment = null, string? delegateToUserId = null)
    {
        var instance = await _instanceFactory.GetByIdAsync(instanceId);
        // 审批节点挂起时状态为 Waiting，需同时接受 Running 和 Waiting
        if (instance == null || (instance.Status != WorkflowStatus.Running && instance.Status != WorkflowStatus.Waiting))
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

        if (!await CanApproveAsync(instance, currentNode, currentUserId))
        {
            throw new UnauthorizedAccessException("无权执行此审批操作");
        }

        var user = await _userService.GetUserByIdAsync(currentUserId);
        var userName = user?.Username ?? currentUserId;

        // 检查操作权限标志
        var approvalConfig = currentNode.Data.Config?.Approval;
        if (approvalConfig != null)
        {
            switch (action)
            {
                case ApprovalAction.Delegate:
                    if (!approvalConfig.AllowDelegate)
                    {
                        throw new InvalidOperationException("该节点不允许转办操作");
                    }
                    if (string.IsNullOrEmpty(delegateToUserId))
                    {
                        throw new ArgumentException("转办必须指定目标用户");
                    }
                    break;
                case ApprovalAction.Reject:
                    if (!approvalConfig.AllowReject)
                    {
                        throw new InvalidOperationException("该节点不允许拒绝操作");
                    }
                    break;
                case ApprovalAction.Return:
                    if (!approvalConfig.AllowReturn)
                    {
                        throw new InvalidOperationException("该节点不允许退回操作");
                    }
                    break;
            }
        }

        var history = await GetApprovalHistoryAsync(instanceId);

        var record = new ApprovalRecord
        {
            Id = GenerateSafeId(),
            WorkflowInstanceId = instanceId,
            NodeId = nodeId,
            ApproverId = currentUserId,
            ApproverName = userName,
            Action = action,
            Comment = comment,
            DelegateToUserId = delegateToUserId,
            ApprovedAt = DateTime.UtcNow,
            Sequence = history.Count + 1,
            CompanyId = instance.CompanyId
        };

        // 注意：Return 操作由 ReturnToNodeAsync 方法处理，此处不创建记录
        if (action != ApprovalAction.Return)
        {
            await _approvalRecordFactory.CreateAsync(record);

            await _instanceFactory.UpdateAsync(instanceId, i =>
            {
                i.ApprovalRecords.Add(record);
                i.UpdatedAt = DateTime.UtcNow;
            });
        }

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
                await HandleDelegateAsync(instanceId, nodeId, delegateToUserId!, instance, currentUserId);
                break;
            case ApprovalAction.Return:
                // Bug 20 修复：退回操作不在此处处理（已在 ReturnToNodeAsync 中完成）
                // 此处仅记录了审批记录，实际退回由 ReturnToNodeAsync 方法处理
                break;
        }

        return true;
    }

    /// <summary>
    /// 处理人工输入提交 - 验证用户后继续流程
    /// </summary>
    public async Task<bool> ProcessHumanInputSubmitAsync(string instanceId, string nodeId, string currentUserId)
    {
        var instance = await _instanceFactory.GetByIdAsync(instanceId);
        if (instance == null)
        {
            throw new InvalidOperationException("流程实例不存在");
        }

        if (instance.Status != WorkflowStatus.Running && instance.Status != WorkflowStatus.Waiting)
        {
            throw new InvalidOperationException("流程已结束");
        }

        var definition = instance.WorkflowDefinitionSnapshot ?? await _definitionFactory.GetByIdAsync(instance.WorkflowDefinitionId);
        if (definition == null)
        {
            throw new InvalidOperationException("流程定义不存在");
        }

        var node = definition.Graph.Nodes.FirstOrDefault(n => n.Id == nodeId);
        if (node == null || node.Type != "humanInput")
        {
            throw new InvalidOperationException("节点类型无效或非人工输入节点");
        }

        var approvers = await GetNodeApproversAsync(instanceId, nodeId);
        if (!approvers.Contains(currentUserId))
        {
            throw new UnauthorizedAccessException("无权提交此人工输入");
        }

        await _instanceFactory.UpdateAsync(instanceId, i => i.Status = WorkflowStatus.Running);
        await MoveToNextNodeAsync(instanceId, nodeId);
        return true;
    }

    /// <summary>
    /// Bug 5 修复：处理转办逻辑
    /// </summary>
    private async Task HandleDelegateAsync(string instanceId, string nodeId, string delegateToUserId, WorkflowInstance instance, string currentUserId)
    {
        // 更新待审批人：移除原审批人，添加被转办人
        var currentApprovers = instance.GetActiveApprovers(nodeId);

        currentApprovers.Remove(currentUserId);
        if (!currentApprovers.Contains(delegateToUserId))
        {
            currentApprovers.Add(delegateToUserId);
        }
        await UpdateCurrentApproverIdsAsync(instanceId, nodeId, currentApprovers);

        // 发送通知给被转办人
        try
        {
            if (!string.IsNullOrEmpty(instance.DocumentId))
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

        if (node.Data.Config?.Approval == null) return false;

        // Bug 3 修复：所有审批类型都阻止重复审批
        var history = await GetApprovalHistoryAsync(instance.Id);

        _logger.LogInformation("CanApproveAsync: 用户 {UserId}, 历史记录数: {Count}",
            userId, history.Count);

        var hasApproved = history.Any(r =>
            r.NodeId.Trim().Equals(node.Id.Trim(), StringComparison.OrdinalIgnoreCase) &&
            r.ApproverId.Trim().Equals(userId.Trim(), StringComparison.OrdinalIgnoreCase) &&
            r.Action == ApprovalAction.Approve);

        if (hasApproved)
        {
            _logger.LogWarning("用户 {UserId} 已审批过节点 {NodeId}", userId, node.Id);
            return false;
        }

        var approvers = await GetNodeApproversAsync(instance.Id, node.Id);
        _logger.LogInformation("节点 {NodeId} 候选审批人: {Approvers}, 当前用户: {UserId}",
            node.Id, string.Join(",", approvers), userId);

        // Bug 4：Sequential 模式下，只有轮到的人才能审批
        if (node.Data.Config.Approval.Type == ApprovalType.Sequential)
        {
            var nextApprover = await GetNextSequentialApproverAsync(instance, node, approvers);
            return nextApprover == userId;
        }

        return approvers.Contains(userId);
    }

    /// <summary>
    /// Bug 4：获取顺序审批中下一个应审批的人
    /// </summary>
    private async Task<string?> GetNextSequentialApproverAsync(WorkflowInstance instance, WorkflowNode node, List<string> allApprovers)
    {
        var history = await GetApprovalHistoryAsync(instance.Id);
        var completedApprovers = history
            .Where(r => r.NodeId == node.Id && r.Action == ApprovalAction.Approve)
            .Select(r => r.ApproverId)
            .ToList();

        _logger.LogInformation("节点 {NodeId} 已完成审批的人: {Completed}", node.Id, string.Join(",", completedApprovers));

        // 按原始顺序找到第一个还没审批的人
        var next = allApprovers.FirstOrDefault(a => !completedApprovers.Contains(a));
        _logger.LogInformation("节点 {NodeId} 下一个应审批的人: {Next}", node.Id, next ?? "None");
        return next;
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
        if (node == null || node.Data.Config?.Approval == null)
        {
            await MoveToNextNodeAsync(instanceId, nodeId);
            return;
        }

        var config = node.Data.Config.Approval;
        var allApprovers = await GetNodeApproversAsync(instanceId, nodeId);

        var history = await GetApprovalHistoryAsync(instanceId);
        var completedApprovals = history
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
                // 注意：record 刚刚被添加，还没有被持久化到数据库，所以需要将当前记录加入已完成列表
                var completedWithCurrent = new List<string>(completedApprovals) { record.ApproverId };
                var nextApprover = allApprovers.FirstOrDefault(a => !completedWithCurrent.Contains(a));
                
                if (nextApprover == null)
                {
                    // 所有人都审批完成
                    isNodeComplete = true;
                }
                else
                {
                    // 还有下一人，更新 CurrentApproverIds 为下一个审批人
                    await UpdateCurrentApproverIdsAsync(instanceId, nodeId, new List<string> { nextApprover });

                    // 发送通知给下一个审批人
                    await SendApprovalNotificationsAsync(instanceId, node);
                }
                break;
        }

        if (isNodeComplete)
        {
            // Bug 6 修复：审批节点完成时通知发起人
            try
            {
                var instanceForNotify = await _instanceFactory.GetByIdAsync(instanceId);
                if (instanceForNotify != null && !string.IsNullOrEmpty(instanceForNotify.DocumentId))
                {
                    var document = await _documentFactory.GetByIdAsync(instanceForNotify.DocumentId);
                    if (document != null)
                    {
                        var approverNames = string.Join(", ", completedApprovals);
                        await _notificationService.CreateWorkflowNotificationAsync(
                            instanceId,
                            document.Title,
                            "workflow_approval_completed",
                            new List<string> { instanceForNotify.StartedBy },
                            $"审批节点 [{node.Data.Label ?? node.Id}] 已完成，审批人: {approverNames}",
                            instanceForNotify.CompanyId
                        );
                    }
                }
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "发送审批完成通知失败: InstanceId={InstanceId}", instanceId);
            }

            await MoveToNextNodeAsync(instanceId, nodeId);
        }
    }

    /// <summary>
    /// Bug 9 修复：退回到指定节点后重新触发节点处理
    /// </summary>
    /// <param name="instanceId">工作流实例ID</param>
    /// <param name="targetNodeId">目标节点ID</param>
    /// <param name="comment">退回意见</param>
    /// <param name="currentUserId">当前操作人用户ID</param>
    public async Task<bool> ReturnToNodeAsync(string instanceId, string targetNodeId, string comment, string currentUserId)
    {
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

        if (!await CanApproveAsync(instance, currentNode, currentUserId))
        {
            throw new UnauthorizedAccessException("无权在当前节点执行退回操作");
        }

        var targetNode = definition.Graph.Nodes.FirstOrDefault(n => n.Id == targetNodeId);
        if (targetNode == null)
        {
            throw new InvalidOperationException("目标节点不存在");
        }

        var history = await GetApprovalHistoryAsync(instanceId);
        var hasPassedTargetNode = history.Any(r => r.NodeId == targetNodeId);
        if (!hasPassedTargetNode && targetNode.Type != "start")
        {
            throw new InvalidOperationException("只能退回到已经经过的节点或开始节点");
        }

        var user = await _userService.GetUserByIdAsync(currentUserId);
        var userName = user?.Username ?? currentUserId;
        var approvalRecord = new ApprovalRecord
        {
            Id = GenerateSafeId(),
            WorkflowInstanceId = instanceId,
            NodeId = instance.CurrentNodeId,
            ApproverId = currentUserId,
            ApproverName = userName,
            Action = ApprovalAction.Return,
            Comment = comment,
            ApprovedAt = DateTime.UtcNow,
            Sequence = history.Count + 1,
            CompanyId = instance.CompanyId
        };
        await _approvalRecordFactory.CreateAsync(approvalRecord);

        await _instanceFactory.UpdateAsync(instanceId, i =>
        {
            i.CurrentNodeId = targetNodeId;
            i.ApprovalRecords.Add(approvalRecord);
            i.ActiveApprovals.Clear();
            i.CurrentApproverIds.Clear(); // 清空审批人
            i.UpdatedAt = DateTime.UtcNow;
        });

        // 发送退回通知
        try
        {
            if (!string.IsNullOrEmpty(instance.DocumentId))
            {
                var document = await _documentFactory.GetByIdAsync(instance.DocumentId);
                if (document != null)
                {
                    var relatedUsers = new List<string> { instance.StartedBy, currentUserId };
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
