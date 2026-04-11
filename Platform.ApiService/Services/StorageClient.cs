using Platform.ServiceDefaults.Models;

namespace Platform.ApiService.Services;

public interface IStorageClient
{
    Task<string> UploadAsync(Stream stream, string fileName, string? contentType = null, Dictionary<string, object>? metadata = null, string bucketName = "default");
    Task<StoredFileInfo> UploadWithInfoAsync(Stream stream, string fileName, string? contentType = null, Dictionary<string, object>? metadata = null, string bucketName = "default");
    Task DownloadAsync(string fileId, Stream destination, string bucketName = "default");
    Task<Stream> GetDownloadStreamAsync(string fileId, string bucketName = "default");
    Task<byte[]> DownloadAsBytesAsync(string fileId, string bucketName = "default");
    Task<StoredFileInfo?> GetFileInfoAsync(string fileId, string bucketName = "default");
    Task<bool> DeleteAsync(string fileId, string bucketName = "default");
    Task<bool> ExistsAsync(string fileId, string bucketName = "default");
    Task<bool> RenameAsync(string fileId, string newFileName, string bucketName = "default");
    Task<bool> UpdateMetadataAsync(string fileId, Dictionary<string, object> metadata, string bucketName = "default");
    Task<string?> GetFileHashAsync(string fileId, string bucketName = "default");
    Task<StoredFileInfo?> FindByHashAsync(string md5Hash, string bucketName = "default");
    Task<StorageStatistics> GetStorageStatisticsAsync(string? bucketName = null);
    Task<StoredFileInfo?> FindByFileNameAsync(string fileName, string bucketName = "default");
}

public class StorageClient : IStorageClient
{
    private readonly GridFSStorageService _storageService;

    public StorageClient(GridFSStorageService storageService)
    {
        _storageService = storageService;
    }

    public Task<string> UploadAsync(Stream stream, string fileName, string? contentType = null, Dictionary<string, object>? metadata = null, string bucketName = "default")
        => _storageService.UploadAsync(stream, fileName, contentType, metadata, bucketName);

    public Task<StoredFileInfo> UploadWithInfoAsync(Stream stream, string fileName, string? contentType = null, Dictionary<string, object>? metadata = null, string bucketName = "default")
        => _storageService.UploadWithInfoAsync(stream, fileName, contentType, metadata, bucketName);

    public Task DownloadAsync(string fileId, Stream destination, string bucketName = "default")
        => _storageService.DownloadAsync(fileId, destination, bucketName);

    public Task<Stream> GetDownloadStreamAsync(string fileId, string bucketName = "default")
        => _storageService.GetDownloadStreamAsync(fileId, bucketName);

    public Task<byte[]> DownloadAsBytesAsync(string fileId, string bucketName = "default")
        => _storageService.DownloadAsBytesAsync(fileId, bucketName);

    public Task<StoredFileInfo?> GetFileInfoAsync(string fileId, string bucketName = "default")
        => _storageService.GetFileInfoAsync(fileId, bucketName);

    public Task<bool> DeleteAsync(string fileId, string bucketName = "default")
        => _storageService.DeleteAsync(fileId, bucketName);

    public Task<bool> ExistsAsync(string fileId, string bucketName = "default")
        => _storageService.ExistsAsync(fileId, bucketName);

    public Task<bool> RenameAsync(string fileId, string newFileName, string bucketName = "default")
        => _storageService.RenameAsync(fileId, newFileName, bucketName);

    public Task<bool> UpdateMetadataAsync(string fileId, Dictionary<string, object> metadata, string bucketName = "default")
        => _storageService.UpdateMetadataAsync(fileId, metadata, bucketName);

    public Task<string?> GetFileHashAsync(string fileId, string bucketName = "default")
        => _storageService.GetFileHashAsync(fileId, bucketName);

    public Task<StoredFileInfo?> FindByHashAsync(string md5Hash, string bucketName = "default")
        => _storageService.FindByHashAsync(md5Hash, bucketName);

    public Task<StorageStatistics> GetStorageStatisticsAsync(string? bucketName = null)
        => _storageService.GetStorageStatisticsAsync(bucketName);

    public Task<StoredFileInfo?> FindByFileNameAsync(string fileName, string bucketName = "default")
        => _storageService.FindByFileNameAsync(fileName, bucketName);
}