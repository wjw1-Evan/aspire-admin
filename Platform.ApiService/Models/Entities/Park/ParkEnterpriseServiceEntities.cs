using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using MongoDB.Bson.Serialization.Attributes;

using Platform.ServiceDefaults.Models;

namespace Platform.ApiService.Models;

[BsonIgnoreExtraElements]
public class ServiceCategory : MultiTenantEntity
{
    [Required]
    [StringLength(100)]
    public string Name { get; set; } = string.Empty;

    [StringLength(500)]
    public string? Description { get; set; }

    [StringLength(100)]
    public string? Icon { get; set; }

    public int SortOrder { get; set; }

    public bool IsActive { get; set; } = true;
}

[BsonIgnoreExtraElements]
public class ServiceRequest : MultiTenantEntity
{
    [Required]
    [StringLength(100)]
    public string CategoryId { get; set; } = string.Empty;

    [StringLength(100)]
    public string? TenantId { get; set; }

    [Required]
    [StringLength(200)]
    public string Title { get; set; } = string.Empty;

    [StringLength(2000)]
    public string? Description { get; set; }

    [StringLength(100)]
    public string? ContactPerson { get; set; }

    [StringLength(50)]
    public string? ContactPhone { get; set; }

    [StringLength(20)]
    public string Priority { get; set; } = "Normal";

    [StringLength(200)]
    public string Status { get; set; } = "Pending";

    [StringLength(100)]
    public string? AssignedTo { get; set; }

    public DateTime? AssignedAt { get; set; }

    public DateTime? CompletedAt { get; set; }

    [StringLength(2000)]
    public string? Resolution { get; set; }

    [Range(1, 5)]
    public int? Rating { get; set; }

    [StringLength(500)]
    public string? Feedback { get; set; }

    public List<string>? Attachments { get; set; }
}
