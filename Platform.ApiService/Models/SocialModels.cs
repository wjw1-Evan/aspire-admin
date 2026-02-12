using System.ComponentModel.DataAnnotations;
using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;
using Platform.ServiceDefaults.Models;

namespace Platform.ApiService.Models;

/// <summary>
/// 表示用户上报的定位信标信息。
/// </summary>
public class UserLocationBeacon : MultiTenantEntity
{
    /// <summary>
    /// 用户标识。
    /// </summary>
    [BsonElement("userId")]
    [BsonRepresentation(BsonType.ObjectId)]
    [Required]
    public string UserId { get; set; } = string.Empty;

    /// <summary>
    /// 纬度（单位：度）。
    /// </summary>
    [BsonElement("latitude")]
    [Range(-90, 90)]
    public double Latitude { get; set; }

    /// <summary>
    /// 经度（单位：度）。
    /// </summary>
    [BsonElement("longitude")]
    [Range(-180, 180)]
    public double Longitude { get; set; }

    /// <summary>
    /// 定位精度（单位：米）。
    /// </summary>
    [BsonElement("accuracy")]
    [Range(0, 10000)]
    public double? Accuracy { get; set; }

    /// <summary>
    /// 海拔高度（单位：米）。
    /// </summary>
    [BsonElement("altitude")]
    public double? Altitude { get; set; }

    /// <summary>
    /// 航向角（单位：度）。
    /// </summary>
    [BsonElement("heading")]
    public double? Heading { get; set; }

    /// <summary>
    /// 移动速度（单位：米/秒）。
    /// </summary>
    [BsonElement("speed")]
    public double? Speed { get; set; }

    /// <summary>
    /// 最近一次上报时间（UTC）。
    /// </summary>
    [BsonElement("lastSeenAt")]
    public DateTime LastSeenAt { get; set; } = DateTime.UtcNow;

    /// <summary>
    /// 所在城市（通过逆地理编码获取）。
    /// </summary>
    [BsonElement("city")]
    public string? City { get; set; }

    /// <summary>
    /// 所在国家（通过逆地理编码获取）。
    /// </summary>
    [BsonElement("country")]
    public string? Country { get; set; }
}

/// <summary>
/// 地理坐标点。
/// </summary>
public class GeoPoint
{
    /// <summary>
    /// 纬度（单位：度）。
    /// </summary>
    [Range(-90, 90)]
    public double Latitude { get; set; }

    /// <summary>
    /// 经度（单位：度）。
    /// </summary>
    [Range(-180, 180)]
    public double Longitude { get; set; }

    /// <summary>
    /// 定位精度（单位：米）。
    /// </summary>
    [Range(0, 10000)]
    public double? Accuracy { get; set; }

    /// <summary>
    /// 海拔高度（单位：米）。
    /// </summary>
    public double? Altitude { get; set; }

    /// <summary>
    /// 航向角（单位：度）。
    /// </summary>
    public double? Heading { get; set; }

    /// <summary>
    /// 移动速度（单位：米/秒）。
    /// </summary>
    public double? Speed { get; set; }

    /// <summary>
    /// 原始时间戳（毫秒）。
    /// </summary>
    public long? Timestamp { get; set; }
}

/// <summary>
/// 上报定位信标请求。
/// </summary>
public class UpdateLocationBeaconRequest
{
    /// <summary>
    /// 纬度（单位：度）。
    /// </summary>
    [Required]
    [Range(-90, 90)]
    public double Latitude { get; set; }

    /// <summary>
    /// 经度（单位：度）。
    /// </summary>
    [Required]
    [Range(-180, 180)]
    public double Longitude { get; set; }

    /// <summary>
    /// 定位精度（单位：米）。
    /// </summary>
    [Range(0, 10000)]
    public double? Accuracy { get; set; }

    /// <summary>
    /// 海拔高度（单位：米）。
    /// </summary>
    public double? Altitude { get; set; }

    /// <summary>
    /// 航向角（单位：度）。
    /// </summary>
    public double? Heading { get; set; }

    /// <summary>
    /// 移动速度（单位：米/秒）。
    /// </summary>
    public double? Speed { get; set; }

    /// <summary>
    /// 原始时间戳（毫秒）。
    /// </summary>
    public long? Timestamp { get; set; }
}

/// <summary>
/// 逆地理编码结果（包含城市和国家信息）
/// </summary>
public class GeocodeResult
{
    /// <summary>
    /// 所在城市
    /// </summary>
    public string? City { get; set; }

    /// <summary>
    /// 所在国家
    /// </summary>
    public string? Country { get; set; }
}

/// <summary>
/// 用户位置信息响应（仅包含城市和国家，不包含详细坐标）
/// </summary>
public class UserLocationInfo
{
    /// <summary>
    /// 所在城市
    /// </summary>
    public string? City { get; set; }

    /// <summary>
    /// 所在国家
    /// </summary>
    public string? Country { get; set; }
}

/// <summary>
/// 附近的人搜索请求。
/// </summary>
public class NearbyUsersRequest
{
    /// <summary>
    /// 搜索中心点。
    /// </summary>
    [Required]
    public GeoPoint Center { get; set; } = new();

    /// <summary>
    /// 搜索半径（单位：米，默认 2000）。
    /// </summary>
    [Range(100, 20000)]
    public double? RadiusMeters { get; set; }

    /// <summary>
    /// 返回数量上限（默认 20）。
    /// </summary>
    [Range(1, 50)]
    public int? Limit { get; set; }

    /// <summary>
    /// 兴趣标签过滤。
    /// </summary>
    public List<string>? Interests { get; set; }
}

/// <summary>
/// 附近用户响应条目。
/// </summary>
public class NearbyUserDto
{
    /// <summary>
    /// 用户标识。
    /// </summary>
    public string UserId { get; set; } = string.Empty;

    /// <summary>
    /// 显示名称。
    /// </summary>
    public string DisplayName { get; set; } = string.Empty;

    /// <summary>
    /// 头像地址。
    /// </summary>
    public string? AvatarUrl { get; set; }

    /// <summary>
    /// 与当前用户的距离（单位：米）。
    /// </summary>
    public double DistanceMeters { get; set; }

    /// <summary>
    /// 最近活跃时间（UTC）。
    /// </summary>
    public DateTime LastActiveAt { get; set; }

    /// <summary>
    /// 位置坐标。
    /// </summary>
    public GeoPoint? Location { get; set; }

    /// <summary>
    /// 兴趣标签。
    /// </summary>
    public List<string>? Interests { get; set; }

    /// <summary>
    /// 已存在的会话标识（如有）。
    /// </summary>
    public string? SessionId { get; set; }
}

/// <summary>
/// 附近的人搜索响应。
/// </summary>
public class NearbyUsersResponse
{
    /// <summary>
    /// 附近用户列表。
    /// </summary>
    public List<NearbyUserDto> Items { get; set; } = new();

    /// <summary>
    /// 匹配总数。
    /// </summary>
    public int Total { get; set; }

    /// <summary>
    /// 建议下一次刷新间隔（秒）。
    /// </summary>
    public int? NextRefreshAfter { get; set; }
}

