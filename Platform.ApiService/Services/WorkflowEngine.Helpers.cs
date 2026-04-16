using Platform.ApiService.Models;
using Platform.ApiService.Models.Workflow;
using MongoDB.Bson;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using System;
using Microsoft.EntityFrameworkCore;

namespace Platform.ApiService.Services;

public partial class WorkflowEngine
{
    /// <summary>
    /// 从流程实例和关联公文中获取变量字典
    /// 
    /// 业务规则：
    /// 1. 首先加载流程实例中的变量
    /// 2. 然后加载关联公文的基本信息（标题、ID、发起人等）
    /// 3. 加载流程定义中所有节点绑定的表单字段定义（用于条件组件判断）
    /// 4. 最后加载公文的表单数据（实际值）
    /// 5. 表单数据优先级最高，会覆盖同名的其他变量
    /// 
    /// 关键改进：
    /// - 条件组件现在可以访问流程中涉及的所有表单字段
    /// - 支持多个节点绑定不同的表单
    /// - 自动处理 DataScopeKey 嵌套
    /// </summary>
    private async Task<Dictionary<string, object?>> GetDocumentVariablesAsync(string instanceId)
    {
        var instance = await _context.Set<WorkflowInstance>().FirstOrDefaultAsync(x => x.Id == instanceId);
        if (instance == null) return new Dictionary<string, object?>();

        var variables = instance.GetVariablesDict();

        _logger.LogDebug($"\n========== : GetDocumentVariablesAsync ==========");
        _logger.LogDebug($": 实例ID = {instanceId}");
        _logger.LogDebug($": 公文ID = {instance.DocumentId}");
        _logger.LogDebug($": 初始变量数 = {variables.Count}");

        // 第一步：加载流程定义中所有节点绑定的表单字段定义
        // 这样条件组件可以知道有哪些表单字段可用
        _logger.LogDebug($": 开始加载流程中绑定的表单定义");
        if (instance.FormDefinitionSnapshots != null && instance.FormDefinitionSnapshots.Count > 0)
        {
            _logger.LogDebug($": 发现 {instance.FormDefinitionSnapshots.Count} 个表单快照");
            foreach (var snapshot in instance.FormDefinitionSnapshots)
            {
                try
                {
                    var formDef = System.Text.Json.JsonSerializer.Deserialize<FormDefinition>(
                        snapshot.FormDefinitionJson,
                        new System.Text.Json.JsonSerializerOptions { PropertyNameCaseInsensitive = true });

                    if (formDef?.Fields != null && formDef.Fields.Count > 0)
                    {
                        _logger.LogDebug($": 节点 [{snapshot.NodeId}] 绑定表单，包含 {formDef.Fields.Count} 个字段");
                        foreach (var field in formDef.Fields)
                        {
                            // 注入表单字段定义（作为元数据，便于条件组件了解可用字段）
                            // 实际值会在后面从公文表单数据中覆盖
                            var fieldKey = field.DataKey;
                            if (!string.IsNullOrEmpty(fieldKey))
                            {
                                // 如果变量中还没有这个字段，先注入 null 作为占位符
                                if (!variables.ContainsKey(fieldKey))
                                {
                                    variables[fieldKey] = null;
                                    _logger.LogDebug($": 注入表单字段占位符 [{fieldKey}] (来自节点 {snapshot.NodeId})");
                                }
                            }
                        }
                    }
                }
                catch (Exception ex)
                {
                    _logger.LogDebug($": 解析表单快照失败 - {ex.Message}");
                    _logger.LogError(": 解析表单快照失败 - {Error}", ex.Message);
                }
            }
        }
        else
        {
            _logger.LogDebug($": 没有表单快照");
        }

        // 第二步：加载公文信息和表单数据
        if (!string.IsNullOrEmpty(instance.DocumentId))
        {
            var document = await _context.Set<Document>().FirstOrDefaultAsync(x => x.Id == instance.DocumentId);
            if (document != null)
            {
                _logger.LogDebug($": 公文已找到，标题 = {document.Title}");
                _logger.LogDebug($": 公文FormData = {(document.FormData == null ? "null" : $"Count={document.FormData.Count}")}");

                // 调试：输出 FormData 的详细信息
                if (document.FormData != null)
                {
                    _logger.LogDebug($": FormData 详细内容:");
                    foreach (var kv in document.FormData)
                    {
                        _logger.LogDebug($"  [{kv.Key}] = {(kv.Value == null ? "null" : $"{kv.Value} ({kv.Value.GetType().Name})")}");
                    }
                }

                // 注入公文基本信息
                variables["document_title"] = document.Title;
                variables["document_id"] = document.Id;
                variables["started_by"] = instance.StartedBy;
                variables["document_content"] = document.Content ?? string.Empty;
                variables["document_status"] = document.Status.ToString();
                variables["document_created_at"] = document.CreatedAt;

                // 🔧 关键修复：将公文的表单数据作为变量注入
                // 这些数据用于条件组件的业务规则判断
                if (document.FormData != null && document.FormData.Count > 0)
                {
                    _logger.LogDebug($": 注入公文表单数据到变量，共 {document.FormData.Count} 个字段");

                    foreach (var kv in document.FormData)
                    {
                        // 表单数据优先级最高，会覆盖同名的其他变量
                        // 如果值是字典（DataScopeKey 嵌套），需要展平
                        if (kv.Value is System.Collections.Generic.Dictionary<string, object> nestedDict)
                        {
                            _logger.LogDebug($": 展平嵌套表单数据 [{kv.Key}]，包含 {nestedDict.Count} 个字段");
                            foreach (var nested in nestedDict)
                            {
                                variables[nested.Key] = nested.Value;
                                _logger.LogDebug($": 表单字段 [{nested.Key}] = {(nested.Value == null ? "null" : $"{nested.Value} ({nested.Value.GetType().Name})")}");
                                _logger.LogDebug(": 表单字段 {Key} = {Value}", nested.Key, nested.Value);
                            }
                        }
                        else
                        {
                            variables[kv.Key] = kv.Value;
                            _logger.LogDebug($": 表单字段 [{kv.Key}] = {(kv.Value == null ? "null" : $"{kv.Value} ({kv.Value.GetType().Name})")}");
                            _logger.LogDebug(": 表单字段 {Key} = {Value}", kv.Key, kv.Value);
                        }
                    }
                }
                else
                {
                    _logger.LogDebug($": 公文没有表单数据或FormData为空");
                }
            }
            else
            {
                _logger.LogDebug($": 公文未找到！DocumentId = {instance.DocumentId}");
            }
        }
        else
        {
            _logger.LogDebug($": 实例没有关联公文");
        }

        _logger.LogDebug($": 最终变量数 = {variables.Count}");
        return variables;
    }

