using Platform.ApiService.Models;
using System.Linq.Dynamic.Core;

namespace Platform.ApiService.Services;

/// <summary>
/// 文件分享服务接口
/// </summary>
public interface IFileShareService
{
    /// <summary>
    /// 创建文件分享
    /// </summary>
    /// <param name="fileItemId">文件项ID</param>
    /// <param name="request">分享创建请求</param>
    /// <returns>创建的分享</returns>
    Task<Models.FileShare> CreateShareAsync(string fileItemId, CreateShareRequest request);

    /// <summary>
    /// 根据分享令牌获取分享信息
    /// </summary>
    /// <param name="shareToken">分享令牌</param>
    /// <returns>分享信息</returns>
    Task<Models.FileShare?> GetShareAsync(string shareToken);

    /// <summary>
    /// 根据分享ID获取分享信息
    /// </summary>
    /// <param name="id">分享ID</param>
    /// <returns>分享信息</returns>
    Task<Models.FileShare?> GetShareByIdAsync(string id);

    /// <summary>
    /// 更新分享设置
    /// </summary>
    /// <param name="id">分享ID</param>
    /// <param name="request">更新请求</param>
    /// <returns>更新后的分享</returns>
    Task<Models.FileShare> UpdateShareAsync(string id, UpdateShareRequest request);

    /// <summary>
    /// 删除分享
    /// </summary>
    /// <param name="id">分享ID</param>
    /// <returns>删除操作结果</returns>
    Task DeleteShareAsync(string id);

    /// <summary>
    /// 获取我创建的分享列表
    /// </summary>
    /// <param name="pageParams">分页参数</param>
    /// <param name="type">分享类型筛选</param>
    /// <param name="permission">分享权限筛选</param>
    /// <param name="isActive">是否激活筛选</param>
    /// <param name="createdAfter">创建时间范围（开始）</param>
    /// <param name="createdBefore">创建时间范围（结束）</param>
    /// <param name="expiresAfter">过期时间范围（开始）</param>
    /// <param name="expiresBefore">过期时间范围（结束）</param>
    /// <returns>分享列表</returns>
    Task<System.Linq.Dynamic.Core.PagedResult<Models.FileShare>> GetMySharesAsync(
        Platform.ServiceDefaults.Models.PageParams pageParams,
        ShareType? type = null,
        SharePermission? permission = null,
        bool? isActive = null,
        DateTime? createdAfter = null,
        DateTime? createdBefore = null,
        DateTime? expiresAfter = null,
        DateTime? expiresBefore = null);

    /// <summary>
    /// 获取分享给我的文件列表
    /// </summary>
    /// <param name="pageParams">分页参数</param>
    /// <param name="permission">分享权限筛选</param>
    /// <param name="createdAfter">创建时间范围（开始）</param>
    /// <param name="createdBefore">创建时间范围（结束）</param>
    /// <param name="expiresAfter">过期时间范围（开始）</param>
    /// <param name="expiresBefore">过期时间范围（结束）</param>
    /// <returns>分享文件列表</returns>
    Task<System.Linq.Dynamic.Core.PagedResult<Models.FileShare>> GetSharedWithMeAsync(
        Platform.ServiceDefaults.Models.PageParams pageParams,
        SharePermission? permission = null,
        DateTime? createdAfter = null,
        DateTime? createdBefore = null,
        DateTime? expiresAfter = null,
        DateTime? expiresBefore = null);

    /// <summary>
    /// 验证分享访问权限
    /// </summary>
    /// <param name="shareToken">分享令牌</param>
    /// <param name="password">分享密码（可选）</param>
    /// <returns>是否有访问权限</returns>
    Task<bool> ValidateShareAccessAsync(string shareToken, string? password = null);

    /// <summary>
    /// 记录分享访问日志
    /// </summary>
    /// <param name="shareToken">分享令牌</param>
    /// <param name="accessorInfo">访问者信息（可选）</param>
    /// <returns>记录操作结果</returns>
    Task RecordShareAccessAsync(string shareToken, string? accessorInfo = null);

    /// <summary>
    /// 获取分享的文件内容
    /// </summary>
    /// <param name="shareToken">分享令牌</param>
    /// <param name="password">分享密码（可选）</param>
    /// <returns>文件流</returns>
    Task<Stream> GetSharedFileContentAsync(string shareToken, string? password = null);

    /// <summary>
    /// 获取分享的文件信息
    /// </summary>
    /// <param name="shareToken">分享令牌</param>
    /// <param name="password">分享密码（可选）</param>
    /// <returns>文件信息</returns>
    Task<FileItem?> GetSharedFileInfoAsync(string shareToken, string? password = null);

    /// <summary>
    /// 批量删除分享
    /// </summary>
    /// <param name="ids">分享ID列表</param>
    /// <returns>删除结果</returns>
    Task<BatchOperationResult> BatchDeleteSharesAsync(List<string> ids);
}

/// <summary>
/// 创建分享请求模型
/// </summary>
public class CreateShareRequest
{
    /// <summary>分享类型</summary>
    public ShareType Type { get; set; } = ShareType.Link;

    /// <summary>分享权限</summary>
    public SharePermission Permission { get; set; } = SharePermission.View;

    /// <summary>过期时间</summary>
    public DateTime? ExpiresAt { get; set; }

    /// <summary>分享密码</summary>
    public string Password { get; set; } = string.Empty;

    /// <summary>允许访问的用户ID列表（内部分享）</summary>
    public List<string> AllowedUserIds { get; set; } = [];

    /// <summary>分享设置</summary>
    public Dictionary<string, object> Settings { get; set; } = [];
}

/// <summary>
/// 更新分享请求模型
/// </summary>
public class UpdateShareRequest
{
    /// <summary>分享权限</summary>
    public SharePermission? Permission { get; set; }

    /// <summary>过期时间</summary>
    public DateTime? ExpiresAt { get; set; }

    /// <summary>分享密码</summary>
    public string? Password { get; set; }

    /// <summary>是否激活</summary>
    public bool? IsActive { get; set; }

    /// <summary>允许访问的用户ID列表（内部分享）</summary>
    public List<string>? AllowedUserIds { get; set; }

    /// <summary>分享设置</summary>
    public Dictionary<string, object>? Settings { get; set; }
}

