using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;
using Platform.ServiceDefaults.Models;
using System.ComponentModel.DataAnnotations;

namespace Platform.ApiService.Models;

/// <summary>
/// 好友请求状态
/// </summary>
public enum FriendRequestStatus
{
    /// <summary>
    /// 待处理
    /// </summary>
    Pending,

    /// <summary>
    /// 已接受
    /// </summary>
    Accepted,

    /// <summary>
    /// 已拒绝
    /// </summary>
    Rejected
}

/// <summary>
/// 好友请求方向
/// </summary>
public enum FriendRequestDirection
{
    /// <summary>
    /// 收到的请求
    /// </summary>
    Incoming,

    /// <summary>
    /// 发出的请求
    /// </summary>
    Outgoing
}

/// <summary>
/// 好友请求实体
/// </summary>
public class FriendRequest : BaseEntity, IEntity, ISoftDeletable, ITimestamped
{
    /// <summary>
    /// 请求发起人用户标识
    /// </summary>
    [BsonRepresentation(BsonType.ObjectId)]
    [BsonElement("requesterId")]
    public string RequesterId { get; set; } = string.Empty;

    /// <summary>
    /// 请求发起人用户名
    /// </summary>
    [BsonElement("requesterUsername")]
    public string RequesterUsername { get; set; } = string.Empty;

    /// <summary>
    /// 请求发起人显示名称
    /// </summary>
    [BsonElement("requesterName")]
    public string? RequesterName { get; set; }
        = default;

    /// <summary>
    /// 请求发起人手机号
    /// </summary>
    [BsonElement("requesterPhone")]
    public string? RequesterPhoneNumber { get; set; }
        = default;

    /// <summary>
    /// 目标用户标识
    /// </summary>
    [BsonRepresentation(BsonType.ObjectId)]
    [BsonElement("targetUserId")]
    public string TargetUserId { get; set; } = string.Empty;

    /// <summary>
    /// 目标用户用户名
    /// </summary>
    [BsonElement("targetUsername")]
    public string TargetUsername { get; set; } = string.Empty;

    /// <summary>
    /// 目标用户显示名称
    /// </summary>
    [BsonElement("targetName")]
    public string? TargetName { get; set; }
        = default;

    /// <summary>
    /// 目标用户手机号
    /// </summary>
    [BsonElement("targetPhone")]
    public string? TargetPhoneNumber { get; set; }
        = default;

    /// <summary>
    /// 请求状态
    /// </summary>
    [BsonElement("status")]
    [BsonRepresentation(BsonType.String)]
    public FriendRequestStatus Status { get; set; } = FriendRequestStatus.Pending;

    /// <summary>
    /// 附言
    /// </summary>
    [BsonElement("message")]
    public string? Message { get; set; }
        = default;

    /// <summary>
    /// 处理时间
    /// </summary>
    [BsonElement("processedAt")]
    public DateTime? ProcessedAt { get; set; }
        = default;
}

/// <summary>
/// 好友关系实体（单向记录）
/// </summary>
public class Friendship : BaseEntity, IEntity, ISoftDeletable, ITimestamped
{
    /// <summary>
    /// 用户标识
    /// </summary>
    [BsonRepresentation(BsonType.ObjectId)]
    [BsonElement("userId")]
    public string UserId { get; set; } = string.Empty;

    /// <summary>
    /// 好友用户标识
    /// </summary>
    [BsonRepresentation(BsonType.ObjectId)]
    [BsonElement("friendUserId")]
    public string FriendUserId { get; set; } = string.Empty;

    /// <summary>
    /// 好友用户名
    /// </summary>
    [BsonElement("friendUsername")]
    public string FriendUsername { get; set; } = string.Empty;

    /// <summary>
    /// 好友显示名称
    /// </summary>
    [BsonElement("friendDisplayName")]
    public string? FriendDisplayName { get; set; }
        = default;

    /// <summary>
    /// 好友手机号
    /// </summary>
    [BsonElement("friendPhone")]
    public string? FriendPhoneNumber { get; set; }
        = default;

    /// <summary>
    /// 备注
    /// </summary>
    [BsonElement("remark")]
    public string? Remark { get; set; }
        = default;
}

/// <summary>
/// 搜索好友结果
/// </summary>
public class FriendSearchResult
{
    /// <summary>
    /// 用户标识
    /// </summary>
    public string UserId { get; set; } = string.Empty;

    /// <summary>
    /// 用户名
    /// </summary>
    public string Username { get; set; } = string.Empty;

