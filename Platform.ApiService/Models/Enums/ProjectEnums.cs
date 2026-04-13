namespace Platform.ApiService.Models;

public enum ProjectStatus
{
    Planning = 0,
    InProgress = 1,
    OnHold = 2,
    Completed = 3,
    Cancelled = 4
}

public enum ProjectPriority
{
    Low = 0,
    Medium = 1,
    High = 2
}

public enum ProjectMemberRole
{
    Manager = 0,
    Member = 1,
    Viewer = 2
}

public enum MilestoneStatus
{
    Pending = 0,
    Achieved = 1,
    Delayed = 2
}