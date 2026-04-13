using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;

using Platform.ServiceDefaults.Models;

namespace Platform.ApiService.Models;

/// <summary>
/// 文件项实体模型（文件和文件夹）
/// </summary>
public class FileItem : MultiTenantEntity
{
    /// <summary>文件/文件夹名称</summary>
    [Required]
    [StringLength(255)]
    public string Name { get; set; } = string.Empty;

    /// <summary>文件路径</summary>
    [Required]
    [StringLength(2000)]
    public string Path { get; set; } = string.Empty;

    /// <summary>父文件夹ID</summary>
    [StringLength(100)]
    public string ParentId { get; set; } = string.Empty;

    /// <summary>文件项类型</summary>
    [BsonRepresentation(BsonType.Int32)]
    public FileItemType Type { get; set; } = FileItemType.File;

    /// <summary>文件大小（字节）</summary>
    public long Size { get; set; } = 0;

    /// <summary>MIME类型</summary>
    [StringLength(100)]
    public string MimeType { get; set; } = string.Empty;

    /// <summary>GridFS文件ID</summary>
    [StringLength(100)]
    public string GridFSId { get; set; } = string.Empty;

    /// <summary>文件哈希值，用于去重</summary>
    [StringLength(128)]
    public string Hash { get; set; } = string.Empty;

    /// <summary>删除时的原路径（用于回收站显示）</summary>
    [StringLength(2000)]
    public string? OriginalPath { get; set; }

    /// <summary>删除者显示名</summary>
    [StringLength(100)]
    public string? DeletedByName { get; set; }

    /// <summary>距离永久删除的天数（回收站提示）</summary>
    [Range(1, 365)]
    public int? DaysUntilPermanentDelete { get; set; }

    /// <summary>文件状态</summary>
    [BsonRepresentation(BsonType.Int32)]
    public FileStatus Status { get; set; } = FileStatus.Active;

    /// <summary>文件元数据</summary>
    public Dictionary<string, object> Metadata { get; set; } = [];

    /// <summary>标签列表</summary>
    public List<string> Tags { get; set; } = [];

    /// <summary>最后访问时间</summary>
    public DateTime? LastAccessedAt { get; set; }

    /// <summary>下载次数</summary>
    public int DownloadCount { get; set; } = 0;

    /// <summary>缩略图GridFS ID</summary>
    [StringLength(100)]
    public string ThumbnailGridFSId { get; set; } = string.Empty;
}

/// <summary>
/// 文件分享实体模型
/// </summary>
public class FileShare : MultiTenantEntity
{
    /// <summary>被分享的文件项ID</summary>
    [Required]
    [StringLength(100)]
    public string FileItemId { get; set; } = string.Empty;

    /// <summary>分享令牌</summary>
    [Required]
    [StringLength(100)]
    public string ShareToken { get; set; } = string.Empty;

    /// <summary>分享类型</summary>
    [BsonRepresentation(BsonType.Int32)]
    public ShareType Type { get; set; } = ShareType.Link;

    /// <summary>分享权限</summary>
    [BsonRepresentation(BsonType.Int32)]
    public SharePermission Permission { get; set; } = SharePermission.View;

    /// <summary>过期时间</summary>
    public DateTime? ExpiresAt { get; set; }

    /// <summary>分享密码</summary>
    [StringLength(100)]
    public string Password { get; set; } = string.Empty;

    /// <summary>是否激活</summary>
    public bool IsActive { get; set; } = true;

    /// <summary>允许访问的用户ID列表（内部分享）</summary>
    public List<string> AllowedUserIds { get; set; } = [];

    /// <summary>访问次数</summary>
    public int AccessCount { get; set; } = 0;

    /// <summary>最后访问时间</summary>
    public DateTime? LastAccessedAt { get; set; }

    /// <summary>分享设置</summary>
    public Dictionary<string, object> Settings { get; set; } = [];
}

/// <summary>
/// 文件版本实体模型
/// </summary>
public class FileVersion : MultiTenantEntity
{
    /// <summary>文件项ID</summary>
    [Required]
    [StringLength(100)]
    public string FileItemId { get; set; } = string.Empty;

    /// <summary>版本号</summary>
    public int VersionNumber { get; set; } = 1;

    /// <summary>版本对应的GridFS ID</summary>
    [StringLength(100)]
    public string GridFSId { get; set; } = string.Empty;

    /// <summary>版本文件大小</summary>
    public long Size { get; set; } = 0;

    /// <summary>版本文件哈希值</summary>
    [StringLength(128)]
    public string Hash { get; set; } = string.Empty;

    /// <summary>版本说明</summary>
    [StringLength(500)]
    public string Comment { get; set; } = string.Empty;

    /// <summary>是否为当前版本</summary>
    public bool IsCurrentVersion { get; set; } = false;

    /// <summary>版本元数据</summary>
    public Dictionary<string, object> Metadata { get; set; } = [];
}

/// <summary>
/// 存储配额实体模型
/// </summary>
public class StorageQuota : MultiTenantEntity
{
    /// <summary>用户ID</summary>
    [Required]
    [StringLength(100)]
    public string UserId { get; set; } = string.Empty;

    /// <summary>总配额（字节）</summary>
    public long TotalQuota { get; set; } = 0;

    /// <summary>已使用空间（字节）</summary>
    public long UsedSpace { get; set; } = 0;

    /// <summary>文件数量</summary>
    public long FileCount { get; set; } = 0;

    /// <summary>警告阈值（百分比，0-100）</summary>
    [Range(0, 100)]
    public int WarningThreshold { get; set; } = 80;

    /// <summary>是否启用</summary>
    public bool IsEnabled { get; set; } = true;

    /// <summary>最后计算时间</summary>
    public DateTime LastCalculatedAt { get; set; } = DateTime.UtcNow;

    /// <summary>按文件类型统计使用量</summary>
    public Dictionary<string, long> TypeUsage { get; set; } = [];
}



