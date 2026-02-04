using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;
using Platform.ServiceDefaults.Attributes;
using Platform.ServiceDefaults.Models;

namespace Platform.ApiService.Models;

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
    Rejected = 3
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
    CC = 4
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

/// <summary>
/// 工作流分析数据
/// </summary>
public class WorkflowAnalytics
{
    /// <summary>
    /// 使用次数
    /// </summary>
    [BsonElement("usageCount")]
    public int UsageCount { get; set; } = 0;

    /// <summary>
    /// 完成率（百分比）
    /// </summary>
    [BsonElement("completionRate")]
    public double CompletionRate { get; set; } = 0.0;

    /// <summary>
    /// 平均完成时间（小时）
    /// </summary>
    [BsonElement("averageCompletionTimeHours")]
    public double AverageCompletionTimeHours { get; set; } = 0.0;

    /// <summary>
    /// 最后使用时间
    /// </summary>
    [BsonElement("lastUsedAt")]
    public DateTime? LastUsedAt { get; set; }

    /// <summary>
    /// 性能评分（0-100）
    /// </summary>
    [BsonElement("performanceScore")]
    public double PerformanceScore { get; set; } = 0.0;

    /// <summary>
    /// 趋势数据（最近30天的使用情况）
    /// </summary>
    [BsonElement("trendData")]
    public List<TrendDataPoint> TrendData { get; set; } = new();

    /// <summary>
    /// 性能问题列表
    /// </summary>
    [BsonElement("performanceIssues")]
    public List<PerformanceIssue> PerformanceIssues { get; set; } = new();
}

/// <summary>
/// 趋势数据点
/// </summary>
public class TrendDataPoint
{
    /// <summary>
    /// 日期
    /// </summary>
    [BsonElement("date")]
    public DateTime Date { get; set; }

    /// <summary>
    /// 使用次数
    /// </summary>
    [BsonElement("usageCount")]
    public int UsageCount { get; set; }

    /// <summary>
    /// 完成次数
    /// </summary>
    [BsonElement("completionCount")]
    public int CompletionCount { get; set; }

    /// <summary>
    /// 平均完成时间（小时）
    /// </summary>
    [BsonElement("averageCompletionTimeHours")]
    public double AverageCompletionTimeHours { get; set; }
}

/// <summary>
/// 性能问题
/// </summary>
public class PerformanceIssue
{
    /// <summary>
    /// 问题类型
    /// </summary>
    [BsonElement("type")]
    public string Type { get; set; } = string.Empty;

    /// <summary>
    /// 问题描述
    /// </summary>
    [BsonElement("description")]
    public string Description { get; set; } = string.Empty;

    /// <summary>
    /// 严重程度
    /// </summary>
    [BsonElement("severity")]
    [BsonRepresentation(BsonType.String)]
    public ValidationSeverity Severity { get; set; }

    /// <summary>
    /// 检测时间
    /// </summary>
    [BsonElement("detectedAt")]
    public DateTime DetectedAt { get; set; } = DateTime.UtcNow;

    /// <summary>
    /// 建议解决方案
    /// </summary>
    [BsonElement("suggestedSolution")]
    public string? SuggestedSolution { get; set; }
}

/// <summary>
/// 批量操作记录
/// </summary>
[BsonIgnoreExtraElements]
[BsonCollectionName("bulk_operations")]
public class BulkOperation : IEntity, ISoftDeletable, ITimestamped, IMultiTenant
{
    /// <summary>
    /// 实体ID
    /// </summary>
    [BsonId]
    [BsonRepresentation(BsonType.ObjectId)]
    public string Id { get; set; } = string.Empty;

    /// <summary>
    /// 操作类型
    /// </summary>
    [BsonElement("operationType")]
    [BsonRepresentation(BsonType.String)]
    public BulkOperationType OperationType { get; set; }

    /// <summary>
    /// 操作状态
    /// </summary>
    [BsonElement("status")]
    [BsonRepresentation(BsonType.String)]
    public BulkOperationStatus Status { get; set; } = BulkOperationStatus.Queued;

    /// <summary>
    /// 目标工作流ID列表
    /// </summary>
    [BsonElement("targetWorkflowIds")]
    public List<string> TargetWorkflowIds { get; set; } = new();

    /// <summary>
    /// 操作参数（JSON格式）
    /// </summary>
    [BsonElement("parameters")]
    public Dictionary<string, object> Parameters { get; set; } = new();

    /// <summary>
    /// 总数量
    /// </summary>
    [BsonElement("totalCount")]
    public int TotalCount { get; set; }

    /// <summary>
    /// 已处理数量
    /// </summary>
    [BsonElement("processedCount")]
    public int ProcessedCount { get; set; } = 0;

    /// <summary>
    /// 成功数量
    /// </summary>
    [BsonElement("successCount")]
    public int SuccessCount { get; set; } = 0;

    /// <summary>
    /// 失败数量
    /// </summary>
    [BsonElement("failureCount")]
    public int FailureCount { get; set; } = 0;

    /// <summary>
    /// 错误信息列表
    /// </summary>
    [BsonElement("errors")]
    public List<BulkOperationError> Errors { get; set; } = new();

    /// <summary>
    /// 开始时间
    /// </summary>
    [BsonElement("startedAt")]
    public DateTime? StartedAt { get; set; }

    /// <summary>
    /// 完成时间
    /// </summary>
    [BsonElement("completedAt")]
    public DateTime? CompletedAt { get; set; }

    /// <summary>
    /// 预估完成时间
    /// </summary>
    [BsonElement("estimatedCompletionAt")]
    public DateTime? EstimatedCompletionAt { get; set; }

    /// <summary>
    /// 是否可取消
    /// </summary>
    [BsonElement("cancellable")]
    public bool Cancellable { get; set; } = true;

    /// <summary>
    /// 企业ID（多租户）
    /// </summary>
    [BsonElement("companyId")]
    public string CompanyId { get; set; } = string.Empty;

