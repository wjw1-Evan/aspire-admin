using System.ComponentModel.DataAnnotations;
using Platform.ApiService.Models;

namespace Platform.ApiService.Models;

public class BuildingDto
{
    public string Id { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string? Address { get; set; }
    public int TotalFloors { get; set; }
    public decimal TotalArea { get; set; }
    public decimal RentedArea { get; set; }
    public decimal OccupancyRate { get; set; }
    public string? BuildingType { get; set; }
    public int YearBuilt { get; set; }
    public DateTime? DeliveryDate { get; set; }
    public string Status { get; set; } = string.Empty;
    public string? Description { get; set; }
    public string? CoverImage { get; set; }
    public int TotalUnits { get; set; }
    public int AvailableUnits { get; set; }
    public List<string>? Images { get; set; }
    public List<string>? Attachments { get; set; }
}

public class CreateBuildingRequest
{
    [Required]
    public string Name { get; set; } = string.Empty;
    public string? Address { get; set; }
    public int TotalFloors { get; set; }
    public decimal TotalArea { get; set; }
    public string? BuildingType { get; set; }
    public int YearBuilt { get; set; }
    [Required]
    public DateTime? DeliveryDate { get; set; }
    public string? Description { get; set; }
    public string? CoverImage { get; set; }
    public List<string>? Images { get; set; }
    public List<string>? Attachments { get; set; }
}

public class UpdateBuildingRequest : CreateBuildingRequest
{
    public string? Status { get; set; }
}

public class PropertyUnitDto
{
    public string Id { get; set; } = string.Empty;
    public string BuildingId { get; set; } = string.Empty;
    public string? BuildingName { get; set; }
    public string UnitNumber { get; set; } = string.Empty;
    public int Floor { get; set; }
    public decimal Area { get; set; }
    public decimal MonthlyRent { get; set; }
    public decimal? DailyRent { get; set; }
    public string UnitType { get; set; } = string.Empty;
    public string Status { get; set; } = string.Empty;
    public string? CurrentTenantId { get; set; }
    public string? CurrentTenantName { get; set; }
    public DateTime? LeaseEndDate { get; set; }
    public List<string>? Facilities { get; set; }
    public List<LeaseContractDto>? LeaseHistory { get; set; }
    public List<string>? Attachments { get; set; }
}

public class CreatePropertyUnitRequest
{
    [Required]
    public string BuildingId { get; set; } = string.Empty;
    [Required]
    public string UnitNumber { get; set; } = string.Empty;
    public int Floor { get; set; }
    public decimal Area { get; set; }
    public decimal MonthlyRent { get; set; }
    public decimal? DailyRent { get; set; }
    public string? UnitType { get; set; }
    public string? Description { get; set; }
    public List<string>? Facilities { get; set; }
    public List<string>? Images { get; set; }
    public List<string>? Attachments { get; set; }
}

public class AssetStatisticsResponse
{
    public int TotalBuildings { get; set; }
    public decimal TotalArea { get; set; }
    public int TotalUnits { get; set; }
    public int AvailableUnits { get; set; }
    public int RentedUnits { get; set; }
    public decimal OccupancyRate { get; set; }
    public decimal TotalRentableArea { get; set; }
    public decimal RentedArea { get; set; }
    public double? OccupancyRateYoY { get; set; }
    public double? OccupancyRateMoM { get; set; }
    public double? RentedAreaYoY { get; set; }
    public double? RentedAreaMoM { get; set; }
    public double? TotalBuildingsYoY { get; set; }
    public double? TotalBuildingsMoM { get; set; }
}
