using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;
using Platform.ServiceDefaults.Attributes;
using Platform.ServiceDefaults.Models;

namespace Platform.ApiService.Models;

/// <summary>
/// 文件项类型枚举
/// </summary>
public enum FileItemType
{
    /// <summary>文件</summary>
    File = 0,

    /// <summary>文件夹</summary>
    Folder = 1
}

/// <summary>
/// 文件状态枚举
/// </summary>
public enum FileStatus
{
    /// <summary>活跃状态</summary>
    Active = 0,

    /// <summary>在回收站中</summary>
    InRecycleBin = 1,

    /// <summary>已删除</summary>
    Deleted = 2
}

/// <summary>
/// 分享类型枚举
/// </summary>
public enum ShareType
{
    /// <summary>链接分享</summary>
    Link = 0,

    /// <summary>企业内部分享</summary>
    Internal = 1,

    /// <summary>公开分享</summary>
    Public = 2
}

/// <summary>
/// 分享权限枚举
/// </summary>
public enum SharePermission
{
    /// <summary>仅查看</summary>
    View = 0,

    /// <summary>查看和下载</summary>
    Download = 1,

    /// <summary>编辑权限</summary>
    Edit = 2,

    /// <summary>完全控制</summary>
    Full = 3
}

/// <summary>
/// 文件项实体模型（文件和文件夹）
/// </summary>
[BsonIgnoreExtraElements]
[BsonCollectionName("file_items")]
public class FileItem : MultiTenantEntity, IEntity, ISoftDeletable, ITimestamped
{
    /// <summary>文件/文件夹名称</summary>
    [BsonElement("name")]
    public string Name { get; set; } = string.Empty;

    /// <summary>文件路径</summary>
    [BsonElement("path")]
    public string Path { get; set; } = string.Empty;

    /// <summary>父文件夹ID</summary>
    [BsonElement("parentId")]
    public string ParentId { get; set; } = string.Empty;

    /// <summary>文件项类型</summary>
    [BsonElement("type")]
    [BsonRepresentation(BsonType.Int32)]
    public FileItemType Type { get; set; } = FileItemType.File;

    /// <summary>文件大小（字节）</summary>
    [BsonElement("size")]
    public long Size { get; set; } = 0;

    /// <summary>MIME类型</summary>
    [BsonElement("mimeType")]
    public string MimeType { get; set; } = string.Empty;

    /// <summary>GridFS文件ID</summary>
    [BsonElement("gridFSId")]
    public string GridFSId { get; set; } = string.Empty;

    /// <summary>文件哈希值，用于去重</summary>
    [BsonElement("hash")]
    public string Hash { get; set; } = string.Empty;

    /// <summary>文件状态</summary>
    [BsonElement("status")]
    [BsonRepresentation(BsonType.Int32)]
    public FileStatus Status { get; set; } = FileStatus.Active;

    /// <summary>文件元数据</summary>
    [BsonElement("metadata")]
    public Dictionary<string, object> Metadata { get; set; } = [];

    /// <summary>标签列表</summary>
    [BsonElement("tags")]
    public List<string> Tags { get; set; } = [];

    /// <summary>最后访问时间</summary>
    [BsonElement("lastAccessedAt")]
    public DateTime? LastAccessedAt { get; set; }

    /// <summary>下载次数</summary>
    [BsonElement("downloadCount")]
    public int DownloadCount { get; set; } = 0;

    /// <summary>缩略图GridFS ID</summary>
    [BsonElement("thumbnailGridFSId")]
    public string ThumbnailGridFSId { get; set; } = string.Empty;
}

/// <summary>
/// 文件分享实体模型
/// </summary>
[BsonIgnoreExtraElements]
[BsonCollectionName("file_shares")]
public class FileShare : MultiTenantEntity, IEntity, ISoftDeletable, ITimestamped
{
    /// <summary>被分享的文件项ID</summary>
    [BsonElement("fileItemId")]
    public string FileItemId { get; set; } = string.Empty;

    /// <summary>分享令牌</summary>
    [BsonElement("shareToken")]
    public string ShareToken { get; set; } = string.Empty;

    /// <summary>分享类型</summary>
    [BsonElement("type")]
    [BsonRepresentation(BsonType.Int32)]
    public ShareType Type { get; set; } = ShareType.Link;

    /// <summary>分享权限</summary>
    [BsonElement("permission")]
    [BsonRepresentation(BsonType.Int32)]
    public SharePermission Permission { get; set; } = SharePermission.View;

    /// <summary>过期时间</summary>
    [BsonElement("expiresAt")]
    public DateTime? ExpiresAt { get; set; }

    /// <summary>分享密码</summary>
    [BsonElement("password")]
    public string Password { get; set; } = string.Empty;

    /// <summary>是否激活</summary>
    [BsonElement("isActive")]
    public bool IsActive { get; set; } = true;

