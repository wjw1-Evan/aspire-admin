using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;
using Platform.ServiceDefaults.Attributes;
using Platform.ServiceDefaults.Models;
using System;
using System.Collections.Generic;

namespace Platform.ApiService.Models;

/// <summary>
/// 任务状态枚举
/// </summary>
public enum TaskStatus
{
    /// <summary>待分配</summary>
    Pending = 0,
    
    /// <summary>已分配</summary>
    Assigned = 1,
    
    /// <summary>执行中</summary>
    InProgress = 2,
    
    /// <summary>已完成</summary>
    Completed = 3,
    
    /// <summary>已取消</summary>
    Cancelled = 4,
    
    /// <summary>失败</summary>
    Failed = 5,
    
    /// <summary>暂停</summary>
    Paused = 6
}

/// <summary>
/// 任务优先级枚举
/// </summary>
public enum TaskPriority
{
    /// <summary>低</summary>
    Low = 0,
    
    /// <summary>中</summary>
    Medium = 1,
    
    /// <summary>高</summary>
    High = 2,
    
    /// <summary>紧急</summary>
    Urgent = 3
}

/// <summary>
/// 任务执行结果枚举
/// </summary>
public enum TaskExecutionResult
{
    /// <summary>未执行</summary>
    NotExecuted = 0,
    
    /// <summary>成功</summary>
    Success = 1,
    
    /// <summary>失败</summary>
    Failed = 2,
    
    /// <summary>超时</summary>
    Timeout = 3,
    
    /// <summary>被中断</summary>
    Interrupted = 4
}

/// <summary>
/// 任务实体模型
/// </summary>
[BsonIgnoreExtraElements]
[BsonCollectionName("tasks")]
public class WorkTask : IEntity, ISoftDeletable, ITimestamped, IMultiTenant
{
    /// <summary>任务ID</summary>
    [BsonId]
    [BsonRepresentation(BsonType.ObjectId)]
    public string Id { get; set; } = string.Empty;

    /// <summary>任务名称</summary>
    [BsonElement("taskName")]
    public string TaskName { get; set; } = string.Empty;

    /// <summary>任务描述</summary>
    [BsonElement("description")]
    public string? Description { get; set; }

    /// <summary>任务类型</summary>
    [BsonElement("taskType")]
    public string TaskType { get; set; } = string.Empty;

    /// <summary>任务状态</summary>
    [BsonElement("status")]
    [BsonRepresentation(BsonType.Int32)]
    public TaskStatus Status { get; set; } = TaskStatus.Pending;

    /// <summary>优先级</summary>
    [BsonElement("priority")]
    [BsonRepresentation(BsonType.Int32)]
    public TaskPriority Priority { get; set; } = TaskPriority.Medium;

    /// <summary>创建者ID</summary>
    [BsonElement("createdBy")]
    public string CreatedBy { get; set; } = string.Empty;

    /// <summary>创建时间</summary>
    [BsonElement("createdAt")]
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    /// <summary>分配给的用户ID</summary>
    [BsonElement("assignedTo")]
    public string? AssignedTo { get; set; }

    /// <summary>分配时间</summary>
    [BsonElement("assignedAt")]
    public DateTime? AssignedAt { get; set; }

    /// <summary>计划开始时间</summary>
    [BsonElement("plannedStartTime")]
    public DateTime? PlannedStartTime { get; set; }

    /// <summary>计划完成时间</summary>
    [BsonElement("plannedEndTime")]
    public DateTime? PlannedEndTime { get; set; }

    /// <summary>实际开始时间</summary>
    [BsonElement("actualStartTime")]
    public DateTime? ActualStartTime { get; set; }

    /// <summary>实际完成时间</summary>
    [BsonElement("actualEndTime")]
    public DateTime? ActualEndTime { get; set; }

    /// <summary>预计耗时（分钟）</summary>
    [BsonElement("estimatedDuration")]
    public int? EstimatedDuration { get; set; }

    /// <summary>实际耗时（分钟）</summary>
    [BsonElement("actualDuration")]
    public int? ActualDuration { get; set; }

    /// <summary>执行结果</summary>
    [BsonElement("executionResult")]
    [BsonRepresentation(BsonType.Int32)]
    public TaskExecutionResult ExecutionResult { get; set; } = TaskExecutionResult.NotExecuted;

    /// <summary>完成百分比 (0-100)</summary>
    [BsonElement("completionPercentage")]
    public int CompletionPercentage { get; set; } = 0;

    /// <summary>任务备注</summary>
    [BsonElement("remarks")]
    public string? Remarks { get; set; }

    /// <summary>所属企业ID</summary>
    [BsonElement("companyId")]
    public string CompanyId { get; set; } = string.Empty;

    /// <summary>相关用户ID列表（参与者）</summary>
    [BsonElement("participantIds")]
    public List<string> ParticipantIds { get; set; } = new();

    /// <summary>标签列表</summary>
    [BsonElement("tags")]
    public List<string> Tags { get; set; } = new();

    /// <summary>附件列表</summary>
    [BsonElement("attachments")]
    public List<TaskAttachment> Attachments { get; set; } = new();

    /// <summary>所属项目ID（可选，支持独立任务）</summary>
    [BsonElement("projectId")]
    public string? ProjectId { get; set; }

    /// <summary>父任务ID（可选，支持任务层级结构）</summary>
    [BsonElement("parentTaskId")]
    public string? ParentTaskId { get; set; }

