using System.ComponentModel.DataAnnotations;
using Platform.ApiService.Models;

namespace Platform.ApiService.Models;

public class VisitTaskDto
{
    public string Id { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public string ManagerName { get; set; } = string.Empty;
    public string Phone { get; set; } = string.Empty;
    public string VisitType { get; set; } = string.Empty;
    public string VisitMethod { get; set; } = string.Empty;
    public string? Details { get; set; }
    public string? TenantId { get; set; }
    public string? TenantName { get; set; }
    public string? VisitLocation { get; set; }
    [Required]
    public DateTime VisitDate { get; set; }
    public string Status { get; set; } = string.Empty;
    public string? Visitor { get; set; }
    public string? IntervieweeName { get; set; }
    public string? IntervieweePosition { get; set; }
    public string? Content { get; set; }
    public List<string> Photos { get; set; } = new();
    public string? Feedback { get; set; }
    public int? AssessmentScore { get; set; }
    public string? AssessmentId { get; set; }
}

public class CreateVisitTaskRequest
{
    [Required]
    public string Title { get; set; } = string.Empty;
    [Required]
    public string ManagerName { get; set; } = string.Empty;
    public string Phone { get; set; } = string.Empty;
    public string VisitType { get; set; } = "日常走访";
    public string VisitMethod { get; set; } = "实地走访";
    [Required(ErrorMessage = "走访时间不能为空")]
    public DateTime VisitDate { get; set; }
    public string? Details { get; set; }
    public string? TenantId { get; set; }
    public string? TenantName { get; set; }
    public string? VisitLocation { get; set; }
    public string? QuestionnaireId { get; set; }
    public string? Visitor { get; set; }
    public string? Status { get; set; }
    public string? IntervieweeName { get; set; }
    public string? IntervieweePosition { get; set; }
    public string? IntervieweePhone { get; set; }
    public string? Content { get; set; }
    public List<string>? Photos { get; set; }
    public List<string>? Attachments { get; set; }
    public string? Feedback { get; set; }
}

public class VisitAssessmentDto
{
    public string Id { get; set; } = string.Empty;
    public string TaskId { get; set; } = string.Empty;
    public string VisitorName { get; set; } = string.Empty;
    public string Phone { get; set; } = string.Empty;
    public string Location { get; set; } = string.Empty;
    public string TaskDescription { get; set; } = string.Empty;
    public int Score { get; set; }
    public string? Comments { get; set; }
}

public class VisitQuestionDto
{
    public string Id { get; set; } = string.Empty;
    public string Content { get; set; } = string.Empty;
    public string? Category { get; set; }
    public string Answer { get; set; } = string.Empty;
    public bool IsFrequentlyUsed { get; set; }
}

public class VisitQuestionnaireDto
{
    public string Id { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public string? Purpose { get; set; }
    public List<string> QuestionIds { get; set; } = new();
    public int QuestionCount => QuestionIds.Count;
    public int? SortOrder { get; set; }
}

public class GenerateAnswerRequest
{
    public string Content { get; set; } = string.Empty;
    public string? Category { get; set; }
}

public class VisitStatisticsDto
{
    public int PendingTasks { get; set; }
    public int CompletedTasksThisMonth { get; set; }
    public int ActiveManagers { get; set; }
    public decimal CompletionRate { get; set; }
    public int TotalAssessments { get; set; }
    public decimal AverageScore { get; set; }
    public Dictionary<string, int> TasksByType { get; set; } = new();
    public Dictionary<string, int> TasksByStatus { get; set; } = new();
    public Dictionary<string, int> ManagerRanking { get; set; } = new();
    public Dictionary<string, int> MonthlyTrends { get; set; } = new();
    public string? Period { get; set; }
    public int TotalQuestions { get; set; }
    public int FrequentlyUsedQuestions { get; set; }
}
