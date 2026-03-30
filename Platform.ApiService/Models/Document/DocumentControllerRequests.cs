using System.Collections.Generic;

namespace Platform.ApiService.Models;

/// <summary>
/// 提交公文请求
/// </summary>
public class SubmitDocumentRequest
{
    /// <summary>
    /// 流程定义ID
    /// </summary>
    public string WorkflowDefinitionId { get; set; } = string.Empty;

    /// <summary>
    /// 流程变量
    /// </summary>
    public Dictionary<string, object>? Variables { get; set; }
}

/// <summary>
/// 审批请求
/// </summary>
public class ApprovalRequest
{
    /// <summary>
    /// 审批意见
    /// </summary>
    public string? Comment { get; set; }
}

/// <summary>
/// 退回请求
/// </summary>
public class ReturnDocumentRequest
{
    /// <summary>
    /// 退回目标节点ID
    /// </summary>
    public string TargetNodeId { get; set; } = string.Empty;

    /// <summary>
    /// 退回原因
    /// </summary>
    public string Comment { get; set; } = string.Empty;
}

/// <summary>
/// 转办请求
/// </summary>
public class DelegateDocumentRequest
{
    /// <summary>
    /// 转办目标用户ID
    /// </summary>
    public string DelegateToUserId { get; set; } = string.Empty;

    /// <summary>
    /// 转办说明
    /// </summary>
    public string? Comment { get; set; }
}
