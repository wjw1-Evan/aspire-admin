using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;

namespace Platform.ApiService.Models;

public class CurrentUser
{
    [BsonId]
    [BsonRepresentation(BsonType.ObjectId)]
    public string? Id { get; set; }

    [BsonElement("name")]
    public string? Name { get; set; }

    [BsonElement("avatar")]
    public string? Avatar { get; set; }

    [BsonElement("userid")]
    public string? UserId { get; set; }

    [BsonElement("email")]
    public string? Email { get; set; }

    [BsonElement("signature")]
    public string? Signature { get; set; }

    [BsonElement("title")]
    public string? Title { get; set; }

    [BsonElement("group")]
    public string? Group { get; set; }

    [BsonElement("tags")]
    public List<UserTag>? Tags { get; set; }

    [BsonElement("notifyCount")]
    public int NotifyCount { get; set; }

    [BsonElement("unreadCount")]
    public int UnreadCount { get; set; }

    [BsonElement("country")]
    public string? Country { get; set; }

    [BsonElement("access")]
    public string? Access { get; set; }

    [BsonElement("geographic")]
    public GeographicInfo? Geographic { get; set; }

    [BsonElement("address")]
    public string? Address { get; set; }

    [BsonElement("phone")]
    public string? Phone { get; set; }

    [BsonElement("isLogin")]
    public bool IsLogin { get; set; } = true;

    [BsonElement("createdAt")]
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    [BsonElement("updatedAt")]
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}

public class UserTag
{
    [BsonElement("key")]
    public string? Key { get; set; }

    [BsonElement("label")]
    public string? Label { get; set; }
}

public class GeographicInfo
{
    [BsonElement("province")]
    public LocationInfo? Province { get; set; }

    [BsonElement("city")]
    public LocationInfo? City { get; set; }
}

public class LocationInfo
{
    [BsonElement("label")]
    public string? Label { get; set; }

    [BsonElement("key")]
    public string? Key { get; set; }
}

public class LoginRequest
{
    public string? Username { get; set; }
    public string? Password { get; set; }
    public bool AutoLogin { get; set; }
    public string? Type { get; set; }
}

public class LoginResult
{
    public string? Status { get; set; }
    public string? Type { get; set; }
    public string? CurrentAuthority { get; set; }
    public string? Token { get; set; }
}

public class ApiResponse<T>
{
    public bool Success { get; set; }
    public T? Data { get; set; }
    public string? ErrorCode { get; set; }
    public string? ErrorMessage { get; set; }
}

public class PageParams
{
    public int Current { get; set; } = 1;
    public int PageSize { get; set; } = 10;
}

public class AppUser
{
    [BsonId]
    [BsonRepresentation(BsonType.ObjectId)]
    public string? Id { get; set; }

    [BsonElement("username")]
    public string Username { get; set; } = string.Empty;

    [BsonElement("passwordHash")]
    public string PasswordHash { get; set; } = string.Empty;

    [BsonElement("email")]
    public string? Email { get; set; }

    [BsonElement("role")]
    public string Role { get; set; } = "user";

    [BsonElement("isActive")]
    public bool IsActive { get; set; } = true;

    [BsonElement("createdAt")]
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    [BsonElement("updatedAt")]
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    [BsonElement("lastLoginAt")]
    public DateTime? LastLoginAt { get; set; }
}

public class RegisterRequest
{
    public string Username { get; set; } = string.Empty;
    public string Password { get; set; } = string.Empty;
    public string? Email { get; set; }
}
