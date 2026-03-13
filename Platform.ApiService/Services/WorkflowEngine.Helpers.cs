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
        var instance = await _instanceFactory.GetByIdAsync(instanceId);
        if (instance == null) return new Dictionary<string, object?>();

        var variables = instance.GetVariablesDict();

        System.Console.WriteLine($"\n========== DEBUG_WORKFLOW: GetDocumentVariablesAsync ==========");
        System.Console.WriteLine($"DEBUG_WORKFLOW: 实例ID = {instanceId}");
        System.Console.WriteLine($"DEBUG_WORKFLOW: 公文ID = {instance.DocumentId}");
        System.Console.WriteLine($"DEBUG_WORKFLOW: 初始变量数 = {variables.Count}");

        // 第一步：加载流程定义中所有节点绑定的表单字段定义
        // 这样条件组件可以知道有哪些表单字段可用
        System.Console.WriteLine($"DEBUG_WORKFLOW: 开始加载流程中绑定的表单定义");
        if (instance.FormDefinitionSnapshots != null && instance.FormDefinitionSnapshots.Count > 0)
        {
            System.Console.WriteLine($"DEBUG_WORKFLOW: 发现 {instance.FormDefinitionSnapshots.Count} 个表单快照");
            foreach (var snapshot in instance.FormDefinitionSnapshots)
            {
                try
                {
                    var formDef = System.Text.Json.JsonSerializer.Deserialize<FormDefinition>(
                        snapshot.FormDefinitionJson,
                        new System.Text.Json.JsonSerializerOptions { PropertyNameCaseInsensitive = true });

                    if (formDef?.Fields != null && formDef.Fields.Count > 0)
                    {
                        System.Console.WriteLine($"DEBUG_WORKFLOW: 节点 [{snapshot.NodeId}] 绑定表单，包含 {formDef.Fields.Count} 个字段");
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
                                    System.Console.WriteLine($"DEBUG_WORKFLOW: 注入表单字段占位符 [{fieldKey}] (来自节点 {snapshot.NodeId})");
                                }
                            }
                        }
                    }
                }
                catch (Exception ex)
                {
                    System.Console.WriteLine($"DEBUG_WORKFLOW: 解析表单快照失败 - {ex.Message}");
                    _logger.LogError("DEBUG_WORKFLOW: 解析表单快照失败 - {Error}", ex.Message);
                }
            }
        }
        else
        {
            System.Console.WriteLine($"DEBUG_WORKFLOW: 没有表单快照");
        }

        // 第二步：加载公文信息和表单数据
        if (!string.IsNullOrEmpty(instance.DocumentId))
        {
            var document = await _documentFactory.GetByIdAsync(instance.DocumentId);
            if (document != null)
            {
                System.Console.WriteLine($"DEBUG_WORKFLOW: 公文已找到，标题 = {document.Title}");
                System.Console.WriteLine($"DEBUG_WORKFLOW: 公文FormData = {(document.FormData == null ? "null" : $"Count={document.FormData.Count}")}");

                // 调试：输出 FormData 的详细信息
                if (document.FormData != null)
                {
                    System.Console.WriteLine($"DEBUG_WORKFLOW: FormData 详细内容:");
                    foreach (var kv in document.FormData)
                    {
                        System.Console.WriteLine($"  [{kv.Key}] = {(kv.Value == null ? "null" : $"{kv.Value} ({kv.Value.GetType().Name})")}");
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
                    System.Console.WriteLine($"DEBUG_WORKFLOW: 注入公文表单数据到变量，共 {document.FormData.Count} 个字段");
                    _logger.LogInformation("DEBUG_WORKFLOW: 注入公文表单数据到变量，共 {Count} 个字段", document.FormData.Count);

                    foreach (var kv in document.FormData)
                    {
                        // 表单数据优先级最高，会覆盖同名的其他变量
                        // 如果值是字典（DataScopeKey 嵌套），需要展平
                        if (kv.Value is System.Collections.Generic.Dictionary<string, object> nestedDict)
                        {
                            System.Console.WriteLine($"DEBUG_WORKFLOW: 展平嵌套表单数据 [{kv.Key}]，包含 {nestedDict.Count} 个字段");
                            foreach (var nested in nestedDict)
                            {
                                variables[nested.Key] = nested.Value;
                                System.Console.WriteLine($"DEBUG_WORKFLOW: 表单字段 [{nested.Key}] = {(nested.Value == null ? "null" : $"{nested.Value} ({nested.Value.GetType().Name})")}");
                                _logger.LogDebug("DEBUG_WORKFLOW: 表单字段 {Key} = {Value}", nested.Key, nested.Value);
                            }
                        }
                        else
                        {
                            variables[kv.Key] = kv.Value;
                            System.Console.WriteLine($"DEBUG_WORKFLOW: 表单字段 [{kv.Key}] = {(kv.Value == null ? "null" : $"{kv.Value} ({kv.Value.GetType().Name})")}");
                            _logger.LogDebug("DEBUG_WORKFLOW: 表单字段 {Key} = {Value}", kv.Key, kv.Value);
                        }
                    }
                }
                else
                {
                    System.Console.WriteLine($"DEBUG_WORKFLOW: 公文没有表单数据或FormData为空");
                }
            }
            else
            {
                System.Console.WriteLine($"DEBUG_WORKFLOW: 公文未找到！DocumentId = {instance.DocumentId}");
            }
        }
        else
        {
            System.Console.WriteLine($"DEBUG_WORKFLOW: 实例没有关联公文");
        }

        System.Console.WriteLine($"DEBUG_WORKFLOW: 最终变量数 = {variables.Count}");
        System.Console.Out.Flush();
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

        if (!string.IsNullOrEmpty(instance.DocumentId))
        {
            await _documentFactory.UpdateAsync(instance.DocumentId, d =>
            {
                d.Status = Models.Workflow.DocumentStatus.Draft; // 撤回 → 回到草稿
                d.UpdatedAt = DateTime.UtcNow;
            });
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

        if (!string.IsNullOrEmpty(instance.DocumentId))
        {
            await _documentFactory.UpdateAsync(instance.DocumentId, d =>
            {
                d.Status = documentStatus;
                d.UpdatedAt = DateTime.UtcNow;
            });
        }
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
