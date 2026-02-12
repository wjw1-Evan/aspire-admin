using MongoDB.Bson;
using MongoDB.Driver.GridFS;
using Platform.ServiceDefaults.Models;

namespace Platform.ServiceDefaults.Services;

/// <summary>
/// 🚀 文件存储工厂接口 - 通用文件存储抽象
/// 支持多种存储后端：GridFS、Azure Blob Storage、S3 等
/// </summary>
public interface IFileStorageFactory
{
    /// <summary>
    /// 获取存储提供者信息
    /// </summary>
    string Provider { get; }

    /// <summary>
    /// 上传文件到存储
    /// </summary>
    Task<string> UploadAsync(
        Stream stream,
        string fileName,
        string? contentType = null,
        Dictionary<string, object>? metadata = null,
        string bucketName = "default",
        CancellationToken cancellationToken = default);

    /// <summary>
    /// 上传文件并返回文件信息
    /// </summary>
    Task<StoredFileInfo> UploadWithInfoAsync(
        Stream stream,
        string fileName,
        string? contentType = null,
        Dictionary<string, object>? metadata = null,
        string bucketName = "default",
        CancellationToken cancellationToken = default);

    /// <summary>
    /// 下载文件到流
    /// </summary>
    Task DownloadAsync(
        string fileId,
        Stream destination,
        string bucketName = "default",
        CancellationToken cancellationToken = default);

    /// <summary>
    /// 获取文件下载流
    /// </summary>
    Task<Stream> GetDownloadStreamAsync(
        string fileId,
        string bucketName = "default",
        CancellationToken cancellationToken = default);

    /// <summary>
    /// 获取文件内容作为字节数组
    /// </summary>
    Task<byte[]> DownloadAsBytesAsync(
        string fileId,
        string bucketName = "default",
        CancellationToken cancellationToken = default);

    /// <summary>
    /// 获取文件信息
    /// </summary>
    Task<StoredFileInfo?> GetFileInfoAsync(
        string fileId,
        string bucketName = "default",
        CancellationToken cancellationToken = default);

    /// <summary>
    /// 删除文件
    /// </summary>
    Task<bool> DeleteAsync(
        string fileId,
        string bucketName = "default",
        CancellationToken cancellationToken = default);

    /// <summary>
    /// 检查文件是否存在
    /// </summary>
    Task<bool> ExistsAsync(
        string fileId,
        string bucketName = "default",
        CancellationToken cancellationToken = default);

    /// <summary>
    /// 重命名文件
    /// </summary>
    Task<bool> RenameAsync(
        string fileId,
        string newFileName,
        string bucketName = "default",
        CancellationToken cancellationToken = default);

    /// <summary>
    /// 更新文件元数据
    /// </summary>
    Task<bool> UpdateMetadataAsync(
        string fileId,
        Dictionary<string, object> metadata,
        string bucketName = "default",
        CancellationToken cancellationToken = default);

    /// <summary>
    /// 获取文件的 MD5 哈希值（用于去重）
    /// </summary>
    Task<string?> GetFileHashAsync(
        string fileId,
        string bucketName = "default",
        CancellationToken cancellationToken = default);

    /// <summary>
    /// 根据 MD5 哈希查找已存在的文件（用于秒传）
    /// </summary>
    Task<StoredFileInfo?> FindByHashAsync(
        string md5Hash,
        string bucketName = "default",
        CancellationToken cancellationToken = default);

    /// <summary>
    /// 获取存储使用统计
    /// </summary>
    Task<StorageStatistics> GetStorageStatisticsAsync(
        string? bucketName = null,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// 根据文件名查找文件
    /// </summary>
    Task<StoredFileInfo?> FindByFileNameAsync(
        string fileName,
        string bucketName = "default",
        CancellationToken cancellationToken = default);
}

/// <summary>
/// 存储的文件信息
/// </summary>
public class StoredFileInfo
{
    public string Id { get; set; } = string.Empty;
    public string FileName { get; set; } = string.Empty;
    public long Length { get; set; }
    public long ChunkSize { get; set; }
    public DateTime UploadDateTime { get; set; }
    public string? MD5 { get; set; }
    public string? ContentType { get; set; }
    public Dictionary<string, object> Metadata { get; set; } = new();
    public string BucketName { get; set; } = "default";

    public static StoredFileInfo FromBsonDocument(BsonDocument doc, string bucketName = "default")
    {
        return new StoredFileInfo
        {
            Id = doc["_id"].AsObjectId.ToString(),
            FileName = doc["filename"].AsString,
            Length = doc["length"].AsInt64,
            ChunkSize = doc["chunkSize"].AsInt64,
            UploadDateTime = doc["uploadDate"].ToUniversalTime(),
            MD5 = doc.GetValue("md5", null)?.AsString,
            ContentType = doc.GetValue("contentType", null)?.AsString,
            Metadata = doc.GetValue("metadata", null)?.AsBsonDocument?.ToDictionary(
                k => k.Name,
                v => (object)v.Value
            ) ?? new Dictionary<string, object>(),
            BucketName = bucketName
        };
    }
}

/// <summary>
/// 存储统计信息
/// </summary>
public class StorageStatistics
{
    public string Provider { get; set; } = string.Empty;
    public long TotalFileCount { get; set; }
    public long TotalSizeBytes { get; set; }
    public long TotalChunksCount { get; set; }
    public Dictionary<string, BucketStatistics> Buckets { get; set; } = new();
}

public class BucketStatistics
{
    public string BucketName { get; set; } = string.Empty;
    public long FileCount { get; set; }
    public long SizeBytes { get; set; }
    public long ChunksCount { get; set; }
}
