using System.Collections.Generic;
using System.Threading.Tasks;
using Platform.ApiService.Models;
using Platform.ApiService.Models.Workflow;
using Platform.ApiService.Workflows.Executors;

namespace Platform.ApiService.Services;

/// <summary>
/// 工作流引擎服务接口
/// </summary>
public interface IWorkflowEngine
{
    /// <summary>
    /// 启动工作流
    /// </summary>
    /// <param name="definitionId">工作流定义ID</param>
    /// <param name="documentId">关联文档ID</param>
    /// <param name="startedBy">启动人用户ID</param>
    /// <param name="variables">初始变量</param>
    Task<WorkflowInstance> StartWorkflowAsync(string definitionId, string documentId, string startedBy, Dictionary<string, object?>? variables = null);

    /// <summary>
    /// 处理审批操作
    /// </summary>
    /// <param name="instanceId">工作流实例ID</param>
    /// <param name="nodeId">节点ID</param>
    /// <param name="action">审批动作</param>
    /// <param name="currentUserId">当前操作人用户ID</param>
    /// <param name="comment">审批意见</param>
    /// <param name="delegateToUserId">转办目标用户ID</param>
    Task<bool> ProcessApprovalAsync(string instanceId, string nodeId, ApprovalAction action, string currentUserId, string? comment = null, string? delegateToUserId = null);

    /// <summary>
    /// 获取指定节点的实际审批人列表
    /// </summary>
    Task<List<string>> GetNodeApproversAsync(string instanceId, string nodeId);

    /// <summary>
    /// 退回到指定节点
    /// </summary>
    /// <param name="instanceId">工作流实例ID</param>
    /// <param name="targetNodeId">目标节点ID</param>
    /// <param name="comment">退回意见</param>
    /// <param name="currentUserId">当前操作人用户ID</param>
    Task<bool> ReturnToNodeAsync(string instanceId, string targetNodeId, string comment, string currentUserId);

    /// <summary>
    /// 获取审批历史
    /// </summary>
    Task<List<ApprovalRecord>> GetApprovalHistoryAsync(string instanceId);

    /// <summary>
    /// 获取流程实例
    /// </summary>
    Task<WorkflowInstance?> GetInstanceAsync(string instanceId);

    /// <summary>
    /// 取消流程
    /// </summary>
    Task<bool> CancelWorkflowAsync(string instanceId, string reason);

    /// <summary>
    /// 继续流程执行（用于后台任务或延迟任务恢复）
    /// </summary>
    Task<bool> ProceedAsync(string instanceId, string nodeId);
}
