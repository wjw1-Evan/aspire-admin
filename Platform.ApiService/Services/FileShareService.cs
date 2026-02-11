using Platform.ApiService.Models;
using Platform.ServiceDefaults.Services;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Linq.Expressions;
using Microsoft.EntityFrameworkCore;
using System.Security.Cryptography;
using System.Text;

namespace Platform.ApiService.Services;

/// <summary>
/// 文件分享服务实现
/// </summary>
public class FileShareService : IFileShareService
{
    private readonly IDataFactory<Models.FileShare> _shareFactory;
    private readonly ICloudStorageService _cloudStorageService;
    private readonly ITenantContext _tenantContext;
    private readonly ILogger<FileShareService> _logger;

    /// <summary>
    /// 初始化文件分享服务
    /// </summary>
    public FileShareService(
        IDataFactory<Models.FileShare> shareFactory,
        ICloudStorageService cloudStorageService,
        ITenantContext tenantContext,
        ILogger<FileShareService> logger)
    {
        _shareFactory = shareFactory ?? throw new ArgumentNullException(nameof(shareFactory));
        _cloudStorageService = cloudStorageService ?? throw new ArgumentNullException(nameof(cloudStorageService));
        _tenantContext = tenantContext ?? throw new ArgumentNullException(nameof(tenantContext));
        _logger = logger ?? throw new ArgumentNullException(nameof(logger));
    }

    /// <summary>
    /// 创建文件分享
    /// </summary>
    public async Task<Models.FileShare> CreateShareAsync(string fileItemId, CreateShareRequest request)
    {
        if (string.IsNullOrWhiteSpace(fileItemId))
            throw new ArgumentException("文件项ID不能为空", nameof(fileItemId));

        // 验证文件是否存在
        var fileItem = await _cloudStorageService.GetFileItemAsync(fileItemId);
        if (fileItem == null)
            throw new ArgumentException("文件不存在", nameof(fileItemId));

        // 生成唯一的分享令牌
        var shareToken = GenerateShareToken();

        // 创建分享记录
        var share = new Models.FileShare
        {
            FileItemId = fileItemId,
            ShareToken = shareToken,
            Type = request.Type,
            Permission = request.Permission,
            ExpiresAt = request.ExpiresAt,
            Password = !string.IsNullOrEmpty(request.Password) ? HashPassword(request.Password) : string.Empty,
            IsActive = true,
            AllowedUserIds = new List<string>(request.AllowedUserIds),
            AccessCount = 0,
            Settings = new Dictionary<string, object>(request.Settings)
        };

        await _shareFactory.CreateAsync(share);

        _logger.LogInformation("Created file share {ShareId} for file {FileItemId} with token {ShareToken}",
            share.Id, fileItemId, shareToken);

        return share;
    }

    /// <summary>
    /// 根据分享令牌获取分享信息
    /// </summary>
    public async Task<Models.FileShare?> GetShareAsync(string shareToken)
    {
        if (string.IsNullOrWhiteSpace(shareToken))
            return null;

        var shares = await _shareFactory.FindAsync(s => s.ShareToken == shareToken && s.IsActive, limit: 1);
        var share = shares.FirstOrDefault();

        if (share != null && share.ExpiresAt.HasValue && share.ExpiresAt.Value <= DateTime.UtcNow)
        {
            _logger.LogWarning("Share {ShareId} with token {ShareToken} has expired", share.Id, shareToken);
            return null;
        }

        return share;
    }

    /// <summary>
    /// 根据分享ID获取分享信息
    /// </summary>
    public async Task<Models.FileShare?> GetShareByIdAsync(string id)
    {
        if (string.IsNullOrWhiteSpace(id))
            return null;

        var shares = await _shareFactory.FindAsync(s => s.Id == id, limit: 1);
        return shares.FirstOrDefault();
    }

    /// <summary>
    /// 更新分享设置
    /// </summary>
    public async Task<Models.FileShare> UpdateShareAsync(string id, UpdateShareRequest request)
    {
        if (string.IsNullOrWhiteSpace(id))
            throw new ArgumentException("分享ID不能为空", nameof(id));

        var share = await GetShareByIdAsync(id);
        if (share == null)
            throw new ArgumentException("分享不存在", nameof(id));

        var currentUserId = _tenantContext.GetCurrentUserId();
        if (share.CreatedBy != currentUserId)
            throw new UnauthorizedAccessException("无权限修改此分享");

        await _shareFactory.UpdateAsync(id, entity =>
        {
            if (request.Permission.HasValue) entity.Permission = request.Permission.Value;
            if (request.ExpiresAt.HasValue) entity.ExpiresAt = request.ExpiresAt.Value;
            if (request.Password != null)
            {
                entity.Password = !string.IsNullOrEmpty(request.Password) ? HashPassword(request.Password) : string.Empty;
            }
            if (request.IsActive.HasValue) entity.IsActive = request.IsActive.Value;
            if (request.AllowedUserIds != null) entity.AllowedUserIds = request.AllowedUserIds;
            if (request.Settings != null) entity.Settings = request.Settings;
        });

        _logger.LogInformation("Updated share {ShareId}", id);
        return await _shareFactory.GetByIdAsync(id) ?? throw new InvalidOperationException("更新分享失败");
    }