    /// <summary>允许访问的用户ID列表（内部分享）</summary>
    [BsonElement("allowedUserIds")]
    public List<string> AllowedUserIds { get; set; } = [];

    /// <summary>访问次数</summary>
    [BsonElement("accessCount")]
    public int AccessCount { get; set; } = 0;

    /// <summary>最后访问时间</summary>
    [BsonElement("lastAccessedAt")]
    public DateTime? LastAccessedAt { get; set; }

    /// <summary>分享设置</summary>
    [BsonElement("settings")]
    public Dictionary<string, object> Settings { get; set; } = [];
}

/// <summary>
/// 文件版本实体模型
/// </summary>
[BsonIgnoreExtraElements]
[BsonCollectionName("file_versions")]
public class FileVersion : MultiTenantEntity, IEntity, ISoftDeletable, ITimestamped
{
    /// <summary>文件项ID</summary>
    [BsonElement("fileItemId")]
    public string FileItemId { get; set; } = string.Empty;

    /// <summary>版本号</summary>
    [BsonElement("versionNumber")]
    public int VersionNumber { get; set; } = 1;

    /// <summary>版本对应的GridFS ID</summary>
    [BsonElement("gridFSId")]
    public string GridFSId { get; set; } = string.Empty;

    /// <summary>版本文件大小</summary>
    [BsonElement("size")]
    public long Size { get; set; } = 0;

    /// <summary>版本文件哈希值</summary>
    [BsonElement("hash")]
    public string Hash { get; set; } = string.Empty;

    /// <summary>版本说明</summary>
    [BsonElement("comment")]
    public string Comment { get; set; } = string.Empty;

    /// <summary>是否为当前版本</summary>
    [BsonElement("isCurrentVersion")]
    public bool IsCurrentVersion { get; set; } = false;

    /// <summary>版本元数据</summary>
    [BsonElement("metadata")]
    public Dictionary<string, object> Metadata { get; set; } = [];
}

/// <summary>
/// 存储配额实体模型
/// </summary>
[BsonIgnoreExtraElements]
[BsonCollectionName("storage_quotas")]
public class StorageQuota : MultiTenantEntity, IEntity, ISoftDeletable, ITimestamped
{
    /// <summary>用户ID</summary>
    [BsonElement("userId")]
    public string UserId { get; set; } = string.Empty;

    /// <summary>总配额（字节）</summary>
    [BsonElement("totalQuota")]
    public long TotalQuota { get; set; } = 0;

    /// <summary>已使用空间（字节）</summary>
    [BsonElement("usedSpace")]
    public long UsedSpace { get; set; } = 0;

    /// <summary>文件数量</summary>
    [BsonElement("fileCount")]
    public long FileCount { get; set; } = 0;

    /// <summary>最后计算时间</summary>
    [BsonElement("lastCalculatedAt")]
    public DateTime LastCalculatedAt { get; set; } = DateTime.UtcNow;

    /// <summary>按文件类型统计使用量</summary>
    [BsonElement("typeUsage")]
    public Dictionary<string, long> TypeUsage { get; set; } = [];
}

/// <summary>
/// 文件预览信息模型
/// </summary>
public class FilePreviewInfo
{
    /// <summary>文件ID</summary>
    public string FileId { get; set; } = string.Empty;

    /// <summary>预览类型</summary>
    public string PreviewType { get; set; } = string.Empty;

    /// <summary>预览URL</summary>
    public string PreviewUrl { get; set; } = string.Empty;

    /// <summary>缩略图URL</summary>
    public string ThumbnailUrl { get; set; } = string.Empty;

    /// <summary>是否支持预览</summary>
    public bool IsPreviewable { get; set; } = false;

    /// <summary>预览元数据</summary>
    public Dictionary<string, object> Metadata { get; set; } = [];
}

/// <summary>
/// 存储使用信息模型
/// </summary>
public class StorageUsageInfo
{
    /// <summary>用户ID</summary>
    public string UserId { get; set; } = string.Empty;

    /// <summary>总配额（字节）</summary>
    public long TotalQuota { get; set; } = 0;

    /// <summary>已使用空间（字节）</summary>
    public long UsedSpace { get; set; } = 0;

    /// <summary>可用空间（字节）</summary>
    public long AvailableSpace => TotalQuota - UsedSpace;

    /// <summary>使用率（百分比）</summary>
    public double UsagePercentage => TotalQuota > 0 ? (double)UsedSpace / TotalQuota * 100 : 0;

    /// <summary>文件数量</summary>
    public long FileCount { get; set; } = 0;

    /// <summary>文件夹数量</summary>
    public long FolderCount { get; set; } = 0;

    /// <summary>按文件类型统计</summary>
    public Dictionary<string, long> TypeUsage { get; set; } = [];

