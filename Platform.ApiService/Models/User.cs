using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;
using System.ComponentModel.DataAnnotations;

namespace Platform.ApiService.Models;

public class User : ISoftDeletable
{
    [BsonId]
    [BsonRepresentation(BsonType.ObjectId)]
    public string? Id { get; set; }

    [BsonElement("name")]
    public string Name { get; set; } = string.Empty;

    [BsonElement("email")]
    public string Email { get; set; } = string.Empty;

    [BsonElement("age")]
    public int Age { get; set; }

    [BsonElement("createdAt")]
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    [BsonElement("updatedAt")]
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    // 软删除字段
    [BsonElement("isDeleted")]
    public bool IsDeleted { get; set; } = false;

    [BsonElement("deletedAt")]
    public DateTime? DeletedAt { get; set; }

    [BsonElement("deletedBy")]
    public string? DeletedBy { get; set; }

    [BsonElement("deletedReason")]
    public string? DeletedReason { get; set; }
}

public class CreateUserRequest
{
    [Required(ErrorMessage = "用户名不能为空")]
    [StringLength(50, ErrorMessage = "用户名长度不能超过50个字符")]
    public string Name { get; set; } = string.Empty;
    
    [Required(ErrorMessage = "邮箱不能为空")]
    [EmailAddress(ErrorMessage = "邮箱格式不正确")]
    public string Email { get; set; } = string.Empty;
    
    [Range(0, 150, ErrorMessage = "年龄必须在0-150之间")]
    public int Age { get; set; }
}

// 新的用户管理创建请求模型
public class CreateUserManagementRequest
{
    [Required(ErrorMessage = "用户名不能为空")]
    [StringLength(50, MinimumLength = 3, ErrorMessage = "用户名长度必须在3-50个字符之间")]
    public string Username { get; set; } = string.Empty;
    
    [EmailAddress(ErrorMessage = "邮箱格式不正确")]
    public string? Email { get; set; }
    
    [Required(ErrorMessage = "密码不能为空")]
    [StringLength(100, MinimumLength = 6, ErrorMessage = "密码长度至少6个字符")]
    public string Password { get; set; } = string.Empty;
    
    public string? Role { get; set; } = "user";
    public List<string>? RoleIds { get; set; }
    public bool IsActive { get; set; } = true;
}

public class UpdateUserRequest
{
    public string? Name { get; set; }
    public string? Email { get; set; }
    public int? Age { get; set; }
}

// 新的用户管理更新请求模型
public class UpdateUserManagementRequest
{
    public string? Username { get; set; }
    public string? Email { get; set; }
    public string? Role { get; set; }
    public List<string>? RoleIds { get; set; }
    public bool? IsActive { get; set; }
}

// 用户管理相关的请求和响应模型
public class UserListRequest
{
    public int Page { get; set; } = 1;
    public int PageSize { get; set; } = 10;
    public string? Search { get; set; }
    public string? Role { get; set; }
    public bool? IsActive { get; set; }
    public string? SortBy { get; set; } = "CreatedAt";
    public string? SortOrder { get; set; } = "desc";
}

public class UserListResponse
{
    public List<AppUser> Users { get; set; } = new();
    public int Total { get; set; }
    public int Page { get; set; }
    public int PageSize { get; set; }
    public int TotalPages => (int)Math.Ceiling((double)Total / PageSize);
}

public class BulkUserActionRequest
{
    public List<string> UserIds { get; set; } = new();
    public string Action { get; set; } = string.Empty; // "activate", "deactivate", "delete"
    public string? Reason { get; set; } // 删除原因（仅用于delete操作）
}

public class UserStatisticsResponse
{
    public int TotalUsers { get; set; }
    public int ActiveUsers { get; set; }
    public int InactiveUsers { get; set; }
    public int AdminUsers { get; set; }
    public int RegularUsers { get; set; }
    public int NewUsersToday { get; set; }
    public int NewUsersThisWeek { get; set; }
    public int NewUsersThisMonth { get; set; }
}

public class UserActivityLog : ISoftDeletable
{
    [BsonId]
    [BsonRepresentation(BsonType.ObjectId)]
    public string? Id { get; set; }

    [BsonElement("userId")]
    public string UserId { get; set; } = string.Empty;

    [BsonElement("username")]
    public string Username { get; set; } = string.Empty;

    [BsonElement("action")]
    public string Action { get; set; } = string.Empty; // "login", "logout", "update_profile", etc.

    [BsonElement("description")]
    public string Description { get; set; } = string.Empty;

    [BsonElement("ipAddress")]
    public string? IpAddress { get; set; }

    [BsonElement("userAgent")]
    public string? UserAgent { get; set; }

    [BsonElement("httpMethod")]
    public string? HttpMethod { get; set; }

    [BsonElement("path")]
    public string? Path { get; set; }

    [BsonElement("queryString")]
    public string? QueryString { get; set; }

    [BsonElement("statusCode")]
    public int? StatusCode { get; set; }

    [BsonElement("duration")]
    public long? Duration { get; set; }

    [BsonElement("createdAt")]
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    // 软删除字段
    [BsonElement("isDeleted")]
    public bool IsDeleted { get; set; } = false;

    [BsonElement("deletedAt")]
    public DateTime? DeletedAt { get; set; }

    [BsonElement("deletedBy")]
    public string? DeletedBy { get; set; }

    [BsonElement("deletedReason")]
    public string? DeletedReason { get; set; }
}

/// <summary>
/// 获取用户活动日志请求参数
/// </summary>
public class GetUserActivityLogsRequest
{
    public int Page { get; set; } = 1;
    public int PageSize { get; set; } = 20;
    public string? UserId { get; set; }
    public string? Action { get; set; }
    public DateTime? StartDate { get; set; }
    public DateTime? EndDate { get; set; }
}

/// <summary>
/// 用户活动日志分页响应
/// </summary>
public class UserActivityLogPagedResponse
{
    public List<UserActivityLog> Data { get; set; } = new();
    public long Total { get; set; }
    public int Page { get; set; }
    public int PageSize { get; set; }
    public int TotalPages { get; set; }
}

// 个人中心相关模型
public class UpdateProfileRequest
{
    public string? Username { get; set; }
    
    [EmailAddress(ErrorMessage = "邮箱格式不正确")]
    public string? Email { get; set; }
    
    [StringLength(50, ErrorMessage = "姓名长度不能超过50个字符")]
    public string? Name { get; set; }
    
    [Range(0, 150, ErrorMessage = "年龄必须在0-150之间")]
    public int? Age { get; set; }
}