    /// <summary>
    /// 删除分享
    /// </summary>
    public async Task DeleteShareAsync(string id)
    {
        if (string.IsNullOrWhiteSpace(id))
            throw new ArgumentException("分享ID不能为空", nameof(id));

        var share = await GetShareByIdAsync(id);
        if (share == null)
            throw new ArgumentException("分享不存在", nameof(id));

        var currentUserId = _tenantContext.GetCurrentUserId();
        if (share.CreatedBy != currentUserId)
            throw new UnauthorizedAccessException("无权限删除此分享");

        await _shareFactory.SoftDeleteAsync(id);
        _logger.LogInformation("Deleted share {ShareId}", id);
    }

    /// <summary>
    /// 获取我创建的分享列表
    /// </summary>
    public async Task<PagedResult<Models.FileShare>> GetMySharesAsync(ShareListQuery query)
    {
        var currentUserId = _tenantContext.GetCurrentUserId();
        if (string.IsNullOrEmpty(currentUserId))
            throw new UnauthorizedAccessException("用户未登录");

        Expression<Func<Models.FileShare, bool>> filter = s => s.CreatedBy == currentUserId;

        if (query.Type.HasValue)
        {
            var typeFilter = query.Type.Value;
            filter = CombineFilters(filter, s => s.Type == typeFilter);
        }

        if (query.Permission.HasValue)
        {
            var permissionFilter = query.Permission.Value;
            filter = CombineFilters(filter, s => s.Permission == permissionFilter);
        }

        if (query.IsActive.HasValue)
        {
            filter = CombineFilters(filter, s => s.IsActive == query.IsActive.Value);
        }

        if (query.CreatedAfter.HasValue)
        {
            filter = CombineFilters(filter, s => s.CreatedAt >= query.CreatedAfter.Value);
        }

        if (query.CreatedBefore.HasValue)
        {
            filter = CombineFilters(filter, s => s.CreatedAt <= query.CreatedBefore.Value);
        }

        if (query.ExpiresAfter.HasValue)
        {
            filter = CombineFilters(filter, s => s.ExpiresAt >= query.ExpiresAfter.Value);
        }

        if (query.ExpiresBefore.HasValue)
        {
            filter = CombineFilters(filter, s => s.ExpiresAt <= query.ExpiresBefore.Value);
        }

        var (shares, total) = await _shareFactory.FindPagedAsync(
            filter,
            query => query.OrderByDescending(s => s.CreatedAt),
            query.Page,
            query.PageSize);

        return new PagedResult<Models.FileShare>
        {
            Data = shares,
            Total = (int)total,
            Page = query.Page,
            PageSize = query.PageSize
        };
    }

    /// <summary>
    /// 获取分享给我的文件列表
    /// </summary>
    public async Task<PagedResult<Models.FileShare>> GetSharedWithMeAsync(ShareListQuery query)
    {
        var currentUserId = _tenantContext.GetCurrentUserId();
        if (string.IsNullOrEmpty(currentUserId))
            throw new UnauthorizedAccessException("用户未登录");

        Expression<Func<Models.FileShare, bool>> filter = s => s.Type == ShareType.Internal && s.IsActive;

        if (query.Permission.HasValue)
        {
            var permissionFilter = query.Permission.Value;
            filter = CombineFilters(filter, s => s.Permission == permissionFilter);
        }

        if (query.CreatedAfter.HasValue)
        {
            filter = CombineFilters(filter, s => s.CreatedAt >= query.CreatedAfter.Value);
        }

        if (query.CreatedBefore.HasValue)
        {
            filter = CombineFilters(filter, s => s.CreatedAt <= query.CreatedBefore.Value);
        }

        if (query.ExpiresAfter.HasValue)
        {
            filter = CombineFilters(filter, s => s.ExpiresAt >= query.ExpiresAfter.Value);
        }

        if (query.ExpiresBefore.HasValue)
        {
            filter = CombineFilters(filter, s => s.ExpiresAt <= query.ExpiresBefore.Value);
        }

        var (shares, total) = await _shareFactory.FindPagedAsync(
            filter,
            query => query.OrderByDescending(s => s.CreatedAt),
            query.Page,
            query.PageSize);

        var filteredShares = shares.Where(s => s.AllowedUserIds.Contains(currentUserId)).ToList();
        var filteredTotal = total;

        return new PagedResult<Models.FileShare>
        {
            Data = filteredShares,
            Total = (int)filteredTotal,
            Page = query.Page,
            PageSize = query.PageSize
        };
    }