    /// <summary>最后更新时间</summary>
    public DateTime LastUpdatedAt { get; set; } = DateTime.UtcNow;
}

/// <summary>
/// 回收站统计信息
/// </summary>
public class RecycleStatistics
{
    /// <summary>回收站总项目数（含文件和文件夹）</summary>
    public int TotalItems { get; set; }

    /// <summary>回收站中文件总大小（字节）</summary>
    public long TotalSize { get; set; }

    /// <summary>按日期分组的统计</summary>
    public List<RecycleStatisticsItem> ItemsByDate { get; set; } = [];
}

/// <summary>
/// 回收站按日期分组统计项
/// </summary>
public class RecycleStatisticsItem
{
    /// <summary>日期（yyyy-MM-dd）</summary>
    public string Date { get; set; } = string.Empty;

    /// <summary>当日回收站项目数</summary>
    public int Count { get; set; }

    /// <summary>当日文件总大小（字节）</summary>
    public long Size { get; set; }
}

/// <summary>
/// 文件版本比较结果模型
/// </summary>
public class FileVersionComparison
{
    /// <summary>版本1 ID</summary>
    public string Version1Id { get; set; } = string.Empty;

    /// <summary>版本2 ID</summary>
    public string Version2Id { get; set; } = string.Empty;

    /// <summary>版本1信息</summary>
    public FileVersion? Version1 { get; set; }

    /// <summary>版本2信息</summary>
    public FileVersion? Version2 { get; set; }

    /// <summary>差异内容（文本文件）</summary>
    public string? DiffContent { get; set; }

    /// <summary>是否有差异</summary>
    public bool HasDifferences { get; set; } = false;

    /// <summary>比较类型</summary>
    public string ComparisonType { get; set; } = string.Empty;

    /// <summary>比较元数据</summary>
    public Dictionary<string, object> Metadata { get; set; } = [];
}

/// <summary>
/// 分页结果模型
/// </summary>
/// <typeparam name="T">数据类型</typeparam>
public class PagedResult<T>
{
    /// <summary>数据列表</summary>
    public List<T> Data { get; set; } = [];

    /// <summary>总数量</summary>
    public int Total { get; set; } = 0;

    /// <summary>当前页码</summary>
    public int Page { get; set; } = 1;

    /// <summary>每页数量</summary>
    public int PageSize { get; set; } = 20;

    /// <summary>总页数</summary>
    public int TotalPages => PageSize > 0 ? (int)Math.Ceiling((double)Total / PageSize) : 0;

    /// <summary>是否有下一页</summary>
    public bool HasNextPage => Page < TotalPages;

    /// <summary>是否有上一页</summary>
    public bool HasPreviousPage => Page > 1;
}

/// <summary>
/// 文件列表查询参数
/// </summary>
public class FileListQuery
{
    /// <summary>页码</summary>
    public int Page { get; set; } = 1;

    /// <summary>每页数量</summary>
    public int PageSize { get; set; } = 20;

    /// <summary>排序字段</summary>
    public string SortBy { get; set; } = "name";

    /// <summary>排序方向</summary>
    public string SortOrder { get; set; } = "asc";

    /// <summary>文件类型筛选</summary>
    public FileItemType? Type { get; set; }

    /// <summary>文件状态筛选</summary>
    public FileStatus? Status { get; set; }
}

/// <summary>
/// 文件搜索查询参数
/// </summary>
public class FileSearchQuery
{
    /// <summary>搜索关键词</summary>
    public string Keyword { get; set; } = string.Empty;

    /// <summary>页码</summary>
    public int Page { get; set; } = 1;

    /// <summary>每页数量</summary>
    public int PageSize { get; set; } = 20;

    /// <summary>文件类型筛选</summary>
    public FileItemType? Type { get; set; }

    /// <summary>MIME类型筛选</summary>
    public string? MimeType { get; set; }

    /// <summary>文件大小范围（最小值，字节）</summary>
    public long? MinSize { get; set; }

    /// <summary>文件大小范围（最大值，字节）</summary>
    public long? MaxSize { get; set; }

    /// <summary>创建时间范围（开始）</summary>
    public DateTime? CreatedAfter { get; set; }

    /// <summary>创建时间范围（结束）</summary>
    public DateTime? CreatedBefore { get; set; }

    /// <summary>修改时间范围（开始）</summary>
    public DateTime? ModifiedAfter { get; set; }

    /// <summary>修改时间范围（结束）</summary>
    public DateTime? ModifiedBefore { get; set; }

    /// <summary>标签筛选</summary>
    public List<string> Tags { get; set; } = [];

    /// <summary>排序字段</summary>
    public string SortBy { get; set; } = "name";

    /// <summary>排序方向</summary>
    public string SortOrder { get; set; } = "asc";

    /// <summary>是否搜索文件内容</summary>
    public bool SearchContent { get; set; } = false;
}

