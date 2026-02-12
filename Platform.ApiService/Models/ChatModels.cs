using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using System.IO;
using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;
using Platform.ServiceDefaults.Models;

namespace Platform.ApiService.Models;

/// <summary>
/// 聊天消息类型
/// </summary>
public enum ChatMessageType
{
    /// <summary>
    /// 文本消息
    /// </summary>
    Text,

    /// <summary>
    /// 图片附件
    /// </summary>
    Image,

    /// <summary>
    /// 文件附件
    /// </summary>
    File,

    /// <summary>
    /// 系统消息
    /// </summary>
    System
}

/// <summary>
/// 聊天附件信息
/// </summary>
public class ChatAttachmentInfo
{
    /// <summary>
    /// 附件标识
    /// </summary>
    [StringLength(100)]
    [Column("id")]
    [BsonElement("id")]
    public string Id { get; set; } = string.Empty;

    /// <summary>
    /// 附件名称
    /// </summary>
    [Required]
    [StringLength(255)]
    [Column("name")]
    [BsonElement("name")]
    public string Name { get; set; } = string.Empty;

    /// <summary>
    /// 附件大小（单位：字节）
    /// </summary>
    [Column("size")]
    [BsonElement("size")]
    public long Size { get; set; } = 0;

    /// <summary>
    /// 内容类型（MIME）
    /// </summary>
    [Required]
    [StringLength(100)]
    [Column("mimeType")]
    [BsonElement("mimeType")]
    public string MimeType { get; set; } = string.Empty;

    /// <summary>
    /// 服务器可访问地址
    /// </summary>
    [Required]
    [StringLength(2000)]
    [Column("url")]
    [BsonElement("url")]
    public string Url { get; set; } = string.Empty;

    /// <summary>
    /// 缩略图地址（可选）
    /// </summary>
    [StringLength(2000)]
    [Column("thumbnailUrl")]
    [BsonElement("thumbnailUrl")]
    public string? ThumbnailUrl { get; set; }

    /// <summary>
    /// 上传时间（UTC）
    /// </summary>
    [Column("uploadedAt")]
    [BsonElement("uploadedAt")]
    public DateTime UploadedAt { get; set; } = DateTime.UtcNow;
}

/// <summary>
/// 聊天附件实体
/// </summary>
[BsonIgnoreExtraElements]
[Table("chatAttachments")]
public class ChatAttachment : MultiTenantEntity
{
    /// <summary>
    /// 关联会话标识
    /// </summary>
    [Required]
    [StringLength(100)]
    [Column("sessionId")]
    [BsonElement("sessionId")]
    [BsonRepresentation(BsonType.ObjectId)]
    public string SessionId { get; set; } = string.Empty;

    /// <summary>
    /// 关联消息标识
    /// </summary>
    [StringLength(100)]
    [Column("messageId")]
    [BsonElement("messageId")]
    [BsonRepresentation(BsonType.ObjectId)]
    public string? MessageId { get; set; }

    /// <summary>
    /// 上传者用户标识
    /// </summary>
    [Required]
    [StringLength(100)]
    [Column("uploaderId")]
    [BsonElement("uploaderId")]
    public string UploaderId { get; set; } = string.Empty;

    /// <summary>
    /// 文件名称
    /// </summary>
    [Required]
    [StringLength(255)]
    [Column("name")]
    [BsonElement("name")]
    public string Name { get; set; } = string.Empty;

    /// <summary>
    /// 文件大小（字节）
    /// </summary>
    [Column("size")]
    [BsonElement("size")]
    public long Size { get; set; } = 0;

    /// <summary>
    /// 内容类型
    /// </summary>
    [Required]
    [StringLength(100)]
    [Column("mimeType")]
    [BsonElement("mimeType")]
    public string MimeType { get; set; } = string.Empty;

    /// <summary>
    /// 存储对象标识（GridFS/Object Storage）
    /// </summary>
    [Required]
    [StringLength(255)]
    [Column("storageObjectId")]
    [BsonElement("storageObjectId")]
    public string StorageObjectId { get; set; } = string.Empty;

    /// <summary>
    /// 下载地址（预签名或代理地址）
    /// </summary>
    [Required]
    [StringLength(2000)]
    [Column("downloadUrl")]
    [BsonElement("downloadUrl")]
    public string DownloadUrl { get; set; } = string.Empty;

    /// <summary>
    /// 附件校验摘要（可选）
    /// </summary>
    [StringLength(128)]
    [Column("checksum")]
    [BsonElement("checksum")]
    public string? Checksum { get; set; }

    /// <summary>
    /// 缩略图地址（可选）
    /// </summary>
    [StringLength(2000)]
    [Column("thumbnailUrl")]
    [BsonElement("thumbnailUrl")]
    public string? ThumbnailUrl { get; set; }
}

/// <summary>
/// 聊天会话实体
/// </summary>
[BsonIgnoreExtraElements]
[Table("chatSessions")]
public class ChatSession : MultiTenantEntity
{
    /// <summary>
    /// 会话参与用户标识集合
    /// </summary>
    [Required]
    [Column("participants")]
    [BsonElement("participants")]
    public List<string> Participants { get; set; } = new();