    // IEntity, ISoftDeletable, ITimestamped 接口实现
    /// <summary>
    /// 是否已软删除
    /// </summary>
    [BsonElement("isDeleted")]
    public bool IsDeleted { get; set; } = false;

    /// <summary>
    /// 软删除时间（UTC）
    /// </summary>
    [BsonElement("deletedAt")]
    public DateTime? DeletedAt { get; set; }

    /// <summary>
    /// 软删除操作人ID
    /// </summary>
    [BsonElement("deletedBy")]
    public string? DeletedBy { get; set; }

    /// <summary>
    /// 软删除原因
    /// </summary>
    [BsonElement("deletedReason")]
    public string? DeletedReason { get; set; }

    /// <summary>
    /// 创建时间（UTC）
    /// </summary>
    [BsonElement("createdAt")]
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    /// <summary>
    /// 最近更新时间（UTC）
    /// </summary>
    [BsonElement("updatedAt")]
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    /// <summary>
    /// 创建人ID
    /// </summary>
    [BsonElement("createdBy")]
    public string? CreatedBy { get; set; }

    /// <summary>
    /// 创建人用户名
    /// </summary>
    [BsonElement("createdByUsername")]
    public string? CreatedByUsername { get; set; }

    /// <summary>
    /// 更新人ID
    /// </summary>
    [BsonElement("updatedBy")]
    public string? UpdatedBy { get; set; }

    /// <summary>
    /// 更新人用户名
    /// </summary>
    [BsonElement("updatedByUsername")]
    public string? UpdatedByUsername { get; set; }
}

/// <summary>
/// 批量操作错误
/// </summary>
public class BulkOperationError
{
    /// <summary>
    /// 工作流ID
    /// </summary>
    [BsonElement("workflowId")]
    public string WorkflowId { get; set; } = string.Empty;

    /// <summary>
    /// 工作流名称
    /// </summary>
    [BsonElement("workflowName")]
    public string? WorkflowName { get; set; }

    /// <summary>
    /// 错误消息
    /// </summary>
    [BsonElement("errorMessage")]
    public string ErrorMessage { get; set; } = string.Empty;

    /// <summary>
    /// 错误代码
    /// </summary>
    [BsonElement("errorCode")]
    public string? ErrorCode { get; set; }

    /// <summary>
    /// 发生时间
    /// </summary>
    [BsonElement("occurredAt")]
    public DateTime OccurredAt { get; set; } = DateTime.UtcNow;
}

/// <summary>
/// 工作流导出配置
/// </summary>
public class WorkflowExportConfig
{
    /// <summary>
    /// 导出格式
    /// </summary>
    [BsonElement("format")]
    [BsonRepresentation(BsonType.String)]
    public ExportFormat Format { get; set; } = ExportFormat.Json;

    /// <summary>
    /// 是否包含分析数据
    /// </summary>
    [BsonElement("includeAnalytics")]
    public bool IncludeAnalytics { get; set; } = false;

    /// <summary>
    /// 是否包含依赖项
    /// </summary>
    [BsonElement("includeDependencies")]
    public bool IncludeDependencies { get; set; } = false;

    /// <summary>
    /// 是否包含历史版本
    /// </summary>
    [BsonElement("includeVersionHistory")]
    public bool IncludeVersionHistory { get; set; } = false;

    /// <summary>
    /// 过滤条件
    /// </summary>
    [BsonElement("filters")]
    public Dictionary<string, object> Filters { get; set; } = new();

    /// <summary>
    /// 自定义字段列表
    /// </summary>
    [BsonElement("customFields")]
    public List<string> CustomFields { get; set; } = new();
}

/// <summary>
/// 工作流导入结果
/// </summary>
public class WorkflowImportResult
{
    /// <summary>
    /// 导入的工作流数量
    /// </summary>
    [BsonElement("importedCount")]
    public int ImportedCount { get; set; } = 0;

    /// <summary>
    /// 跳过的工作流数量
    /// </summary>
    [BsonElement("skippedCount")]
    public int SkippedCount { get; set; } = 0;

    /// <summary>
    /// 失败的工作流数量
    /// </summary>
    [BsonElement("failedCount")]
    public int FailedCount { get; set; } = 0;

    /// <summary>
    /// 冲突列表
    /// </summary>
    [BsonElement("conflicts")]
    public List<ImportConflict> Conflicts { get; set; } = new();

    /// <summary>
    /// 错误列表
    /// </summary>
    [BsonElement("errors")]
    public List<ImportError> Errors { get; set; } = new();

    /// <summary>
    /// 导入的工作流ID列表
    /// </summary>
    [BsonElement("importedWorkflowIds")]
    public List<string> ImportedWorkflowIds { get; set; } = new();
}

/// <summary>
/// 导入冲突
/// </summary>
public class ImportConflict
{
    /// <summary>
    /// 工作流名称
    /// </summary>
    [BsonElement("workflowName")]
    public string WorkflowName { get; set; } = string.Empty;

    /// <summary>
    /// 冲突类型
    /// </summary>
    [BsonElement("conflictType")]
    public string ConflictType { get; set; } = string.Empty;

    /// <summary>
    /// 现有工作流ID
    /// </summary>
    [BsonElement("existingWorkflowId")]
    public string? ExistingWorkflowId { get; set; }

    /// <summary>
    /// 冲突描述
    /// </summary>
    [BsonElement("description")]
    public string Description { get; set; } = string.Empty;

    /// <summary>
    /// 建议解决方案
    /// </summary>
    [BsonElement("suggestedResolution")]
    public string? SuggestedResolution { get; set; }
}

/// <summary>
/// 导入错误
/// </summary>
public class ImportError
{
    /// <summary>
    /// 工作流名称
    /// </summary>
    [BsonElement("workflowName")]
    public string? WorkflowName { get; set; }

    /// <summary>
    /// 错误消息
    /// </summary>
    [BsonElement("errorMessage")]
    public string ErrorMessage { get; set; } = string.Empty;

    /// <summary>
    /// 错误详情
    /// </summary>
    [BsonElement("errorDetails")]
    public string? ErrorDetails { get; set; }

