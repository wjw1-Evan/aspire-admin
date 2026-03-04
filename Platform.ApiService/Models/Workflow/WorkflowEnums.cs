namespace Platform.ApiService.Models.Workflow;

/// <summary>
/// 批量操作类型枚举
/// </summary>
public enum BulkOperationType
{
    /// <summary>激活</summary>
    Activate = 0,

    /// <summary>停用</summary>
    Deactivate = 1,

    /// <summary>删除</summary>
    Delete = 2,

    /// <summary>更新类别</summary>
    UpdateCategory = 3,

    /// <summary>导出</summary>
    Export = 4
}

/// <summary>
/// 批量操作状态枚举
/// </summary>
public enum BulkOperationStatus
{
    /// <summary>排队中</summary>
    Queued = 0,

    /// <summary>进行中</summary>
    InProgress = 1,

    /// <summary>已完成</summary>
    Completed = 2,

    /// <summary>已取消</summary>
    Cancelled = 3,

    /// <summary>失败</summary>
    Failed = 4
}

/// <summary>
/// 导出格式枚举
/// </summary>
public enum ExportFormat
{
    /// <summary>JSON格式</summary>
    Json = 0,

    /// <summary>Excel格式</summary>
    Excel = 1,

    /// <summary>CSV格式</summary>
    Csv = 2
}

/// <summary>
/// 模板类型枚举
/// </summary>
public enum TemplateType
{
    /// <summary>系统模板</summary>
    System = 0,

    /// <summary>企业模板</summary>
    Company = 1,

    /// <summary>用户模板</summary>
    User = 2
}

/// <summary>
/// 验证严重程度枚举
/// </summary>
public enum ValidationSeverity
{
    /// <summary>信息</summary>
    Info = 0,

    /// <summary>警告</summary>
    Warning = 1,

    /// <summary>错误</summary>
    Error = 2,

    /// <summary>严重错误</summary>
    Critical = 3
}

/// <summary>
/// 工作流状态枚举
/// </summary>
public enum WorkflowStatus
{
    /// <summary>运行中</summary>
    Running = 0,

    /// <summary>已完成</summary>
    Completed = 1,

    /// <summary>已取消</summary>
    Cancelled = 2,

    /// <summary>已拒绝</summary>
    Rejected = 3,

    /// <summary>挂起等待</summary>
    Waiting = 4
}

/// <summary>
/// 审批动作枚举
/// </summary>
public enum ApprovalAction
{
    /// <summary>通过</summary>
    Approve = 0,

    /// <summary>拒绝</summary>
    Reject = 1,

    /// <summary>退回</summary>
    Return = 2,

    /// <summary>转办</summary>
    Delegate = 3,

    /// <summary>抄送</summary>
    CC = 4,

    /// <summary>系统自动执行</summary>
    AutoSystem = 10
}

/// <summary>
/// 审批类型枚举
/// </summary>
public enum ApprovalType
{
    /// <summary>会签（所有人必须通过）</summary>
    All = 0,

    /// <summary>或签（任意一人通过即可）</summary>
    Any = 1,

    /// <summary>顺序审批（按列表顺序依次审批）</summary>
    Sequential = 2
}

/// <summary>
/// 审批人类型枚举
/// </summary>
public enum ApproverType
{
    /// <summary>指定用户</summary>
    User = 0,

    /// <summary>角色</summary>
    Role = 1,

    /// <summary>部门</summary>
    Department = 2,

    /// <summary>表单字段</summary>
    FormField = 3
}
