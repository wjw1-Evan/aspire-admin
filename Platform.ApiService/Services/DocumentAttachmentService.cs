using Microsoft.AspNetCore.Http;
using Platform.ApiService.Models;
using Platform.ServiceDefaults.Models;
using Platform.ServiceDefaults.Services;
using Microsoft.Extensions.Logging;
using System.Security.Authentication;
using System.Security.Cryptography;

namespace Platform.ApiService.Services;

public class DocumentAttachmentService : IDocumentAttachmentService
{
    private readonly IStorageClient _storageClient;
    private readonly ITenantContext _tenantContext;
    private readonly ILogger<DocumentAttachmentService> _logger;

    public DocumentAttachmentService(
        IStorageClient storageClient,
        ITenantContext tenantContext,
        ILogger<DocumentAttachmentService> logger)
    {
        _storageClient = storageClient;
        _tenantContext = tenantContext;
        _logger = logger;
    }

    public async Task<DocumentAttachmentUploadResult> UploadAttachmentAsync(IFormFile file)
    {
        ArgumentNullException.ThrowIfNull(file);

        if (file.Length <= 0)
            throw new ArgumentException("附件内容为空", nameof(file));

        var userId = _tenantContext.GetCurrentUserId() ?? throw new AuthenticationException(ErrorCode.UserNotAuthenticated);

        await using var fileStream = file.OpenReadStream();

        string checksum;
        using (var sha256 = SHA256.Create())
        {
            var hashBytes = await sha256.ComputeHashAsync(fileStream);
            checksum = Convert.ToHexString(hashBytes);
        }

        fileStream.Position = 0;

        var fileName = string.IsNullOrWhiteSpace(file.FileName)
            ? $"attachment-{Guid.NewGuid():N}"
            : file.FileName;

        var metadata = new Dictionary<string, object>
        {
            { "uploaderId", userId },
            { "mimeType", file.ContentType ?? "application/octet-stream" },
            { "size", file.Length },
            { "checksum", checksum }
        };

        var gridFsId = await _storageClient.UploadAsync(
            fileStream,
            fileName,
            file.ContentType,
            metadata,
            "document_attachments");

        return new DocumentAttachmentUploadResult
        {
            Id = gridFsId,
            Name = fileName,
            Size = file.Length,
            ContentType = file.ContentType ?? "application/octet-stream",
            Url = $"/api/documents/attachments/{gridFsId}"
        };
    }

    public async Task<DocumentAttachmentDownloadResult?> DownloadAttachmentAsync(string attachmentId)
    {
        if (string.IsNullOrWhiteSpace(attachmentId))
            throw new ArgumentException("附件标识不能为空", nameof(attachmentId));

        try
        {
            var bytes = await _storageClient.DownloadAsBytesAsync(attachmentId, "document_attachments");
            var fileInfo = await _storageClient.GetFileInfoAsync(attachmentId, "document_attachments");

            return new DocumentAttachmentDownloadResult
            {
                Content = new MemoryStream(bytes),
                ContentType = fileInfo?.ContentType ?? "application/octet-stream",
                FileName = fileInfo?.FileName ?? "attachment",
                ContentLength = fileInfo?.Length ?? bytes.Length
            };
        }
        catch
        {
            return null;
        }
    }
}