    /// <summary>
    /// 显示名称
    /// </summary>
    public string? DisplayName { get; set; }
        = default;

    /// <summary>
    /// 手机号码
    /// </summary>
    public string? PhoneNumber { get; set; }
        = default;

    /// <summary>
    /// 是否已是好友
    /// </summary>
    public bool IsFriend { get; set; }
        = false;

    /// <summary>
    /// 是否存在待处理请求
    /// </summary>
    public bool HasPendingRequest { get; set; }
        = false;

    /// <summary>
    /// 是否为对方发起的请求
    /// </summary>
    public bool IsIncomingRequest { get; set; }
        = false;
}

/// <summary>
/// 好友汇总信息
/// </summary>
public class FriendSummaryResponse
{
    /// <summary>
    /// 好友用户标识
    /// </summary>
    public string UserId { get; set; } = string.Empty;

    /// <summary>
    /// 好友用户名
    /// </summary>
    public string Username { get; set; } = string.Empty;

    /// <summary>
    /// 好友显示名称
    /// </summary>
    public string? DisplayName { get; set; }
        = default;

    /// <summary>
    /// 好友手机号
    /// </summary>
    public string? PhoneNumber { get; set; }
        = default;

    /// <summary>
    /// 好友关系记录标识
    /// </summary>
    public string FriendshipId { get; set; } = string.Empty;

    /// <summary>
    /// 关联的聊天会话标识
    /// </summary>
    public string? SessionId { get; set; }
        = default;

    /// <summary>
    /// 成为好友的时间
    /// </summary>
    public DateTime CreatedAt { get; set; }
        = DateTime.UtcNow;
}

/// <summary>
/// 好友请求响应
/// </summary>
public class FriendRequestResponse
{
    /// <summary>
    /// 请求标识
    /// </summary>
    public string Id { get; set; } = string.Empty;

    /// <summary>
    /// 请求发起人标识
    /// </summary>
    public string RequesterId { get; set; } = string.Empty;

    /// <summary>
    /// 请求发起人用户名
    /// </summary>
    public string RequesterUsername { get; set; } = string.Empty;

    /// <summary>
    /// 请求发起人显示名称
    /// </summary>
    public string? RequesterDisplayName { get; set; }
        = default;

    /// <summary>
    /// 请求发起人手机号
    /// </summary>
    public string? RequesterPhoneNumber { get; set; }
        = default;

    /// <summary>
    /// 目标用户标识
    /// </summary>
    public string TargetUserId { get; set; } = string.Empty;

    /// <summary>
    /// 目标用户用户名
    /// </summary>
    public string TargetUsername { get; set; } = string.Empty;

    /// <summary>
    /// 目标用户显示名称
    /// </summary>
    public string? TargetDisplayName { get; set; }
        = default;

    /// <summary>
    /// 目标用户手机号
    /// </summary>
    public string? TargetPhoneNumber { get; set; }
        = default;

    /// <summary>
    /// 请求状态
    /// </summary>
    public FriendRequestStatus Status { get; set; }
        = FriendRequestStatus.Pending;

    /// <summary>
    /// 请求附言
    /// </summary>
    public string? Message { get; set; }
        = default;

    /// <summary>
    /// 创建时间
    /// </summary>
    public DateTime CreatedAt { get; set; }
        = DateTime.UtcNow;

    /// <summary>
    /// 处理时间
    /// </summary>
    public DateTime? ProcessedAt { get; set; }
        = default;
}

/// <summary>
/// 创建好友请求模型
/// </summary>
public class CreateFriendRequestRequest
{
    /// <summary>
    /// 目标用户标识
    /// </summary>
    [Required(ErrorMessage = "目标用户不能为空")]
    public string TargetUserId { get; set; } = string.Empty;

    /// <summary>
    /// 附言
    /// </summary>
    [StringLength(200, ErrorMessage = "附言长度不能超过200个字符")]
    public string? Message { get; set; }
        = default;
}

/// <summary>
/// 好友验证请求模型
/// </summary>
public class FriendRequestIdRequest
{
    /// <summary>
    /// 请求标识
    /// </summary>
    [Required]
    public string RequestId { get; set; } = string.Empty;
}

/// <summary>
/// 好友会话响应
/// </summary>
public class FriendSessionResponse
{
    /// <summary>
    /// 聊天会话标识
    /// </summary>
    public string SessionId { get; set; } = string.Empty;

    /// <summary>
    /// 好友用户标识
    /// </summary>
    public string FriendUserId { get; set; } = string.Empty;
}

