using Microsoft.Extensions.Logging;
using MongoDB.Bson;
using MongoDB.Driver;
using MongoDB.Driver.GridFS;
using Platform.ServiceDefaults.Models;

namespace Platform.ServiceDefaults.Services;

/// <summary>
/// 🚀 GridFS 文件存储实现 - 基于 MongoDB GridFS
/// 实现 IFileStorageFactory 接口
/// </summary>
public class GridFSFileStorage : IFileStorageFactory
{
    private readonly IMongoDatabase _database;
    private readonly ILogger<GridFSFileStorage> _logger;
    private readonly Dictionary<string, GridFSBucket> _bucketCache;

    public string Provider => "GridFS";

    public GridFSFileStorage(
        IMongoDatabase database,
        ILogger<GridFSFileStorage> logger)
    {
        _database = database ?? throw new ArgumentNullException(nameof(database));
        _logger = logger;
        _bucketCache = new Dictionary<string, GridFSBucket>(StringComparer.OrdinalIgnoreCase);
    }

    private GridFSBucket GetBucket(string bucketName = "default")
    {
        if (_bucketCache.TryGetValue(bucketName, out var cachedBucket))
        {
            return cachedBucket;
        }

        var bucket = new GridFSBucket(_database, new GridFSBucketOptions
        {
            BucketName = bucketName,
            ChunkSizeBytes = 261120
        });

        _bucketCache[bucketName] = bucket;
        return bucket;
    }

    /// <inheritdoc />
    public async Task<string> UploadAsync(
        Stream stream,
        string fileName,
        string? contentType = null,
        Dictionary<string, object>? metadata = null,
        string bucketName = "default",
        CancellationToken cancellationToken = default)
    {
        var bucket = GetBucket(bucketName);

        var options = new GridFSUploadOptions
        {
            ChunkSizeBytes = 261120,
            Metadata = metadata?.ToBsonDocument()
        };

        if (!string.IsNullOrEmpty(contentType))
        {
            options.Metadata ??= new BsonDocument();
            options.Metadata["contentType"] = contentType;
        }

        var objectId = await bucket.UploadFromStreamAsync(
            fileName,
            stream,
            options,
            cancellationToken);

        _logger.LogInformation(
            "Uploaded file {FileName} to GridFS bucket {BucketName} with ID {FileId}",
            fileName,
            bucketName,
            objectId);

        return objectId.ToString();
    }

    /// <inheritdoc />
    public async Task<StoredFileInfo> UploadWithInfoAsync(
        Stream stream,
        string fileName,
        string? contentType = null,
        Dictionary<string, object>? metadata = null,
        string bucketName = "default",
        CancellationToken cancellationToken = default)
    {
        var objectId = await UploadAsync(
            stream,
            fileName,
            contentType,
            metadata,
            bucketName,
            cancellationToken);

        var fileInfo = await GetFileInfoAsync(objectId, bucketName, cancellationToken);
        return fileInfo ?? throw new InvalidOperationException($"Failed to get file info after upload: {objectId}");
    }

    /// <inheritdoc />
    public async Task DownloadAsync(
        string fileId,
        Stream destination,
        string bucketName = "default",
        CancellationToken cancellationToken = default)
    {
        if (!ObjectId.TryParse(fileId, out var objectId))
        {
            throw new ArgumentException($"Invalid GridFS file ID: {fileId}", nameof(fileId));
        }

        var bucket = GetBucket(bucketName);

        await bucket.DownloadToStreamAsync(
            objectId,
            destination,
            cancellationToken: cancellationToken);

        _logger.LogDebug(
            "Downloaded file {FileId} from GridFS bucket {BucketName}",
            fileId,
            bucketName);
    }
    /// <inheritdoc />
    public async Task<Stream> GetDownloadStreamAsync(
        string fileId,
        string bucketName = "default",
        CancellationToken cancellationToken = default)
    {
        if (!ObjectId.TryParse(fileId, out var objectId))
        {
            throw new ArgumentException($"Invalid GridFS file ID: {fileId}", nameof(fileId));
        }

        var bucket = GetBucket(bucketName);

        return await bucket.OpenDownloadStreamAsync(
            objectId,
            cancellationToken: cancellationToken);
    }

