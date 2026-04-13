using System.ComponentModel.DataAnnotations;

namespace Platform.ApiService.Models;

public class CreateTaskRequest
{
    [Required]
    public string TaskName { get; set; } = string.Empty;

    public string? Description { get; set; }

    [Required]
    public string TaskType { get; set; } = string.Empty;

    public int Priority { get; set; } = (int)TaskPriority.Medium;

    public string? AssignedTo { get; set; }

    public DateTime? PlannedStartTime { get; set; }

    public DateTime? PlannedEndTime { get; set; }

    public int? EstimatedDuration { get; set; }

    public List<string> ParticipantIds { get; set; } = new();

    public List<string> Tags { get; set; } = new();

    public string? Remarks { get; set; }

    public string? ProjectId { get; set; }

    public string? ParentTaskId { get; set; }

    public int SortOrder { get; set; } = 0;

    public int? Duration { get; set; }
}

public class UpdateTaskRequest
{
    public string TaskId { get; set; } = string.Empty;

    public string? TaskName { get; set; }

    public string? Description { get; set; }

    public string? TaskType { get; set; }

    public int? Priority { get; set; }

    public int? Status { get; set; }

    public string? AssignedTo { get; set; }

    public DateTime? PlannedStartTime { get; set; }

    public DateTime? PlannedEndTime { get; set; }

    public int? CompletionPercentage { get; set; }

    public List<string>? ParticipantIds { get; set; }

    public List<string>? Tags { get; set; }

    public string? Remarks { get; set; }

    public string? ProjectId { get; set; }

    public string? ParentTaskId { get; set; }

    public int? SortOrder { get; set; }

    public int? Duration { get; set; }
}

public class AssignTaskRequest
{
    public string TaskId { get; set; } = string.Empty;

    public string AssignedTo { get; set; } = string.Empty;

    public string? Remarks { get; set; }
}

public class ExecuteTaskRequest
{
    public string TaskId { get; set; } = string.Empty;

    public int Status { get; set; } = (int)TaskStatus.InProgress;

    public string? Message { get; set; }

    public int? CompletionPercentage { get; set; }
}

public class CompleteTaskRequest
{
    public string TaskId { get; set; } = string.Empty;

    public int ExecutionResult { get; set; } = (int)TaskExecutionResult.Success;

    public string? Remarks { get; set; }

    public string? ErrorMessage { get; set; }
}

public class TaskDto
{
    public string? Id { get; set; }

    public string TaskName { get; set; } = string.Empty;

    public string? Description { get; set; }

    public string TaskType { get; set; } = string.Empty;

    public int Status { get; set; }

    public string StatusName { get; set; } = string.Empty;

    public int Priority { get; set; }

    public string PriorityName { get; set; } = string.Empty;

    public string CreatedBy { get; set; } = string.Empty;

    public string? CreatedByName { get; set; }

    public string? AssignedTo { get; set; }

    public string? AssignedToName { get; set; }

    public DateTime? AssignedAt { get; set; }

    public DateTime? PlannedStartTime { get; set; }

    public DateTime? PlannedEndTime { get; set; }

    public DateTime? ActualStartTime { get; set; }

    public DateTime? ActualEndTime { get; set; }

    public int? EstimatedDuration { get; set; }

    public int? ActualDuration { get; set; }

    public int ExecutionResult { get; set; }

    public string ExecutionResultName { get; set; } = string.Empty;

    public int CompletionPercentage { get; set; }

    public string? Remarks { get; set; }

    public List<string> ParticipantIds { get; set; } = new();

    public List<ParticipantInfo> Participants { get; set; } = new();

    public List<string> Tags { get; set; } = new();

    public List<TaskAttachmentDto> Attachments { get; set; } = new();

    public DateTime UpdatedAt { get; set; }

    public string? UpdatedBy { get; set; }

    public string? ProjectId { get; set; }

    public string? ProjectName { get; set; }

    public string? ParentTaskId { get; set; }

    public int SortOrder { get; set; }

    public int? Duration { get; set; }

    public List<TaskDto>? Children { get; set; }
}

public class ParticipantInfo
{
    public string UserId { get; set; } = string.Empty;

    public string Username { get; set; } = string.Empty;

    public string? Email { get; set; }
}

public class TaskAttachmentDto
{
    public string Id { get; set; } = string.Empty;

    public string FileName { get; set; } = string.Empty;

    public string FileUrl { get; set; } = string.Empty;

    public long FileSize { get; set; }

    public DateTime UploadedAt { get; set; }

    public string UploadedBy { get; set; } = string.Empty;
}

public class TaskExecutionLogDto
{
    public string? Id { get; set; }

    public string TaskId { get; set; } = string.Empty;

    public string ExecutedBy { get; set; } = string.Empty;

    public string? ExecutedByName { get; set; }

    public DateTime StartTime { get; set; }

    public DateTime? EndTime { get; set; }

    public int Status { get; set; }

    public string StatusName { get; set; } = string.Empty;

    public string? Message { get; set; }

    public string? ErrorMessage { get; set; }

    public int ProgressPercentage { get; set; }
}

public class TaskStatistics
{
    public int TotalTasks { get; set; }

    public int PendingTasks { get; set; }

    public int InProgressTasks { get; set; }

    public int CompletedTasks { get; set; }

    public int FailedTasks { get; set; }

    public int OverdueTasks { get; set; }

    public double AverageCompletionTime { get; set; }

    public double CompletionRate { get; set; }

    public Dictionary<string, int> TasksByPriority { get; set; } = new();

    public Dictionary<string, int> TasksByStatus { get; set; } = new();
}