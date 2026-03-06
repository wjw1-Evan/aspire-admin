using Platform.ApiService.Models;
using Platform.ApiService.Models.Workflow;
using MongoDB.Bson;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using System;

namespace Platform.ApiService.Services;

public partial class WorkflowEngine
{
    /// <summary>
    /// 从流程实例和关联公文中获取变量字典
    /// </summary>
    private async Task<Dictionary<string, object?>> GetDocumentVariablesAsync(string instanceId)
    {
        var instance = await _instanceFactory.GetByIdAsync(instanceId);
        if (instance == null) return new Dictionary<string, object?>();

        var variables = instance.GetVariablesDict();

        var document = await _documentFactory.GetByIdAsync(instance.DocumentId);
        if (document != null)
        {
            variables["document_title"] = document.Title;
            variables["document_id"] = document.Id;
            variables["started_by"] = instance.StartedBy;
            variables["document_content"] = document.Content ?? string.Empty;
        }

        return variables;
    }

    /// <summary>
    /// 获取审批历史
    /// </summary>
    public async Task<List<ApprovalRecord>> GetApprovalHistoryAsync(string instanceId)
    {
        var history = await _approvalRecordFactory.FindWithoutTenantFilterAsync(
            r => r.WorkflowInstanceId == instanceId,
            query => query.OrderBy(r => r.Sequence));
        _logger.LogInformation("获取实例 {InstanceId} 的审批历史, 发现 {Count} 条记录 (忽略租户过滤器)", instanceId, history.Count);
        return history;
    }

    /// <summary>
    /// 获取流程实例
    /// </summary>
    public async Task<WorkflowInstance?> GetInstanceAsync(string instanceId)
    {
        return await _instanceFactory.GetByIdWithoutTenantFilterAsync(instanceId);
    }

    /// <summary>
    /// 取消流程（撤回）
    /// </summary>
    public async Task<bool> CancelWorkflowAsync(string instanceId, string reason)
    {
        var instance = await _instanceFactory.GetByIdAsync(instanceId);
        if (instance == null) return false;

        // Bug 8 修复：撤回时状态设为 Cancelled，公文回到草稿
        await _instanceFactory.UpdateAsync(instanceId, i =>
        {
            i.Status = WorkflowStatus.Cancelled;
            i.CompletedAt = DateTime.UtcNow;
            i.CurrentApproverIds.Clear(); // 清空待审批人
            i.ActiveApprovals.Clear(); // 清除所有活跃审批节点
        });

        await _documentFactory.UpdateAsync(instance.DocumentId, d =>
        {
            d.Status = Models.Workflow.DocumentStatus.Draft; // 撤回 → 回到草稿
            d.UpdatedAt = DateTime.UtcNow;
        });

        return true;
    }

    /// <summary>
    /// Bug 12 修复：生成合法的 MongoDB ObjectId
    /// </summary>
    private string GenerateSafeId()
    {
        return ObjectId.GenerateNewId().ToString();
    }

    /// <summary>
    /// 获取下一个等待节点
    /// </summary>
    public async Task<List<WorkflowNode>> GetNextWaitNodesAsync(string instanceId)
    {
        var instance = await _instanceFactory.GetByIdAsync(instanceId);
        if (instance == null || instance.Status != WorkflowStatus.Running) return new List<WorkflowNode>();

        var definition = instance.WorkflowDefinitionSnapshot ?? await _definitionFactory.GetByIdAsync(instance.WorkflowDefinitionId);
        if (definition == null) return new List<WorkflowNode>();

        var currentNode = definition.Graph.Nodes.FirstOrDefault(n => n.Id == instance.CurrentNodeId);
        if (currentNode == null) return new List<WorkflowNode>();

        if (currentNode.Type == "approval") return new List<WorkflowNode> { currentNode };

        var edges = definition.Graph.Edges.Where(e => e.Source == instance.CurrentNodeId).ToList();
        var nodes = new List<WorkflowNode>();
        foreach (var edge in edges)
        {
            var node = definition.Graph.Nodes.FirstOrDefault(n => n.Id == edge.Target);
            if (node != null) nodes.Add(node);
        }

        return nodes;
    }

