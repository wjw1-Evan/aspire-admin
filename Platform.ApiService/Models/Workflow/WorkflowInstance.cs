using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;
using Platform.ServiceDefaults.Attributes;
using Platform.ServiceDefaults.Models;
using System.ComponentModel.DataAnnotations.Schema;
using System.Text.Json;

namespace Platform.ApiService.Models.Workflow;

/// <summary>
/// 工作流实例实体
/// </summary>
[BsonIgnoreExtraElements]
[BsonCollectionName("workflow_instances")]
public class WorkflowInstance : MultiTenantEntity
{
    // 门面属性和辅助方法（不持久化，用于代码适配）
    /// <summary>
    /// 设置流程变量
    /// </summary>
    public void SetVariable(string key, object? value)
    {
        var entry = Variables.FirstOrDefault(v => v.Key == key);
        if (entry == null)
        {
            entry = new WorkflowVariableEntry { Key = key };
            Variables.Add(entry);
        }
        entry.ValueJson = value == null ? null : JsonSerializer.Serialize(value);
    }

    /// <summary>
    /// 获取指定的流程变量
    /// </summary>
    public T? GetVariable<T>(string key)
    {
        var entry = Variables.FirstOrDefault(v => v.Key == key);
        if (entry == null || entry.ValueJson == null) return default;
        return JsonSerializer.Deserialize<T>(entry.ValueJson);
    }

    /// <summary>
    /// 获取所有变量的字典副本
    /// </summary>
    public Dictionary<string, object> GetVariablesDict()
    {
        var dict = new Dictionary<string, object>();
        foreach (var entry in Variables)
        {
            if (entry.ValueJson != null)
            {
                // 注意：这里由于 object 类型，JsonSerializer 会将其反序列化为 JsonElement
                // 在后续表达式求值中需要处理
                dict[entry.Key] = JsonSerializer.Deserialize<object>(entry.ValueJson)!;
            }
        }
        return dict;
    }

    /// <summary>
    /// 获取指定节点的活跃审批人列表
    /// </summary>
    public List<string> GetActiveApprovers(string nodeId)
    {
        return ActiveApprovals.FirstOrDefault(a => a.NodeId == nodeId)?.ApproverIds ?? new List<string>();
    }

    /// <summary>
    /// 设置指定节点的活跃审批人列表
    /// </summary>
    public void SetActiveApprovers(string nodeId, List<string> approverIds)
    {
        var entry = ActiveApprovals.FirstOrDefault(a => a.NodeId == nodeId);
        if (entry == null)
        {
            entry = new NodeApprovalEntry { NodeId = nodeId };
            ActiveApprovals.Add(entry);
        }
        entry.ApproverIds = approverIds;
    }

    /// <summary>
    /// 移除指定节点的活跃审批人 (改为清空列表而不是移除对象，防止 EF Core / MongoDB 追踪错误)
    /// </summary>
    public void RemoveActiveApprovers(string nodeId)
    {
        var entry = ActiveApprovals.FirstOrDefault(a => a.NodeId == nodeId);
        if (entry != null)
        {
            entry.ApproverIds.Clear();
        }
    }

    /// <summary>
    /// 获取指定节点的并行分支完成状态
    /// </summary>
    public List<string> GetParallelBranches(string nodeId)
    {
        return ParallelBranches.FirstOrDefault(b => b.NodeId == nodeId)?.BranchIds ?? new List<string>();
    }

    /// <summary>
    /// 为指定节点添加已完成的并行分支
    /// </summary>
    public void AddParallelBranch(string nodeId, string branchId)
    {
        var entry = ParallelBranches.FirstOrDefault(b => b.NodeId == nodeId);
        if (entry == null)
        {
            entry = new ParallelBranchEntry { NodeId = nodeId };
            ParallelBranches.Add(entry);
        }
        if (!entry.BranchIds.Contains(branchId)) entry.BranchIds.Add(branchId);
    }

    /// <summary>
    /// 重置所有变量
    /// </summary>
    public void ResetVariables(Dictionary<string, object> dictionary)
    {
        Variables.Clear();
        foreach (var kv in dictionary)
        {
            SetVariable(kv.Key, kv.Value);
        }
    }
    /// <summary>
    /// 关联流程定义ID
    /// </summary>
    [BsonElement("workflowDefinitionId")]
    [BsonRepresentation(BsonType.ObjectId)]
    public string WorkflowDefinitionId { get; set; } = string.Empty;

