using Platform.ApiService.Models;
using Platform.ServiceDefaults.Services;

namespace Platform.ApiService.Services;

/// <summary>
/// 存储配额服务实现
/// </summary>
public class StorageQuotaService : IStorageQuotaService
{
    private readonly IDatabaseOperationFactory<StorageQuota> _quotaFactory;
    private readonly IDatabaseOperationFactory<FileItem> _fileItemFactory;
    private readonly ITenantContext _tenantContext;
    private readonly ILogger<StorageQuotaService> _logger;

    /// <summary>
    /// 默认存储配额（10GB）
    /// </summary>
    private const long DefaultQuota = 10L * 1024 * 1024 * 1024;

    /// <summary>
    /// 初始化存储配额服务
    /// </summary>
    public StorageQuotaService(
        IDatabaseOperationFactory<StorageQuota> quotaFactory,
        IDatabaseOperationFactory<FileItem> fileItemFactory,
        ITenantContext tenantContext,
        ILogger<StorageQuotaService> logger)
    {
        _quotaFactory = quotaFactory ?? throw new ArgumentNullException(nameof(quotaFactory));
        _fileItemFactory = fileItemFactory ?? throw new ArgumentNullException(nameof(fileItemFactory));
        _tenantContext = tenantContext ?? throw new ArgumentNullException(nameof(tenantContext));
        _logger = logger ?? throw new ArgumentNullException(nameof(logger));
    }

    /// <summary>
    /// 获取用户存储配额信息
    /// </summary>
    public async Task<StorageQuota> GetUserQuotaAsync(string? userId = null)
    {
        var targetUserId = userId ?? _tenantContext.GetCurrentUserId();
        if (string.IsNullOrEmpty(targetUserId))
            throw new InvalidOperationException("用户ID不能为空");

        return await GetOrCreateUserQuotaAsync(targetUserId);
    }

    /// <summary>
    /// 设置用户存储配额
    /// </summary>
    public async Task<StorageQuota> SetUserQuotaAsync(string userId, long totalQuota)
    {
        if (string.IsNullOrWhiteSpace(userId))
            throw new ArgumentException("用户ID不能为空", nameof(userId));

        if (totalQuota < 0)
            throw new ArgumentException("配额不能为负数", nameof(totalQuota));

        var quota = await GetOrCreateUserQuotaAsync(userId);

        var updateBuilder = _quotaFactory.CreateUpdateBuilder();
        var update = updateBuilder
            .Set(q => q.TotalQuota, totalQuota)
            .Set(q => q.LastCalculatedAt, DateTime.UtcNow)
            .Build();

        var filterBuilder = _quotaFactory.CreateFilterBuilder();
        var updatedQuota = await _quotaFactory.FindOneAndUpdateAsync(
            filterBuilder.Equal(q => q.Id, quota.Id).Build(),
            update);

        if (updatedQuota == null)
            throw new InvalidOperationException("更新配额失败");

        _logger.LogInformation("Updated storage quota for user {UserId} to {TotalQuota} bytes", userId, totalQuota);
        return updatedQuota;
    }

    /// <summary>
    /// 更新用户存储使用量
    /// </summary>
    public async Task<StorageQuota> UpdateStorageUsageAsync(string userId, long sizeChange)
    {
        if (string.IsNullOrWhiteSpace(userId))
            throw new ArgumentException("用户ID不能为空", nameof(userId));

        var quota = await GetOrCreateUserQuotaAsync(userId);

        // 计算新的使用量
        var newUsedSpace = Math.Max(0, quota.UsedSpace + sizeChange);

        var updateBuilder = _quotaFactory.CreateUpdateBuilder();
        var update = updateBuilder
            .Set(q => q.UsedSpace, newUsedSpace)
            .Set(q => q.LastCalculatedAt, DateTime.UtcNow)
            .Build();

        var filterBuilder = _quotaFactory.CreateFilterBuilder();
        var updatedQuota = await _quotaFactory.FindOneAndUpdateAsync(
            filterBuilder.Equal(q => q.Id, quota.Id).Build(),
            update);

        if (updatedQuota == null)
            throw new InvalidOperationException("更新存储使用量失败");

        _logger.LogDebug("Updated storage usage for user {UserId} by {SizeChange} bytes, new usage: {UsedSpace}",
            userId, sizeChange, newUsedSpace);

        return updatedQuota;
    }

