using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;
using System.ComponentModel.DataAnnotations;
using System.Text.Json.Serialization;
using Platform.ServiceDefaults.Models;

namespace Platform.ApiService.Models;

/// <summary>
/// 创建用户请求
/// </summary>
public class CreateUserRequest
{
    /// <summary>
    /// 用户名
    /// </summary>
    [Required(ErrorMessage = "用户名不能为空")]
    [StringLength(50, ErrorMessage = "用户名长度不能超过50个字符")]
    public string Name { get; set; } = string.Empty;

    /// <summary>
    /// 邮箱地址
    /// </summary>
    [Required(ErrorMessage = "邮箱不能为空")]
    [EmailAddress(ErrorMessage = "邮箱格式不正确")]
    public string Email { get; set; } = string.Empty;

    /// <summary>
    /// 手机号码（中国标准：11位数字，符合中国手机号号段规则）
    /// </summary>
    /// <remarks>
    /// 验证规则：如果提供了手机号，必须符合中国手机号标准（11位数字，以1开头，第二位为3-9）
    /// 空字符串或 null 值将被视为清空手机号，不会触发验证错误
    /// </remarks>
    public string? PhoneNumber { get; set; }

    /// <summary>
    /// 年龄
    /// </summary>
    [Range(0, 150, ErrorMessage = "年龄必须在0-150之间")]
    public int Age { get; set; }
}

/// <summary>
/// 用户管理创建请求模型
/// </summary>
public class CreateUserManagementRequest
{
    /// <summary>
    /// 用户名（3-50个字符）
    /// </summary>
    [Required(ErrorMessage = "用户名不能为空")]
    [StringLength(50, MinimumLength = 3, ErrorMessage = "用户名长度必须在3-50个字符之间")]
    public string Username { get; set; } = string.Empty;

    /// <summary>
    /// 邮箱地址（可选）
    /// </summary>
    [EmailAddress(ErrorMessage = "邮箱格式不正确")]
    public string? Email { get; set; }

    /// <summary>
    /// 手机号码（中国标准：11位数字，符合中国手机号号段规则）
    /// </summary>
    /// <remarks>
    /// 验证规则：如果提供了手机号，必须符合中国手机号标准（11位数字，以1开头，第二位为3-9）
    /// 空字符串或 null 值将被视为清空手机号，不会触发验证错误
    /// </remarks>
    public string? PhoneNumber { get; set; }

    /// <summary>
    /// 密码（至少6个字符）
    /// </summary>
    [Required(ErrorMessage = "密码不能为空")]
    [StringLength(100, MinimumLength = 6, ErrorMessage = "密码长度至少6个字符")]
    public string Password { get; set; } = string.Empty;

    /// <summary>
    /// 角色ID列表
    /// </summary>
    public List<string>? RoleIds { get; set; }

    /// <summary>
    /// 是否激活（默认true）
    /// </summary>
    public bool IsActive { get; set; } = true;
}

/// <summary>
/// 更新用户请求
/// </summary>
public class UpdateUserRequest
{
    /// <summary>
    /// 姓名
    /// </summary>
    public string? Name { get; set; }

    /// <summary>
    /// 邮箱地址
    /// </summary>
    public string? Email { get; set; }

    /// <summary>
    /// 手机号码（中国标准：11位数字，符合中国手机号号段规则）
    /// </summary>
    /// <remarks>
    /// 验证规则：如果提供了手机号，必须符合中国手机号标准（11位数字，以1开头，第二位为3-9）
    /// 空字符串或 null 值将被视为清空手机号，不会触发验证错误
    /// </remarks>
    public string? PhoneNumber { get; set; }

    /// <summary>
    /// 年龄
    /// </summary>
    public int? Age { get; set; }
}

/// <summary>
/// 用户管理更新请求模型
/// </summary>
public class UpdateUserManagementRequest
{
    /// <summary>
    /// 用户名
    /// </summary>
    public string? Username { get; set; }

    /// <summary>
    /// 邮箱地址
    /// </summary>
    public string? Email { get; set; }

