using System.ComponentModel.DataAnnotations;
using Platform.ApiService.Models;

namespace Platform.ApiService.Models;

public class ServiceCategoryListResponse
{
    public List<ServiceCategoryDto> Categories { get; set; } = new();
}

public class ServiceCategoryDto
{
    public string Id { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public string? Icon { get; set; }
    public int SortOrder { get; set; }
    public bool IsActive { get; set; }
    public int RequestCount { get; set; }
}

public class CreateServiceCategoryRequest
{
    [Required]
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public string? Icon { get; set; }
    public int SortOrder { get; set; }
}

public class ServiceRequestDto
{
    public string Id { get; set; } = string.Empty;
    public string CategoryId { get; set; } = string.Empty;
    public string? CategoryName { get; set; }
    public string? TenantId { get; set; }
    public string? TenantName { get; set; }
    public string Title { get; set; } = string.Empty;
    public string? Description { get; set; }
    public string? ContactPerson { get; set; }
    public string? ContactPhone { get; set; }
    public string Priority { get; set; } = string.Empty;
    public string Status { get; set; } = string.Empty;
    public string? AssignedTo { get; set; }
    public string? AssignedToName { get; set; }
    public DateTime? CompletedAt { get; set; }
    public int? Rating { get; set; }
}

public class CreateServiceRequestRequest
{
    [Required]
    public string CategoryId { get; set; } = string.Empty;
    public string? TenantId { get; set; }
    [Required]
    public string Title { get; set; } = string.Empty;
    public string? Description { get; set; }
    public string? ContactPerson { get; set; }
    public string? ContactPhone { get; set; }
    public string? Priority { get; set; }
    public List<string>? Attachments { get; set; }
}

public class UpdateServiceRequestStatusRequest
{
    [Required]
    public string Status { get; set; } = string.Empty;
    public string? AssignedTo { get; set; }
    public string? Resolution { get; set; }
}

public class ServiceStatisticsResponse
{
    public int TotalCategories { get; set; }
    public int ActiveCategories { get; set; }
    public int TotalRequests { get; set; }
    public int PendingRequests { get; set; }
    public int ProcessingRequests { get; set; }
    public int CompletedRequests { get; set; }
    public int TodayNewRequests { get; set; }
    public decimal ApproxHandlingTime { get; set; }
    public decimal SatisfactionRate { get; set; }
    public decimal AverageRating { get; set; }
    public Dictionary<string, int> RequestsByCategory { get; set; } = new();
    public Dictionary<string, int> RequestsByStatus { get; set; } = new();
    public double? TotalRequestsYoY { get; set; }
    public double? TotalRequestsMoM { get; set; }
    public double? AverageRatingYoY { get; set; }
    public double? AverageRatingMoM { get; set; }
}
