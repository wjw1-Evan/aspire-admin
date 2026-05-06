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