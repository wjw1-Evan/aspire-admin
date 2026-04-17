using Platform.ApiService.Models;
using Platform.ApiService.Extensions;
using Platform.ServiceDefaults.Services;
using Platform.ServiceDefaults.Extensions;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Linq.Dynamic.Core;
using System.Linq.Expressions;
using Microsoft.EntityFrameworkCore;
using System.Security.Cryptography;
using System.Text;
using Platform.ServiceDefaults.Models;

namespace Platform.ApiService.Services;

/// <summary>
/// 文件分享服务实现
/// </summary>
public class FileShareService : IFileShareService
{
    private readonly DbContext _context;
    private readonly ICloudStorageService _cloudStorageService;
    private readonly ILogger<FileShareService> _logger;

    /// <summary>
    /// 初始化文件分享服务
    /// </summary>
    public FileShareService(
        DbContext context,
        ICloudStorageService cloudStorageService,
        ILogger<FileShareService> logger)
    {
        _context = context;
        _cloudStorageService = cloudStorageService ?? throw new ArgumentNullException(nameof(cloudStorageService));
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

        await _context.Set<Models.FileShare>().AddAsync(share);
        await _context.SaveChangesAsync();


        return share;
    }

    /// <summary>
    /// 根据分享令牌获取分享信息
    /// </summary>
    public async Task<Models.FileShare?> GetShareAsync(string shareToken)
    {
        if (string.IsNullOrWhiteSpace(shareToken))
            return null;

        var share = await _context.Set<Models.FileShare>().FirstOrDefaultAsync(s => s.ShareToken == shareToken && s.IsActive);

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

        return await _context.Set<Models.FileShare>().FirstOrDefaultAsync(s => s.Id == id);
    }

    /// <summary>
    /// 更新分享设置
    /// </summary>
    public async Task<Models.FileShare> UpdateShareAsync(string id, UpdateShareRequest request)
    {
        if (string.IsNullOrWhiteSpace(id))
            throw new ArgumentException("分享ID不能为空", nameof(id));

        var share = await _context.Set<Models.FileShare>().FirstOrDefaultAsync(s => s.Id == id);
        if (share == null)
            throw new ArgumentException("分享不存在", nameof(id));

        if (request.Permission.HasValue) share.Permission = request.Permission.Value;
        if (request.ExpiresAt.HasValue) share.ExpiresAt = request.ExpiresAt.Value;
        if (request.Password != null)
        {
            share.Password = !string.IsNullOrEmpty(request.Password) ? HashPassword(request.Password) : string.Empty;
        }
        if (request.IsActive.HasValue) share.IsActive = request.IsActive.Value;
        if (request.AllowedUserIds != null) share.AllowedUserIds = request.AllowedUserIds;
        if (request.Settings != null) share.Settings = request.Settings;

        await _context.SaveChangesAsync();
        return share;
    }

    /// <summary>
    /// 删除分享
    /// </summary>
    public async Task DeleteShareAsync(string id)
    {
        if (string.IsNullOrWhiteSpace(id))
            throw new ArgumentException("分享ID不能为空", nameof(id));

        var share = await _context.Set<Models.FileShare>().FirstOrDefaultAsync(s => s.Id == id);
        if (share == null)
            throw new ArgumentException("分享不存在", nameof(id));

        _context.Set<Models.FileShare>().Remove(share);
        await _context.SaveChangesAsync();
    }

    /// <summary>
    /// 获取我创建的分享列表
    /// </summary>
    public async Task<System.Linq.Dynamic.Core.PagedResult<Models.FileShare>> GetMySharesAsync(
        Platform.ServiceDefaults.Models.ProTableRequest request,
        ShareType? type = null,
        SharePermission? permission = null,
        bool? isActive = null,
        DateTime? createdAfter = null,
        DateTime? createdBefore = null,
        DateTime? expiresAfter = null,
        DateTime? expiresBefore = null)
    {
        IQueryable<Models.FileShare> queryable = _context.Set<Models.FileShare>();

        if (type.HasValue)
        {
            queryable = queryable.Where(s => s.Type == type.Value);
        }

        if (permission.HasValue)
        {
            queryable = queryable.Where(s => s.Permission == permission.Value);
        }

        if (isActive.HasValue)
        {
            queryable = queryable.Where(s => s.IsActive == isActive.Value);
        }

        if (createdAfter.HasValue)
        {
            queryable = queryable.Where(s => s.CreatedAt >= createdAfter.Value);
        }

        if (createdBefore.HasValue)
        {
            queryable = queryable.Where(s => s.CreatedAt <= createdBefore.Value);
        }

        if (expiresAfter.HasValue)
        {
            queryable = queryable.Where(s => s.ExpiresAt >= expiresAfter.Value);
        }

        if (expiresBefore.HasValue)
        {
            queryable = queryable.Where(s => s.ExpiresAt <= expiresBefore.Value);
        }

        return queryable.ToPagedList(request);
    }

    /// <summary>
    /// 获取分享给我的文件列表
    /// </summary>
    public async Task<System.Linq.Dynamic.Core.PagedResult<Models.FileShare>> GetSharedWithMeAsync(
        Platform.ServiceDefaults.Models.ProTableRequest request,
        SharePermission? permission = null,
        DateTime? createdAfter = null,
        DateTime? createdBefore = null,
        DateTime? expiresAfter = null,
        DateTime? expiresBefore = null)
    {
        IQueryable<Models.FileShare> queryable = _context.Set<Models.FileShare>()
            .Where(s => s.Type == ShareType.Internal && s.IsActive);

        if (permission.HasValue)
        {
            queryable = queryable.Where(s => s.Permission == permission.Value);
        }

        if (createdAfter.HasValue)
        {
            queryable = queryable.Where(s => s.CreatedAt >= createdAfter.Value);
        }

        if (createdBefore.HasValue)
        {
            queryable = queryable.Where(s => s.CreatedAt <= createdBefore.Value);
        }

        if (expiresAfter.HasValue)
        {
            queryable = queryable.Where(s => s.ExpiresAt >= expiresAfter.Value);
        }

        if (expiresBefore.HasValue)
        {
            queryable = queryable.Where(s => s.ExpiresAt <= expiresBefore.Value);
        }

        return queryable.ToPagedList(request);
    }

    /// <summary>
    /// 验证分享访问权限
    /// </summary>
    public async Task<bool> ValidateShareAccessAsync(string shareToken, string? password = null)
    {
        var share = await _context.Set<Models.FileShare>().FirstOrDefaultAsync(s => s.ShareToken == shareToken);

        if (share == null)
            return false;

        // 验证密码
        if (!string.IsNullOrEmpty(share.Password))
        {
            if (string.IsNullOrEmpty(password))
                return false;

            var hashedPassword = HashPassword(password);
            if (hashedPassword != share.Password)
                return false;
        }

        // 验证过期时间
        if (share.ExpiresAt.HasValue && share.ExpiresAt.Value < DateTime.UtcNow)
            return false;

        // 验证激活状态
        if (!share.IsActive)
            return false;

        return true;
    }

    /// <summary>
    /// 增加分享访问次数
    /// </summary>
    public async Task IncrementAccessCountAsync(string shareId)
    {
        var share = await _context.Set<Models.FileShare>().FirstOrDefaultAsync(s => s.Id == shareId);
        if (share != null)
        {
            share.AccessCount++;
            share.LastAccessedAt = DateTime.UtcNow;
            await _context.SaveChangesAsync();
        }
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
        var bytes = new byte[32];
        RandomNumberGenerator.Fill(bytes);
        return Convert.ToBase64String(bytes)[..32];
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