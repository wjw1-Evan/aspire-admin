using System;
using System.Collections.Generic;

namespace Platform.ApiService.Models;

/// <summary>
/// 创建任务请求DTO
/// </summary>
public class CreateTaskRequest
{
    /// <summary>任务名称</summary>
    public string TaskName { get; set; } = string.Empty;

    /// <summary>任务描述</summary>
    public string? Description { get; set; }

    /// <summary>任务类型</summary>
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
/// 任务查询请求DTO
/// </summary>
public class TaskQueryRequest
{
    /// <summary>页码</summary>
    public int Page { get; set; } = 1;

    /// <summary>每页数量</summary>
    public int PageSize { get; set; } = 10;

    /// <summary>搜索关键词</summary>
    public string? Search { get; set; }

    /// <summary>任务状态</summary>
    public int? Status { get; set; }

    /// <summary>优先级</summary>
    public int? Priority { get; set; }

    /// <summary>分配给的用户ID</summary>
    public string? AssignedTo { get; set; }

    /// <summary>创建者ID</summary>
    public string? CreatedBy { get; set; }

    /// <summary>任务类型</summary>
    public string? TaskType { get; set; }

    /// <summary>开始日期</summary>
    public DateTime? StartDate { get; set; }

    /// <summary>结束日期</summary>
    public DateTime? EndDate { get; set; }

    /// <summary>排序字段</summary>
    public string SortBy { get; set; } = "CreatedAt";

    /// <summary>排序顺序</summary>
    public string SortOrder { get; set; } = "desc";

    /// <summary>标签过滤</summary>
    public List<string>? Tags { get; set; }
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

    /// <summary>创建时间</summary>
    public DateTime CreatedAt { get; set; }

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

    /// <summary>父任务ID</summary>
    public string? ParentTaskId { get; set; }

    /// <summary>排序顺序</summary>
    public int SortOrder { get; set; }

    /// <summary>工期（天数）</summary>
    public int? Duration { get; set; }

    /// <summary>子任务列表</summary>
    public List<TaskDto> Children { get; set; } = new();
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

/// <summary>
/// 任务列表响应DTO
/// </summary>
public class TaskListResponse
{
    /// <summary>任务列表</summary>
    public List<TaskDto> Tasks { get; set; } = new();

    /// <summary>总数</summary>
    public int Total { get; set; }

    /// <summary>页码</summary>
    public int Page { get; set; }

    /// <summary>每页数量</summary>
    public int PageSize { get; set; }
}

/// <summary>
/// 任务执行日志DTO
/// </summary>
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

    /// <summary>创建时间</summary>
    public DateTime CreatedAt { get; set; }
}