    /// <summary>
    /// 参与人昵称映射（可选）
    /// </summary>
    [Column("participantNames")]
    [BsonElement("participantNames")]
    public Dictionary<string, string> ParticipantNames { get; set; } = new();

    /// <summary>
    /// 参与人头像映射（可选）。
    /// </summary>
    [Column("participantAvatars")]
    [BsonElement("participantAvatars")]
    public Dictionary<string, string>? ParticipantAvatars { get; set; } = new();

    /// <summary>
    /// 最后一条消息内容摘要
    /// </summary>
    [StringLength(500)]
    [Column("lastMessageExcerpt")]
    [BsonElement("lastMessageExcerpt")]
    public string? LastMessageExcerpt { get; set; }

    /// <summary>
    /// 最后一条消息标识
    /// </summary>
    [StringLength(100)]
    [Column("lastMessageId")]
    [BsonElement("lastMessageId")]
    public string? LastMessageId { get; set; }

    /// <summary>
    /// 最后一条消息时间（UTC）
    /// </summary>
    [Column("lastMessageAt")]
    [BsonElement("lastMessageAt")]
    public DateTime? LastMessageAt { get; set; }

    /// <summary>
    /// 每位参与者的未读计数
    /// </summary>
    [Column("unreadCounts")]
    [BsonElement("unreadCounts")]
    public Dictionary<string, int> UnreadCounts { get; set; } = new();

    /// <summary>
    /// 每位参与者的最后已读消息标识
    /// </summary>
    [Column("lastReadMessageIds")]
    [BsonElement("lastReadMessageIds")]
    public Dictionary<string, string> LastReadMessageIds { get; set; } = new();

    /// <summary>
    /// 会话标签/主题
    /// </summary>
    [Column("topicTags")]
    [BsonElement("topicTags")]
    public List<string> TopicTags { get; set; } = new();

    /// <summary>
    /// 是否静音
    /// </summary>
    [Column("isMuted")]
    [BsonElement("isMuted")]
    public bool IsMuted { get; set; } = false;
}

/// <summary>
/// 聊天消息实体
/// </summary>
[BsonIgnoreExtraElements]
[Table("chatMessages")]
public class ChatMessage : MultiTenantEntity
{
    /// <summary>
    /// 会话标识
    /// </summary>
    [Required]
    [StringLength(100)]
    [Column("sessionId")]
    [BsonElement("sessionId")]
    [BsonRepresentation(BsonType.ObjectId)]
    public string SessionId { get; set; } = string.Empty;

    /// <summary>
    /// 发送方用户标识
    /// </summary>
    [Required]
    [StringLength(100)]
    [Column("senderId")]
    [BsonElement("senderId")]
    public string SenderId { get; set; } = string.Empty;

    /// <summary>
    /// 发送方显示名称
    /// </summary>
    [StringLength(100)]
    [Column("senderName")]
    [BsonElement("senderName")]
    public string? SenderName { get; set; }

    /// <summary>
    /// 接收方用户标识（私聊场景可用）
    /// </summary>
    [StringLength(100)]
    [Column("recipientId")]
    [BsonElement("recipientId")]
    public string? RecipientId { get; set; }

    /// <summary>
    /// 消息类型
    /// </summary>
    [Column("type")]
    [BsonElement("type")]
    [BsonRepresentation(BsonType.String)]
    public ChatMessageType Type { get; set; } = ChatMessageType.Text;

    /// <summary>
    /// 文本内容
    /// </summary>
    [StringLength(4000)]
    [Column("content")]
    [BsonElement("content")]
    public string? Content { get; set; }

    /// <summary>
    /// 附件信息
    /// </summary>
    [Column("attachment")]
    [BsonElement("attachment")]
    public ChatAttachmentInfo? Attachment { get; set; }

    /// <summary>
    /// 扩展元数据
    /// </summary>
    [Column("metadata")]
    [BsonElement("metadata")]
    public Dictionary<string, object> Metadata { get; set; } = new();

    /// <summary>
    /// 消息是否被撤回
    /// </summary>
    [Column("isRecalled")]
    [BsonElement("isRecalled")]
    public bool IsRecalled { get; set; } = false;

    /// <summary>
    /// 客户端生成的消息标识，用于去重和状态同步。
    /// </summary>
    [StringLength(100)]
    [Column("clientMessageId")]
    [BsonElement("clientMessageId")]
    public string? ClientMessageId { get; set; }
}

/// <summary>
/// 聊天会话查询请求
/// </summary>
public class ChatSessionListRequest
{
    /// <summary>
    /// 页码（从 1 开始）
    /// </summary>
    [Range(1, int.MaxValue)]
    public int Page { get; set; } = 1;

    /// <summary>
    /// 每页数量
    /// </summary>
    [Range(1, 100)]
    public int PageSize { get; set; } = 20;

    /// <summary>
    /// 关键字过滤
    /// </summary>
    public string? Keyword { get; set; }
        = default;
}

/// <summary>
/// 聊天消息查询请求
/// </summary>
public class ChatMessageListRequest
{
    /// <summary>
    /// 游标（上一页最后一条消息标识）
    /// </summary>
    public string? Cursor { get; set; }
        = default;

