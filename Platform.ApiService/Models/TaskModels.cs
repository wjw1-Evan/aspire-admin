using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;

using Platform.ServiceDefaults.Models;
using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;

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
[BsonIgnoreExtraElements]
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
[BsonIgnoreExtraElements]
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

    /// <summary>逾期任务数</summary>
    public int OverdueTasks { get; set; }

    /// <summary>平均完成时间（分钟）</summary>
    public double AverageCompletionTime { get; set; }

    /// <summary>完成率（百分比）</summary>
    public double CompletionRate { get; set; }

    /// <summary>按优先级统计</summary>
    public Dictionary<string, int> TasksByPriority { get; set; } = new();

    /// <summary>按状态统计</summary>
    public Dictionary<string, int> TasksByStatus { get; set; } = new();
}

/// <summary>
/// 创建任务请求DTO
/// </summary>
public class CreateTaskRequest
{
    /// <summary>任务名称</summary>
    [Required]
    public string TaskName { get; set; } = string.Empty;

    /// <summary>任务描述</summary>
    public string? Description { get; set; }

    /// <summary>任务类型</summary>
    [Required]
    public string TaskType { get; set; } = string.Empty;

    /// <summary>优先级</summary>
    public int Priority { get; set; } = (int)TaskPriority.Medium;

    /// <summary>分配给的用户ID</summary>
    public string? AssignedTo { get; set; }

    /// <summary>计划开始时间</summary>
    public DateTime? PlannedStartTime { get; set; }

    /// <summary>计划完成时间</summary>
    public DateTime? PlannedEndTime { get; set; }

    /// <summary>预计耗时（分钟）</summary>
    public int? EstimatedDuration { get; set; }

    /// <summary>参与者ID列表</summary>
    public List<string> ParticipantIds { get; set; } = new();

    /// <summary>标签列表</summary>
    public List<string> Tags { get; set; } = new();

    /// <summary>备注</summary>
    public string? Remarks { get; set; }

    /// <summary>所属项目ID（可选）</summary>
    public string? ProjectId { get; set; }

    /// <summary>父任务ID（可选）</summary>
    public string? ParentTaskId { get; set; }

    /// <summary>排序顺序</summary>
    public int SortOrder { get; set; } = 0;

    /// <summary>工期（天数）</summary>
    public int? Duration { get; set; }
}

/// <summary>
/// 更新任务请求DTO
/// </summary>
public class UpdateTaskRequest
{
    /// <summary>任务ID</summary>
    public string TaskId { get; set; } = string.Empty;

    /// <summary>任务名称</summary>
    public string? TaskName { get; set; }

    /// <summary>任务描述</summary>
    public string? Description { get; set; }

    /// <summary>任务类型</summary>
    public string? TaskType { get; set; }

    /// <summary>优先级</summary>
    public int? Priority { get; set; }

    /// <summary>任务状态</summary>
    public int? Status { get; set; }

    /// <summary>分配给的用户ID</summary>
    public string? AssignedTo { get; set; }

    /// <summary>计划开始时间</summary>
    public DateTime? PlannedStartTime { get; set; }

    /// <summary>计划完成时间</summary>
    public DateTime? PlannedEndTime { get; set; }

    /// <summary>完成百分比</summary>
    public int? CompletionPercentage { get; set; }

    /// <summary>参与者ID列表</summary>
    public List<string>? ParticipantIds { get; set; }

    /// <summary>标签列表</summary>
    public List<string>? Tags { get; set; }

    /// <summary>备注</summary>
    public string? Remarks { get; set; }

    /// <summary>所属项目ID（可选）</summary>
    public string? ProjectId { get; set; }

    /// <summary>父任务ID（可选）</summary>
    public string? ParentTaskId { get; set; }

    /// <summary>排序顺序</summary>
    public int? SortOrder { get; set; }

    /// <summary>工期（天数）</summary>
    public int? Duration { get; set; }
}

/// <summary>
/// 分配任务请求DTO
/// </summary>
public class AssignTaskRequest
{
    /// <summary>任务ID</summary>
    public string TaskId { get; set; } = string.Empty;

    /// <summary>分配给的用户ID</summary>
    public string AssignedTo { get; set; } = string.Empty;

    /// <summary>分配备注</summary>
    public string? Remarks { get; set; }
}

/// <summary>
/// 执行任务请求DTO
/// </summary>
public class ExecuteTaskRequest
{
    /// <summary>任务ID</summary>
    public string TaskId { get; set; } = string.Empty;

    /// <summary>执行状态</summary>
    public int Status { get; set; } = (int)TaskStatus.InProgress;

    /// <summary>执行消息</summary>
    public string? Message { get; set; }

    /// <summary>完成百分比</summary>
    public int? CompletionPercentage { get; set; }
}

/// <summary>
/// 完成任务请求DTO
/// </summary>
public class CompleteTaskRequest
{
    /// <summary>任务ID</summary>
    public string TaskId { get; set; } = string.Empty;