    /// <summary>
    /// 检查用户是否有足够的存储空间
    /// </summary>
    public async Task<bool> CheckStorageAvailabilityAsync(string userId, long requiredSize)
    {
        if (string.IsNullOrWhiteSpace(userId))
            throw new ArgumentException("用户ID不能为空", nameof(userId));

        if (requiredSize < 0)
            return true;

        var quota = await GetOrCreateUserQuotaAsync(userId);
        var availableSpace = quota.TotalQuota - quota.UsedSpace;

        return availableSpace >= requiredSize;
    }

    /// <summary>
    /// 获取企业存储统计
    /// </summary>
    public async Task<CompanyStorageStatistics> GetCompanyStorageStatisticsAsync(string? companyId = null)
    {
        var targetCompanyId = companyId ?? await _tenantContext.GetCurrentCompanyIdAsync();
        if (string.IsNullOrEmpty(targetCompanyId))
            throw new InvalidOperationException("企业ID不能为空");

        // 获取企业所有用户的配额信息
        var filterBuilder = _quotaFactory.CreateFilterBuilder();
        var quotaFilter = filterBuilder.Build(); // 多租户过滤会自动应用

        var quotas = await _quotaFactory.FindAsync(quotaFilter);

        // 获取企业所有文件统计
        var fileFilterBuilder = _fileItemFactory.CreateFilterBuilder();
        var fileFilter = fileFilterBuilder
            .Equal(f => f.Status, FileStatus.Active)
            .Build();

        var files = await _fileItemFactory.FindAsync(fileFilter);

        // 按文件类型统计
        var typeUsage = files
            .Where(f => f.Type == FileItemType.File)
            .GroupBy(f => GetFileTypeCategory(f.MimeType))
            .ToDictionary(g => g.Key, g => g.Sum(f => f.Size));

        // 按用户统计
        var userUsage = files
            .Where(f => f.Type == FileItemType.File && !string.IsNullOrEmpty(f.CreatedBy))
            .GroupBy(f => f.CreatedBy!)
            .ToDictionary(g => g.Key, g => g.Sum(f => f.Size));

        var statistics = new CompanyStorageStatistics
        {
            CompanyId = targetCompanyId,
            CompanyName = "企业", // TODO: 从企业服务获取企业名称
            TotalUsers = quotas.Count,
            TotalQuota = quotas.Sum(q => q.TotalQuota),
            UsedSpace = quotas.Sum(q => q.UsedSpace),
            TotalFiles = files.Count(f => f.Type == FileItemType.File),
            TotalFolders = files.Count(f => f.Type == FileItemType.Folder),
            TypeUsage = typeUsage,
            UserUsage = userUsage,
            LastUpdatedAt = DateTime.UtcNow
        };

        return statistics;
    }