    /// <summary>
    /// 手机号码（中国标准：11位数字，符合中国手机号号段规则）
    /// </summary>
    /// <remarks>
    /// 验证规则：如果提供了手机号，必须符合中国手机号标准（11位数字，以1开头，第二位为3-9）
    /// 空字符串或 null 值将被视为清空手机号，不会触发验证错误
    /// </remarks>
    public string? PhoneNumber { get; set; }

    /// <summary>
    /// 角色ID列表
    /// </summary>
    public List<string>? RoleIds { get; set; }

    /// <summary>
    /// 是否激活
    /// </summary>
    public bool? IsActive { get; set; }
}

/// <summary>
/// 用户列表查询请求
/// </summary>
public class UserListRequest
{
    /// <summary>
    /// 页码（默认1）
    /// </summary>
    public int Page { get; set; } = 1;

    /// <summary>
    /// 每页大小（默认10）
    /// </summary>
    public int PageSize { get; set; } = 10;

    /// <summary>
    /// 搜索关键词（用户名、邮箱）
    /// </summary>
    public string? Search { get; set; }

    /// <summary>
    /// 角色ID列表（按角色筛选）
    /// </summary>
    public List<string>? RoleIds { get; set; }

    /// <summary>
    /// 是否激活（按状态筛选）
    /// </summary>
    public bool? IsActive { get; set; }

    /// <summary>
    /// 排序字段（默认CreatedAt）
    /// </summary>
    public string? SortBy { get; set; } = "CreatedAt";

    /// <summary>
    /// 排序方向（asc/desc，默认desc）
    /// </summary>
    public string? SortOrder { get; set; } = "desc";

    /// <summary>
    /// 开始日期（按创建时间范围搜索）
    /// </summary>
    public DateTime? StartDate { get; set; }

    /// <summary>
    /// 结束日期（按创建时间范围搜索）
    /// </summary>
    public DateTime? EndDate { get; set; }
}

/// <summary>
/// 包含角色信息的用户响应DTO
/// v6.0: 添加角色信息支持，解决前端缺少roleIds字段的问题
/// </summary>
public class UserWithRolesResponse
{
    /// <summary>
    /// 用户所在组织信息列表（含层级路径）
    /// </summary>
    public List<UserOrganizationInfo> Organizations { get; set; } = new();

    /// <summary>
    /// 用户ID
    /// </summary>
    public string? Id { get; set; }

    /// <summary>
    /// 用户名
    /// </summary>
    public string Username { get; set; } = string.Empty;

    /// <summary>
    /// 显示名称
    /// </summary>
    public string? Name { get; set; }

    /// <summary>
    /// 邮箱地址
    /// </summary>
    public string? Email { get; set; }

    /// <summary>
    /// 手机号码
    /// </summary>
    public string? PhoneNumber { get; set; }

    /// <summary>
    /// 年龄
    /// </summary>
    public int? Age { get; set; }

    /// <summary>
    /// 是否激活
    /// </summary>
    public bool IsActive { get; set; }

    /// <summary>
    /// 最后登录时间
    /// </summary>
    public DateTime? LastLoginAt { get; set; }

    /// <summary>
    /// 创建时间
    /// </summary>
    public DateTime CreatedAt { get; set; }

    /// <summary>
    /// 更新时间
    /// </summary>
    public DateTime UpdatedAt { get; set; }

    /// <summary>
    /// 用户在当前企业的角色ID列表
    /// </summary>
    public List<string> RoleIds { get; set; } = new();

    /// <summary>
    /// 用户在当前企业的角色名称列表
    /// </summary>
    public List<string> RoleNames { get; set; } = new();

    /// <summary>
    /// 是否为当前企业的管理员
    /// </summary>
    public bool IsAdmin { get; set; }
}

/// <summary>
/// 用户所属组织信息
/// </summary>
public class UserOrganizationInfo
{
    /// <summary>
    /// 组织节点ID
    /// </summary>
    public string OrganizationUnitId { get; set; } = string.Empty;

    /// <summary>
    /// 组织节点名称
    /// </summary>
    public string? OrganizationUnitName { get; set; }

    /// <summary>
    /// 层级路径（例如：总部 / 技术部 / 后端组）
    /// </summary>
    public string? FullPath { get; set; }

    /// <summary>
    /// 是否主组织
    /// </summary>
    public bool IsPrimary { get; set; }
}

