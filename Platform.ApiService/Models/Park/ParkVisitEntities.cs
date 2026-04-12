using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using MongoDB.Bson.Serialization.Attributes;
using Platform.ServiceDefaults.Attributes;
using Platform.ServiceDefaults.Models;

namespace Platform.ApiService.Models;

[BsonIgnoreExtraElements]
[Table("visitTasks")]
public class VisitTask : MultiTenantEntity
{
    [Required]
    [StringLength(100)]
    [Column("managerName")]
    [BsonElement("managerName")]
    public string ManagerName { get; set; } = string.Empty;

    [Required]
    [StringLength(20)]
    [Column("phone")]
    [BsonElement("phone")]
    public string Phone { get; set; } = string.Empty;

    [Required]
    [StringLength(200)]
    [Column("title")]
    [BsonElement("title")]
    public string Title { get; set; } = string.Empty;

    [StringLength(50)]
    [Column("visitType")]
    [BsonElement("visitType")]
    public string VisitType { get; set; } = "日常走访";

    [StringLength(50)]
    [Column("visitMethod")]
    [BsonElement("visitMethod")]
    public string VisitMethod { get; set; } = "实地走访";

    [StringLength(2000)]
    [Column("details")]
    [BsonElement("details")]
    public string? Details { get; set; }

    [StringLength(100)]
    [Column("tenantId")]
    [BsonElement("tenantId")]
    public string? TenantId { get; set; }

    [StringLength(200)]
    [Column("tenantName")]
    [BsonElement("tenantName")]
    public string? TenantName { get; set; }

    [StringLength(500)]
    [Column("visitLocation")]
    [BsonElement("visitLocation")]
    public string? VisitLocation { get; set; }

    [Required]
    [Column("visitDate")]
    [BsonElement("visitDate")]
    public DateTime VisitDate { get; set; }

    [StringLength(20)]
    [Column("status")]
    [BsonElement("status")]
    public string Status { get; set; } = "Pending";

    [StringLength(100)]
    [Column("questionnaireId")]
    [BsonElement("questionnaireId")]
    public string? QuestionnaireId { get; set; }

    [StringLength(100)]
    [Column("visitor")]
    [BsonElement("visitor")]
    public string? Visitor { get; set; }

    [StringLength(100)]
    [Column("intervieweeName")]
    [BsonElement("intervieweeName")]
    public string? IntervieweeName { get; set; }

    [StringLength(100)]
    [Column("intervieweePosition")]
    [BsonElement("intervieweePosition")]
    public string? IntervieweePosition { get; set; }

    [StringLength(50)]
    [Column("intervieweePhone")]
    [BsonElement("intervieweePhone")]
    public string? IntervieweePhone { get; set; }

    [Column("content")]
    [BsonElement("content")]
    public string? Content { get; set; }

    [Column("photos")]
    [BsonElement("photos")]
    public List<string> Photos { get; set; } = new();

    [Column("attachments")]
    [BsonElement("attachments")]
    public List<string> Attachments { get; set; } = new();

    [Column("feedback")]
    [BsonElement("feedback")]
    public string? Feedback { get; set; }
}

[BsonIgnoreExtraElements]
[Table("visitAssessments")]
public class VisitAssessment : MultiTenantEntity
{
    [Required]
    [StringLength(100)]
    [Column("taskId")]
    [BsonElement("taskId")]
    public string TaskId { get; set; } = string.Empty;

    [Required]
    [StringLength(100)]
    [Column("visitorName")]
    [BsonElement("visitorName")]
    public string VisitorName { get; set; } = string.Empty;

    [Required]
    [StringLength(50)]
    [Column("phone")]
    [BsonElement("phone")]
    public string Phone { get; set; } = string.Empty;

    [Required]
    [StringLength(500)]
    [Column("location")]
    [BsonElement("location")]
    public string Location { get; set; } = string.Empty;

    [Required]
    [StringLength(2000)]
    [Column("taskDescription")]
    [BsonElement("taskDescription")]
    public string TaskDescription { get; set; } = string.Empty;

    [Range(0, 100)]
    [Column("score")]
    [BsonElement("score")]
    public int Score { get; set; }

    [StringLength(1000)]
    [Column("comments")]
    [BsonElement("comments")]
    public string? Comments { get; set; }
}

[BsonIgnoreExtraElements]
[Table("visitQuestions")]
public class VisitQuestion : MultiTenantEntity
{
    [Required]
    [StringLength(1000)]
    [Column("content")]
    [BsonElement("content")]
    public string Content { get; set; } = string.Empty;

    [StringLength(100)]
    [Column("category")]
    [BsonElement("category")]
    public string? Category { get; set; }

    [Required]
    [StringLength(2000)]
    [Column("answer")]
    [BsonElement("answer")]
    public string Answer { get; set; } = string.Empty;

    public bool? IsFrequentlyUsed { get; set; }
}

[BsonIgnoreExtraElements]
[Table("visitQuestionnaires")]
public class VisitQuestionnaire : MultiTenantEntity
{
    [Required]
    [StringLength(200)]
    [Column("title")]
    [BsonElement("title")]
    public string Title { get; set; } = string.Empty;

    [StringLength(500)]
    [Column("purpose")]
    [BsonElement("purpose")]
    public string? Purpose { get; set; }

    [Column("questionIds")]
    [BsonElement("questionIds")]
    public List<string> QuestionIds { get; set; } = new();

    [Column("sortOrder")]
    [BsonElement("sortOrder")]
    public int? SortOrder { get; set; }

    [StringLength(1000)]
    [Column("notes")]
    [BsonElement("notes")]
    public string? Notes { get; set; }
}