    /// <summary>执行结果</summary>
    public int ExecutionResult { get; set; } = (int)TaskExecutionResult.Success;

    /// <summary>完成备注</summary>
    public string? Remarks { get; set; }

    /// <summary>错误信息（如果失败）</summary>
    public string? ErrorMessage { get; set; }
}

/// <summary>
/// 任务响应DTO
/// </summary>
public class TaskDto
{
    /// <summary>任务ID</summary>
    public string? Id { get; set; }

    /// <summary>任务名称</summary>
    public string TaskName { get; set; } = string.Empty;

    /// <summary>任务描述</summary>
    public string? Description { get; set; }

    /// <summary>任务类型</summary>
    public string TaskType { get; set; } = string.Empty;

    /// <summary>任务状态</summary>
    public int Status { get; set; }

    /// <summary>任务状态名称</summary>
    public string StatusName { get; set; } = string.Empty;

    /// <summary>优先级</summary>
    public int Priority { get; set; }

    /// <summary>优先级名称</summary>
    public string PriorityName { get; set; } = string.Empty;

    /// <summary>创建者ID</summary>
    public string CreatedBy { get; set; } = string.Empty;

    /// <summary>创建者名称</summary>
    public string? CreatedByName { get; set; }

    /// <summary>分配给的用户ID</summary>
    public string? AssignedTo { get; set; }

    /// <summary>分配给的用户名称</summary>
    public string? AssignedToName { get; set; }

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
    public int ExecutionResult { get; set; }

    /// <summary>执行结果名称</summary>
    public string ExecutionResultName { get; set; } = string.Empty;

    /// <summary>完成百分比</summary>
    public int CompletionPercentage { get; set; }

    /// <summary>任务备注</summary>
    public string? Remarks { get; set; }

    /// <summary>参与者ID列表</summary>
    public List<string> ParticipantIds { get; set; } = new();

    /// <summary>参与者信息列表</summary>
    public List<ParticipantInfo> Participants { get; set; } = new();

    /// <summary>标签列表</summary>
    public List<string> Tags { get; set; } = new();

    /// <summary>附件列表</summary>
    public List<TaskAttachmentDto> Attachments { get; set; } = new();

    /// <summary>最后更新时间</summary>
    public DateTime UpdatedAt { get; set; }

    /// <summary>最后更新者ID</summary>
    public string? UpdatedBy { get; set; }

    /// <summary>所属项目ID</summary>
    public string? ProjectId { get; set; }

    /// <summary>所属项目名称</summary>
    public string? ProjectName { get; set; }

    /// <summary>父任务ID</summary>
    public string? ParentTaskId { get; set; }

    /// <summary>排序顺序</summary>
    public int SortOrder { get; set; }

    /// <summary>工期（天数）</summary>
    public int? Duration { get; set; }

    /// <summary>子任务列表</summary>
    public List<TaskDto>? Children { get; set; }
}

/// <summary>
/// 参与者信息DTO
/// </summary>
public class ParticipantInfo
{
    /// <summary>用户ID</summary>
    public string UserId { get; set; } = string.Empty;

    /// <summary>用户名</summary>
    public string Username { get; set; } = string.Empty;

    /// <summary>用户邮箱</summary>
    public string? Email { get; set; }
}

/// <summary>
/// 任务附件DTO
/// </summary>
public class TaskAttachmentDto
{
    /// <summary>附件ID</summary>
    public string Id { get; set; } = string.Empty;

    /// <summary>附件名称</summary>
    public string FileName { get; set; } = string.Empty;

    /// <summary>附件URL</summary>
    public string FileUrl { get; set; } = string.Empty;

    /// <summary>文件大小（字节）</summary>
    public long FileSize { get; set; }

    /// <summary>上传时间</summary>
    public DateTime UploadedAt { get; set; }

    /// <summary>上传者ID</summary>
    public string UploadedBy { get; set; } = string.Empty;
}

public class TaskExecutionLogDto
{
    /// <summary>日志ID</summary>
    public string? Id { get; set; }

    /// <summary>任务ID</summary>
    public string TaskId { get; set; } = string.Empty;

    /// <summary>执行者ID</summary>
    public string ExecutedBy { get; set; } = string.Empty;

    /// <summary>执行者名称</summary>
    public string? ExecutedByName { get; set; }

    /// <summary>执行开始时间</summary>
    public DateTime StartTime { get; set; }

    /// <summary>执行结束时间</summary>
    public DateTime? EndTime { get; set; }

    /// <summary>执行状态</summary>
    public int Status { get; set; }

    /// <summary>执行状态名称</summary>
    public string StatusName { get; set; } = string.Empty;

    /// <summary>执行消息</summary>
    public string? Message { get; set; }

    /// <summary>错误信息</summary>
    public string? ErrorMessage { get; set; }

    /// <summary>执行进度百分比</summary>
    public int ProgressPercentage { get; set; }
}