    /// <summary>
    /// 获取审批历史
    /// </summary>
    public async Task<List<ApprovalRecord>> GetApprovalHistoryAsync(string instanceId)
    {
        var history = await _context.Set<ApprovalRecord>()
            .IgnoreQueryFilters()
            .Where(r => r.WorkflowInstanceId == instanceId)
            .OrderBy(r => r.Sequence)
            .ToListAsync();
        return history;
    }

    /// <summary>
    /// 获取流程实例
    /// </summary>
    public async Task<WorkflowInstance?> GetInstanceAsync(string instanceId)
    {
        return await _context.Set<WorkflowInstance>().IgnoreQueryFilters().FirstOrDefaultAsync(x => x.Id == instanceId);
    }

    /// <summary>
    /// 取消流程（撤回）
    /// </summary>
    public async Task<bool> CancelWorkflowAsync(string instanceId, string reason)
    {
        var instance = await _context.Set<WorkflowInstance>().FirstOrDefaultAsync(x => x.Id == instanceId);
        if (instance == null) return false;

        instance.Status = WorkflowStatus.Cancelled;
        instance.CompletedAt = DateTime.UtcNow;
        instance.CurrentApproverIds.Clear();
        instance.ActiveApprovals.Clear();
        await _context.SaveChangesAsync();

        if (!string.IsNullOrEmpty(instance.DocumentId))
        {
            var document = await _context.Set<Document>().FirstOrDefaultAsync(x => x.Id == instance.DocumentId!);
            if (document != null)
            {
                document.Status = Models.Workflow.DocumentStatus.Draft;
                await _context.SaveChangesAsync();
            }
        }

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
        var instance = await _context.Set<WorkflowInstance>().FirstOrDefaultAsync(x => x.Id == instanceId);
        if (instance == null || instance.Status != WorkflowStatus.Running) return new List<WorkflowNode>();

        var definition = instance.WorkflowDefinitionSnapshot ?? await _context.Set<WorkflowDefinition>().FirstOrDefaultAsync(x => x.Id == instance.WorkflowDefinitionId);
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
        var instance = await _context.Set<WorkflowInstance>().FirstOrDefaultAsync(x => x.Id == instanceId);
        if (instance != null)
        {
            instance.CurrentNodeId = nodeId;
            instance.CurrentApproverIds.Clear();
            await _context.SaveChangesAsync();
        }
    }

