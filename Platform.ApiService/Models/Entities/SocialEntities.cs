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
    [BsonRepresentation(BsonType.ObjectId)]
    [Required]
    public string UserId { get; set; } = string.Empty;

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
    /// 最近一次上报时间（UTC）。
    /// </summary>
    public DateTime LastSeenAt { get; set; } = DateTime.UtcNow;

    /// <summary>
    /// 所在城市（通过逆地理编码获取）。
    /// </summary>
    public string? City { get; set; }

    /// <summary>
    /// 所在国家（通过逆地理编码获取）。
    /// </summary>
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