    /// <inheritdoc />
    public async Task<byte[]> DownloadAsBytesAsync(
        string fileId,
        string bucketName = "default",
        CancellationToken cancellationToken = default)
    {
        using var memoryStream = new MemoryStream();
        await DownloadAsync(fileId, memoryStream, bucketName, cancellationToken);
        return memoryStream.ToArray();
    }

    /// <inheritdoc />
    public async Task<StoredFileInfo?> GetFileInfoAsync(
        string fileId,
        string bucketName = "default",
        CancellationToken cancellationToken = default)
    {
        if (!ObjectId.TryParse(fileId, out var objectId))
        {
            throw new ArgumentException($"Invalid GridFS file ID: {fileId}", nameof(fileId));
        }

        var filesCollection = _database.GetCollection<BsonDocument>($"{bucketName}.files");

        try
        {
            var filter = Builders<BsonDocument>.Filter.Eq("_id", objectId);
            var doc = await filesCollection.Find(filter).FirstOrDefaultAsync(cancellationToken);

            if (doc == null)
            {
                return null;
            }

            return StoredFileInfo.FromBsonDocument(doc, bucketName);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to get file info for {FileId}", fileId);
            throw;
        }
    }

    /// <inheritdoc />
    public async Task<bool> DeleteAsync(
        string fileId,
        string bucketName = "default",
        CancellationToken cancellationToken = default)
    {
        if (!ObjectId.TryParse(fileId, out var objectId))
        {
            throw new ArgumentException($"Invalid GridFS file ID: {fileId}", nameof(fileId));
        }

        var bucket = GetBucket(bucketName);

        try
        {
            await bucket.DeleteAsync(objectId, cancellationToken);
            _logger.LogInformation("Deleted file {FileId} from GridFS bucket {BucketName}", fileId, bucketName);
            return true;
        }
        catch (GridFSFileNotFoundException)
        {
            _logger.LogWarning("File {FileId} not found in GridFS bucket {BucketName}", fileId, bucketName);
            return false;
        }
    }

    /// <inheritdoc />
    public async Task<bool> ExistsAsync(
        string fileId,
        string bucketName = "default",
        CancellationToken cancellationToken = default)
    {
        if (!ObjectId.TryParse(fileId, out var objectId))
        {
            return false;
        }

        var filesCollection = _database.GetCollection<BsonDocument>($"{bucketName}.files");
        var filter = Builders<BsonDocument>.Filter.Eq("_id", objectId);
        return await filesCollection.Find(filter).AnyAsync(cancellationToken);
    }

    /// <inheritdoc />
    public async Task<bool> RenameAsync(
        string fileId,
        string newFileName,
        string bucketName = "default",
        CancellationToken cancellationToken = default)
    {
        if (!ObjectId.TryParse(fileId, out var objectId))
        {
            throw new ArgumentException($"Invalid GridFS file ID: {fileId}", nameof(fileId));
        }

        var bucket = GetBucket(bucketName);

        try
        {
            await bucket.RenameAsync(objectId, newFileName, cancellationToken: cancellationToken);
            _logger.LogInformation(
                "Renamed file {FileId} to {NewFileName} in bucket {BucketName}",
                fileId,
                newFileName,
                bucketName);
            return true;
        }
        catch (GridFSFileNotFoundException)
        {
            _logger.LogWarning("File {FileId} not found for rename", fileId);
            return false;
        }
    }

