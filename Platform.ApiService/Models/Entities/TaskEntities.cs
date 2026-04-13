using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;

using Platform.ServiceDefaults.Models;
using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;

namespace Platform.ApiService.Models;

/// <summary>
/// 任务实体模型
/// </summary>
public class WorkTask : MultiTenantEntity
{
    /// <summary>任务名称</summary>
    public string TaskName { get; set; } = string.Empty;

    /// <summary>任务描述</summary>
    public string? Description { get; set; }

    /// <summary>任务类型</summary>
    public string TaskType { get; set; } = string.Empty;

    /// <summary>任务状态</summary>
    [BsonRepresentation(BsonType.Int32)]
    public TaskStatus Status { get; set; } = TaskStatus.Pending;

    /// <summary>优先级</summary>
    [BsonRepresentation(BsonType.Int32)]
    public TaskPriority Priority { get; set; } = TaskPriority.Medium;

    /// <summary>分配给的用户ID</summary>
    [BsonRepresentation(BsonType.ObjectId)]
    public string? AssignedTo { get; set; }

    /// <summary>分配时间</summary>
    public DateTime? AssignedAt { get; set; }

    /// <summary>计划开始时间</summary>
    public DateTime? PlannedStartTime { get; set; }

    /// <summary>计划完成时间</summary>
    public DateTime? PlannedEndTime { get; set; }

    /// <summary>实际开始时间</summary>
    public DateTime? ActualStartTime { get; set; }

    /// <summary>实际完成时间</summary>
    public DateTime? ActualEndTime { get; set; }

    /// <summary>预计耗时（分钟）</summary>
    public int? EstimatedDuration { get; set; }

    /// <summary>实际耗时（分钟）</summary>
    public int? ActualDuration { get; set; }

    /// <summary>执行结果</summary>
    [BsonRepresentation(BsonType.Int32)]
    public TaskExecutionResult ExecutionResult { get; set; } = TaskExecutionResult.NotExecuted;

    /// <summary>完成百分比 (0-100)</summary>
    public int CompletionPercentage { get; set; } = 0;

    /// <summary>任务备注</summary>
    public string? Remarks { get; set; }

    /// <summary>相关用户ID列表（参与者）</summary>
    public List<string> ParticipantIds { get; set; } = new();

    /// <summary>标签列表</summary>
    public List<string> Tags { get; set; } = new();

    /// <summary>附件列表</summary>
    public List<TaskAttachment> Attachments { get; set; } = new();

    /// <summary>所属项目ID（可选，支持独立任务）</summary>
    [BsonRepresentation(BsonType.ObjectId)]
    public string? ProjectId { get; set; }

    /// <summary>父任务ID（可选，支持任务层级结构）</summary>
    [BsonRepresentation(BsonType.ObjectId)]
    public string? ParentTaskId { get; set; }

    /// <summary>排序顺序（用于任务树排序）</summary>
    public int SortOrder { get; set; } = 0;

    /// <summary>工期（天数，从 PlannedStartTime 和 PlannedEndTime 计算或手动设置）</summary>
    public int? Duration { get; set; }
}

/// <summary>
/// 任务附件模型
/// </summary>
public class TaskAttachment
{
    /// <summary>附件ID</summary>
    public string Id { get; set; } = Guid.NewGuid().ToString();

    /// <summary>附件名称</summary>
    public string FileName { get; set; } = string.Empty;

    /// <summary>附件URL</summary>
    public string FileUrl { get; set; } = string.Empty;

    /// <summary>文件大小（字节）</summary>
    public long FileSize { get; set; }

    /// <summary>上传时间</summary>
    public DateTime UploadedAt { get; set; } = DateTime.UtcNow;

    /// <summary>上传者ID</summary>
    public string UploadedBy { get; set; } = string.Empty;
}

/// <summary>
/// 任务执行日志模型
/// </summary>
public class TaskExecutionLog : MultiTenantEntity
{
    /// <summary>任务ID</summary>
    [BsonRepresentation(BsonType.ObjectId)]
    public string TaskId { get; set; } = string.Empty;

    /// <summary>执行者ID</summary>
    [BsonRepresentation(BsonType.ObjectId)]
    public string ExecutedBy { get; set; } = string.Empty;

    /// <summary>执行开始时间</summary>
    public DateTime StartTime { get; set; } = DateTime.UtcNow;

    /// <summary>执行结束时间</summary>
    public DateTime? EndTime { get; set; }

    /// <summary>执行状态</summary>
    [BsonRepresentation(BsonType.Int32)]
    public TaskExecutionResult Status { get; set; } = TaskExecutionResult.NotExecuted;

    /// <summary>执行消息</summary>
    public string? Message { get; set; }

    /// <summary>错误信息</summary>
    public string? ErrorMessage { get; set; }

    /// <summary>执行进度百分比</summary>
    public int ProgressPercentage { get; set; } = 0;
}