    /// <summary>
    /// 行号（如果适用）
    /// </summary>
    [BsonElement("lineNumber")]
    public int? LineNumber { get; set; }
}

/// <summary>
/// 工作流模板
/// </summary>
[BsonIgnoreExtraElements]
[BsonCollectionName("workflow_templates")]
public class WorkflowTemplate : IEntity, ISoftDeletable, ITimestamped, IMultiTenant
{
    /// <summary>
    /// 实体ID
    /// </summary>
    [BsonId]
    [BsonRepresentation(BsonType.ObjectId)]
    public string Id { get; set; } = string.Empty;

    /// <summary>
    /// 模板名称
    /// </summary>
    [BsonElement("name")]
    public string Name { get; set; } = string.Empty;

    /// <summary>
    /// 模板描述
    /// </summary>
    [BsonElement("description")]
    public string? Description { get; set; }

    /// <summary>
    /// 模板类型
    /// </summary>
    [BsonElement("templateType")]
    [BsonRepresentation(BsonType.String)]
    public TemplateType TemplateType { get; set; } = TemplateType.User;

    /// <summary>
    /// 模板分类
    /// </summary>
    [BsonElement("category")]
    public string Category { get; set; } = string.Empty;

    /// <summary>
    /// 模板标签
    /// </summary>
    [BsonElement("tags")]
    public List<string> Tags { get; set; } = new();

    /// <summary>
    /// 工作流定义模板
    /// </summary>
    [BsonElement("workflowDefinitionTemplate")]
    public WorkflowDefinition WorkflowDefinitionTemplate { get; set; } = new();

    /// <summary>
    /// 参数定义
    /// </summary>
    [BsonElement("parameters")]
    public List<TemplateParameter> Parameters { get; set; } = new();

    /// <summary>
    /// 版本号
    /// </summary>
    [BsonElement("version")]
    public string Version { get; set; } = "1.0.0";

    /// <summary>
    /// 是否公开（对其他用户可见）
    /// </summary>
    [BsonElement("isPublic")]
    public bool IsPublic { get; set; } = false;

    /// <summary>
    /// 使用次数
    /// </summary>
    [BsonElement("usageCount")]
    public int UsageCount { get; set; } = 0;

    /// <summary>
    /// 评分（1-5星）
    /// </summary>
    [BsonElement("rating")]
    public double Rating { get; set; } = 0.0;

    /// <summary>
    /// 评价数量
    /// </summary>
    [BsonElement("ratingCount")]
    public int RatingCount { get; set; } = 0;

    /// <summary>
    /// 依赖项列表
    /// </summary>
    [BsonElement("dependencies")]
    public List<TemplateDependency> Dependencies { get; set; } = new();

    /// <summary>
    /// 企业ID（多租户）
    /// </summary>
    [BsonElement("companyId")]
    public string CompanyId { get; set; } = string.Empty;

    // IEntity, ISoftDeletable, ITimestamped 接口实现
    /// <summary>
    /// 是否已软删除
    /// </summary>
    [BsonElement("isDeleted")]
    public bool IsDeleted { get; set; } = false;

    /// <summary>
    /// 软删除时间（UTC）
    /// </summary>
    [BsonElement("deletedAt")]
    public DateTime? DeletedAt { get; set; }

    /// <summary>
    /// 软删除操作人ID
    /// </summary>
    [BsonElement("deletedBy")]
    public string? DeletedBy { get; set; }

    /// <summary>
    /// 软删除原因
    /// </summary>
    [BsonElement("deletedReason")]
    public string? DeletedReason { get; set; }

    /// <summary>
    /// 创建时间（UTC）
    /// </summary>
    [BsonElement("createdAt")]
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    /// <summary>
    /// 最近更新时间（UTC）
    /// </summary>
    [BsonElement("updatedAt")]
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    /// <summary>
    /// 创建人ID
    /// </summary>
    [BsonElement("createdBy")]
    public string? CreatedBy { get; set; }

    /// <summary>
    /// 创建人用户名
    /// </summary>
    [BsonElement("createdByUsername")]
    public string? CreatedByUsername { get; set; }

    /// <summary>
    /// 更新人ID
    /// </summary>
    [BsonElement("updatedBy")]
    public string? UpdatedBy { get; set; }

    /// <summary>
    /// 更新人用户名
    /// </summary>
    [BsonElement("updatedByUsername")]
    public string? UpdatedByUsername { get; set; }
}

/// <summary>
/// 模板参数
/// </summary>
public class TemplateParameter
{
    /// <summary>
    /// 参数名称
    /// </summary>
    [BsonElement("name")]
    public string Name { get; set; } = string.Empty;

    /// <summary>
    /// 参数显示名称
    /// </summary>
    [BsonElement("displayName")]
    public string DisplayName { get; set; } = string.Empty;

    /// <summary>
    /// 参数描述
    /// </summary>
    [BsonElement("description")]
    public string? Description { get; set; }

    /// <summary>
    /// 参数类型（string, number, boolean, select）
    /// </summary>
    [BsonElement("type")]
    public string Type { get; set; } = "string";

    /// <summary>
    /// 默认值
    /// </summary>
    [BsonElement("defaultValue")]
    public object? DefaultValue { get; set; }

    /// <summary>
    /// 是否必需
    /// </summary>
    [BsonElement("required")]
    public bool Required { get; set; } = false;

    /// <summary>
    /// 选项列表（当type为select时使用）
    /// </summary>
    [BsonElement("options")]
    public List<ParameterOption> Options { get; set; } = new();

    /// <summary>
    /// 验证规则
    /// </summary>
    [BsonElement("validation")]
    public ParameterValidation? Validation { get; set; }
}

/// <summary>
/// 参数选项
/// </summary>
public class ParameterOption
{
    /// <summary>
    /// 选项值
    /// </summary>
    [BsonElement("value")]
    public string Value { get; set; } = string.Empty;