    /// <summary>
    /// 重新计算用户存储使用量
    /// </summary>
    public async Task<StorageQuota> RecalculateUserStorageAsync(string userId)
    {
        if (string.IsNullOrWhiteSpace(userId))
            throw new ArgumentException("用户ID不能为空", nameof(userId));

        // 获取用户所有活跃文件
        var fileFilterBuilder = _fileItemFactory.CreateFilterBuilder();
        var fileFilter = fileFilterBuilder
            .Equal(f => f.CreatedBy, userId)
            .Equal(f => f.Type, FileItemType.File)
            .Equal(f => f.Status, FileStatus.Active)
            .Build();

        var userFiles = await _fileItemFactory.FindAsync(fileFilter);

        // 计算实际使用量
        var actualUsedSpace = userFiles.Sum(f => f.Size);
        var fileCount = userFiles.Count;

        // 按文件类型统计
        var typeUsage = userFiles
            .GroupBy(f => GetFileTypeCategory(f.MimeType))
            .ToDictionary(g => g.Key, g => g.Sum(f => f.Size));

        // 更新配额信息
        var quota = await GetOrCreateUserQuotaAsync(userId);

        var updateBuilder = _quotaFactory.CreateUpdateBuilder();
        var update = updateBuilder
            .Set(q => q.UsedSpace, actualUsedSpace)
            .Set(q => q.FileCount, fileCount)
            .Set(q => q.TypeUsage, typeUsage)
            .Set(q => q.LastCalculatedAt, DateTime.UtcNow)
            .Build();

        var filterBuilder = _quotaFactory.CreateFilterBuilder();
        var updatedQuota = await _quotaFactory.FindOneAndUpdateAsync(
            filterBuilder.Equal(q => q.Id, quota.Id).Build(),
            update);

        if (updatedQuota == null)
            throw new InvalidOperationException("重新计算存储使用量失败");

        _logger.LogInformation("Recalculated storage usage for user {UserId}: {UsedSpace} bytes, {FileCount} files",
            userId, actualUsedSpace, fileCount);

        return updatedQuota;
    }

    /// <summary>
    /// 批量设置用户配额
    /// </summary>
    public async Task<BatchOperationResult> BatchSetUserQuotasAsync(List<UserQuotaSetting> quotaSettings)
    {
        var result = new BatchOperationResult
        {
            Total = quotaSettings.Count,
            StartTime = DateTime.UtcNow
        };

        foreach (var setting in quotaSettings)
        {
            try
            {
                await SetUserQuotaAsync(setting.UserId, setting.TotalQuota);
                result.SuccessIds.Add(setting.UserId);
                result.SuccessCount++;
            }
            catch (Exception ex)
            {
                result.Errors.Add(new BatchOperationError
                {
                    FileItemId = setting.UserId,
                    FileName = setting.Username,
                    ErrorCode = "SET_QUOTA_FAILED",
                    ErrorMessage = ex.Message
                });
                result.FailureCount++;
            }
        }

        result.EndTime = DateTime.UtcNow;
        return result;
    }

    /// <summary>
    /// 获取存储使用量排行榜
    /// </summary>
    public async Task<List<UserStorageRanking>> GetStorageUsageRankingAsync(int topCount = 10, string? companyId = null)
    {
        if (topCount <= 0)
            throw new ArgumentException("返回数量必须大于0", nameof(topCount));

        var filterBuilder = _quotaFactory.CreateFilterBuilder();
        var filter = filterBuilder.Build(); // 多租户过滤会自动应用

        var quotas = await _quotaFactory.FindAsync(filter);

        var rankings = quotas
            .OrderByDescending(q => q.UsedSpace)
            .Take(topCount)
            .Select((q, index) => new UserStorageRanking
            {
                Rank = index + 1,
                UserId = q.UserId,
                Username = q.UserId, // TODO: 从用户服务获取用户名
                DisplayName = q.UserId, // TODO: 从用户服务获取显示名称
                UsedSpace = q.UsedSpace,
                TotalQuota = q.TotalQuota,
                FileCount = q.FileCount,
                LastActivityAt = q.LastCalculatedAt
            })
            .ToList();

        return rankings;
    }