    /// <summary>
    /// 验证分享访问权限
    /// </summary>
    public async Task<bool> ValidateShareAccessAsync(string shareToken, string? password = null)
    {
        var share = await GetShareAsync(shareToken);
        if (share == null)
            return false;

        // 检查分享是否激活
        if (!share.IsActive)
            return false;

        // 检查分享是否过期
        if (share.ExpiresAt.HasValue && share.ExpiresAt.Value <= DateTime.UtcNow)
            return false;

        // 检查密码
        if (!string.IsNullOrEmpty(share.Password))
        {
            if (string.IsNullOrEmpty(password))
                return false;

            if (!VerifyPassword(password, share.Password))
                return false;
        }

        // 检查内部分享权限
        if (share.Type == ShareType.Internal)
        {
            var currentUserId = _tenantContext.GetCurrentUserId();
            if (string.IsNullOrEmpty(currentUserId) || !share.AllowedUserIds.Contains(currentUserId))
                return false;
        }

        return true;
    }

    /// <summary>
    /// 记录分享访问日志
    /// </summary>
    public async Task RecordShareAccessAsync(string shareToken, string? accessorInfo = null)
    {
        var share = await GetShareAsync(shareToken);
        if (share == null)
            return;

        await _shareFactory.UpdateAsync(share.Id, entity =>
        {
            entity.AccessCount++;
            entity.LastAccessedAt = DateTime.UtcNow;
        });

        _logger.LogInformation("Recorded access for share {ShareId} with token {ShareToken}, accessor: {AccessorInfo}",
            share.Id, shareToken, accessorInfo ?? "anonymous");
    }

    /// <summary>
    /// 获取分享的文件内容
    /// </summary>
    public async Task<Stream> GetSharedFileContentAsync(string shareToken, string? password = null)
    {
        // 验证访问权限
        if (!await ValidateShareAccessAsync(shareToken, password))
            throw new UnauthorizedAccessException("无权限访问此分享");

        var share = await GetShareAsync(shareToken);
        if (share == null)
            throw new ArgumentException("分享不存在");

        // 检查权限是否允许下载
        if (share.Permission == SharePermission.View)
            throw new UnauthorizedAccessException("此分享仅允许查看，不允许下载");

        // 记录访问日志
        await RecordShareAccessAsync(shareToken);

        // 获取文件内容
        return await _cloudStorageService.DownloadFileAsync(share.FileItemId);
    }

    /// <summary>
    /// 获取分享的文件信息
    /// </summary>
    public async Task<FileItem?> GetSharedFileInfoAsync(string shareToken, string? password = null)
    {
        // 验证访问权限
        if (!await ValidateShareAccessAsync(shareToken, password))
            throw new UnauthorizedAccessException("无权限访问此分享");

        var share = await GetShareAsync(shareToken);
        if (share == null)
            return null;

        // 记录访问日志
        await RecordShareAccessAsync(shareToken);

        // 获取文件信息
        return await _cloudStorageService.GetFileItemAsync(share.FileItemId);
    }

    /// <summary>
    /// 批量删除分享
    /// </summary>
    public async Task<BatchOperationResult> BatchDeleteSharesAsync(List<string> ids)
    {
        var result = new BatchOperationResult
        {
            Total = ids.Count,
            StartTime = DateTime.UtcNow
        };

        foreach (var id in ids)
        {
            try
            {
                await DeleteShareAsync(id);
                result.SuccessIds.Add(id);
                result.SuccessCount++;
            }
            catch (Exception ex)
            {
                result.Errors.Add(new BatchOperationError
                {
                    FileItemId = id,
                    ErrorCode = "DELETE_SHARE_FAILED",
                    ErrorMessage = ex.Message
                });
                result.FailureCount++;
            }
        }

        result.EndTime = DateTime.UtcNow;
        return result;
    }

    #region 私有辅助方法

    /// <summary>
    /// 生成分享令牌
    /// </summary>
    private static string GenerateShareToken()
    {
        // 生成32字符的随机令牌
        const string chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
        var random = new Random();
        var token = new char[32];

        for (int i = 0; i < token.Length; i++)
        {
            token[i] = chars[random.Next(chars.Length)];
        }

        return new string(token);
    }

    /// <summary>
    /// 哈希密码
    /// </summary>
    private static string HashPassword(string password)
    {
        using var sha256 = SHA256.Create();
        var hashedBytes = sha256.ComputeHash(Encoding.UTF8.GetBytes(password));
        return Convert.ToBase64String(hashedBytes);
    }

    /// <summary>
    /// 验证密码
    /// </summary>
    private static bool VerifyPassword(string password, string hashedPassword)
    {
        var hashedInput = HashPassword(password);
        return hashedInput == hashedPassword;
    }

    private static Expression<Func<T, bool>> CombineFilters<T>(Expression<Func<T, bool>> filter1, Expression<Func<T, bool>> filter2)
    {
        var parameter = Expression.Parameter(typeof(T));
        var body = Expression.AndAlso(
            Expression.Invoke(filter1, parameter),
            Expression.Invoke(filter2, parameter));
        return Expression.Lambda<Func<T, bool>>(body, parameter);
    }

    #endregion
}