    /// <summary>
    /// 选项标签
    /// </summary>
    [BsonElement("label")]
    public string Label { get; set; } = string.Empty;
}

/// <summary>
/// 参数验证规则
/// </summary>
public class ParameterValidation
{
    /// <summary>
    /// 最小值（数字类型）
    /// </summary>
    [BsonElement("min")]
    public double? Min { get; set; }

    /// <summary>
    /// 最大值（数字类型）
    /// </summary>
    [BsonElement("max")]
    public double? Max { get; set; }

    /// <summary>
    /// 最小长度（字符串类型）
    /// </summary>
    [BsonElement("minLength")]
    public int? MinLength { get; set; }

    /// <summary>
    /// 最大长度（字符串类型）
    /// </summary>
    [BsonElement("maxLength")]
    public int? MaxLength { get; set; }

    /// <summary>
    /// 正则表达式模式
    /// </summary>
    [BsonElement("pattern")]
    public string? Pattern { get; set; }
}

/// <summary>
/// 模板依赖项
/// </summary>
public class TemplateDependency
{
    /// <summary>
    /// 依赖项名称
    /// </summary>
    [BsonElement("name")]
    public string Name { get; set; } = string.Empty;

    /// <summary>
    /// 依赖项类型（role, department, form, etc.）
    /// </summary>
    [BsonElement("type")]
    public string Type { get; set; } = string.Empty;

    /// <summary>
    /// 依赖项ID
    /// </summary>
    [BsonElement("dependencyId")]
    public string? DependencyId { get; set; }

    /// <summary>
    /// 是否必需
    /// </summary>
    [BsonElement("required")]
    public bool Required { get; set; } = true;

    /// <summary>
    /// 描述
    /// </summary>
    [BsonElement("description")]
    public string? Description { get; set; }
}

/// <summary>
/// 工作流验证结果
/// </summary>
public class WorkflowValidationResult
{
    /// <summary>
    /// 是否有效
    /// </summary>
    [BsonElement("isValid")]
    public bool IsValid { get; set; } = true;

    /// <summary>
    /// 验证问题列表
    /// </summary>
    [BsonElement("issues")]
    public List<ValidationIssue> Issues { get; set; } = new();

    /// <summary>
    /// 验证时间
    /// </summary>
    [BsonElement("validatedAt")]
    public DateTime ValidatedAt { get; set; } = DateTime.UtcNow;

    /// <summary>
    /// 验证器版本
    /// </summary>
    [BsonElement("validatorVersion")]
    public string ValidatorVersion { get; set; } = "1.0.0";
}

/// <summary>
/// 验证问题
/// </summary>
public class ValidationIssue
{
    /// <summary>
    /// 问题ID
    /// </summary>
    [BsonElement("id")]
    public string Id { get; set; } = Guid.NewGuid().ToString();

    /// <summary>
    /// 问题类型
    /// </summary>
    [BsonElement("type")]
    public string Type { get; set; } = string.Empty;

    /// <summary>
    /// 严重程度
    /// </summary>
    [BsonElement("severity")]
    [BsonRepresentation(BsonType.String)]
    public ValidationSeverity Severity { get; set; }

    /// <summary>
    /// 问题描述
    /// </summary>
    [BsonElement("message")]
    public string Message { get; set; } = string.Empty;

    /// <summary>
    /// 问题详情
    /// </summary>
    [BsonElement("details")]
    public string? Details { get; set; }

    /// <summary>
    /// 相关节点ID
    /// </summary>
    [BsonElement("nodeId")]
    public string? NodeId { get; set; }

    /// <summary>
    /// 相关边ID
    /// </summary>
    [BsonElement("edgeId")]
    public string? EdgeId { get; set; }

    /// <summary>
    /// 建议解决方案
    /// </summary>
    [BsonElement("suggestedFix")]
    public string? SuggestedFix { get; set; }

    /// <summary>
    /// 问题位置信息
    /// </summary>
    [BsonElement("location")]
    public ValidationLocation? Location { get; set; }
}

/// <summary>
/// 验证问题位置信息
/// </summary>
public class ValidationLocation
{
    /// <summary>
    /// X坐标
    /// </summary>
    [BsonElement("x")]
    public double? X { get; set; }

    /// <summary>
    /// Y坐标
    /// </summary>
    [BsonElement("y")]
    public double? Y { get; set; }

    /// <summary>
    /// 区域宽度
    /// </summary>
    [BsonElement("width")]
    public double? Width { get; set; }

    /// <summary>
    /// 区域高度
    /// </summary>
    [BsonElement("height")]
    public double? Height { get; set; }
}

/// <summary>
/// 用户工作流过滤器偏好
/// </summary>
[BsonIgnoreExtraElements]
[BsonCollectionName("user_workflow_filter_preferences")]
public class UserWorkflowFilterPreference : IEntity, ISoftDeletable, ITimestamped, IMultiTenant
{
    /// <summary>
    /// 实体ID
    /// </summary>
    [BsonId]
    [BsonRepresentation(BsonType.ObjectId)]
    public string Id { get; set; } = string.Empty;

    /// <summary>
    /// 用户ID
    /// </summary>
    [BsonElement("userId")]
    public string UserId { get; set; } = string.Empty;

    /// <summary>
    /// 偏好名称
    /// </summary>
    [BsonElement("name")]
    public string Name { get; set; } = string.Empty;

    /// <summary>
    /// 是否为默认偏好
    /// </summary>
    [BsonElement("isDefault")]
    public bool IsDefault { get; set; } = false;

    /// <summary>
    /// 过滤器配置
    /// </summary>
    [BsonElement("filterConfig")]
    public WorkflowFilterConfig FilterConfig { get; set; } = new();

    /// <summary>
    /// 企业ID（多租户）
    /// </summary>
    [BsonElement("companyId")]
    public string CompanyId { get; set; } = string.Empty;

    // IEntity, ISoftDeletable, ITimestamped 接口实现
    /// <summary>
    /// 是否已软删除
    /// </summary>
    [BsonElement("isDeleted")]
    public bool IsDeleted { get; set; } = false;

