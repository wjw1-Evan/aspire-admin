using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using MongoDB.Bson.Serialization.Attributes;

using Platform.ServiceDefaults.Models;

namespace Platform.ApiService.Models;

[BsonIgnoreExtraElements]
public class VisitTask : MultiTenantEntity
{
    [Required]
    [StringLength(100)]
    public string ManagerName { get; set; } = string.Empty;

    [Required]
    [StringLength(20)]
    public string Phone { get; set; } = string.Empty;

    [Required]
    [StringLength(200)]
    public string Title { get; set; } = string.Empty;

    [StringLength(50)]
    public string VisitType { get; set; } = "日常走访";

    [StringLength(50)]
    public string VisitMethod { get; set; } = "实地走访";

    [StringLength(2000)]
    public string? Details { get; set; }

    [StringLength(100)]
    public string? TenantId { get; set; }

    [StringLength(200)]
    public string? TenantName { get; set; }

    [StringLength(500)]
    public string? VisitLocation { get; set; }

    [Required]
    public DateTime VisitDate { get; set; }

    [StringLength(20)]
    public string Status { get; set; } = "Pending";

    [StringLength(100)]
    public string? QuestionnaireId { get; set; }

    [StringLength(100)]
    public string? Visitor { get; set; }

    [StringLength(100)]
    public string? IntervieweeName { get; set; }

    [StringLength(100)]
    public string? IntervieweePosition { get; set; }

    [StringLength(50)]
    public string? IntervieweePhone { get; set; }

    public string? Content { get; set; }

    public List<string> Photos { get; set; } = new();

    public List<string> Attachments { get; set; } = new();

    public string? Feedback { get; set; }
}

[BsonIgnoreExtraElements]
public class VisitAssessment : MultiTenantEntity
{
    [Required]
    [StringLength(100)]
    public string TaskId { get; set; } = string.Empty;

    [Required]
    [StringLength(100)]
    public string VisitorName { get; set; } = string.Empty;

    [Required]
    [StringLength(50)]
    public string Phone { get; set; } = string.Empty;

    [Required]
    [StringLength(500)]
    public string Location { get; set; } = string.Empty;

    [Required]
    [StringLength(2000)]
    public string TaskDescription { get; set; } = string.Empty;

    [Range(0, 100)]
    public int Score { get; set; }

    [StringLength(1000)]
    public string? Comments { get; set; }
}

[BsonIgnoreExtraElements]
public class VisitQuestion : MultiTenantEntity
{
    [Required]
    [StringLength(1000)]
    public string Content { get; set; } = string.Empty;

    [StringLength(100)]
    public string? Category { get; set; }

    [Required]
    [StringLength(2000)]
    public string Answer { get; set; } = string.Empty;

    public bool? IsFrequentlyUsed { get; set; }
}

[BsonIgnoreExtraElements]
public class VisitQuestionnaire : MultiTenantEntity
{
    [Required]
    [StringLength(200)]
    public string Title { get; set; } = string.Empty;

    [StringLength(500)]
    public string? Purpose { get; set; }

    public List<string> QuestionIds { get; set; } = new();

    public int? SortOrder { get; set; }

    [StringLength(1000)]
    public string? Notes { get; set; }
}