    /// <summary>
    /// 获取存储配额警告列表
    /// </summary>
    public async Task<List<StorageQuotaWarning>> GetQuotaWarningsAsync(double warningThreshold = 0.8, string? companyId = null)
    {
        if (warningThreshold < 0 || warningThreshold > 1)
            throw new ArgumentException("警告阈值必须在0-1之间", nameof(warningThreshold));

        var filterBuilder = _quotaFactory.CreateFilterBuilder();
        var filter = filterBuilder.Build(); // 多租户过滤会自动应用

        var quotas = await _quotaFactory.FindAsync(filter);

        var warnings = new List<StorageQuotaWarning>();

        foreach (var quota in quotas)
        {
            if (quota.TotalQuota <= 0) continue;

            var usagePercentage = (double)quota.UsedSpace / quota.TotalQuota;

            if (usagePercentage >= warningThreshold)
            {
                var warning = new StorageQuotaWarning
                {
                    UserId = quota.UserId,
                    Username = quota.UserId, // TODO: 从用户服务获取用户名
                    DisplayName = quota.UserId, // TODO: 从用户服务获取显示名称
                    UsedSpace = quota.UsedSpace,
                    TotalQuota = quota.TotalQuota
                };

                // 确定警告级别和消息
                if (usagePercentage >= 1.0)
                {
                    warning.Level = WarningLevel.Emergency;
                    warning.Message = "存储空间已满，无法上传新文件";
                    warning.Suggestion = "请立即清理文件或联系管理员增加配额";
                }
                else if (usagePercentage >= 0.95)
                {
                    warning.Level = WarningLevel.Critical;
                    warning.Message = "存储空间严重不足，仅剩余5%";
                    warning.Suggestion = "请尽快清理不需要的文件";
                }
                else if (usagePercentage >= 0.9)
                {
                    warning.Level = WarningLevel.Warning;
                    warning.Message = "存储空间不足，仅剩余10%";
                    warning.Suggestion = "建议清理一些文件以释放空间";
                }
                else
                {
                    warning.Level = WarningLevel.Info;
                    warning.Message = $"存储空间使用率已达到{usagePercentage:P0}";
                    warning.Suggestion = "建议定期清理不需要的文件";
                }

                warnings.Add(warning);
            }
        }

        return warnings.OrderByDescending(w => w.UsagePercentage).ToList();
    }

    /// <summary>
    /// 清理未使用的存储配额记录
    /// </summary>
    public async Task<BatchOperationResult> CleanupUnusedQuotasAsync(string? companyId = null)
    {
        var result = new BatchOperationResult
        {
            StartTime = DateTime.UtcNow
        };

        try
        {
            // 获取所有配额记录
            var filterBuilder = _quotaFactory.CreateFilterBuilder();
            var filter = filterBuilder.Build(); // 多租户过滤会自动应用

            var quotas = await _quotaFactory.FindAsync(filter);

            // 查找未使用的配额（使用量为0且文件数为0，且超过30天未更新）
            var cutoffDate = DateTime.UtcNow.AddDays(-30);
            var unusedQuotas = quotas
                .Where(q => q.UsedSpace == 0 && q.FileCount == 0 && q.LastCalculatedAt < cutoffDate)
                .ToList();

            result.Total = unusedQuotas.Count;

            foreach (var quota in unusedQuotas)
            {
                try
                {
                    // 软删除配额记录
                    await _quotaFactory.FindOneAndSoftDeleteAsync(
                        filterBuilder.Equal(q => q.Id, quota.Id).Build());

                    result.SuccessIds.Add(quota.Id);
                    result.SuccessCount++;
                }
                catch (Exception ex)
                {
                    result.Errors.Add(new BatchOperationError
                    {
                        FileItemId = quota.Id,
                        FileName = quota.UserId,
                        ErrorCode = "DELETE_QUOTA_FAILED",
                        ErrorMessage = ex.Message
                    });
                    result.FailureCount++;
                }
            }

            _logger.LogInformation("Cleaned up {Count} unused storage quota records", result.SuccessCount);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to cleanup unused storage quotas");
            result.Errors.Add(new BatchOperationError
            {
                ErrorCode = "CLEANUP_FAILED",
                ErrorMessage = ex.Message
            });
        }

        result.EndTime = DateTime.UtcNow;
        return result;
    }