    /// <summary>
    /// 软删除时间（UTC）
    /// </summary>
    [BsonElement("deletedAt")]
    public DateTime? DeletedAt { get; set; }

    /// <summary>
    /// 软删除操作人ID
    /// </summary>
    [BsonElement("deletedBy")]
    public string? DeletedBy { get; set; }

    /// <summary>
    /// 软删除原因
    /// </summary>
    [BsonElement("deletedReason")]
    public string? DeletedReason { get; set; }

    /// <summary>
    /// 创建时间（UTC）
    /// </summary>
    [BsonElement("createdAt")]
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    /// <summary>
    /// 最近更新时间（UTC）
    /// </summary>
    [BsonElement("updatedAt")]
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    /// <summary>
    /// 创建人ID
    /// </summary>
    [BsonElement("createdBy")]
    public string? CreatedBy { get; set; }

    /// <summary>
    /// 创建人用户名
    /// </summary>
    [BsonElement("createdByUsername")]
    public string? CreatedByUsername { get; set; }

    /// <summary>
    /// 更新人ID
    /// </summary>
    [BsonElement("updatedBy")]
    public string? UpdatedBy { get; set; }

    /// <summary>
    /// 更新人用户名
    /// </summary>
    [BsonElement("updatedByUsername")]
    public string? UpdatedByUsername { get; set; }
}

/// <summary>
/// 工作流过滤器配置
/// </summary>
public class WorkflowFilterConfig
{
    /// <summary>
    /// 关键词搜索
    /// </summary>
    [BsonElement("keyword")]
    public string? Keyword { get; set; }

    /// <summary>
    /// 类别列表
    /// </summary>
    [BsonElement("categories")]
    public List<string> Categories { get; set; } = new();

    /// <summary>
    /// 状态列表
    /// </summary>
    [BsonElement("statuses")]
    public List<string> Statuses { get; set; } = new();

    /// <summary>
    /// 日期范围过滤
    /// </summary>
    [BsonElement("dateRange")]
    public DateRangeFilter? DateRange { get; set; }

    /// <summary>
    /// 使用次数范围
    /// </summary>
    [BsonElement("usageRange")]
    public UsageRangeFilter? UsageRange { get; set; }

    /// <summary>
    /// 创建者ID列表
    /// </summary>
    [BsonElement("createdBy")]
    public List<string> CreatedBy { get; set; } = new();

    /// <summary>
    /// 排序字段
    /// </summary>
    [BsonElement("sortBy")]
    public string? SortBy { get; set; }

    /// <summary>
    /// 排序方向
    /// </summary>
    [BsonElement("sortOrder")]
    public string? SortOrder { get; set; }
}

/// <summary>
/// 公文状态枚举
/// </summary>
public enum DocumentStatus
{
    /// <summary>草稿</summary>
    Draft = 0,

    /// <summary>审批中</summary>
    Pending = 1,

    /// <summary>已通过</summary>
    Approved = 2,

    /// <summary>已拒绝</summary>
    Rejected = 3
}

/// <summary>
/// 工作流版本信息
/// </summary>
public class WorkflowVersion
{
    /// <summary>
    /// 主版本号
    /// </summary>
    [BsonElement("major")]
    public int Major { get; set; } = 1;

    /// <summary>
    /// 次版本号
    /// </summary>
    [BsonElement("minor")]
    public int Minor { get; set; } = 0;

    /// <summary>
    /// 创建时间
    /// </summary>
    [BsonElement("createdAt")]
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}

/// <summary>
/// 工作流图形定义
/// </summary>
public class WorkflowGraph
{
    /// <summary>
    /// 节点列表
    /// </summary>
    [BsonElement("nodes")]
    public List<WorkflowNode> Nodes { get; set; } = new();

    /// <summary>
    /// 边列表（连接线）
    /// </summary>
    [BsonElement("edges")]
    public List<WorkflowEdge> Edges { get; set; } = new();
}

/// <summary>
/// 工作流节点
/// </summary>
public class WorkflowNode
{
    /// <summary>
    /// 节点ID
    /// </summary>
    [BsonElement("id")]
    public string Id { get; set; } = string.Empty;

    /// <summary>
    /// 节点类型：start/end/approval/condition/parallel
    /// </summary>
    [BsonElement("type")]
    public string Type { get; set; } = string.Empty;

    /// <summary>
    /// 节点标签
    /// </summary>
    [BsonElement("label")]
    public string? Label { get; set; }

    /// <summary>
    /// 节点位置
    /// </summary>
    [BsonElement("position")]
    public NodePosition Position { get; set; } = new();

    /// <summary>
    /// 节点配置
    /// </summary>
    [BsonElement("config")]
    public NodeConfig Config { get; set; } = new();
}

/// <summary>
/// 节点位置
/// </summary>
public class NodePosition
{
    /// <summary>
    /// X坐标
    /// </summary>
    [BsonElement("x")]
    public double X { get; set; }

    /// <summary>
    /// Y坐标
    /// </summary>
    [BsonElement("y")]
    public double Y { get; set; }
}

/// <summary>
/// 节点配置
/// </summary>
public class NodeConfig
{
    /// <summary>
    /// 审批节点配置
    /// </summary>
    [BsonElement("approval")]
    public ApprovalConfig? Approval { get; set; }

    /// <summary>
    /// 条件节点配置
    /// </summary>
    [BsonElement("condition")]
    public ConditionConfig? Condition { get; set; }

    /// <summary>
    /// 并行网关配置
    /// </summary>
    [BsonElement("parallel")]
    public ParallelConfig? Parallel { get; set; }

    /// <summary>
    /// 表单绑定配置（用于起始节点或审批节点收集数据）
    /// </summary>
    [BsonElement("form")]
    public FormBinding? Form { get; set; }
}

/// <summary>
/// 审批节点配置
/// </summary>
public class ApprovalConfig
{
    /// <summary>
    /// 审批类型：会签或或签
    /// </summary>
    [BsonElement("type")]
    [BsonRepresentation(BsonType.String)]
    public ApprovalType Type { get; set; } = ApprovalType.All;