    /// <summary>
    /// 设置当前节点并清空待审批人
    /// </summary>
    private async Task SetCurrentNodeAsync(string instanceId, string nodeId)
    {
        await _instanceFactory.UpdateAsync(instanceId, i =>
        {
            i.CurrentNodeId = nodeId;
            i.CurrentApproverIds.Clear(); // Bug 6: 切换节点时清空审批人
            i.UpdatedAt = DateTime.UtcNow;
        });
    }

    /// <summary>
    /// 完成流程（通过或拒绝）
    /// </summary>
    private async Task CompleteWorkflowAsync(string instanceId, WorkflowStatus status)
    {
        var instance = await _instanceFactory.GetByIdAsync(instanceId);
        if (instance == null) return;

        _logger.LogInformation("DEBUG_WORKFLOW: Completing Workflow {InstanceId} with Status {Status}", instanceId, status);

        await _instanceFactory.UpdateAsync(instanceId, i =>
        {
            i.Status = status;
            i.CompletedAt = DateTime.UtcNow;
            i.CurrentApproverIds.Clear(); // Bug 6: 流程结束清空审批人
            i.ActiveApprovals.Clear(); // 清除任务映射
        });

        // Bug 2/8 修复：使用完全限定名，区分 Completed/Rejected
        var documentStatus = status == WorkflowStatus.Completed
            ? Models.Workflow.DocumentStatus.Approved
            : Models.Workflow.DocumentStatus.Rejected;

        await _documentFactory.UpdateAsync(instance.DocumentId, d =>
        {
            d.Status = documentStatus;
            d.UpdatedAt = DateTime.UtcNow;
        });
    }

    /// <summary>
    /// 获取节点审批人列表
    /// </summary>
    public async Task<List<string>> GetNodeApproversAsync(string instanceId, string nodeId)
    {
        var instance = await _instanceFactory.GetByIdAsync(instanceId);
        if (instance == null) return new List<string>();

        var definition = instance.WorkflowDefinitionSnapshot ?? await _definitionFactory.GetByIdAsync(instance.WorkflowDefinitionId);
        if (definition == null) return new List<string>();

        var node = definition.Graph.Nodes.FirstOrDefault(n => n.Id == nodeId);
        if (node == null || node.Data.Config.Approval == null) return new List<string>();

        var approvers = new List<string>();
        foreach (var rule in node.Data.Config.Approval.Approvers)
        {
            var resolvedApprovers = await ResolveApproverAsync(instance, rule);
            approvers.AddRange(resolvedApprovers);
        }

        return approvers.Distinct().ToList();
    }

    /// <summary>
    /// 解析审批人规则
    /// </summary>
    private async Task<List<string>> ResolveApproverAsync(WorkflowInstance instance, ApproverRule rule)
    {
        return await _approverResolverFactory.ResolveAsync(rule, instance.CompanyId, instance);
    }

    /// <summary>
    /// Bug 6: 更新流程实例的待审批人列表
    /// </summary>
    private async Task UpdateCurrentApproverIdsAsync(string instanceId, string nodeId, List<string> approverIds)
    {
        await _instanceFactory.UpdateAsync(instanceId, i =>
        {
            if (approverIds == null || approverIds.Count == 0)
            {
                i.RemoveActiveApprovers(nodeId);
            }
            else
            {
                i.SetActiveApprovers(nodeId, approverIds.Distinct().ToList());
            }

            i.CurrentApproverIds = i.ActiveApprovals.SelectMany(x => x.ApproverIds).Distinct().ToList();
            i.UpdatedAt = DateTime.UtcNow;
        });
    }

    /// <summary>
    /// 清除节点的待审批人（当节点退出时）
    /// </summary>
    private async Task ClearNodeApproversAsync(string instanceId, string nodeId)
    {
        await _instanceFactory.UpdateAsync(instanceId, i =>
        {
            if (i.ActiveApprovals.Any(a => a.NodeId == nodeId))
            {
                i.RemoveActiveApprovers(nodeId);
                i.CurrentApproverIds = i.ActiveApprovals.SelectMany(x => x.ApproverIds).Distinct().ToList();
                i.UpdatedAt = DateTime.UtcNow;
            }
        });
    }
}
