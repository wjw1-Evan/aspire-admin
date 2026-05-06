using Microsoft.Extensions.Logging;
using Platform.ServiceDefaults.Models;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;

namespace Platform.ApiService.Services;

public class FileSystemStorageService
{
    private readonly string _baseStoragePath;
    private readonly ILogger<FileSystemStorageService> _logger;

    public string Provider => "FileSystem";

    public FileSystemStorageService(
        ILogger<FileSystemStorageService> logger,
        string? baseStoragePath = null)
    {
        _logger = logger ?? throw new ArgumentNullException(nameof(logger));
        _baseStoragePath = baseStoragePath ?? Path.Combine(
            Environment.GetFolderPath(Environment.SpecialFolder.ApplicationData),
            "AspireAdmin",
            "FileStorage");

        Directory.CreateDirectory(_baseStoragePath);
    }

    private string GetBucketPath(string bucketName)
    {
        var bucketPath = Path.Combine(_baseStoragePath, SanitizeFileName(bucketName));
        Directory.CreateDirectory(bucketPath);
        Directory.CreateDirectory(Path.Combine(bucketPath, "files"));
        Directory.CreateDirectory(Path.Combine(bucketPath, "metadata"));
        return bucketPath;
    }

    private static string SanitizeFileName(string name)
    {
        var invalidChars = Path.GetInvalidFileNameChars();
        return new string(name.Select(c => invalidChars.Contains(c) ? '_' : c).ToArray());
    }

    public async Task<string> UploadAsync(
        Stream stream,
        string fileName,
        string? contentType = null,
        Dictionary<string, object>? metadata = null,
        string bucketName = "default",
        CancellationToken cancellationToken = default)
    {
        var fileId = Guid.NewGuid().ToString();
        var bucketPath = GetBucketPath(bucketName);
        var fileExtension = Path.GetExtension(fileName);
        var storedFileName = $"{fileId}{fileExtension}";
        var filePath = Path.Combine(bucketPath, "files", storedFileName);

        await using (var fileStream = new FileStream(filePath, FileMode.Create, FileAccess.Write))
        {
            await stream.CopyToAsync(fileStream, cancellationToken);
        }

        var fileInfo = new StoredFileInfo
        {
            Id = fileId,
            FileName = fileName,
            Length = new FileInfo(filePath).Length,
            ChunkSize = new FileInfo(filePath).Length,
            UploadDateTime = DateTime.UtcNow,
            ContentType = contentType ?? "application/octet-stream",
            Metadata = metadata ?? new Dictionary<string, object>(),
            BucketName = bucketName
        };

        fileInfo.MD5 = await ComputeMD5Async(filePath);

        var metadataPath = Path.Combine(bucketPath, "metadata", $"{fileId}.json");
        await File.WriteAllTextAsync(
            metadataPath,
            JsonSerializer.Serialize(fileInfo, JsonOptions),
            cancellationToken);

        _logger.LogDebug(
            "Uploaded file {FileId} to bucket {BucketName}",
            fileId,
            bucketName);

        return fileId;
    }

    public async Task<StoredFileInfo> UploadWithInfoAsync(
        Stream stream,
        string fileName,
        string? contentType = null,
        Dictionary<string, object>? metadata = null,
        string bucketName = "default",
        CancellationToken cancellationToken = default)
    {
        var fileId = await UploadAsync(
            stream,
            fileName,
            contentType,
            metadata,
            bucketName,
            cancellationToken);

        var fileInfo = await GetFileInfoAsync(fileId, bucketName, cancellationToken);
        return fileInfo ?? throw new InvalidOperationException($"Failed to get file info after upload: {fileId}");
    }

    public async Task DownloadAsync(
        string fileId,
        Stream destination,
        string bucketName = "default",
        CancellationToken cancellationToken = default)
    {
        var filePath = GetFilePath(fileId, bucketName);

        if (!File.Exists(filePath))
        {
            throw new FileNotFoundException($"File {fileId} not found in bucket {bucketName}");
        }

        await using (var fileStream = new FileStream(filePath, FileMode.Open, FileAccess.Read))
        {
            await fileStream.CopyToAsync(destination, cancellationToken);
        }

        _logger.LogDebug(
            "Downloaded file {FileId} from bucket {BucketName}",
            fileId,
            bucketName);
    }