    /// <inheritdoc />
    public async Task<bool> UpdateMetadataAsync(
        string fileId,
        Dictionary<string, object> metadata,
        string bucketName = "default",
        CancellationToken cancellationToken = default)
    {
        if (!ObjectId.TryParse(fileId, out var objectId))
        {
            throw new ArgumentException($"Invalid GridFS file ID: {fileId}", nameof(fileId));
        }

        var filesCollection = _database.GetCollection<BsonDocument>($"{bucketName}.files");

        try
        {
            var update = Builders<BsonDocument>.Update.Set("metadata", metadata.ToBsonDocument());
            var result = await filesCollection.UpdateOneAsync(
                Builders<BsonDocument>.Filter.Eq("_id", objectId),
                update,
                cancellationToken: cancellationToken);

            _logger.LogInformation(
                "Updated metadata for file {FileId} in bucket {BucketName}: {Success}",
                fileId,
                bucketName,
                result.ModifiedCount > 0);

            return result.ModifiedCount > 0;
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "File {FileId} not found for metadata update", fileId);
            return false;
        }
    }

    /// <inheritdoc />
    public async Task<string?> GetFileHashAsync(
        string fileId,
        string bucketName = "default",
        CancellationToken cancellationToken = default)
    {
        var fileInfo = await GetFileInfoAsync(fileId, bucketName, cancellationToken);
        return fileInfo?.MD5;
    }

    /// <inheritdoc />
    public async Task<StoredFileInfo?> FindByHashAsync(
        string md5Hash,
        string bucketName = "default",
        CancellationToken cancellationToken = default)
    {
        var filesCollection = _database.GetCollection<BsonDocument>($"{bucketName}.files");
        var filter = Builders<BsonDocument>.Filter.Eq("md5", md5Hash);
        var doc = await filesCollection.Find(filter).FirstOrDefaultAsync(cancellationToken);

        if (doc == null)
        {
            return null;
        }

        return StoredFileInfo.FromBsonDocument(doc, bucketName);
    }

    /// <inheritdoc />
    public async Task<StorageStatistics> GetStorageStatisticsAsync(
        string? bucketName = null,
        CancellationToken cancellationToken = default)
    {
        var statistics = new StorageStatistics
        {
            Provider = "GridFS",
            Buckets = new Dictionary<string, BucketStatistics>()
        };

        var bucketsToCheck = new List<string>();

        if (!string.IsNullOrEmpty(bucketName))
        {
            bucketsToCheck.Add(bucketName);
        }
        else
        {
            var collectionNames = _database.ListCollectionNames().ToList();
            foreach (var name in collectionNames)
            {
                if (name.StartsWith("fs.", StringComparison.OrdinalIgnoreCase))
                {
                    var bn = name == "fs.files" || name == "fs.chunks" ? "default" : name["fs.".Length..];
                    if (!bucketsToCheck.Contains(bn))
                    {
                        bucketsToCheck.Add(bn);
                    }
                }
            }
        }

        foreach (var bn in bucketsToCheck)
        {
            var stats = await CalculateBucketStatsAsync(bn, cancellationToken);
            statistics.Buckets[bn] = stats;
            statistics.TotalFileCount += stats.FileCount;
            statistics.TotalSizeBytes += stats.SizeBytes;
            statistics.TotalChunksCount += stats.ChunksCount;
        }

        return statistics;
    }

    private async Task<BucketStatistics> CalculateBucketStatsAsync(
        string bucketName,
        CancellationToken cancellationToken)
    {
        var stats = new BucketStatistics { BucketName = bucketName };

        try
        {
            var filesCollection = _database.GetCollection<BsonDocument>($"{bucketName}.files");
            var files = await filesCollection.Find(Builders<BsonDocument>.Filter.Empty)
                .ToListAsync(cancellationToken);

            stats.FileCount = files.Count;
            stats.SizeBytes = files.Sum(f => GetInt64Safe(f, "length"));
            stats.ChunksCount = files.Sum(f =>
            {
                var length = GetInt64Safe(f, "length");
                var chunkSize = GetInt64Safe(f, "chunkSize", 261120);
                return (long)Math.Ceiling((double)length / chunkSize);
            });
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to calculate stats for bucket {BucketName}", bucketName);
        }

        return stats;
    }

    /// <summary>
    /// 安全地获取 Int64 值（处理 Int32/Int64 类型混用的情况）
    /// </summary>
    private static long GetInt64Safe(BsonDocument doc, string key, long defaultValue = 0)
    {
        var value = doc.GetValue(key, null);
        if (value == null) return defaultValue;

        return value.BsonType switch
        {
            BsonType.Int32 => value.AsInt32,
            BsonType.Int64 => value.AsInt64,
            _ => defaultValue
        };
    }

    /// <inheritdoc />
    public async Task<StoredFileInfo?> FindByFileNameAsync(
        string fileName,
        string bucketName = "default",
        CancellationToken cancellationToken = default)
    {
        var filesCollection = _database.GetCollection<BsonDocument>($"{bucketName}.files");
        var filter = Builders<BsonDocument>.Filter.Eq("filename", fileName);
        var doc = await filesCollection.Find(filter).FirstOrDefaultAsync(cancellationToken);

        if (doc == null)
        {
            return null;
        }

        return StoredFileInfo.FromBsonDocument(doc, bucketName);
    }
}
