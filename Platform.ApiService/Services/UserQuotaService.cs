using Microsoft.EntityFrameworkCore;
using Platform.ApiService.Models;
using Platform.ServiceDefaults.Models;
using Platform.ServiceDefaults.Services;

namespace Platform.ApiService.Services;

public class UserQuotaService : IUserQuotaService
{
    private readonly DbContext _context;
    private readonly ITenantContext _tenantContext;
    private readonly ILogger<UserQuotaService> _logger;

    private const long DefaultQuota = 0;

    public UserQuotaService(DbContext context, ITenantContext tenantContext, ILogger<UserQuotaService> logger)
    {
        _context = context;
        _tenantContext = tenantContext;
        _logger = logger;
    }

    public async Task<StorageQuota> GetUserQuotaAsync(string? userId = null)
    {
        var targetUserId = userId ?? _tenantContext.GetCurrentUserId();
        if (string.IsNullOrEmpty(targetUserId))
            throw new InvalidOperationException("用户ID不能为空");

        var quota = await FindUserQuotaAsync(targetUserId)
            ?? throw new InvalidOperationException("用户尚未分配存储配额，请联系管理员设置配额");

        var allFiles = await _context.Set<FileItem>().Where(f =>
            f.CreatedBy == targetUserId &&
            f.Type == FileItemType.File &&
            f.Status == FileStatus.Active).ToListAsync();

        var userFiles = allFiles.Where(f => !string.IsNullOrEmpty(f.CreatedBy) && f.CreatedBy == targetUserId).ToList();
        var actualUsedSpace = userFiles.Sum(f => f.Size);
        var fileCount = userFiles.Count;
        var typeUsage = userFiles.GroupBy(f => GetFileTypeCategory(f.MimeType))
            .ToDictionary(g => g.Key, g => g.Sum(f => f.Size));

        quota.UsedSpace = actualUsedSpace;
        quota.FileCount = fileCount;
        quota.TypeUsage = typeUsage;
        quota.LastCalculatedAt = DateTime.UtcNow;

        return quota;
    }

    public async Task<StorageQuota> SetUserQuotaAsync(string userId, long totalQuota, int? warningThreshold = null, bool? isEnabled = null)
    {
        if (string.IsNullOrWhiteSpace(userId))
            throw new ArgumentException("用户ID不能为空", nameof(userId));
        if (totalQuota < 0)
            throw new ArgumentException("配额不能为负数", nameof(totalQuota));
        if (warningThreshold.HasValue && (warningThreshold.Value < 0 || warningThreshold.Value > 100))
            throw new ArgumentException("警告阈值必须在0-100之间", nameof(warningThreshold));

        var quota = await EnsureQuotaForSettingAsync(userId, totalQuota, warningThreshold, isEnabled);
        var entity = await _context.Set<StorageQuota>().FirstOrDefaultAsync(x => x.Id == quota.Id!);
        if (entity != null)
        {
            entity.TotalQuota = totalQuota;
            if (warningThreshold.HasValue) entity.WarningThreshold = warningThreshold.Value;
            if (isEnabled.HasValue) entity.IsEnabled = isEnabled.Value;
            entity.UpdatedAt = DateTime.UtcNow;
            await _context.SaveChangesAsync();
        }
        return entity ?? quota;
    }

    public async Task<StorageQuota> UpdateStorageUsageAsync(string userId, long sizeChange)
    {
        if (string.IsNullOrWhiteSpace(userId))
            throw new ArgumentException("用户ID不能为空");

        var quota = await FindUserQuotaAsync(userId) ?? throw new InvalidOperationException("用户尚未分配存储配额");
        quota.UsedSpace = Math.Max(0, quota.UsedSpace + sizeChange);
        quota.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync();
        return quota;
    }

    public async Task<bool> CheckStorageAvailabilityAsync(string userId, long requiredSize)
    {
        if (string.IsNullOrWhiteSpace(userId))
            throw new ArgumentException("用户ID不能为空");

        var quota = await FindUserQuotaAsync(userId);
        if (quota == null || !quota.IsEnabled)
            return true;

        return quota.UsedSpace + requiredSize <= quota.TotalQuota;
    }

    public async Task<StorageQuota> RecalculateUserStorageAsync(string userId)
    {
        if (string.IsNullOrWhiteSpace(userId))
            throw new ArgumentException("用户ID不能为空");

        var files = await _context.Set<FileItem>().Where(f =>
            f.CreatedBy == userId && f.Type == FileItemType.File && f.Status == FileStatus.Active).ToListAsync();

        var quota = await FindUserQuotaAsync(userId) ?? throw new InvalidOperationException("用户尚未分配存储配额");
        quota.UsedSpace = files.Sum(f => f.Size);
        quota.FileCount = files.Count;
        quota.TypeUsage = files.GroupBy(f => GetFileTypeCategory(f.MimeType))
            .ToDictionary(g => g.Key, g => g.Sum(f => f.Size));
        quota.LastCalculatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync();
        return quota;
    }

    public async Task<BatchOperationResult> BatchSetUserQuotasAsync(List<UserQuotaSettingDto> quotaSettings)
    {
        var result = new BatchOperationResult { Total = quotaSettings.Count, StartTime = DateTime.UtcNow };
        foreach (var setting in quotaSettings)
        {
            try
            {
                await SetUserQuotaAsync(setting.UserId, setting.TotalQuota, setting.WarningThreshold, setting.IsEnabled);
                result.SuccessIds.Add(setting.UserId);
                result.SuccessCount++;
            }
            catch (Exception ex)
            {
                result.Errors.Add(new BatchOperationError { FileItemId = setting.UserId, ErrorCode = "BATCH_SET_FAILED", ErrorMessage = ex.Message });
                result.FailureCount++;
            }
        }
        result.EndTime = DateTime.UtcNow;
        return result;
    }

    private async Task<StorageQuota?> FindUserQuotaAsync(string userId)
    {
        return await _context.Set<StorageQuota>().FirstOrDefaultAsync(x => x.UserId == userId);
    }

    private async Task<StorageQuota> EnsureQuotaForSettingAsync(string userId, long totalQuota, int? warningThreshold, bool? isEnabled)
    {
        var existing = await _context.Set<StorageQuota>().FirstOrDefaultAsync(x => x.UserId == userId);
        if (existing != null) return existing;

        var quota = new StorageQuota
        {
            UserId = userId,
            TotalQuota = totalQuota,
            UsedSpace = 0,
            FileCount = 0,
            WarningThreshold = warningThreshold ?? 80,
            IsEnabled = isEnabled ?? true
        };
        await _context.Set<StorageQuota>().AddAsync(quota);
        await _context.SaveChangesAsync();
        return quota;
    }

    private static string GetFileTypeCategory(string? mimeType)
    {
        if (string.IsNullOrEmpty(mimeType)) return "other";
        if (mimeType.StartsWith("image/")) return "image";
        if (mimeType.StartsWith("video/")) return "video";
        if (mimeType.StartsWith("audio/")) return "audio";
        if (mimeType.StartsWith("text/")) return "text";
        if (mimeType.Contains("pdf")) return "pdf";
        if (mimeType.Contains("word") || mimeType.Contains("document")) return "document";
        if (mimeType.Contains("sheet") || mimeType.Contains("excel")) return "spreadsheet";
        return "other";
    }
}