    public async Task<Stream> GetDownloadStreamAsync(
        string fileId,
        string bucketName = "default",
        CancellationToken cancellationToken = default)
    {
        var filePath = GetFilePath(fileId, bucketName);

        if (!File.Exists(filePath))
        {
            throw new FileNotFoundException($"File {fileId} not found in bucket {bucketName}");
        }

        return new FileStream(filePath, FileMode.Open, FileAccess.Read, FileShare.Read, 4096, true);
    }

    public async Task<byte[]> DownloadAsBytesAsync(
        string fileId,
        string bucketName = "default",
        CancellationToken cancellationToken = default)
    {
        using var memoryStream = new MemoryStream();
        await DownloadAsync(fileId, memoryStream, bucketName, cancellationToken);
        return memoryStream.ToArray();
    }

    public async Task<StoredFileInfo?> GetFileInfoAsync(
        string fileId,
        string bucketName = "default",
        CancellationToken cancellationToken = default)
    {
        var metadataPath = GetMetadataPath(fileId, bucketName);

        if (!File.Exists(metadataPath))
        {
            return null;
        }

        try
        {
            var json = await File.ReadAllTextAsync(metadataPath, cancellationToken);
            return JsonSerializer.Deserialize<StoredFileInfo>(json, JsonOptions);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to get file info for {FileId}", fileId);
            throw;
        }
    }

