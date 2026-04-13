using System.ComponentModel.DataAnnotations;

namespace Platform.ApiService.Models;

public class UpdateLocationBeaconRequest
{
    [Required]
    [Range(-90, 90)]
    public double Latitude { get; set; }

    [Required]
    [Range(-180, 180)]
    public double Longitude { get; set; }

    [Range(0, 10000)]
    public double? Accuracy { get; set; }

    public double? Altitude { get; set; }

    public double? Heading { get; set; }

    public double? Speed { get; set; }

    public long? Timestamp { get; set; }
}

public class GeocodeResult
{
    public string? City { get; set; }

    public string? Country { get; set; }
}

public class UserLocationInfo
{
    public string? City { get; set; }

    public string? Country { get; set; }
}

public class NearbyUsersRequest
{
    [Required]
    public GeoPoint Center { get; set; } = new();

    [Range(100, 20000)]
    public double? RadiusMeters { get; set; }

    [Range(1, 50)]
    public int? Limit { get; set; }

    public List<string>? Interests { get; set; }
}

public class NearbyUserDto
{
    public string UserId { get; set; } = string.Empty;

    public string DisplayName { get; set; } = string.Empty;

    public string? AvatarUrl { get; set; }

    public double DistanceMeters { get; set; }

    public DateTime LastActiveAt { get; set; }

    public GeoPoint? Location { get; set; }

    public List<string>? Interests { get; set; }

    public string? SessionId { get; set; }
}

public class NearbyUsersResponse
{
    public List<NearbyUserDto> Items { get; set; } = new();

    public int Total { get; set; }

    public int? NextRefreshAfter { get; set; }
}