/// <summary>
/// 文件内容搜索查询参数
/// </summary>
public class FileContentSearchQuery
{
    /// <summary>页码</summary>
    public int Page { get; set; } = 1;

    /// <summary>每页数量</summary>
    public int PageSize { get; set; } = 20;

    /// <summary>文件类型筛选</summary>
    public List<string> FileTypes { get; set; } = [];

    /// <summary>最大搜索文件大小（字节）</summary>
    public long? MaxFileSize { get; set; }

    /// <summary>是否区分大小写</summary>
    public bool CaseSensitive { get; set; } = false;

    /// <summary>是否使用正则表达式</summary>
    public bool UseRegex { get; set; } = false;
}

/// <summary>
/// 回收站查询参数
/// </summary>
public class RecycleBinQuery
{
    /// <summary>页码</summary>
    public int Page { get; set; } = 1;

    /// <summary>每页数量</summary>
    public int PageSize { get; set; } = 20;

    /// <summary>排序字段</summary>
    public string SortBy { get; set; } = "deletedAt";

    /// <summary>排序方向</summary>
    public string SortOrder { get; set; } = "desc";

    /// <summary>文件类型筛选</summary>
    public FileItemType? Type { get; set; }

    /// <summary>删除时间范围（开始）</summary>
    public DateTime? DeletedAfter { get; set; }

    /// <summary>删除时间范围（结束）</summary>
    public DateTime? DeletedBefore { get; set; }
}

/// <summary>
/// 批量操作结果
/// </summary>
public class BatchOperationResult
{
    /// <summary>总数量</summary>
    public int Total { get; set; } = 0;

    /// <summary>成功数量</summary>
    public int SuccessCount { get; set; } = 0;

    /// <summary>失败数量</summary>
    public int FailureCount { get; set; } = 0;

    /// <summary>成功的文件项ID列表</summary>
    public List<string> SuccessIds { get; set; } = [];

    /// <summary>失败的文件项信息</summary>
    public List<BatchOperationError> Errors { get; set; } = [];

    /// <summary>是否全部成功</summary>
    public bool IsAllSuccess => FailureCount == 0;

    /// <summary>操作开始时间</summary>
    public DateTime StartTime { get; set; } = DateTime.UtcNow;

    /// <summary>操作结束时间</summary>
    public DateTime? EndTime { get; set; }

    /// <summary>操作耗时（毫秒）</summary>
    public long? Duration => EndTime.HasValue ? (long)EndTime.Value.Subtract(StartTime).TotalMilliseconds : null;
}

/// <summary>
/// 批量操作错误信息
/// </summary>
public class BatchOperationError
{
    /// <summary>文件项ID</summary>
    public string FileItemId { get; set; } = string.Empty;

    /// <summary>文件项名称</summary>
    public string FileName { get; set; } = string.Empty;

    /// <summary>错误代码</summary>
    public string ErrorCode { get; set; } = string.Empty;

    /// <summary>错误消息</summary>
    public string ErrorMessage { get; set; } = string.Empty;

    /// <summary>错误详情</summary>
    public Dictionary<string, object> ErrorDetails { get; set; } = [];
}

/// <summary>
/// 存储使用统计信息
/// </summary>
public class StorageUsageStats
{
    /// <summary>总用户数</summary>
    public int TotalUsers { get; set; } = 0;

    /// <summary>总配额（字节）</summary>
    public long TotalQuota { get; set; } = 0;

    /// <summary>总使用量（字节）</summary>
    public long TotalUsed { get; set; } = 0;

    /// <summary>平均使用量（字节）</summary>
    public long AverageUsage { get; set; } = 0;

    /// <summary>使用量分布</summary>
    public List<UsageDistributionItem> UsageDistribution { get; set; } = [];

    /// <summary>使用量排行榜</summary>
    public List<TopUserItem> TopUsers { get; set; } = [];
}

/// <summary>
/// 使用量分布项
/// </summary>
public class UsageDistributionItem
{
    /// <summary>使用量范围</summary>
    public string Range { get; set; } = string.Empty;

    /// <summary>用户数量</summary>
    public int Count { get; set; } = 0;

    /// <summary>百分比</summary>
    public double Percentage { get; set; } = 0;
}

/// <summary>
/// 排行榜用户项
/// </summary>
public class TopUserItem
{
    /// <summary>用户ID</summary>
    public string UserId { get; set; } = string.Empty;

    /// <summary>用户名</summary>
    public string Username { get; set; } = string.Empty;

    /// <summary>用户显示名称</summary>
    public string UserDisplayName { get; set; } = string.Empty;

    /// <summary>已使用配额（字节）</summary>
    public long UsedQuota { get; set; } = 0;

    /// <summary>使用率（百分比）</summary>
    public double UsagePercentage { get; set; } = 0;
}
