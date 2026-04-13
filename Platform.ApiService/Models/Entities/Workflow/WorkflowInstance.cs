using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;

using Platform.ServiceDefaults.Models;
using System.ComponentModel.DataAnnotations.Schema;
using System.Text.Json;

namespace Platform.ApiService.Models.Workflow;

/// <summary>
/// 工作流实例实体
/// </summary>
[BsonIgnoreExtraElements]
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
    public Dictionary<string, object?> GetVariablesDict()
    {
        var dict = new Dictionary<string, object?>();
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
    /// 重置所有变量
    /// </summary>
    public void ResetVariables(Dictionary<string, object?> dictionary)
    {
        Variables.Clear();
        foreach (var kv in dictionary)
        {
            SetVariable(kv.Key, kv.Value);
        }
    }
    private string _workflowDefinitionId = string.Empty;
    /// <summary>
    /// 关联流程定义ID
    /// </summary>
    [BsonRepresentation(BsonType.ObjectId)]
    public string WorkflowDefinitionId 
    { 
        get => _workflowDefinitionId; 
        set => _workflowDefinitionId = value == "" ? null! : value; 
    }

    private string? _documentId;
    /// <summary>
    /// 关联公文ID
    /// </summary>
    [BsonRepresentation(BsonType.ObjectId)]
    public string? DocumentId 
    { 
        get => _documentId; 
        set => _documentId = value == "" ? null : value; 
    }

    /// <summary>
    /// 流程状态
    /// </summary>
    [BsonRepresentation(BsonType.String)]
    public WorkflowStatus Status { get; set; } = WorkflowStatus.Running;

    /// <summary>
    /// 当前审批任务的审批人 ID 列表（用于优化待办列表查询）
    /// </summary>
    public List<string> CurrentApproverIds { get; set; } = new();

    /// <summary>
    /// 活跃的审批任务列表 (NodeId -> 审批人ID列表) ，用于支持并行分支
    /// </summary>
    public List<NodeApprovalEntry> ActiveApprovals { get; set; } = new();

    /// <summary>
    /// 流程实例在当前节点的预计超时时间
    /// </summary>
    public DateTime? TimeoutAt { get; set; }

    /// <summary>
    /// 当前节点ID
    /// </summary>
    public string CurrentNodeId { get; set; } = string.Empty;

    /// <summary>
    /// 流程变量列表
    /// </summary>
    public List<WorkflowVariableEntry> Variables { get; set; } = new();

    /// <summary>
    /// 审批记录列表
    /// </summary>
    public List<ApprovalRecord> ApprovalRecords { get; set; } = new();

    /// <summary>
    /// 发起人ID
    /// </summary>
    public string StartedBy { get; set; } = string.Empty;

    /// <summary>
    /// 启动时间
    /// </summary>
    public DateTime? StartedAt { get; set; }

    /// <summary>
    /// 完成时间
    /// </summary>
    public DateTime? CompletedAt { get; set; }

    /// <summary>
    /// 流程定义快照（创建实例时保存，确保已创建的流程不受后续定义变更影响）
    /// </summary>
    public WorkflowDefinition? WorkflowDefinitionSnapshot { get; set; }

    /// <summary>
    /// 表单定义快照列表（节点ID -> 表单定义，创建实例时保存）
    /// </summary>
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
    public string NodeId { get; set; } = string.Empty;

    /// <summary>
    /// 审批人ID列表
    /// </summary>
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
    public string Key { get; set; } = string.Empty;

    /// <summary>
    /// 变量值的JSON字符串
    /// </summary>
    public string? ValueJson { get; set; }
}

/// <summary>
/// 表单快照入口
/// </summary>
public class FormSnapshotEntry
{
    /// <summary>
    /// 节点ID
    /// </summary>
    public string NodeId { get; set; } = string.Empty;

    /// <summary>
    /// 表单定义 JSON
    /// </summary>
    public string FormDefinitionJson { get; set; } = string.Empty;
}