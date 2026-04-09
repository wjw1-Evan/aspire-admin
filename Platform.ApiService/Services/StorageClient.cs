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
    private readonly IHttpClientFactory _httpClientFactory;
    private readonly ILogger<StorageClient> _logger;
    private const string BaseUrl = "http://storage";

    public StorageClient(IHttpClientFactory httpClientFactory, ILogger<StorageClient> logger)
    {
        _httpClientFactory = httpClientFactory;
        _logger = logger;
    }

    private HttpClient CreateClient() => _httpClientFactory.CreateClient("storage");

    public async Task<string> UploadAsync(Stream stream, string fileName, string? contentType = null, Dictionary<string, object>? metadata = null, string bucketName = "default")
    {
        var client = CreateClient();
        using var content = new MultipartFormDataContent();
        
        using var streamContent = new StreamContent(stream);
        streamContent.Headers.ContentType = new System.Net.Http.Headers.MediaTypeHeaderValue(contentType ?? "application/octet-stream");
        content.Add(streamContent, "file", fileName);
        
        if (!string.IsNullOrEmpty(bucketName) && bucketName != "default")
        {
            content.Add(new StringContent(bucketName), "bucketName");
        }

        var response = await client.PostAsync($"/api/files/upload", content);
        response.EnsureSuccessStatusCode();
        
        var result = await response.Content.ReadFromJsonAsync<UploadResponse>();
        return result?.Id ?? throw new InvalidOperationException("Upload response missing file ID");
    }

    public async Task<StoredFileInfo> UploadWithInfoAsync(Stream stream, string fileName, string? contentType = null, Dictionary<string, object>? metadata = null, string bucketName = "default")
    {
        var fileId = await UploadAsync(stream, fileName, contentType, metadata, bucketName);
        var fileInfo = await GetFileInfoAsync(fileId, bucketName);
        return fileInfo ?? throw new InvalidOperationException($"Failed to get file info after upload: {fileId}");
    }

    public async Task DownloadAsync(string fileId, Stream destination, string bucketName = "default")
    {
        var client = CreateClient();
        var url = $"/api/files/{fileId}";
        if (!string.IsNullOrEmpty(bucketName) && bucketName != "default")
        {
            url += $"?bucketName={bucketName}";
        }
        
        var response = await client.GetAsync(url);
        response.EnsureSuccessStatusCode();
        
        await response.Content.CopyToAsync(destination);
    }

    public async Task<Stream> GetDownloadStreamAsync(string fileId, string bucketName = "default")
    {
        var client = CreateClient();
        var url = $"/api/files/{fileId}";
        if (!string.IsNullOrEmpty(bucketName) && bucketName != "default")
        {
            url += $"?bucketName={bucketName}";
        }
        
        var response = await client.GetAsync(url);
        response.EnsureSuccessStatusCode();
        
        return await response.Content.ReadAsStreamAsync();
    }

    public async Task<byte[]> DownloadAsBytesAsync(string fileId, string bucketName = "default")
    {
        var client = CreateClient();
        var url = $"/api/files/{fileId}";
        if (!string.IsNullOrEmpty(bucketName) && bucketName != "default")
        {
            url += $"?bucketName={bucketName}";
        }
        
        return await client.GetByteArrayAsync(url);
    }

    public async Task<StoredFileInfo?> GetFileInfoAsync(string fileId, string bucketName = "default")
    {
        var client = CreateClient();
        var url = $"/api/files/{fileId}/info";
        if (!string.IsNullOrEmpty(bucketName) && bucketName != "default")
        {
            url += $"?bucketName={bucketName}";
        }
        
        try
        {
            var response = await client.GetAsync(url);
            if (!response.IsSuccessStatusCode) return null;
            return await response.Content.ReadFromJsonAsync<StoredFileInfo>();
        }
        catch
        {
            return null;
        }
    }

    public async Task<bool> DeleteAsync(string fileId, string bucketName = "default")
    {
        var client = CreateClient();
        var url = $"/api/files/{fileId}";
        if (!string.IsNullOrEmpty(bucketName) && bucketName != "default")
        {
            url += $"?bucketName={bucketName}";
        }
        
        var response = await client.DeleteAsync(url);
        return response.IsSuccessStatusCode;
    }

    public async Task<bool> ExistsAsync(string fileId, string bucketName = "default")
    {
        var client = CreateClient();
        var url = $"/api/files/{fileId}";
        if (!string.IsNullOrEmpty(bucketName) && bucketName != "default")
        {
            url += $"?bucketName={bucketName}";
        }
        
        var response = await client.SendAsync(new HttpRequestMessage(HttpMethod.Head, url));
        return response.IsSuccessStatusCode;
    }

    public async Task<bool> RenameAsync(string fileId, string newFileName, string bucketName = "default")
    {
        var client = CreateClient();
        var url = $"/api/files/{fileId}/rename";
        if (!string.IsNullOrEmpty(bucketName) && bucketName != "default")
        {
            url += $"?bucketName={bucketName}";
        }
        
        var response = await client.PostAsJsonAsync(url, new { NewFileName = newFileName });
        return response.IsSuccessStatusCode;
    }

    public async Task<bool> UpdateMetadataAsync(string fileId, Dictionary<string, object> metadata, string bucketName = "default")
    {
        var client = CreateClient();
        var url = $"/api/files/{fileId}/metadata";
        if (!string.IsNullOrEmpty(bucketName) && bucketName != "default")
        {
            url += $"?bucketName={bucketName}";
        }
        
        var response = await client.PostAsJsonAsync(url, metadata);
        return response.IsSuccessStatusCode;
    }

    public async Task<string?> GetFileHashAsync(string fileId, string bucketName = "default")
    {
        var fileInfo = await GetFileInfoAsync(fileId, bucketName);
        return fileInfo?.MD5;
    }

    public async Task<StoredFileInfo?> FindByHashAsync(string md5Hash, string bucketName = "default")
    {
        var client = CreateClient();
        var url = $"/api/files/search?md5={md5Hash}";
        if (!string.IsNullOrEmpty(bucketName) && bucketName != "default")
        {
            url += $"&bucketName={bucketName}";
        }
        
        try
        {
            var response = await client.GetAsync(url);
            if (!response.IsSuccessStatusCode) return null;
            return await response.Content.ReadFromJsonAsync<StoredFileInfo>();
        }
        catch
        {
            return null;
        }
    }

    public async Task<StorageStatistics> GetStorageStatisticsAsync(string? bucketName = null)
    {
        var client = CreateClient();
        var url = "/api/files/stats";
        if (!string.IsNullOrEmpty(bucketName))
        {
            url += $"?bucketName={bucketName}";
        }
        
        var response = await client.GetAsync(url);
        response.EnsureSuccessStatusCode();
        return await response.Content.ReadFromJsonAsync<StorageStatistics>() ?? new StorageStatistics();
    }

    public async Task<StoredFileInfo?> FindByFileNameAsync(string fileName, string bucketName = "default")
    {
        var client = CreateClient();
        var url = $"/api/files/search?fileName={Uri.EscapeDataString(fileName)}";
        if (!string.IsNullOrEmpty(bucketName) && bucketName != "default")
        {
            url += $"&bucketName={bucketName}";
        }
        
        try
        {
            var response = await client.GetAsync(url);
            if (!response.IsSuccessStatusCode) return null;
            return await response.Content.ReadFromJsonAsync<StoredFileInfo>();
        }
        catch
        {
            return null;
        }
    }
}

internal class UploadResponse
{
    public string? Id { get; set; }
    public string? Name { get; set; }
}