    /// <summary>
    /// 完成流程（通过或拒绝）
    /// </summary>
    private async Task CompleteWorkflowAsync(string instanceId, WorkflowStatus status)
    {
        var instance = await _context.Set<WorkflowInstance>().FirstOrDefaultAsync(x => x.Id == instanceId);
        if (instance == null) return;


        var workflowInstance = await _context.Set<WorkflowInstance>().FirstOrDefaultAsync(x => x.Id == instanceId);
        if (workflowInstance != null)
        {
            workflowInstance.Status = status;
            workflowInstance.CompletedAt = DateTime.UtcNow;
            workflowInstance.CurrentApproverIds.Clear(); // Bug 6: 流程结束清空审批人
            workflowInstance.ActiveApprovals.Clear(); // 清除任务映射
            await _context.SaveChangesAsync();
        }

        // Bug 2/8 修复：使用完全限定名，区分 Completed/Rejected
        var documentStatus = status == WorkflowStatus.Completed
            ? Models.Workflow.DocumentStatus.Approved
            : Models.Workflow.DocumentStatus.Rejected;

        if (!string.IsNullOrEmpty(instance.DocumentId))
        {
            var document = await _context.Set<Document>().FirstOrDefaultAsync(x => x.Id == instance.DocumentId);
            if (document != null)
            {
                document.Status = documentStatus;
                await _context.SaveChangesAsync();
            }
        }
    }

    /// <summary>
    /// 获取节点审批人列表
    /// </summary>
    public async Task<List<string>> GetNodeApproversAsync(string instanceId, string nodeId)
    {
        var instance = await _context.Set<WorkflowInstance>().FirstOrDefaultAsync(x => x.Id == instanceId);
        if (instance == null) return new List<string>();

        var definition = instance.WorkflowDefinitionSnapshot ?? await _context.Set<WorkflowDefinition>().FirstOrDefaultAsync(x => x.Id == instance.WorkflowDefinitionId);
        if (definition == null) return new List<string>();

        var node = definition.Graph.Nodes.FirstOrDefault(n => n.Id == nodeId);
        if (node == null) return new List<string>();

        if (node.Data.Config?.Approval == null) return new List<string>();

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
        var instance = await _context.Set<WorkflowInstance>().FirstOrDefaultAsync(x => x.Id == instanceId);
        if (instance != null)
        {
            if (approverIds == null || approverIds.Count == 0)
            {
                instance.RemoveActiveApprovers(nodeId);
            }
            else
            {
                instance.SetActiveApprovers(nodeId, approverIds.Distinct().ToList());
            }

            instance.CurrentApproverIds = instance.ActiveApprovals.SelectMany(x => x.ApproverIds).Distinct().ToList();
            await _context.SaveChangesAsync();
        }
    }

    /// <summary>
    /// 清除节点的待审批人（当节点退出时）
    /// </summary>
    private async Task ClearNodeApproversAsync(string instanceId, string nodeId)
    {
        var instance = await _context.Set<WorkflowInstance>().FirstOrDefaultAsync(x => x.Id == instanceId);
        if (instance != null)
        {
            if (instance.ActiveApprovals.Any(a => a.NodeId == nodeId))
            {
                instance.RemoveActiveApprovers(nodeId);
                instance.CurrentApproverIds = instance.ActiveApprovals.SelectMany(x => x.ApproverIds).Distinct().ToList();
                await _context.SaveChangesAsync();
            }
        }
    }
}