/// <summary>
/// 用户列表响应
/// </summary>
public class UserListResponse
{
    /// <summary>
    /// 用户列表
    /// </summary>
    public List<AppUser> Users { get; set; } = new();

    /// <summary>
    /// 总记录数
    /// </summary>
    public int Total { get; set; }

    /// <summary>
    /// 当前页码
    /// </summary>
    public int Page { get; set; }

    /// <summary>
    /// 每页大小
    /// </summary>
    public int PageSize { get; set; }

    /// <summary>
    /// 总页数
    /// </summary>
    public int TotalPages => (int)Math.Ceiling((double)Total / PageSize);
}

/// <summary>
/// 包含角色信息的用户列表响应
/// v6.0: 新增用户列表响应格式，包含角色信息
/// </summary>
public class UserListWithRolesResponse
{
    /// <summary>
    /// 用户列表（包含角色信息）
    /// </summary>
    public List<UserWithRolesResponse> Users { get; set; } = new();

    /// <summary>
    /// 总记录数
    /// </summary>
    public int Total { get; set; }

    /// <summary>
    /// 当前页码
    /// </summary>
    public int Page { get; set; }

    /// <summary>
    /// 每页大小
    /// </summary>
    public int PageSize { get; set; }

    /// <summary>
    /// 总页数
    /// </summary>
    public int TotalPages => (int)Math.Ceiling((double)Total / PageSize);
}

/// <summary>
/// 批量用户操作请求
/// </summary>
public class BulkUserActionRequest
{
    /// <summary>
    /// 用户ID列表
    /// </summary>
    public List<string> UserIds { get; set; } = new();

    /// <summary>
    /// 操作类型（"activate", "deactivate", "delete"）
    /// </summary>
    public string Action { get; set; } = string.Empty;

    /// <summary>
    /// 删除原因（仅用于delete操作）
    /// </summary>
    public string? Reason { get; set; }
}

/// <summary>
/// 用户统计信息响应
/// </summary>
public class UserStatisticsResponse
{
    /// <summary>
    /// 总用户数
    /// </summary>
    public int TotalUsers { get; set; }

    /// <summary>
    /// 活跃用户数
    /// </summary>
    public int ActiveUsers { get; set; }

    /// <summary>
    /// 非活跃用户数
    /// </summary>
    public int InactiveUsers { get; set; }

    /// <summary>
    /// 管理员用户数
    /// </summary>
    public int AdminUsers { get; set; }

    /// <summary>
    /// 普通用户数
    /// </summary>
    public int RegularUsers { get; set; }

    /// <summary>
    /// 今日新增用户数
    /// </summary>
    public int NewUsersToday { get; set; }

    /// <summary>
    /// 本周新增用户数
    /// </summary>
    public int NewUsersThisWeek { get; set; }

    /// <summary>
    /// 本月新增用户数
    /// </summary>
    public int NewUsersThisMonth { get; set; }
}

/// <summary>
/// 用户活动日志实体
/// </summary>
public class UserActivityLog : ISoftDeletable, IEntity, ITimestamped, IMultiTenant
{
    /// <summary>
    /// 日志ID（MongoDB ObjectId）
    /// </summary>
    [BsonId]
    [BsonRepresentation(BsonType.ObjectId)]
    public string Id { get; set; } = string.Empty;

    /// <summary>
    /// 用户ID
    /// </summary>
    [BsonElement("userId")]
    public string UserId { get; set; } = string.Empty;

    /// <summary>
    /// 用户名
    /// </summary>
    [BsonElement("username")]
    public string Username { get; set; } = string.Empty;

    /// <summary>
    /// 操作类型（"login", "logout", "update_profile" 等）
    /// </summary>
    [BsonElement("action")]
    public string Action { get; set; } = string.Empty;

    /// <summary>
    /// 操作描述
    /// </summary>
    [BsonElement("description")]
    public string Description { get; set; } = string.Empty;

    /// <summary>
    /// IP地址
    /// </summary>
    [BsonElement("ipAddress")]
    public string? IpAddress { get; set; }

    /// <summary>
    /// 用户代理（User Agent）
    /// </summary>
    [BsonElement("userAgent")]
    public string? UserAgent { get; set; }

    /// <summary>
    /// HTTP方法
    /// </summary>
    [BsonElement("httpMethod")]
    public string? HttpMethod { get; set; }

