using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;
using Platform.ServiceDefaults.Models;

using System.ComponentModel.DataAnnotations.Schema;

namespace Platform.ApiService.Models.Workflow;

/// <summary>
/// 批量操作记录
/// </summary>
public class BulkOperation : MultiTenantEntity
{
    /// <summary>
    /// 操作类型
    /// </summary>
    [BsonRepresentation(BsonType.String)]
    public BulkOperationType OperationType { get; set; }

    /// <summary>
    /// 操作状态
    /// </summary>
    [BsonRepresentation(BsonType.String)]
    public BulkOperationStatus Status { get; set; } = BulkOperationStatus.Queued;

    /// <summary>
    /// 目标工作流ID列表
    /// </summary>
    public List<string> TargetWorkflowIds { get; set; } = new();

    /// <summary>
    /// 操作参数（JSON格式）
    /// </summary>
    [NotMapped]
    public Dictionary<string, object> Parameters { get; set; } = new();

    /// <summary>
    /// 总数量
    /// </summary>
    public int TotalCount { get; set; }

    /// <summary>
    /// 已处理数量
    /// </summary>
    public int ProcessedCount { get; set; } = 0;

    /// <summary>
    /// 成功数量
    /// </summary>
    public int SuccessCount { get; set; } = 0;

    /// <summary>
    /// 失败数量
    /// </summary>
    public int FailureCount { get; set; } = 0;

    /// <summary>
    /// 错误信息列表
    /// </summary>
    public List<BulkOperationError> Errors { get; set; } = new();

    /// <summary>
    /// 开始时间
    /// </summary>
    public DateTime? StartedAt { get; set; }

    /// <summary>
    /// 完成时间
    /// </summary>
    public DateTime? CompletedAt { get; set; }

    /// <summary>
    /// 预估完成时间
    /// </summary>
    public DateTime? EstimatedCompletionAt { get; set; }

    /// <summary>
    /// 是否可取消
    /// </summary>
    public bool Cancellable { get; set; } = true;
}

/// <summary>
/// 批量操作错误
/// </summary>
public class BulkOperationError
{
    /// <summary>
    /// 工作流ID
    /// </summary>
    public string WorkflowId { get; set; } = string.Empty;

    /// <summary>
    /// 工作流名称
    /// </summary>
    public string? WorkflowName { get; set; }

    /// <summary>
    /// 错误消息
    /// </summary>
    public string ErrorMessage { get; set; } = string.Empty;

    /// <summary>
    /// 错误代码
    /// </summary>
    public string? ErrorCode { get; set; }

    /// <summary>
    /// 发生时间
    /// </summary>
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
    [BsonRepresentation(BsonType.String)]
    public ExportFormat Format { get; set; } = ExportFormat.Json;

    /// <summary>
    /// 是否包含分析数据
    /// </summary>
    public bool IncludeAnalytics { get; set; } = false;

    /// <summary>
    /// 是否包含依赖项
    /// </summary>
    public bool IncludeDependencies { get; set; } = false;

    /// <summary>
    /// 是否包含历史版本
    /// </summary>
    public bool IncludeVersionHistory { get; set; } = false;

    /// <summary>
    /// 过滤条件
    /// </summary>
    public Dictionary<string, object> Filters { get; set; } = new();

    /// <summary>
    /// 自定义字段列表
    /// </summary>
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
    public int ImportedCount { get; set; } = 0;

    /// <summary>
    /// 跳过的工作流数量
    /// </summary>
    public int SkippedCount { get; set; } = 0;

    /// <summary>
    /// 失败的工作流数量
    /// </summary>
    public int FailedCount { get; set; } = 0;

    /// <summary>
    /// 冲突列表
    /// </summary>
    public List<ImportConflict> Conflicts { get; set; } = new();

    /// <summary>
    /// 错误列表
    /// </summary>
    public List<ImportError> Errors { get; set; } = new();

    /// <summary>
    /// 导入的工作流ID列表
    /// </summary>
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
    public string WorkflowName { get; set; } = string.Empty;

    /// <summary>
    /// 冲突类型
    /// </summary>
    public string ConflictType { get; set; } = string.Empty;

    /// <summary>
    /// 现有工作流ID
    /// </summary>
    public string? ExistingWorkflowId { get; set; }

    /// <summary>
    /// 冲突描述
    /// </summary>
    public string Description { get; set; } = string.Empty;

    /// <summary>
    /// 建议解决方案
    /// </summary>
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
    public string? WorkflowName { get; set; }

    /// <summary>
    /// 错误消息
    /// </summary>
    public string ErrorMessage { get; set; } = string.Empty;

    /// <summary>
    /// 错误详情
    /// </summary>
    public string? ErrorDetails { get; set; }

    /// <summary>
    /// 行号（如果适用）
    /// </summary>
    public int? LineNumber { get; set; }
}