    /// <summary>
    /// 审批人规则列表
    /// </summary>
    [BsonElement("approvers")]
    public List<ApproverRule> Approvers { get; set; } = new();

    /// <summary>
    /// 抄送规则列表
    /// </summary>
    [BsonElement("ccRules")]
    public List<ApproverRule>? CcRules { get; set; }

    /// <summary>
    /// 是否允许转办
    /// </summary>
    [BsonElement("allowDelegate")]
    public bool AllowDelegate { get; set; } = false;

    /// <summary>
    /// 是否允许拒绝
    /// </summary>
    [BsonElement("allowReject")]
    public bool AllowReject { get; set; } = true;

    /// <summary>
    /// 是否允许退回
    /// </summary>
    [BsonElement("allowReturn")]
    public bool AllowReturn { get; set; } = false;

    /// <summary>
    /// 超时时间（小时）
    /// </summary>
    [BsonElement("timeoutHours")]
    public int? TimeoutHours { get; set; }
}

/// <summary>
/// 审批人规则
/// </summary>
public class ApproverRule
{
    /// <summary>
    /// 审批人类型：用户/角色/部门
    /// </summary>
    [BsonElement("type")]
    [BsonRepresentation(BsonType.String)]
    public ApproverType Type { get; set; }

    /// <summary>
    /// 用户ID（当Type为User时使用）
    /// </summary>
    [BsonElement("userId")]
    public string? UserId { get; set; }

    /// <summary>
    /// 角色ID（当Type为Role时使用）
    /// </summary>
    [BsonElement("roleId")]
    public string? RoleId { get; set; }

    /// <summary>
    /// 部门ID（当Type为Department时使用）
    /// </summary>
    [BsonElement("departmentId")]
    public string? DepartmentId { get; set; }

    /// <summary>
    /// 表单字段Key（当Type为FormField时使用）
    /// </summary>
    [BsonElement("formFieldKey")]
    public string? FormFieldKey { get; set; }
}

/// <summary>
/// 条件节点配置
/// </summary>
public class ConditionConfig
{
    /// <summary>
    /// 条件表达式，如：amount > 10000
    /// </summary>
    [BsonElement("expression")]
    public string Expression { get; set; } = string.Empty;
}

/// <summary>
/// 并行网关配置
/// </summary>
public class ParallelConfig
{
    /// <summary>
    /// 分支节点ID列表
    /// </summary>
    [BsonElement("branches")]
    public List<string> Branches { get; set; } = new();
}

/// <summary>
/// 工作流边（连接线）
/// </summary>
public class WorkflowEdge
{
    /// <summary>
    /// 边ID
    /// </summary>
    [BsonElement("id")]
    public string Id { get; set; } = string.Empty;

    /// <summary>
    /// 源节点ID
    /// </summary>
    [BsonElement("source")]
    public string Source { get; set; } = string.Empty;

    /// <summary>
    /// 目标节点ID
    /// </summary>
    [BsonElement("target")]
    public string Target { get; set; } = string.Empty;

    /// <summary>
    /// 边标签
    /// </summary>
    [BsonElement("label")]
    public string? Label { get; set; }

    /// <summary>
    /// 条件分支表达式
    /// </summary>
    [BsonElement("condition")]
    public string? Condition { get; set; }
}

/// <summary>
/// 工作流定义实体
/// </summary>
[BsonIgnoreExtraElements]
[BsonCollectionName("workflow_definitions")]
public class WorkflowDefinition : IEntity, ISoftDeletable, ITimestamped, IMultiTenant
{
    /// <summary>
    /// 实体ID
    /// </summary>
    [BsonId]
    [BsonRepresentation(BsonType.ObjectId)]
    public string Id { get; set; } = string.Empty;

    /// <summary>
    /// 流程名称
    /// </summary>
    [BsonElement("name")]
    public string Name { get; set; } = string.Empty;

    /// <summary>
    /// 流程描述
    /// </summary>
    [BsonElement("description")]
    public string? Description { get; set; }

    /// <summary>
    /// 流程分类
    /// </summary>
    [BsonElement("category")]
    public string Category { get; set; } = string.Empty;

    /// <summary>
    /// 版本信息
    /// </summary>
    [BsonElement("version")]
    public WorkflowVersion Version { get; set; } = new();

    /// <summary>
    /// 流程图形定义
    /// </summary>
    [BsonElement("graph")]
    public WorkflowGraph Graph { get; set; } = new();

    /// <summary>
    /// 是否启用
    /// </summary>
    [BsonElement("isActive")]
    public bool IsActive { get; set; } = true;

    /// <summary>
    /// 分析数据
    /// </summary>
    [BsonElement("analytics")]
    public WorkflowAnalytics Analytics { get; set; } = new();

    /// <summary>
    /// 验证结果
    /// </summary>
    [BsonElement("validationResult")]
    public WorkflowValidationResult? ValidationResult { get; set; }

    /// <summary>
    /// 基于的模板ID（如果从模板创建）
    /// </summary>
    [BsonElement("templateId")]
    public string? TemplateId { get; set; }

    /// <summary>
    /// 模板版本（如果从模板创建）
    /// </summary>
    [BsonElement("templateVersion")]
    public string? TemplateVersion { get; set; }

    /// <summary>
    /// 企业ID（多租户）
    /// </summary>
    [BsonElement("companyId")]
    public string CompanyId { get; set; } = string.Empty;

    // IEntity
    // Id 已定义

    // ISoftDeletable
    /// <summary>
    /// 是否已删除
    /// </summary>
    [BsonElement("isDeleted")]
    public bool IsDeleted { get; set; } = false;

    /// <summary>
    /// 删除时间
    /// </summary>
    [BsonElement("deletedAt")]
    public DateTime? DeletedAt { get; set; }

    /// <summary>
    /// 删除人ID
    /// </summary>
    [BsonElement("deletedBy")]
    public string? DeletedBy { get; set; }