    /// <summary>
    /// 请求路径
    /// </summary>
    [BsonElement("path")]
    public string? Path { get; set; }

    /// <summary>
    /// 查询字符串
    /// </summary>
    [BsonElement("queryString")]
    public string? QueryString { get; set; }

    /// <summary>
    /// 完整URL（path + queryString）
    /// </summary>
    [BsonElement("fullUrl")]
    public string? FullUrl { get; set; }

    /// <summary>
    /// HTTP状态码
    /// </summary>
    [BsonElement("statusCode")]
    public int? StatusCode { get; set; }

    /// <summary>
    /// 请求持续时间（毫秒）
    /// </summary>
    [BsonElement("duration")]
    public long? Duration { get; set; }

    /// <summary>
    /// 响应内容（JSON字符串，已截断）
    /// </summary>
    [BsonElement("responseBody")]
    [JsonPropertyName("responseBody")]
    public string? ResponseBody { get; set; }

    /// <summary>
    /// 操作元数据（用于云存储等特殊操作的额外信息）
    /// </summary>
    [BsonElement("metadata")]
    [JsonPropertyName("metadata")]
    public Dictionary<string, object> Metadata { get; set; } = new();

    /// <summary>
    /// 企业ID
    /// </summary>
    [BsonElement("companyId")]
    public string CompanyId { get; set; } = string.Empty;

    /// <summary>
    /// 创建时间
    /// </summary>
    [BsonElement("createdAt")]
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    /// <summary>
    /// 更新时间
    /// </summary>
    [BsonElement("updatedAt")]
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    /// <summary>
    /// 是否已删除（软删除）
    /// </summary>
    [BsonElement("isDeleted")]
    public bool IsDeleted { get; set; } = false;

    /// <summary>
    /// 删除时间
    /// </summary>
    [BsonElement("deletedAt")]
    public DateTime? DeletedAt { get; set; }

    /// <summary>
    /// 删除者
    /// </summary>
    [BsonElement("deletedBy")]
    public string? DeletedBy { get; set; }

    /// <summary>
    /// 删除原因
    /// </summary>
    [BsonElement("deletedReason")]
    public string? DeletedReason { get; set; }
}

/// <summary>
/// 获取用户活动日志请求参数
/// </summary>
public class GetUserActivityLogsRequest
{
    /// <summary>
    /// 页码（默认1）
    /// </summary>
    public int Page { get; set; } = 1;

    /// <summary>
    /// 每页大小（默认20）
    /// </summary>
    public int PageSize { get; set; } = 20;

    /// <summary>
    /// 用户ID（可选，按用户筛选）
    /// </summary>
    public string? UserId { get; set; }

    /// <summary>
    /// 操作类型（可选，按操作类型筛选）
    /// </summary>
    public string? Action { get; set; }

    /// <summary>
    /// 开始日期（可选，按时间范围筛选）
    /// </summary>
    public DateTime? StartDate { get; set; }

    /// <summary>
    /// 结束日期（可选，按时间范围筛选）
    /// </summary>
    public DateTime? EndDate { get; set; }
}

/// <summary>
/// 用户活动日志分页响应
/// </summary>
public class UserActivityLogPagedResponse
{
    /// <summary>
    /// 日志数据列表
    /// </summary>
    public List<UserActivityLog> Data { get; set; } = new();

    /// <summary>
    /// 总记录数
    /// </summary>
    public long Total { get; set; }

    /// <summary>
    /// 当前页码
    /// </summary>
    public int Page { get; set; }

    /// <summary>
    /// 每页大小
    /// </summary>
    public int PageSize { get; set; }

    /// <summary>
    /// 总页数
    /// </summary>
    public int TotalPages { get; set; }
}

/// <summary>
/// HTTP 请求日志记录请求
/// </summary>
public class LogHttpRequestRequest
{
    /// <summary>
    /// 用户ID
    /// </summary>
    public string? UserId { get; set; }

    /// <summary>
    /// 用户名
    /// </summary>
    public string? Username { get; set; }

    /// <summary>
    /// HTTP方法
    /// </summary>
    public string HttpMethod { get; set; } = string.Empty;

    /// <summary>
    /// 请求路径
    /// </summary>
    public string Path { get; set; } = string.Empty;

