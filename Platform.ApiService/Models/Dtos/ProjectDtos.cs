namespace Platform.ApiService.Models;

public class CreateProjectRequest
{
    public string Name { get; set; } = string.Empty;

    public string? Description { get; set; }

    public int Status { get; set; } = (int)ProjectStatus.Planning;

    public DateTime? StartDate { get; set; }

    public DateTime? EndDate { get; set; }

    public List<string>? MemberIds { get; set; }

    public decimal? Budget { get; set; }

    public int Priority { get; set; } = (int)ProjectPriority.Medium;
}

public class UpdateProjectRequest
{
    public string ProjectId { get; set; } = string.Empty;

    public string? Name { get; set; }

    public string? Description { get; set; }

    public int? Status { get; set; }

    public DateTime? StartDate { get; set; }

    public DateTime? EndDate { get; set; }

    public List<string>? MemberIds { get; set; }

    public decimal? Budget { get; set; }

    public int? Priority { get; set; }
}

public class ProjectDto
{
    public string? Id { get; set; }

    public string Name { get; set; } = string.Empty;

    public string? Description { get; set; }

    public int Status { get; set; }

    public string StatusName { get; set; } = string.Empty;

    public DateTime? StartDate { get; set; }

    public DateTime? EndDate { get; set; }

    public int Progress { get; set; }

    public List<string>? MemberIds { get; set; }

    public List<ProjectMemberDto>? ProjectMembers { get; set; }

    public decimal? Budget { get; set; }

    public int Priority { get; set; }

    public string PriorityName { get; set; } = string.Empty;

    public string? CreatedBy { get; set; }

    public string? CreatedByName { get; set; }

    public DateTime? CreatedAt { get; set; }

    public DateTime? UpdatedAt { get; set; }

    public bool CanEdit { get; set; }

    public bool CanDelete { get; set; }
}

public class AddProjectMemberRequest
{
    public string ProjectId { get; set; } = string.Empty;

    public string UserId { get; set; } = string.Empty;

    public int Role { get; set; } = (int)ProjectMemberRole.Member;

    public int Allocation { get; set; } = 100;
}

public class ProjectMemberDto
{
    public string? Id { get; set; }

    public string ProjectId { get; set; } = string.Empty;

    public string UserId { get; set; } = string.Empty;

    public string? UserName { get; set; }

    public string? UserEmail { get; set; }

    public int Role { get; set; }

    public string RoleName { get; set; } = string.Empty;

    public int Allocation { get; set; }
}

public class ProjectStatistics
{
    public int TotalProjects { get; set; }

    public int InProgressProjects { get; set; }

    public int CompletedProjects { get; set; }

    public int DelayedProjects { get; set; }

    public Dictionary<string, int> ProjectsByStatus { get; set; } = new();

    public Dictionary<string, int> ProjectsByPriority { get; set; } = new();
}

public class CreateMilestoneRequest
{
    public string ProjectId { get; set; } = string.Empty;

    public string Name { get; set; } = string.Empty;

    public DateTime TargetDate { get; set; }

    public string? Description { get; set; }
}

public class TaskDependencyDto
{
    public string? Id { get; set; }

    public string PredecessorTaskId { get; set; } = string.Empty;

    public string? PredecessorTaskName { get; set; }

    public string SuccessorTaskId { get; set; } = string.Empty;

    public string? SuccessorTaskName { get; set; }

    public int DependencyType { get; set; }

    public string DependencyTypeName { get; set; } = string.Empty;

    public int LagDays { get; set; }
}