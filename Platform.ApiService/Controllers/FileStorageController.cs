using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Platform.ApiService.Services;
using Platform.ServiceDefaults.Models;

namespace Platform.ApiService.Controllers;

/// <summary>
/// 文件存储控制器
/// GridFS 文件上传、下载、删除等操作
/// </summary>
[Authorize]
[Route("api/files")]
[ApiController]
public class FileStorageController : ControllerBase
{
    private readonly GridFSStorageService _storageService;
    private readonly ILogger<FileStorageController> _logger;

    public FileStorageController(
        GridFSStorageService storageService,
        ILogger<FileStorageController> logger)
    {
        _storageService = storageService;
        _logger = logger;
    }

    [HttpPost("upload")]
    public async Task<IActionResult> Upload(IFormFile file, [FromForm] string? bucketName = "default")
    {
        if (file == null || file.Length == 0)
        {
            return BadRequest("File is required");
        }

        var fileName = file.FileName;
        var contentType = file.ContentType;

        using var stream = file.OpenReadStream();
        var fileId = await _storageService.UploadAsync(
            stream,
            fileName,
            contentType,
            null,
            bucketName ?? "default");

        return Ok(new { id = fileId, name = fileName });
    }

    [HttpGet("{fileId}")]
    public async Task<IActionResult> Download(string fileId, [FromQuery] string? bucketName = "default")
    {
        try
        {
            var fileInfo = await _storageService.GetFileInfoAsync(fileId, bucketName ?? "default");
            if (fileInfo == null)
            {
                return NotFound("File not found");
            }

            var stream = await _storageService.GetDownloadStreamAsync(fileId, bucketName ?? "default");
            return File(stream, fileInfo.ContentType ?? "application/octet-stream", fileInfo.FileName);
        }
        catch (ArgumentException)
        {
            return BadRequest("Invalid file ID");
        }
    }

    [HttpGet("{fileId}/info")]
    public async Task<IActionResult> GetFileInfo(string fileId, [FromQuery] string? bucketName = "default")
    {
        try
        {
            var fileInfo = await _storageService.GetFileInfoAsync(fileId, bucketName ?? "default");
            if (fileInfo == null)
            {
                return NotFound("File not found");
            }

            return Ok(fileInfo);
        }
        catch (ArgumentException)
        {
            return BadRequest("Invalid file ID");
        }
    }

    [HttpDelete("{fileId}")]
    public async Task<IActionResult> Delete(string fileId, [FromQuery] string? bucketName = "default")
    {
        try
        {
            var result = await _storageService.DeleteAsync(fileId, bucketName ?? "default");
            if (!result)
            {
                return NotFound("File not found");
            }

            return Ok(new { success = true });
        }
        catch (ArgumentException)
        {
            return BadRequest("Invalid file ID");
        }
    }

    [HttpPost("{fileId}/rename")]
    public async Task<IActionResult> Rename(string fileId, [FromBody] RenameRequest request, [FromQuery] string? bucketName = "default")
    {
        try
        {
            var result = await _storageService.RenameAsync(fileId, request.NewName, bucketName ?? "default");
            if (!result)
            {
                return NotFound("File not found");
            }

            return Ok(new { success = true });
        }
        catch (ArgumentException)
        {
            return BadRequest("Invalid file ID");
        }
    }

    [HttpPost("{fileId}/metadata")]
    public async Task<IActionResult> UpdateMetadata(string fileId, [FromBody] Dictionary<string, object> metadata, [FromQuery] string? bucketName = "default")
    {
        try
        {
            var result = await _storageService.UpdateMetadataAsync(fileId, metadata, bucketName ?? "default");
            if (!result)
            {
                return NotFound("File not found");
            }

            return Ok(new { success = true });
        }
        catch (ArgumentException)
        {
            return BadRequest("Invalid file ID");
        }
    }

    [HttpGet("stats")]
    public async Task<IActionResult> GetStats([FromQuery] string? bucketName = null)
    {
        var stats = await _storageService.GetStorageStatisticsAsync(bucketName);
        return Ok(stats);
    }

    [HttpGet("search")]
    public async Task<IActionResult> SearchByHash([FromQuery] string? md5, [FromQuery] string? fileName, [FromQuery] string? bucketName = "default")
    {
        StoredFileInfo? fileInfo = null;

        if (!string.IsNullOrEmpty(md5))
        {
            fileInfo = await _storageService.FindByHashAsync(md5, bucketName ?? "default");
        }
        else if (!string.IsNullOrEmpty(fileName))
        {
            fileInfo = await _storageService.FindByFileNameAsync(fileName, bucketName ?? "default");
        }

        if (fileInfo == null)
        {
            return NotFound("File not found");
        }

        return Ok(fileInfo);
    }

    [HttpHead("{fileId}")]
    public async Task<IActionResult> Exists(string fileId, [FromQuery] string? bucketName = "default")
    {
        var exists = await _storageService.ExistsAsync(fileId, bucketName ?? "default");
        return exists ? Ok() : NotFound();
    }
}

public class RenameRequest
{
    public string NewName { get; set; } = string.Empty;
}