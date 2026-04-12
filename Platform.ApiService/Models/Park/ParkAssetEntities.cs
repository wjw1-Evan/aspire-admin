using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using MongoDB.Bson.Serialization.Attributes;
using Platform.ServiceDefaults.Attributes;
using Platform.ServiceDefaults.Models;

namespace Platform.ApiService.Models;

[BsonIgnoreExtraElements]
[Table("buildings")]
public class Building : MultiTenantEntity
{
    [Required]
    [StringLength(100)]
    [Column("name")]
    [BsonElement("name")]
    public string Name { get; set; } = string.Empty;

    [StringLength(500)]
    [Column("address")]
    [BsonElement("address")]
    public string? Address { get; set; }

    [Range(1, 200)]
    [Column("totalFloors")]
    [BsonElement("totalFloors")]
    public int TotalFloors { get; set; }

    [Column("totalArea")]
    [BsonElement("totalArea")]
    public decimal TotalArea { get; set; }

    [StringLength(50)]
    [Column("buildingType")]
    [BsonElement("buildingType")]
    public string? BuildingType { get; set; }

    [Range(1900, 2100)]
    [Column("yearBuilt")]
    [BsonElement("yearBuilt")]
    public int YearBuilt { get; set; }

    [Required]
    [Column("deliveryDate")]
    [BsonElement("deliveryDate")]
    public DateTime? DeliveryDate { get; set; }

    [StringLength(20)]
    [Column("status")]
    [BsonElement("status")]
    public string Status { get; set; } = "Active";

    [StringLength(1000)]
    [Column("description")]
    [BsonElement("description")]
    public string? Description { get; set; }

    [StringLength(500)]
    [Column("coverImage")]
    [BsonElement("coverImage")]
    public string? CoverImage { get; set; }

    [Column("images")]
    [BsonElement("images")]
    public List<string>? Images { get; set; }

    [Column("attachments")]
    [BsonElement("attachments")]
    public List<string>? Attachments { get; set; }
}

[BsonIgnoreExtraElements]
[Table("propertyUnits")]
public class PropertyUnit : MultiTenantEntity
{
    [Required]
    [StringLength(100)]
    [Column("buildingId")]
    [BsonElement("buildingId")]
    public string BuildingId { get; set; } = string.Empty;

    [Required]
    [StringLength(50)]
    [Column("unitNumber")]
    [BsonElement("unitNumber")]
    public string UnitNumber { get; set; } = string.Empty;

    [Range(-10, 200)]
    [Column("floor")]
    [BsonElement("floor")]
    public int Floor { get; set; }

    [Column("area")]
    [BsonElement("area")]
    public decimal Area { get; set; }

    [Column("monthlyRent")]
    [BsonElement("monthlyRent")]
    public decimal MonthlyRent { get; set; }

    [Column("dailyRent")]
    [BsonElement("dailyRent")]
    public decimal? DailyRent { get; set; }

    [StringLength(50)]
    [Column("unitType")]
    [BsonElement("unitType")]
    public string UnitType { get; set; } = "Office";

    [StringLength(20)]
    [Column("status")]
    [BsonElement("status")]
    public string Status { get; set; } = "Available";

    [StringLength(1000)]
    [Column("description")]
    [BsonElement("description")]
    public string? Description { get; set; }

    [StringLength(100)]
    [Column("currentTenantId")]
    [BsonElement("currentTenantId")]
    public string? CurrentTenantId { get; set; }

    [Column("leaseStartDate")]
    [BsonElement("leaseStartDate")]
    public DateTime? LeaseStartDate { get; set; }

    [Column("leaseEndDate")]
    [BsonElement("leaseEndDate")]
    public DateTime? LeaseEndDate { get; set; }

    [Column("facilities")]
    [BsonElement("facilities")]
    public List<string>? Facilities { get; set; }

    [Column("images")]
    [BsonElement("images")]
    public List<string>? Images { get; set; }

    [Column("attachments")]
    [BsonElement("attachments")]
    public List<string>? Attachments { get; set; }
}
