#pragma warning disable CS1591
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Logging;
using Platform.ApiService.Models;
using Platform.ServiceDefaults.Services;
using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Linq.Expressions;
using System.Security.Cryptography;
using System.Threading.Tasks;

namespace Platform.ApiService.Services;

public class ChatAttachmentService : IChatAttachmentService
{
    private readonly IDataFactory<ChatAttachment> _attachmentFactory;
    private readonly IFileStorageFactory _fileStorageFactory;
    private readonly ITenantContext _tenantContext;
    private readonly IChatSessionService _sessionService;
    private readonly ILogger<ChatAttachmentService> _logger;

    public ChatAttachmentService(
        IDataFactory<ChatAttachment> attachmentFactory,
        IFileStorageFactory fileStorageFactory,
        ITenantContext tenantContext,
        IChatSessionService sessionService,
        ILogger<ChatAttachmentService> logger)
    {
        _attachmentFactory = attachmentFactory ?? throw new ArgumentNullException(nameof(attachmentFactory));
        _fileStorageFactory = fileStorageFactory ?? throw new ArgumentNullException(nameof(fileStorageFactory));
        _tenantContext = tenantContext ?? throw new ArgumentNullException(nameof(tenantContext));
        _sessionService = sessionService ?? throw new ArgumentNullException(nameof(sessionService));
        _logger = logger ?? throw new ArgumentNullException(nameof(logger));
    }

    public async Task<ChatAttachmentInfo> UploadAttachmentAsync(string sessionId, IFormFile file)
    {
        ArgumentNullException.ThrowIfNull(file);
        if (file.Length <= 0) throw new ArgumentException("附件内容为空", nameof(file));

        var session = await _sessionService.EnsureSessionAccessibleAsync(sessionId);
        var currentUserId = _tenantContext.GetCurrentUserId() ?? throw new UnauthorizedAccessException("USER_NOT_AUTHENTICATED");

        using var memoryStream = new MemoryStream();
        await file.CopyToAsync(memoryStream);
        memoryStream.Position = 0;

        string checksum;
        using (var sha256 = SHA256.Create())
        {
            checksum = Convert.ToHexString(sha256.ComputeHash(memoryStream));
        }

        var fileName = string.IsNullOrWhiteSpace(file.FileName)
            ? $"attachment-{Guid.NewGuid():N}"
            : file.FileName;

        memoryStream.Position = 0;
        var gridFsId = await _fileStorageFactory.UploadAsync(
            memoryStream,
            fileName,
            file.ContentType ?? "application/octet-stream",
            new Dictionary<string, object>
            {
                { "sessionId", session.Id },
                { "uploaderId", currentUserId },
                { "checksum", checksum }
            },
            "chat_attachments");

        var attachment = new ChatAttachment
        {
            SessionId = session.Id,
            UploaderId = currentUserId,
            Name = fileName,
            Size = file.Length,
            MimeType = file.ContentType ?? "application/octet-stream",
            StorageObjectId = gridFsId.ToString(),
            DownloadUrl = $"/api/chat/messages/{session.Id}/attachments/{gridFsId}",
            Checksum = checksum,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        attachment = await _attachmentFactory.CreateAsync(attachment);

        return new ChatAttachmentInfo
        {
            Id = attachment.Id,
            Name = attachment.Name,
            Size = attachment.Size,
            MimeType = attachment.MimeType,
            Url = attachment.DownloadUrl,
            ThumbnailUrl = attachment.ThumbnailUrl,
            UploadedAt = attachment.CreatedAt
        };
    }

    public async Task<ChatAttachmentDownloadResult> DownloadAttachmentAsync(string sessionId, string storageObjectId)
    {
        var session = await _sessionService.EnsureSessionAccessibleAsync(sessionId);

        Expression<Func<ChatAttachment, bool>> filter = attachment => attachment.SessionId == session.Id &&
                                                                  attachment.StorageObjectId == storageObjectId;

        var attachments = await _attachmentFactory.FindAsync(filter, null, 1);
        var attachment = attachments.FirstOrDefault();
        if (attachment == null) throw new KeyNotFoundException("附件不存在或不属于当前会话");

        try
        {
            var fileInfo = await _fileStorageFactory.GetFileInfoAsync(attachment.StorageObjectId, "chat_attachments");
            if (fileInfo == null) throw new KeyNotFoundException("附件内容不存在或已被删除");

            var downloadStream = await _fileStorageFactory.GetDownloadStreamAsync(attachment.StorageObjectId, "chat_attachments");

            return new ChatAttachmentDownloadResult
            {
                Content = downloadStream,
                FileName = attachment.Name,
                ContentType = string.IsNullOrWhiteSpace(attachment.MimeType) ? "application/octet-stream" : attachment.MimeType,
                ContentLength = fileInfo.Length
            };
        }
        catch (Exception ex) when (ex is KeyNotFoundException)
        {
            throw new KeyNotFoundException("附件内容不存在或已被删除");
        }
    }

    public async Task<ChatAttachmentInfo?> GetAttachmentInfoAsync(string attachmentId, string sessionId)
    {
        var attachment = await _attachmentFactory.GetByIdAsync(attachmentId);
        if (attachment == null || attachment.SessionId != sessionId)
            return null;

        return new ChatAttachmentInfo
        {
            Id = attachment.Id,
            Name = attachment.Name,
            Size = attachment.Size,
            MimeType = attachment.MimeType,
            Url = attachment.DownloadUrl,
            ThumbnailUrl = attachment.ThumbnailUrl,
            UploadedAt = attachment.CreatedAt
        };
    }
}