    /// <summary>
    /// 获取存储配额列表（分页）
    /// </summary>
    public async Task<PagedResult<StorageQuotaListItem>> GetStorageQuotaListAsync(StorageQuotaListQuery query)
    {
        var filterBuilder = _quotaFactory.CreateFilterBuilder();
        var filter = filterBuilder.Build(); // 多租户过滤会自动应用

        // 添加关键词搜索
        if (!string.IsNullOrWhiteSpace(query.Keyword))
        {
            // TODO: 需要根据用户名搜索，这里暂时按用户ID搜索
            filter = filterBuilder.Contains(q => q.UserId, query.Keyword).Build();
        }

        // 构建排序
        var sortBuilder = _quotaFactory.CreateSortBuilder();
        var sort = query.SortBy.ToLowerInvariant() switch
        {
            "usedquota" or "usedspace" => query.SortOrder == "asc"
                ? sortBuilder.Ascending(q => q.UsedSpace).Build()
                : sortBuilder.Descending(q => q.UsedSpace).Build(),
            "totalquota" => query.SortOrder == "asc"
                ? sortBuilder.Ascending(q => q.TotalQuota).Build()
                : sortBuilder.Descending(q => q.TotalQuota).Build(),
            "filecount" => query.SortOrder == "asc"
                ? sortBuilder.Ascending(q => q.FileCount).Build()
                : sortBuilder.Descending(q => q.FileCount).Build(),
            "createdat" => query.SortOrder == "asc"
                ? sortBuilder.Ascending(q => q.CreatedAt).Build()
                : sortBuilder.Descending(q => q.CreatedAt).Build(),
            "lastcalculatedat" => query.SortOrder == "asc"
                ? sortBuilder.Ascending(q => q.LastCalculatedAt).Build()
                : sortBuilder.Descending(q => q.LastCalculatedAt).Build(),
            _ => sortBuilder.Descending(q => q.UsedSpace).Build() // 默认按使用量降序
        };

        // 执行分页查询
        var (quotas, total) = await _quotaFactory.FindPagedAsync(filter, sort, query.Page, query.PageSize);

        // 转换为列表项
        var items = quotas.Select(q => new StorageQuotaListItem
        {
            UserId = q.UserId,
            Username = q.UserId, // TODO: 从用户服务获取用户名
            DisplayName = q.UserId, // TODO: 从用户服务获取显示名称
            Email = "", // TODO: 从用户服务获取邮箱
            TotalQuota = q.TotalQuota,
            UsedSpace = q.UsedSpace,
            FileCount = q.FileCount,
            LastCalculatedAt = q.LastCalculatedAt,
            CreatedAt = q.CreatedAt,
            UpdatedAt = q.UpdatedAt,
            Status = "Active", // TODO: 根据实际状态设置
            WarningLevel = GetWarningLevel(q.UsedSpace, q.TotalQuota)
        }).ToList();

        return new PagedResult<StorageQuotaListItem>
        {
            Data = items,
            Total = (int)total,
            Page = query.Page,
            PageSize = query.PageSize
        };
    }

    /// <summary>
    /// 获取存储使用统计信息
    /// </summary>
    public async Task<StorageUsageStats> GetStorageUsageStatsAsync(string? userId = null)
    {
        // 获取所有配额记录（企业级统计）
        var filterBuilder = _quotaFactory.CreateFilterBuilder();
        var filter = filterBuilder.Build(); // 多租户过滤会自动应用

        var quotas = await _quotaFactory.FindAsync(filter);

        if (!quotas.Any())
        {
            return new StorageUsageStats();
        }

        // 计算基本统计
        var totalUsers = quotas.Count;
        var totalQuota = quotas.Sum(q => q.TotalQuota);
        var totalUsed = quotas.Sum(q => q.UsedSpace);
        var averageUsage = totalUsers > 0 ? totalUsed / totalUsers : 0;

        // 计算使用量分布
        var usageDistribution = CalculateUsageDistribution(quotas);

        // 获取使用量排行榜（前10名）
        var topUsers = quotas
            .OrderByDescending(q => q.UsedSpace)
            .Take(10)
            .Select(q => new TopUserItem
            {
                UserId = q.UserId,
                Username = q.UserId, // TODO: 从用户服务获取用户名
                UserDisplayName = q.UserId, // TODO: 从用户服务获取显示名称
                UsedQuota = q.UsedSpace,
                UsagePercentage = q.TotalQuota > 0 ? (double)q.UsedSpace / q.TotalQuota * 100 : 0
            })
            .ToList();

        return new StorageUsageStats
        {
            TotalUsers = totalUsers,
            TotalQuota = totalQuota,
            TotalUsed = totalUsed,
            AverageUsage = averageUsage,
            UsageDistribution = usageDistribution,
            TopUsers = topUsers
        };
    }