    public async Task<bool> DeleteAsync(
        string fileId,
        string bucketName = "default",
        CancellationToken cancellationToken = default)
    {
        var filePath = GetFilePath(fileId, bucketName);
        var metadataPath = GetMetadataPath(fileId, bucketName);

        try
        {
            if (File.Exists(filePath))
            {
                File.Delete(filePath);
            }

            if (File.Exists(metadataPath))
            {
                File.Delete(metadataPath);
            }

            return true;
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "File {FileId} not found in bucket {BucketName}", fileId, bucketName);
            return false;
        }
    }

    public async Task<bool> ExistsAsync(
        string fileId,
        string bucketName = "default",
        CancellationToken cancellationToken = default)
    {
        var metadataPath = GetMetadataPath(fileId, bucketName);
        return File.Exists(metadataPath);
    }

    public async Task<bool> RenameAsync(
        string fileId,
        string newFileName,
        string bucketName = "default",
        CancellationToken cancellationToken = default)
    {
        var fileInfo = await GetFileInfoAsync(fileId, bucketName, cancellationToken);
        if (fileInfo == null)
        {
            _logger.LogWarning("File {FileId} not found for rename", fileId);
            return false;
        }

        fileInfo.FileName = newFileName;
        await UpdateFileInfoAsync(fileInfo, cancellationToken);
        return true;
    }

    public async Task<bool> UpdateMetadataAsync(
        string fileId,
        Dictionary<string, object> metadata,
        string bucketName = "default",
        CancellationToken cancellationToken = default)
    {
        var fileInfo = await GetFileInfoAsync(fileId, bucketName, cancellationToken);
        if (fileInfo == null)
        {
            _logger.LogWarning("File {FileId} not found for metadata update", fileId);
            return false;
        }

        fileInfo.Metadata = metadata;
        await UpdateFileInfoAsync(fileInfo, cancellationToken);
        return true;
    }

    public async Task<string?> GetFileHashAsync(
        string fileId,
        string bucketName = "default",
        CancellationToken cancellationToken = default)
    {
        var fileInfo = await GetFileInfoAsync(fileId, bucketName, cancellationToken);
        return fileInfo?.MD5;
    }

    public async Task<StoredFileInfo?> FindByHashAsync(
        string md5Hash,
        string bucketName = "default",
        CancellationToken cancellationToken = default)
    {
        var bucketPath = GetBucketPath(bucketName);
        var metadataDir = Path.Combine(bucketPath, "metadata");

        if (!Directory.Exists(metadataDir))
        {
            return null;
        }

        foreach (var metadataFile in Directory.GetFiles(metadataDir, "*.json"))
        {
            var json = await File.ReadAllTextAsync(metadataFile, cancellationToken);
            var fileInfo = JsonSerializer.Deserialize<StoredFileInfo>(json, JsonOptions);

            if (fileInfo?.MD5?.Equals(md5Hash, StringComparison.OrdinalIgnoreCase) == true)
            {
                return fileInfo;
            }
        }

        return null;
    }

    public async Task<StorageStatistics> GetStorageStatisticsAsync(
        string? bucketName = null,
        CancellationToken cancellationToken = default)
    {
        var statistics = new StorageStatistics
        {
            Provider = "FileSystem",
            Buckets = new Dictionary<string, BucketStatistics>()
        };

        var bucketsToCheck = new List<string>();

        if (!string.IsNullOrEmpty(bucketName))
        {
            bucketsToCheck.Add(bucketName);
        }
        else
        {
            var bucketDirs = Directory.GetDirectories(_baseStoragePath);
            bucketsToCheck.AddRange(bucketDirs.Select(Path.GetFileName));
        }

        foreach (var bn in bucketsToCheck)
        {
            var stats = await CalculateBucketStatsAsync(bn, cancellationToken);
            statistics.Buckets[bn] = stats;
            statistics.TotalFileCount += stats.FileCount;
            statistics.TotalSizeBytes += stats.SizeBytes;
        }

        return statistics;
    }

    public async Task<StoredFileInfo?> FindByFileNameAsync(
        string fileName,
        string bucketName = "default",
        CancellationToken cancellationToken = default)
    {
        var bucketPath = GetBucketPath(bucketName);
        var metadataDir = Path.Combine(bucketPath, "metadata");

        if (!Directory.Exists(metadataDir))
        {
            return null;
        }

        foreach (var metadataFile in Directory.GetFiles(metadataDir, "*.json"))
        {
            var json = await File.ReadAllTextAsync(metadataFile, cancellationToken);
            var fileInfo = JsonSerializer.Deserialize<StoredFileInfo>(json, JsonOptions);

            if (fileInfo?.FileName?.Equals(fileName, StringComparison.OrdinalIgnoreCase) == true)
            {
                return fileInfo;
            }
        }

        return null;
    }

    private async Task UpdateFileInfoAsync(StoredFileInfo fileInfo, CancellationToken cancellationToken)
    {
        var metadataPath = GetMetadataPath(fileInfo.Id, fileInfo.BucketName);
        await File.WriteAllTextAsync(
            metadataPath,
            JsonSerializer.Serialize(fileInfo, JsonOptions),
            cancellationToken);
    }

    private string GetFilePath(string fileId, string bucketName)
    {
        var bucketPath = GetBucketPath(bucketName);
        var filesDir = Path.Combine(bucketPath, "files");

        if (!Directory.Exists(filesDir))
        {
            return string.Empty;
        }

        var files = Directory.GetFiles(filesDir, $"{fileId}.*");
        return files.Length > 0 ? files[0] : Path.Combine(filesDir, fileId);
    }

    private string GetMetadataPath(string fileId, string bucketName)
    {
        var bucketPath = GetBucketPath(bucketName);
        return Path.Combine(bucketPath, "metadata", $"{fileId}.json");
    }

    private async Task<string> ComputeMD5Async(string filePath)
    {
        await using var stream = new FileStream(filePath, FileMode.Open, FileAccess.Read, FileShare.Read, 4096, true);
        var hash = await MD5.HashDataAsync(stream);
        return Convert.ToHexString(hash).ToLowerInvariant();
    }

    private async Task<BucketStatistics> CalculateBucketStatsAsync(
        string bucketName,
        CancellationToken cancellationToken)
    {
        var stats = new BucketStatistics { BucketName = bucketName };

        try
        {
            var bucketPath = GetBucketPath(bucketName);
            var filesDir = Path.Combine(bucketPath, "files");
            var metadataDir = Path.Combine(bucketPath, "metadata");

            if (Directory.Exists(filesDir))
            {
                var files = Directory.GetFiles(filesDir);
                stats.FileCount = files.Length;
                stats.SizeBytes = files.Sum(f => new FileInfo(f).Length);
            }

            if (Directory.Exists(metadataDir))
            {
                stats.ChunksCount = Directory.GetFiles(metadataDir).Length;
            }
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to calculate stats for bucket {BucketName}", bucketName);
        }

        return stats;
    }

    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        WriteIndented = true,
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase
    };
}
