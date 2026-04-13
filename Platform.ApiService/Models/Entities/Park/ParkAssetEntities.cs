using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using MongoDB.Bson.Serialization.Attributes;

using Platform.ServiceDefaults.Models;

namespace Platform.ApiService.Models;

[BsonIgnoreExtraElements]
public class Building : MultiTenantEntity
{
    [Required]
    [StringLength(100)]
    public string Name { get; set; } = string.Empty;

    [StringLength(500)]
    public string? Address { get; set; }

    [Range(1, 200)]
    public int TotalFloors { get; set; }

    public decimal TotalArea { get; set; }

    [StringLength(50)]
    public string? BuildingType { get; set; }

    [Range(1900, 2100)]
    public int YearBuilt { get; set; }

    [Required]
    public DateTime? DeliveryDate { get; set; }

    [StringLength(20)]
    public string Status { get; set; } = "Active";

    [StringLength(1000)]
    public string? Description { get; set; }

    [StringLength(500)]
    public string? CoverImage { get; set; }

    public List<string>? Images { get; set; }

    public List<string>? Attachments { get; set; }
}

[BsonIgnoreExtraElements]
public class PropertyUnit : MultiTenantEntity
{
    [Required]
    [StringLength(100)]
    public string BuildingId { get; set; } = string.Empty;

    [Required]
    [StringLength(50)]
    public string UnitNumber { get; set; } = string.Empty;

    [Range(-10, 200)]
    public int Floor { get; set; }

    public decimal Area { get; set; }

    public decimal MonthlyRent { get; set; }

    public decimal? DailyRent { get; set; }

    [StringLength(50)]
    public string UnitType { get; set; } = "Office";

    [StringLength(20)]
    public string Status { get; set; } = "Available";

    [StringLength(1000)]
    public string? Description { get; set; }

    [StringLength(100)]
    public string? CurrentTenantId { get; set; }

    public DateTime? LeaseStartDate { get; set; }

    public DateTime? LeaseEndDate { get; set; }

    public List<string>? Facilities { get; set; }

    public List<string>? Images { get; set; }

    public List<string>? Attachments { get; set; }
}
