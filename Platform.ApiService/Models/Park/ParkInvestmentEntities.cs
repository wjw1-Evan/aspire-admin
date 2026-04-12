using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using MongoDB.Bson.Serialization.Attributes;
using Platform.ServiceDefaults.Attributes;
using Platform.ServiceDefaults.Models;

namespace Platform.ApiService.Models;

[BsonIgnoreExtraElements]
[Table("investmentLeads")]
public class InvestmentLead : MultiTenantEntity
{
    [Required]
    [StringLength(200)]
    [Column("companyName")]
    [BsonElement("companyName")]
    public string CompanyName { get; set; } = string.Empty;

    [StringLength(100)]
    [Column("contactPerson")]
    [BsonElement("contactPerson")]
    public string? ContactPerson { get; set; }

    [StringLength(50)]
    [Column("phone")]
    [BsonElement("phone")]
    public string? Phone { get; set; }

    [StringLength(200)]
    [Column("email")]
    [BsonElement("email")]
    [EmailAddress]
    public string? Email { get; set; }

    [StringLength(50)]
    [Column("industry")]
    [BsonElement("industry")]
    public string? Industry { get; set; }

    [StringLength(50)]
    [Column("source")]
    [BsonElement("source")]
    public string Source { get; set; } = "Direct";

    [Column("intendedArea")]
    [BsonElement("intendedArea")]
    public decimal? IntendedArea { get; set; }

    [Column("budget")]
    [BsonElement("budget")]
    public decimal? Budget { get; set; }

    [StringLength(20)]
    [Column("status")]
    [BsonElement("status")]
    public string Status { get; set; } = "New";

    [StringLength(20)]
    [Column("priority")]
    [BsonElement("priority")]
    public string Priority { get; set; } = "Medium";

    [StringLength(2000)]
    [Column("requirements")]
    [BsonElement("requirements")]
    public string? Requirements { get; set; }

    [StringLength(2000)]
    [Column("notes")]
    [BsonElement("notes")]
    public string? Notes { get; set; }

    [StringLength(100)]
    [Column("assignedTo")]
    [BsonElement("assignedTo")]
    public string? AssignedTo { get; set; }

    [Column("nextFollowUpDate")]
    [BsonElement("nextFollowUpDate")]
    public DateTime? NextFollowUpDate { get; set; }
}

[BsonIgnoreExtraElements]
[Table("investmentProjects")]
public class InvestmentProject : MultiTenantEntity
{
    [StringLength(100)]
    [Column("leadId")]
    [BsonElement("leadId")]
    public string? LeadId { get; set; }

    [Required]
    [StringLength(200)]
    [Column("projectName")]
    [BsonElement("projectName")]
    public string ProjectName { get; set; } = string.Empty;

    [StringLength(200)]
    [Column("companyName")]
    [BsonElement("companyName")]
    public string CompanyName { get; set; } = string.Empty;

    [StringLength(100)]
    [Column("contactPerson")]
    [BsonElement("contactPerson")]
    public string? ContactPerson { get; set; }

    [StringLength(50)]
    [Column("phone")]
    [BsonElement("phone")]
    public string? Phone { get; set; }

    [Column("intendedUnitIds")]
    [BsonElement("intendedUnitIds")]
    public List<string>? IntendedUnitIds { get; set; }

    [Column("intendedArea")]
    [BsonElement("intendedArea")]
    public decimal? IntendedArea { get; set; }

    [Column("proposedRent")]
    [BsonElement("proposedRent")]
    public decimal? ProposedRent { get; set; }

    [StringLength(20)]
    [Column("stage")]
    [BsonElement("stage")]
    public string Stage { get; set; } = "Initial";

    [Column("expectedSignDate")]
    [BsonElement("expectedSignDate")]
    public DateTime? ExpectedSignDate { get; set; }

    [Range(0, 100)]
    [Column("probability")]
    [BsonElement("probability")]
    public decimal? Probability { get; set; }

    [StringLength(2000)]
    [Column("notes")]
    [BsonElement("notes")]
    public string? Notes { get; set; }

    [StringLength(100)]
    [Column("assignedTo")]
    [BsonElement("assignedTo")]
    public string? AssignedTo { get; set; }
}

[BsonIgnoreExtraElements]
[Table("investmentFollowUps")]
public class InvestmentFollowUp : MultiTenantEntity
{
    [StringLength(100)]
    [Column("leadId")]
    [BsonElement("leadId")]
    public string? LeadId { get; set; }

    [StringLength(100)]
    [Column("projectId")]
    [BsonElement("projectId")]
    public string? ProjectId { get; set; }

    [StringLength(50)]
    [Column("followUpType")]
    [BsonElement("followUpType")]
    public string FollowUpType { get; set; } = "Call";

    [Required]
    [StringLength(2000)]
    [Column("content")]
    [BsonElement("content")]
    public string Content { get; set; } = string.Empty;

    [StringLength(500)]
    [Column("result")]
    [BsonElement("result")]
    public string? Result { get; set; }

    [Column("nextFollowUpDate")]
    [BsonElement("nextFollowUpDate")]
    public DateTime? NextFollowUpDate { get; set; }

    [StringLength(500)]
    [Column("nextAction")]
    [BsonElement("nextAction")]
    public string? NextAction { get; set; }
}
