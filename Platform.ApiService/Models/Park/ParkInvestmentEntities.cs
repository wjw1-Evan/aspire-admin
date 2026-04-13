using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using MongoDB.Bson.Serialization.Attributes;

using Platform.ServiceDefaults.Models;

namespace Platform.ApiService.Models;

[BsonIgnoreExtraElements]
public class InvestmentLead : MultiTenantEntity
{
    [Required]
    [StringLength(200)]
    public string CompanyName { get; set; } = string.Empty;

    [StringLength(100)]
    public string? ContactPerson { get; set; }

    [StringLength(50)]
    public string? Phone { get; set; }

    [StringLength(200)]
    [EmailAddress]
    public string? Email { get; set; }

    [StringLength(50)]
    public string? Industry { get; set; }

    [StringLength(50)]
    public string Source { get; set; } = "Direct";

    public decimal? IntendedArea { get; set; }

    public decimal? Budget { get; set; }

    [StringLength(20)]
    public string Status { get; set; } = "New";

    [StringLength(20)]
    public string Priority { get; set; } = "Medium";

    [StringLength(2000)]
    public string? Requirements { get; set; }

    [StringLength(2000)]
    public string? Notes { get; set; }

    [StringLength(100)]
    public string? AssignedTo { get; set; }

    public DateTime? NextFollowUpDate { get; set; }
}

[BsonIgnoreExtraElements]
public class InvestmentProject : MultiTenantEntity
{
    [StringLength(100)]
    public string? LeadId { get; set; }

    [Required]
    [StringLength(200)]
    public string ProjectName { get; set; } = string.Empty;

    [StringLength(200)]
    public string CompanyName { get; set; } = string.Empty;

    [StringLength(100)]
    public string? ContactPerson { get; set; }

    [StringLength(50)]
    public string? Phone { get; set; }

    public List<string>? IntendedUnitIds { get; set; }

    public decimal? IntendedArea { get; set; }

    public decimal? ProposedRent { get; set; }

    [StringLength(20)]
    public string Stage { get; set; } = "Initial";

    public DateTime? ExpectedSignDate { get; set; }

    [Range(0, 100)]
    public decimal? Probability { get; set; }

    [StringLength(2000)]
    public string? Notes { get; set; }

    [StringLength(100)]
    public string? AssignedTo { get; set; }
}

[BsonIgnoreExtraElements]
public class InvestmentFollowUp : MultiTenantEntity
{
    [StringLength(100)]
    public string? LeadId { get; set; }

    [StringLength(100)]
    public string? ProjectId { get; set; }

    [StringLength(50)]
    public string FollowUpType { get; set; } = "Call";

    [Required]
    [StringLength(2000)]
    public string Content { get; set; } = string.Empty;

    [StringLength(500)]
    public string? Result { get; set; }

    public DateTime? NextFollowUpDate { get; set; }

    [StringLength(500)]
    public string? NextAction { get; set; }
}
