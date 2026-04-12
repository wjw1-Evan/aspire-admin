using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using MongoDB.Bson.Serialization.Attributes;
using Platform.ServiceDefaults.Attributes;
using Platform.ServiceDefaults.Models;

namespace Platform.ApiService.Models;

[BsonIgnoreExtraElements]
[Table("serviceCategories")]
public class ServiceCategory : MultiTenantEntity
{
    [Required]
    [StringLength(100)]
    [Column("name")]
    [BsonElement("name")]
    public string Name { get; set; } = string.Empty;

    [StringLength(500)]
    [Column("description")]
    [BsonElement("description")]
    public string? Description { get; set; }

    [StringLength(100)]
    [Column("icon")]
    [BsonElement("icon")]
    public string? Icon { get; set; }

    [Column("sortOrder")]
    [BsonElement("sortOrder")]
    public int SortOrder { get; set; }

    [Column("isActive")]
    [BsonElement("isActive")]
    public bool IsActive { get; set; } = true;
}

[BsonIgnoreExtraElements]
[Table("serviceRequests")]
public class ServiceRequest : MultiTenantEntity
{
    [Required]
    [StringLength(100)]
    [Column("categoryId")]
    [BsonElement("categoryId")]
    public string CategoryId { get; set; } = string.Empty;

    [StringLength(100)]
    [Column("tenantId")]
    [BsonElement("tenantId")]
    public string? TenantId { get; set; }

    [Required]
    [StringLength(200)]
    [Column("title")]
    [BsonElement("title")]
    public string Title { get; set; } = string.Empty;

    [StringLength(2000)]
    [Column("description")]
    [BsonElement("description")]
    public string? Description { get; set; }

    [StringLength(100)]
    [Column("contactPerson")]
    [BsonElement("contactPerson")]
    public string? ContactPerson { get; set; }

    [StringLength(50)]
    [Column("contactPhone")]
    [BsonElement("contactPhone")]
    public string? ContactPhone { get; set; }

    [StringLength(20)]
    [Column("priority")]
    [BsonElement("priority")]
    public string Priority { get; set; } = "Normal";

    [StringLength(200)]
    [Column("status")]
    [BsonElement("status")]
    public string Status { get; set; } = "Pending";

    [StringLength(100)]
    [Column("assignedTo")]
    [BsonElement("assignedTo")]
    public string? AssignedTo { get; set; }

    [Column("assignedAt")]
    [BsonElement("assignedAt")]
    public DateTime? AssignedAt { get; set; }

    [Column("completedAt")]
    [BsonElement("completedAt")]
    public DateTime? CompletedAt { get; set; }

    [StringLength(2000)]
    [Column("resolution")]
    [BsonElement("resolution")]
    public string? Resolution { get; set; }

    [Range(1, 5)]
    [Column("rating")]
    [BsonElement("rating")]
    public int? Rating { get; set; }

    [StringLength(500)]
    [Column("feedback")]
    [BsonElement("feedback")]
    public string? Feedback { get; set; }

    [Column("attachments")]
    [BsonElement("attachments")]
    public List<string>? Attachments { get; set; }
}