    /// <summary>
    /// 关联公文ID
    /// </summary>
    [BsonElement("documentId")]
    [BsonRepresentation(BsonType.ObjectId)]
    public string DocumentId { get; set; } = string.Empty;

    /// <summary>
    /// 流程状态
    /// </summary>
    [BsonElement("status")]
    [BsonRepresentation(BsonType.String)]
    public WorkflowStatus Status { get; set; } = WorkflowStatus.Running;

    /// <summary>
    /// 当前审批任务的审批人 ID 列表（用于优化待办列表查询）
    /// </summary>
    [BsonElement("currentApproverIds")]
    public List<string> CurrentApproverIds { get; set; } = new();

    /// <summary>
    /// 活跃的审批任务列表 (NodeId -> 审批人ID列表) ，用于支持并行分支
    /// </summary>
    [BsonElement("activeApprovals")]
    public List<NodeApprovalEntry> ActiveApprovals { get; set; } = new();

    /// <summary>
    /// 流程实例在当前节点的预计超时时间
    /// </summary>
    [BsonElement("timeoutAt")]
    public DateTime? TimeoutAt { get; set; }

    /// <summary>
    /// 当前节点ID
    /// </summary>
    [BsonElement("currentNodeId")]
    public string CurrentNodeId { get; set; } = string.Empty;

    /// <summary>
    /// 流程变量列表
    /// </summary>
    [BsonElement("variables")]
    public List<WorkflowVariableEntry> Variables { get; set; } = new();

    /// <summary>
    /// 审批记录列表
    /// </summary>
    [BsonElement("approvalRecords")]
    public List<ApprovalRecord> ApprovalRecords { get; set; } = new();

    /// <summary>
    /// 发起人ID
    /// </summary>
    [BsonElement("startedBy")]
    public string StartedBy { get; set; } = string.Empty;

    /// <summary>
    /// 启动时间
    /// </summary>
    [BsonElement("startedAt")]
    public DateTime? StartedAt { get; set; }

    /// <summary>
    /// 完成时间
    /// </summary>
    [BsonElement("completedAt")]
    public DateTime? CompletedAt { get; set; }

    /// <summary>
    /// 并行网关状态跟踪列表（nodeId -> completed branchIds）
    /// </summary>
    [BsonElement("parallelBranches")]
    public List<ParallelBranchEntry> ParallelBranches { get; set; } = new();

    /// <summary>
    /// 流程定义快照（创建实例时保存，确保已创建的流程不受后续定义变更影响）
    /// </summary>
    [BsonElement("workflowDefinitionSnapshot")]
    public WorkflowDefinition? WorkflowDefinitionSnapshot { get; set; }

    /// <summary>
    /// 表单定义快照列表（节点ID -> 表单定义，创建实例时保存）
    /// </summary>
    [BsonElement("formDefinitionSnapshots")]
    public List<FormSnapshotEntry> FormDefinitionSnapshots { get; set; } = new();
}

/// <summary>
/// 审批入口
/// </summary>
public class NodeApprovalEntry
{
    /// <summary>
    /// 节点ID
    /// </summary>
    [BsonElement("nodeId")]
    public string NodeId { get; set; } = string.Empty;

    /// <summary>
    /// 审批人ID列表
    /// </summary>
    [BsonElement("approverIds")]
    public List<string> ApproverIds { get; set; } = new();
}

/// <summary>
/// 变量入口
/// </summary>
public class WorkflowVariableEntry
{
    /// <summary>
    /// 变量名
    /// </summary>
    [BsonElement("key")]
    public string Key { get; set; } = string.Empty;

    /// <summary>
    /// 变量值的JSON字符串
    /// </summary>
    [BsonElement("value")]
    public string? ValueJson { get; set; }
}

/// <summary>
/// 并行分支入口
/// </summary>
public class ParallelBranchEntry
{
    /// <summary>
    /// 节点ID
    /// </summary>
    [BsonElement("nodeId")]
    public string NodeId { get; set; } = string.Empty;

    /// <summary>
    /// 已完成的分支ID列表
    /// </summary>
    [BsonElement("branchIds")]
    public List<string> BranchIds { get; set; } = new();
}

/// <summary>
/// 表单快照入口
/// </summary>
public class FormSnapshotEntry
{
    /// <summary>
    /// 节点ID
    /// </summary>
    [BsonElement("nodeId")]
    public string NodeId { get; set; } = string.Empty;

    /// <summary>
    /// 表单定义 JSON
    /// </summary>
    [BsonElement("formDefinitionJson")]
    public string FormDefinitionJson { get; set; } = string.Empty;
}