    /// <summary>
    /// 请求的消息条数
    /// </summary>
    [Range(1, 200)]
    public int Limit { get; set; } = 50;
}

/// <summary>
/// 发送消息请求
/// </summary>
public class SendChatMessageRequest
{
    /// <summary>
    /// 会话标识
    /// </summary>
    [Required]
    public string SessionId { get; set; } = string.Empty;

    /// <summary>
    /// 消息类型
    /// </summary>
    [Required]
    public ChatMessageType Type { get; set; } = ChatMessageType.Text;

    /// <summary>
    /// 文本内容（文本消息必填）
    /// </summary>
    public string? Content { get; set; }
        = default;

    /// <summary>
    /// 已上传附件标识（附件消息必填）
    /// </summary>
    public string? AttachmentId { get; set; }
        = default;

    /// <summary>
    /// 目标用户（私聊/点对点场景）
    /// </summary>
    public string? RecipientId { get; set; }
        = default;

    /// <summary>
    /// 客户端生成的消息标识。
    /// </summary>
    public string? ClientMessageId { get; set; }
        = default;

    /// <summary>
    /// 附加元数据（可选）。
    /// </summary>
    public Dictionary<string, object>? Metadata { get; set; }
        = new();

    /// <summary>
    /// 指示是否由客户端发起助手流式回复。
    /// </summary>
    public bool AssistantStreaming { get; set; }
        = false;
}

/// <summary>
/// 附件上传响应
/// </summary>
public class UploadAttachmentResponse
{
    /// <summary>
    /// 附件信息
    /// </summary>
    public ChatAttachmentInfo Attachment { get; set; } = new();
}

/// <summary>
/// 附件下载结果
/// </summary>
public class ChatAttachmentDownloadResult
{
    /// <summary>
    /// 文件内容流
    /// </summary>
    public Stream Content { get; set; } = Stream.Null;

    /// <summary>
    /// 文件名称
    /// </summary>
    public string FileName { get; set; } = string.Empty;

    /// <summary>
    /// 内容类型
    /// </summary>
    public string ContentType { get; set; } = "application/octet-stream";

    /// <summary>
    /// 内容长度（字节）
    /// </summary>
    public long ContentLength { get; set; }
        = 0;
}

/// <summary>
/// 标记会话已读请求
/// </summary>
public class MarkSessionReadRequest
{
    /// <summary>
    /// 最后一条已读消息标识
    /// </summary>
    [Required]
    public string LastMessageId { get; set; } = string.Empty;
}

/// <summary>
/// 消息时间线响应
/// </summary>
public class ChatMessageTimelineResponse
{
    /// <summary>
    /// 消息列表
    /// </summary>
    public List<ChatMessage> Items { get; set; } = new();

    /// <summary>
    /// 是否存在更多数据
    /// </summary>
    public bool HasMore { get; set; }
        = false;

    /// <summary>
    /// 下一次请求的游标
    /// </summary>
    public string? NextCursor { get; set; }
        = default;
}

/// <summary>
/// 实时消息推送负载
/// </summary>
public class ChatMessageRealtimePayload
{
    /// <summary>
    /// 会话标识
    /// </summary>
    public string SessionId { get; set; } = string.Empty;

    /// <summary>
    /// 消息内容
    /// </summary>
    public ChatMessage Message { get; set; } = new();

    /// <summary>
    /// 推送时间（UTC）
    /// </summary>
    public DateTime BroadcastAtUtc { get; set; } = DateTime.UtcNow;
}

/// <summary>
/// 实时会话摘要推送负载
/// </summary>
public class ChatSessionRealtimePayload
{
    /// <summary>
    /// 会话摘要
    /// </summary>
    public ChatSession Session { get; set; } = new();

    /// <summary>
    /// 推送时间（UTC）
    /// </summary>
    public DateTime BroadcastAtUtc { get; set; } = DateTime.UtcNow;
}

/// <summary>
/// 实时消息删除推送负载
/// </summary>
public class ChatMessageDeletedPayload
{
    /// <summary>
    /// 会话标识
    /// </summary>
    public string SessionId { get; set; } = string.Empty;

    /// <summary>
    /// 消息标识
    /// </summary>
    public string MessageId { get; set; } = string.Empty;

    /// <summary>
    /// 删除时间（UTC）
    /// </summary>
    public DateTime DeletedAtUtc { get; set; } = DateTime.UtcNow;
}

/// <summary>
/// 实时会话已读推送负载
/// </summary>
public class ChatSessionReadPayload
{
    /// <summary>
    /// 会话标识
    /// </summary>
    public string SessionId { get; set; } = string.Empty;

    /// <summary>
    /// 用户标识
    /// </summary>
    public string UserId { get; set; } = string.Empty;

    /// <summary>
    /// 最后一条已读消息标识
    /// </summary>
    public string LastMessageId { get; set; } = string.Empty;

    /// <summary>
    /// 已读时间（UTC）
    /// </summary>
    public DateTime ReadAtUtc { get; set; } = DateTime.UtcNow;
}