    /// <summary>
    /// 计算使用量分布
    /// </summary>
    private static List<UsageDistributionItem> CalculateUsageDistribution(List<StorageQuota> quotas)
    {
        var distribution = new List<UsageDistributionItem>();
        var totalUsers = quotas.Count;

        if (totalUsers == 0)
            return distribution;

        // 定义使用量范围
        var ranges = new[]
        {
            new { Range = "0-20%", Min = 0.0, Max = 0.2 },
            new { Range = "21-40%", Min = 0.2, Max = 0.4 },
            new { Range = "41-60%", Min = 0.4, Max = 0.6 },
            new { Range = "61-80%", Min = 0.6, Max = 0.8 },
            new { Range = "81-100%", Min = 0.8, Max = 1.0 },
            new { Range = ">100%", Min = 1.0, Max = double.MaxValue }
        };

        foreach (var range in ranges)
        {
            var count = quotas.Count(q =>
            {
                if (q.TotalQuota <= 0) return range.Range == "0-20%";
                var usageRatio = (double)q.UsedSpace / q.TotalQuota;
                return usageRatio >= range.Min && usageRatio < range.Max;
            });

            distribution.Add(new UsageDistributionItem
            {
                Range = range.Range,
                Count = count,
                Percentage = totalUsers > 0 ? (double)count / totalUsers * 100 : 0
            });
        }

        return distribution;
    }

    #region 私有辅助方法

    /// <summary>
    /// 获取或创建用户配额
    /// </summary>
    private async Task<StorageQuota> GetOrCreateUserQuotaAsync(string userId)
    {
        var filterBuilder = _quotaFactory.CreateFilterBuilder();
        var filter = filterBuilder.Equal(q => q.UserId, userId).Build();

        var quotas = await _quotaFactory.FindAsync(filter, limit: 1);
        var quota = quotas.FirstOrDefault();

        if (quota == null)
        {
            quota = new StorageQuota
            {
                UserId = userId,
                TotalQuota = DefaultQuota,
                UsedSpace = 0,
                FileCount = 0,
                LastCalculatedAt = DateTime.UtcNow,
                TypeUsage = []
            };

            await _quotaFactory.CreateAsync(quota);
            _logger.LogInformation("Created default storage quota for user {UserId}: {TotalQuota} bytes", userId, DefaultQuota);
        }

        return quota;
    }

    /// <summary>
    /// 获取文件类型分类
    /// </summary>
    private static string GetFileTypeCategory(string mimeType)
    {
        return mimeType.ToLowerInvariant() switch
        {
            var mime when mime.StartsWith("image/") => "图片",
            var mime when mime.StartsWith("video/") => "视频",
            var mime when mime.StartsWith("audio/") => "音频",
            var mime when mime.StartsWith("text/") => "文本",
            "application/pdf" => "PDF",
            var mime when mime.Contains("document") || mime.Contains("word") => "文档",
            var mime when mime.Contains("spreadsheet") || mime.Contains("excel") => "表格",
            var mime when mime.Contains("presentation") || mime.Contains("powerpoint") => "演示文稿",
            _ => "其他"
        };
    }

    /// <summary>
    /// 获取警告级别
    /// </summary>
    private static WarningLevel? GetWarningLevel(long usedSpace, long totalQuota)
    {
        if (totalQuota <= 0) return null;

        var usagePercentage = (double)usedSpace / totalQuota;

        return usagePercentage switch
        {
            >= 1.0 => WarningLevel.Emergency,
            >= 0.95 => WarningLevel.Critical,
            >= 0.8 => WarningLevel.Warning,
            _ => null
        };
    }

    #endregion
}