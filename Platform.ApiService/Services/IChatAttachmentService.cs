using Microsoft.AspNetCore.Http;
using Platform.ApiService.Models;
using System.Threading.Tasks;

namespace Platform.ApiService.Services;

/// <summary>
/// 聊天附件服务，负责处理文件上传与下载
/// </summary>
public interface IChatAttachmentService
{
    /// <summary>
    /// 上传聊天附件
    /// </summary>
    /// <param name="sessionId">会话标识</param>
    /// <param name="file">上传文件</param>
    /// <returns>附件信息</returns>
    Task<ChatAttachmentInfo> UploadAttachmentAsync(string sessionId, IFormFile file);

    /// <summary>
    /// 下载聊天附件
    /// </summary>
    /// <param name="sessionId">会话标识</param>
    /// <param name="storageObjectId">附件存储标识</param>
    /// <returns>附件内容及元数据</returns>
    Task<ChatAttachmentDownloadResult> DownloadAttachmentAsync(string sessionId, string storageObjectId);

    /// <summary>
    /// 获取附件信息
    /// </summary>
    /// <param name="attachmentId">附件记录标识</param>
    /// <param name="sessionId">会话标识</param>
    /// <returns>附件信息</returns>
    Task<ChatAttachmentInfo?> GetAttachmentInfoAsync(string attachmentId, string sessionId);
}