    /// <summary>
    /// 删除原因
    /// </summary>
    [BsonElement("deletedReason")]
    public string? DeletedReason { get; set; }

    // ITimestamped
    /// <summary>
    /// 创建时间
    /// </summary>
    [BsonElement("createdAt")]
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    /// <summary>
    /// 更新时间
    /// </summary>
    [BsonElement("updatedAt")]
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    /// <summary>
    /// 创建人ID
    /// </summary>
    [BsonElement("createdBy")]
    public string? CreatedBy { get; set; }

    /// <summary>
    /// 创建人用户名
    /// </summary>
    [BsonElement("createdByUsername")]
    public string? CreatedByUsername { get; set; }

    /// <summary>
    /// 更新人ID
    /// </summary>
    [BsonElement("updatedBy")]
    public string? UpdatedBy { get; set; }

    /// <summary>
    /// 更新人用户名
    /// </summary>
    [BsonElement("updatedByUsername")]
    public string? UpdatedByUsername { get; set; }
}

/// <summary>
/// 工作流实例实体
/// </summary>
[BsonIgnoreExtraElements]
[BsonCollectionName("workflow_instances")]
public class WorkflowInstance : IEntity, ISoftDeletable, ITimestamped, IMultiTenant
{
    /// <summary>
    /// 实体ID
    /// </summary>
    [BsonId]
    [BsonRepresentation(BsonType.ObjectId)]
    public string Id { get; set; } = string.Empty;

    /// <summary>
    /// 关联流程定义ID
    /// </summary>
    [BsonElement("workflowDefinitionId")]
    public string WorkflowDefinitionId { get; set; } = string.Empty;

    /// <summary>
    /// 关联公文ID
    /// </summary>
    [BsonElement("documentId")]
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
    /// 流程变量
    /// </summary>
    [BsonElement("variables")]
    public Dictionary<string, object> Variables { get; set; } = new();

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
    /// 企业ID（多租户）
    /// </summary>
    [BsonElement("companyId")]
    public string CompanyId { get; set; } = string.Empty;

    /// <summary>
    /// 并行网关状态跟踪（nodeId -> completed branchIds）
    /// </summary>
    [BsonElement("parallelBranches")]
    public Dictionary<string, List<string>> ParallelBranches { get; set; } = new();

    /// <summary>
    /// 流程定义快照（创建实例时保存，确保已创建的流程不受后续定义变更影响）
    /// </summary>
    [BsonElement("workflowDefinitionSnapshot")]
    public WorkflowDefinition? WorkflowDefinitionSnapshot { get; set; }

    /// <summary>
    /// 表单定义快照（节点ID -> 表单定义，创建实例时保存）
    /// </summary>
    [BsonElement("formDefinitionSnapshots")]
    public Dictionary<string, FormDefinition> FormDefinitionSnapshots { get; set; } = new();

    // IEntity
    // Id 已定义

    // ISoftDeletable
    /// <summary>
    /// 是否已删除
    /// </summary>
    [BsonElement("isDeleted")]
    public bool IsDeleted { get; set; } = false;

    /// <summary>
    /// 删除时间
    /// </summary>
    [BsonElement("deletedAt")]
    public DateTime? DeletedAt { get; set; }

    /// <summary>
    /// 删除人ID
    /// </summary>
    [BsonElement("deletedBy")]
    public string? DeletedBy { get; set; }

    /// <summary>
    /// 删除原因
    /// </summary>
    [BsonElement("deletedReason")]
    public string? DeletedReason { get; set; }

    // ITimestamped
    /// <summary>
    /// 创建时间
    /// </summary>
    [BsonElement("createdAt")]
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    /// <summary>
    /// 更新时间
    /// </summary>
    [BsonElement("updatedAt")]
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    /// <summary>
    /// 创建人ID
    /// </summary>
    [BsonElement("createdBy")]
    public string? CreatedBy { get; set; }

    /// <summary>
    /// 创建人用户名
    /// </summary>
    [BsonElement("createdByUsername")]
    public string? CreatedByUsername { get; set; }

    /// <summary>
    /// 更新人ID
    /// </summary>
    [BsonElement("updatedBy")]
    public string? UpdatedBy { get; set; }

    /// <summary>
    /// 更新人用户名
    /// </summary>
    [BsonElement("updatedByUsername")]
    public string? UpdatedByUsername { get; set; }
}

/// <summary>
/// 审批记录实体
/// </summary>
[BsonIgnoreExtraElements]
[BsonCollectionName("approval_records")]
public class ApprovalRecord : IEntity, ISoftDeletable, ITimestamped, IMultiTenant
{
    /// <summary>
    /// 实体ID
    /// </summary>
    [BsonId]
    [BsonRepresentation(BsonType.ObjectId)]
    public string Id { get; set; } = string.Empty;

    /// <summary>
    /// 关联流程实例ID
    /// </summary>
    [BsonElement("workflowInstanceId")]
    public string WorkflowInstanceId { get; set; } = string.Empty;

    /// <summary>
    /// 节点ID
    /// </summary>
    [BsonElement("nodeId")]
    public string NodeId { get; set; } = string.Empty;

    /// <summary>
    /// 审批人ID
    /// </summary>
    [BsonElement("approverId")]
    public string ApproverId { get; set; } = string.Empty;

    /// <summary>
    /// 审批人姓名
    /// </summary>
    [BsonElement("approverName")]
    public string? ApproverName { get; set; }

    /// <summary>
    /// 审批动作
    /// </summary>
    [BsonElement("action")]
    [BsonRepresentation(BsonType.String)]
    public ApprovalAction Action { get; set; }

    /// <summary>
    /// 审批意见
    /// </summary>
    [BsonElement("comment")]
    public string? Comment { get; set; }

    /// <summary>
    /// 转办目标用户ID
    /// </summary>
    [BsonElement("delegateToUserId")]
    public string? DelegateToUserId { get; set; }

    /// <summary>
    /// 审批时间
    /// </summary>
    [BsonElement("approvedAt")]
    public DateTime? ApprovedAt { get; set; }