    /// <summary>
    /// 查询字符串
    /// </summary>
    public string? QueryString { get; set; }

    /// <summary>
    /// 协议（http/https）
    /// </summary>
    public string Scheme { get; set; } = string.Empty;

    /// <summary>
    /// 主机名
    /// </summary>
    public string Host { get; set; } = string.Empty;

    /// <summary>
    /// HTTP状态码
    /// </summary>
    public int StatusCode { get; set; }

    /// <summary>
    /// 请求持续时间（毫秒）
    /// </summary>
    public long DurationMs { get; set; }

    /// <summary>
    /// IP地址
    /// </summary>
    public string? IpAddress { get; set; }

    /// <summary>
    /// 用户代理（User Agent）
    /// </summary>
    public string? UserAgent { get; set; }

    /// <summary>
    /// 响应内容（JSON字符串，已截断）
    /// </summary>
    public string? ResponseBody { get; set; }

    /// <summary>
    /// 操作元数据（用于云存储等特殊操作的额外信息）
    /// </summary>
    public Dictionary<string, object> Metadata { get; set; } = new();
}

/// <summary>
/// 更新个人资料请求
/// </summary>
public class UpdateProfileRequest
{
    /// <summary>
    /// 用户名
    /// </summary>
    public string? Username { get; set; }

    /// <summary>
    /// 邮箱地址
    /// </summary>
    [EmailAddress(ErrorMessage = "邮箱格式不正确")]
    public string? Email { get; set; }

    /// <summary>
    /// 姓名
    /// </summary>
    [StringLength(50, ErrorMessage = "姓名长度不能超过50个字符")]
    public string? Name { get; set; }

    /// <summary>
    /// 年龄
    /// </summary>
    [Range(0, 150, ErrorMessage = "年龄必须在0-150之间")]
    public int? Age { get; set; }

    /// <summary>
    /// 头像（Base64 数据或图片链接）。
    /// </summary>
    [StringLength(2_500_000, ErrorMessage = "头像数据过大，请选择更小的图片")]
    public string? Avatar { get; set; }

    /// <summary>
    /// 手机号码（中国标准：11位数字，符合中国手机号号段规则）
    /// </summary>
    /// <remarks>
    /// 验证规则：如果提供了手机号，必须符合中国手机号标准（11位数字，以1开头，第二位为3-9）
    /// 空字符串或 null 值将被视为清空手机号，不会触发验证错误
    /// </remarks>
    public string? PhoneNumber { get; set; }
}

/// <summary>
/// 更新 AI 角色定义请求
/// </summary>
public class UpdateAiRoleDefinitionRequest
{
    /// <summary>
    /// AI 角色定义（最多 2000 个字符）
    /// </summary>
    [Required(ErrorMessage = "角色定义不能为空")]
    [StringLength(2000, MinimumLength = 1, ErrorMessage = "角色定义长度必须在 1-2000 个字符之间")]
    public string RoleDefinition { get; set; } = string.Empty;
}

/// <summary>
/// 用户活动统计信息
/// </summary>
public class UserActivityStatistics
{
    /// <summary>
    /// 总记录数
    /// </summary>
    public long TotalCount { get; set; }

    /// <summary>
    /// 成功导出数 (2xx)
    /// </summary>
    public long SuccessCount { get; set; }

    /// <summary>
    /// 异常记录数 (>= 400)
    /// </summary>
    public long ErrorCount { get; set; }

    /// <summary>
    /// 涉及的操作类型总数
    /// </summary>
    public int ActionTypesCount { get; set; }
}

/// <summary>
/// 带统计的分页用户活动日志响应
/// </summary>
public class UserActivityPagedWithStatsResponse
{
    /// <summary>
    /// 日志数据
    /// </summary>
    public List<UserActivityLog> Data { get; set; } = new();

    /// <summary>
    /// 总记录数
    /// </summary>
    public long Total { get; set; }

    /// <summary>
    /// 当前页码
    /// </summary>
    public int Page { get; set; }

    /// <summary>
    /// 每页大小
    /// </summary>
    public int PageSize { get; set; }

    /// <summary>
    /// 统计信息
    /// </summary>
    public UserActivityStatistics Statistics { get; set; } = new();
}