    /// <summary>排序顺序（用于任务树排序）</summary>
    [BsonElement("sortOrder")]
    public int SortOrder { get; set; } = 0;

    /// <summary>工期（天数，从 PlannedStartTime 和 PlannedEndTime 计算或手动设置）</summary>
    [BsonElement("duration")]
    public int? Duration { get; set; }

    /// <summary>是否已删除</summary>
    [BsonElement("isDeleted")]
    public bool IsDeleted { get; set; } = false;

    /// <summary>删除时间</summary>
    [BsonElement("deletedAt")]
    public DateTime? DeletedAt { get; set; }

    /// <summary>删除者ID</summary>
    [BsonElement("deletedBy")]
    public string? DeletedBy { get; set; }

    /// <summary>删除原因</summary>
    [BsonElement("deletedReason")]
    public string? DeletedReason { get; set; }

    /// <summary>最后更新时间</summary>
    [BsonElement("updatedAt")]
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    /// <summary>最后更新者ID</summary>
    [BsonElement("updatedBy")]
    public string? UpdatedBy { get; set; }
}

/// <summary>
/// 任务附件模型
/// </summary>
[BsonIgnoreExtraElements]
public class TaskAttachment
{
    /// <summary>附件ID</summary>
    [BsonElement("id")]
    public string Id { get; set; } = Guid.NewGuid().ToString();

    /// <summary>附件名称</summary>
    [BsonElement("fileName")]
    public string FileName { get; set; } = string.Empty;

    /// <summary>附件URL</summary>
    [BsonElement("fileUrl")]
    public string FileUrl { get; set; } = string.Empty;

    /// <summary>文件大小（字节）</summary>
    [BsonElement("fileSize")]
    public long FileSize { get; set; }

    /// <summary>上传时间</summary>
    [BsonElement("uploadedAt")]
    public DateTime UploadedAt { get; set; } = DateTime.UtcNow;

    /// <summary>上传者ID</summary>
    [BsonElement("uploadedBy")]
    public string UploadedBy { get; set; } = string.Empty;
}

/// <summary>
/// 任务执行日志模型
/// </summary>
[BsonIgnoreExtraElements]
[BsonCollectionName("task_execution_logs")]
public class TaskExecutionLog : IEntity, ISoftDeletable, ITimestamped, IMultiTenant
{
    /// <summary>日志ID</summary>
    [BsonId]
    [BsonRepresentation(BsonType.ObjectId)]
    public string Id { get; set; } = string.Empty;

    /// <summary>任务ID</summary>
    [BsonElement("taskId")]
    public string TaskId { get; set; } = string.Empty;

    /// <summary>执行者ID</summary>
    [BsonElement("executedBy")]
    public string ExecutedBy { get; set; } = string.Empty;

    /// <summary>执行开始时间</summary>
    [BsonElement("startTime")]
    public DateTime StartTime { get; set; } = DateTime.UtcNow;

    /// <summary>执行结束时间</summary>
    [BsonElement("endTime")]
    public DateTime? EndTime { get; set; }

    /// <summary>执行状态</summary>
    [BsonElement("status")]
    [BsonRepresentation(BsonType.Int32)]
    public TaskExecutionResult Status { get; set; } = TaskExecutionResult.NotExecuted;

    /// <summary>执行消息</summary>
    [BsonElement("message")]
    public string? Message { get; set; }

    /// <summary>错误信息</summary>
    [BsonElement("errorMessage")]
    public string? ErrorMessage { get; set; }

    /// <summary>执行进度百分比</summary>
    [BsonElement("progressPercentage")]
    public int ProgressPercentage { get; set; } = 0;

    /// <summary>所属企业ID</summary>
    [BsonElement("companyId")]
    public string CompanyId { get; set; } = string.Empty;

    /// <summary>创建时间</summary>
    [BsonElement("createdAt")]
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    /// <summary>最后更新时间</summary>
    [BsonElement("updatedAt")]
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    /// <summary>是否已删除</summary>
    [BsonElement("isDeleted")]
    public bool IsDeleted { get; set; } = false;

    /// <summary>删除时间</summary>
    [BsonElement("deletedAt")]
    public DateTime? DeletedAt { get; set; }

    /// <summary>删除者ID</summary>
    [BsonElement("deletedBy")]
    public string? DeletedBy { get; set; }

    /// <summary>删除原因</summary>
    [BsonElement("deletedReason")]
    public string? DeletedReason { get; set; }
}

/// <summary>
/// 任务统计模型
/// </summary>
public class TaskStatistics
{
    /// <summary>总任务数</summary>
    public int TotalTasks { get; set; }

    /// <summary>待分配任务数</summary>
    public int PendingTasks { get; set; }

    /// <summary>进行中任务数</summary>
    public int InProgressTasks { get; set; }

    /// <summary>已完成任务数</summary>
    public int CompletedTasks { get; set; }

    /// <summary>失败任务数</summary>
    public int FailedTasks { get; set; }

    /// <summary>平均完成时间（分钟）</summary>
    public double AverageCompletionTime { get; set; }

    /// <summary>完成率（百分比）</summary>
    public double CompletionRate { get; set; }

    /// <summary>按优先级统计</summary>
    public Dictionary<string, int> TasksByPriority { get; set; } = new();

    /// <summary>按状态统计</summary>
    public Dictionary<string, int> TasksByStatus { get; set; } = new();
}