    /// <summary>
    /// 审批顺序
    /// </summary>
    [BsonElement("sequence")]
    public int Sequence { get; set; }

    // IEntity
    // Id 已定义

    // ISoftDeletable
    /// <summary>
    /// 是否已删除
    /// </summary>
    [BsonElement("isDeleted")]
    public bool IsDeleted { get; set; } = false;

    /// <summary>
    /// 删除时间
    /// </summary>
    [BsonElement("deletedAt")]
    public DateTime? DeletedAt { get; set; }

    /// <summary>
    /// 删除人ID
    /// </summary>
    [BsonElement("deletedBy")]
    public string? DeletedBy { get; set; }

    /// <summary>
    /// 删除原因
    /// </summary>
    [BsonElement("deletedReason")]
    public string? DeletedReason { get; set; }

    // ITimestamped
    /// <summary>
    /// 创建时间
    /// </summary>
    [BsonElement("createdAt")]
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    /// <summary>
    /// 更新时间
    /// </summary>
    [BsonElement("updatedAt")]
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    /// <summary>
    /// 创建人ID
    /// </summary>
    [BsonElement("createdBy")]
    public string? CreatedBy { get; set; }

    /// <summary>
    /// 创建人用户名
    /// </summary>
    [BsonElement("createdByUsername")]
    public string? CreatedByUsername { get; set; }

    /// <summary>
    /// 更新人ID
    /// </summary>
    [BsonElement("updatedBy")]
    public string? UpdatedBy { get; set; }

    /// <summary>
    /// 更新人用户名
    /// </summary>
    [BsonElement("updatedByUsername")]
    public string? UpdatedByUsername { get; set; }

    // IMultiTenant
    /// <summary>
    /// 企业ID（多租户）
    /// </summary>
    [BsonElement("companyId")]
    public string CompanyId { get; set; } = string.Empty;
}

/// <summary>
/// 公文实体
/// </summary>
[BsonIgnoreExtraElements]
[BsonCollectionName("documents")]
public class Document : IEntity, ISoftDeletable, ITimestamped, IMultiTenant
{
    /// <summary>
    /// 实体ID
    /// </summary>
    [BsonId]
    [BsonRepresentation(BsonType.ObjectId)]
    public string Id { get; set; } = string.Empty;

    /// <summary>
    /// 公文标题
    /// </summary>
    [BsonElement("title")]
    public string Title { get; set; } = string.Empty;

    /// <summary>
    /// 公文内容
    /// </summary>
    [BsonElement("content")]
    public string? Content { get; set; }

    /// <summary>
    /// 公文类型
    /// </summary>
    [BsonElement("documentType")]
    public string DocumentType { get; set; } = string.Empty;

    /// <summary>
    /// 分类
    /// </summary>
    [BsonElement("category")]
    public string? Category { get; set; }

    /// <summary>
    /// 关联流程实例ID
    /// </summary>
    [BsonElement("workflowInstanceId")]
    public string? WorkflowInstanceId { get; set; }

    /// <summary>
    /// 公文状态
    /// </summary>
    [BsonElement("status")]
    [BsonRepresentation(BsonType.String)]
    public DocumentStatus Status { get; set; } = DocumentStatus.Draft;

    /// <summary>
    /// 附件ID列表（GridFS）
    /// </summary>
    [BsonElement("attachmentIds")]
    public List<string> AttachmentIds { get; set; } = new();

    /// <summary>
    /// 表单数据
    /// </summary>
    [BsonElement("formData")]
    public Dictionary<string, object> FormData { get; set; } = new();

    /// <summary>
    /// 企业ID（多租户）
    /// </summary>
    [BsonElement("companyId")]
    public string CompanyId { get; set; } = string.Empty;

    // IEntity
    // Id 已定义

    // ISoftDeletable
    /// <summary>
    /// 是否已删除
    /// </summary>
    [BsonElement("isDeleted")]
    public bool IsDeleted { get; set; } = false;

    /// <summary>
    /// 删除时间
    /// </summary>
    [BsonElement("deletedAt")]
    public DateTime? DeletedAt { get; set; }

    /// <summary>
    /// 删除人ID
    /// </summary>
    [BsonElement("deletedBy")]
    public string? DeletedBy { get; set; }

    /// <summary>
    /// 删除原因
    /// </summary>
    [BsonElement("deletedReason")]
    public string? DeletedReason { get; set; }

    // ITimestamped
    /// <summary>
    /// 创建时间
    /// </summary>
    [BsonElement("createdAt")]
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    /// <summary>
    /// 更新时间
    /// </summary>
    [BsonElement("updatedAt")]
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    /// <summary>
    /// 创建人ID
    /// </summary>
    [BsonElement("createdBy")]
    public string? CreatedBy { get; set; }

    /// <summary>
    /// 创建人用户名
    /// </summary>
    [BsonElement("createdByUsername")]
    public string? CreatedByUsername { get; set; }

    /// <summary>
    /// 更新人ID
    /// </summary>
    [BsonElement("updatedBy")]
    public string? UpdatedBy { get; set; }

    /// <summary>
    /// 更新人用户名
    /// </summary>
    [BsonElement("updatedByUsername")]
    public string? UpdatedByUsername { get; set; }
}
/// <summary>
/// 日期范围过滤
/// </summary>
public class DateRangeFilter
{
    /// <summary>
    /// 开始日期
    /// </summary>
    public DateTime? Start { get; set; }

    /// <summary>
    /// 结束日期
    /// </summary>
    public DateTime? End { get; set; }

    /// <summary>
    /// 日期字段（createdAt, updatedAt, lastUsed）
    /// </summary>
    public string? Field { get; set; }
}

/// <summary>
/// 使用次数范围过滤
/// </summary>
public class UsageRangeFilter
{
    /// <summary>
    /// 最小使用次数
    /// </summary>
    public int? Min { get; set; }

    /// <summary>
    /// 最大使用次数
    /// </summary>
    public int? Max { get; set; }
}
