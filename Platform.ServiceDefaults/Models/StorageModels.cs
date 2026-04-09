using MongoDB.Bson;

namespace Platform.ServiceDefaults.Models;

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
        var metadata = doc.GetValue("metadata", null)?.AsBsonDocument;
        
        long GetInt64Safe(BsonDocument d, string key)
        {
            var value = d.GetValue(key, null);
            if (value == null) return 0;
            
            return value.BsonType switch
            {
                BsonType.Int32 => value.AsInt32,
                BsonType.Int64 => value.AsInt64,
                _ => 0
            };
        }
        
        return new StoredFileInfo
        {
            Id = doc["_id"].AsObjectId.ToString(),
            FileName = doc["filename"].AsString,
            Length = GetInt64Safe(doc, "length"),
            ChunkSize = GetInt64Safe(doc, "chunkSize"),
            UploadDateTime = doc["uploadDate"].ToUniversalTime(),
            MD5 = doc.GetValue("md5", null)?.AsString,
            ContentType = metadata?.GetValue("contentType", null)?.AsString,
            Metadata = metadata?.ToDictionary(
                k => k.Name,
                v => (object)v.Value
            ) ?? new Dictionary<string, object>(),
            BucketName = bucketName
        };
    }
}

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