namespace Platform.ApiService.Models;

public enum TaskStatus
{
    Pending = 0,
    Assigned = 1,
    InProgress = 2,
    Completed = 3,
    Cancelled = 4,
    Failed = 5,
    Paused = 6
}

public enum TaskPriority
{
    Low = 0,
    Medium = 1,
    High = 2,
    Urgent = 3
}

public enum TaskExecutionResult
{
    NotExecuted = 0,
    Success = 1,
    Failed = 2,
    Timeout = 3
}

public enum TaskDependencyType
{
    FinishToStart = 0,
    StartToStart = 1,
    FinishToFinish = 2,
    StartToFinish = 3
}