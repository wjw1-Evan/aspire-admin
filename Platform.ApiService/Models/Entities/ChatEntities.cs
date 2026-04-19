using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using System.IO;
using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;
using Platform.ServiceDefaults.Models;

namespace Platform.ApiService.Models;

/// <summary>
/// 聊天附件信息
/// </summary>
public class ChatAttachmentInfo
{
    /// <summary>
    /// 附件标识
    /// </summary>
    [StringLength(100)]
    public string Id { get; set; } = string.Empty;

    /// <summary>
    /// 附件名称
    /// </summary>
    [Required]
    [StringLength(255)]
    public string Name { get; set; } = string.Empty;

    /// <summary>
    /// 附件大小（单位：字节）
    /// </summary>
    public long Size { get; set; } = 0;

    /// <summary>
    /// 内容类型（MIME）
    /// </summary>
    [Required]
    [StringLength(100)]
    public string MimeType { get; set; } = string.Empty;

    /// <summary>
    /// 服务器可访问地址
    /// </summary>
    [Required]
    [StringLength(2000)]
    public string Url { get; set; } = string.Empty;

    /// <summary>
    /// 缩略图地址（可选）
    /// </summary>
    [StringLength(2000)]
    public string? ThumbnailUrl { get; set; }
}

/// <summary>
/// 聊天附件实体
/// </summary>
public class ChatAttachment : MultiTenantEntity
{
    /// <summary>
    /// 关联会话标识
    /// </summary>
    [Required]
    [StringLength(100)]
    [BsonRepresentation(BsonType.ObjectId)]
    public string SessionId { get; set; } = string.Empty;

    /// <summary>
    /// 关联消息标识
    /// </summary>
    [StringLength(100)]
    [BsonRepresentation(BsonType.ObjectId)]
    public string? MessageId { get; set; }

    /// <summary>
    /// 上传者用户标识
    /// </summary>
    [Required]
    [StringLength(100)]
    public string UploaderId { get; set; } = string.Empty;

    /// <summary>
    /// 文件名称
    /// </summary>
    [Required]
    [StringLength(255)]
    public string Name { get; set; } = string.Empty;

    /// <summary>
    /// 文件大小（字节）
    /// </summary>
    public long Size { get; set; } = 0;

    /// <summary>
    /// 内容类型
    /// </summary>
    [Required]
    [StringLength(100)]
    public string MimeType { get; set; } = string.Empty;

    /// <summary>
    /// 存储对象标识（GridFS/Object Storage）
    /// </summary>
    [Required]
    [StringLength(255)]
    public string StorageObjectId { get; set; } = string.Empty;

    /// <summary>
    /// 下载地址（预签名或代理地址）
    /// </summary>
    [Required]
    [StringLength(2000)]
    public string DownloadUrl { get; set; } = string.Empty;

    /// <summary>
    /// 附件校验摘要（可选）
    /// </summary>
    [StringLength(128)]
    public string? Checksum { get; set; }

    /// <summary>
    /// 缩略图地址（可选）
    /// </summary>
    [StringLength(2000)]
    public string? ThumbnailUrl { get; set; }
}

/// <summary>
/// 聊天会话实体
/// </summary>
public class ChatSession : MultiTenantEntity
{
    /// <summary>
    /// 会话创建者用户标识
    /// </summary>
    [StringLength(100)]
    public new string? CreatedBy { get; set; }

    /// <summary>
    /// 会话参与用户标识集合
    /// </summary>
    [Required]
    public List<string> Participants { get; set; } = new();

    /// <summary>
    /// 参与人昵称映射（可选）
    /// </summary>
    public Dictionary<string, string> ParticipantNames { get; set; } = new();

    /// <summary>
    /// 参与人头像映射（可选）。
    /// </summary>
    public Dictionary<string, string>? ParticipantAvatars { get; set; } = new();

    /// <summary>
    /// 最后一条消息内容摘要
    /// </summary>
    [StringLength(500)]
    public string? LastMessageExcerpt { get; set; }

    /// <summary>
    /// 最后一条消息标识
    /// </summary>
    [StringLength(100)]
    public string? LastMessageId { get; set; }

    /// <summary>
    /// 最后一条消息时间（UTC）
    /// </summary>
    public DateTime? LastMessageAt { get; set; }

    /// <summary>
    /// 每位参与者的未读计数
    /// </summary>
    public Dictionary<string, int> UnreadCounts { get; set; } = new();

    /// <summary>
    /// 每位参与者的最后已读消息标识
    /// </summary>
    public Dictionary<string, string> LastReadMessageIds { get; set; } = new();

    /// <summary>
    /// 会话标签/主题
    /// </summary>
    public List<string> TopicTags { get; set; } = new();

    /// <summary>
    /// 是否静音
    /// </summary>
    public bool IsMuted { get; set; } = false;
}

/// <summary>
/// 聊天消息实体
/// </summary>
public class ChatMessage : MultiTenantEntity
{
    /// <summary>
    /// 会话标识
    /// </summary>
    [Required]
    [StringLength(100)]
    [BsonRepresentation(BsonType.ObjectId)]
    public string SessionId { get; set; } = string.Empty;

    /// <summary>
    /// 发送方用户标识
    /// </summary>
    [Required]
    [StringLength(100)]
    public string SenderId { get; set; } = string.Empty;

    /// <summary>
    /// 发送方显示名称
    /// </summary>
    [StringLength(100)]
    public string? SenderName { get; set; }

    /// <summary>
    /// 接收方用户标识（私聊场景可用）
    /// </summary>
    [StringLength(100)]
    public string? RecipientId { get; set; }

    /// <summary>
    /// 消息类型
    /// </summary>
    [BsonRepresentation(BsonType.String)]
    public ChatMessageType Type { get; set; } = ChatMessageType.Text;

    /// <summary>
    /// 文本内容
    /// </summary>
    [StringLength(4000)]
    public string? Content { get; set; }

    /// <summary>
    /// 附件信息
    /// </summary>
    public ChatAttachmentInfo? Attachment { get; set; }

    /// <summary>
    /// 扩展元数据
    /// </summary>
    public Dictionary<string, object> Metadata { get; set; } = new();

    /// <summary>
    /// 消息是否被撤回
    /// </summary>
    public bool IsRecalled { get; set; } = false;

    /// <summary>
    /// 客户端生成的消息标识，用于去重和状态同步。
    /// </summary>
    [StringLength(100)]
    public string? ClientMessageId { get; set; }
}


