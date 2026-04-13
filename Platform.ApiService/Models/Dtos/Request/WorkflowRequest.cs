using Microsoft.AspNetCore.Http;
using System.Collections.Generic;
using Platform.ApiService.Models;

namespace Platform.ApiService.Models.Workflow;

/// <summary>
/// 创建流程定义请求
/// </summary>
public class CreateWorkflowRequest
{
    /// <summary>
    /// 流程名称
    /// </summary>
    public string Name { get; set; } = string.Empty;

    /// <summary>
    /// 流程描述
    /// </summary>
    public string? Description { get; set; }

    /// <summary>
    /// 流程分类
    /// </summary>
    public string? Category { get; set; }

    /// <summary>
    /// 流程图形定义
    /// </summary>
    public WorkflowGraph Graph { get; set; } = new();

    /// <summary>
    /// 是否启用
    /// </summary>
    public bool? IsActive { get; set; }
}

/// <summary>
/// 更新流程定义请求
/// </summary>
public class UpdateWorkflowRequest
{
    /// <summary>
    /// 流程名称
    /// </summary>
    public string? Name { get; set; }

    /// <summary>
    /// 流程描述
    /// </summary>
    public string? Description { get; set; }

    /// <summary>
    /// 流程分类
    /// </summary>
    public string? Category { get; set; }

    /// <summary>
    /// 流程图形定义
    /// </summary>
    public WorkflowGraph? Graph { get; set; }

    /// <summary>
    /// 是否启用
    /// </summary>
    public bool? IsActive { get; set; }
}

/// <summary>
/// 启动流程请求
/// </summary>
public class StartWorkflowRequest
{
    /// <summary>
    /// 公文ID
    /// </summary>
    public string DocumentId { get; set; } = string.Empty;

    /// <summary>
    /// 流程变量
    /// </summary>
    public Dictionary<string, object>? Variables { get; set; }
}

/// <summary>
/// 节点动作请求
/// </summary>
public class WorkflowActionRequest
{
    /// <summary>
    /// 操作类型：approve/reject/return/delegate
    /// </summary>
    public string Action { get; set; } = string.Empty;

    /// <summary>
    /// 备注/意见
    /// </summary>
    public string? Comment { get; set; }

    /// <summary>
    /// 退回目标节点ID
    /// </summary>
    public string? TargetNodeId { get; set; }

    /// <summary>
    /// 转办目标用户ID
    /// </summary>
    public string? DelegateToUserId { get; set; }

    /// <summary>
    /// 随审批动作提交的表单数据（可选，用于填表+审批一步到位）
    /// </summary>
    public Dictionary<string, object>? FormData { get; set; }
}

/// <summary>
/// 撤回流程请求
/// </summary>
public class WithdrawWorkflowRequest
{
    /// <summary>
    /// 撤回原因
    /// </summary>
    public string? Reason { get; set; }
}

/// <summary>
/// 根据流程创建公文请求
/// </summary>
public class CreateWorkflowDocumentRequest
{
    /// <summary>
    /// 表单值（键为字段 dataKey）
    /// </summary>
    public Dictionary<string, object>? Values { get; set; }

    /// <summary>
    /// 附件ID列表
    /// </summary>
    public List<string>? AttachmentIds { get; set; }
}

/// <summary>
/// 保存过滤器偏好请求
/// </summary>
public class SaveFilterPreferenceRequest
{
    /// <summary>
    /// 偏好名称
    /// </summary>
    public string Name { get; set; } = string.Empty;

    /// <summary>
    /// 是否为默认偏好
    /// </summary>
    public bool IsDefault { get; set; } = false;

    /// <summary>
    /// 过滤器配置
    /// </summary>
    public WorkflowFilterConfig? FilterConfig { get; set; }
}

/// <summary>
/// 更新过滤器偏好请求
/// </summary>
public class UpdateFilterPreferenceRequest
{
    /// <summary>
    /// 偏好名称
    /// </summary>
    public string? Name { get; set; }

    /// <summary>
    /// 是否为默认偏好
    /// </summary>
    public bool? IsDefault { get; set; }

    /// <summary>
    /// 过滤器配置
    /// </summary>
    public WorkflowFilterConfig? FilterConfig { get; set; }
}

/// <summary>
/// 创建并启动流程请求
/// </summary>
public class CreateAndStartWorkflowDocumentRequest : CreateWorkflowDocumentRequest
{
    /// <summary>
    /// 启动流程时的实例变量（可选）
    /// </summary>
    public Dictionary<string, object>? Variables { get; set; }
}

/// <summary>
/// 创建批量操作请求
/// </summary>
public class CreateBulkOperationRequest
{
    /// <summary>
    /// 操作类型
    /// </summary>
    public BulkOperationType OperationType { get; set; }

    /// <summary>
    /// 目标工作流ID列表
    /// </summary>
    public List<string> WorkflowIds { get; set; } = new();

    /// <summary>
    /// 操作参数（可选）
    /// </summary>
    public Dictionary<string, object>? Parameters { get; set; }
}

/// <summary>
/// 导出工作流请求
/// </summary>
public class ExportWorkflowsRequest
{
    /// <summary>
    /// 工作流ID列表
    /// </summary>
    public List<string> WorkflowIds { get; set; } = new();

    /// <summary>
    /// 导出配置
    /// </summary>
    public WorkflowExportConfig? Config { get; set; }
}

/// <summary>
/// 导出过滤结果请求
/// </summary>
public class ExportFilteredWorkflowsRequest
{
    /// <summary>
    /// 过滤条件
    /// </summary>
    public Dictionary<string, object> Filters { get; set; } = new();

    /// <summary>
    /// 导出配置
    /// </summary>
    public WorkflowExportConfig? Config { get; set; }
}

/// <summary>
/// 验证导入文件请求
/// </summary>
public class ValidateImportFileRequest
{
    /// <summary>
    /// 导入文件
    /// </summary>
    public IFormFile File { get; set; } = null!;
}

/// <summary>
/// 导入工作流请求
/// </summary>
public class ImportWorkflowsRequest
{
    /// <summary>
    /// 导入文件
    /// </summary>
    public IFormFile File { get; set; } = null!;

    /// <summary>
    /// 是否覆盖现有工作流
    /// </summary>
    public bool OverwriteExisting { get; set; } = false;
}

/// <summary>
/// 预览导入请求
/// </summary>
public class PreviewImportRequest
{
    /// <summary>
    /// 导入文件
    /// </summary>
    public IFormFile File { get; set; } = null!;
}

/// <summary>
/// 解决导入冲突请求
/// </summary>
public class ResolveImportConflictsRequest
{
    /// <summary>
    /// 导入文件
    /// </summary>
    public IFormFile File { get; set; } = null!;

    /// <summary>
    /// 冲突解决方案（工作流名称 -> 解决方案）
    /// </summary>
    public Dictionary<string, string> Resolutions { get; set; } = new();
}
