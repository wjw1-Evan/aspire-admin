using Microsoft.EntityFrameworkCore;
using Platform.ApiService.Models;
using Platform.ServiceDefaults.Models;
using Platform.ServiceDefaults.Extensions;
using Platform.ServiceDefaults.Services;
using System.Linq.Dynamic.Core;
using System.Text.Json;

namespace Platform.ApiService.Services;

/// <summary>
/// 看板版本服务实现
/// </summary>
public class DashboardVersionService : IDashboardVersionService
{
    private readonly DbContext _context;
    private readonly IDashboardService _dashboardService;
    private readonly ILogger<DashboardVersionService> _logger;

    public DashboardVersionService(
        DbContext context,
        IDashboardService dashboardService,
        ILogger<DashboardVersionService> logger)
    {
        _context = context ?? throw new ArgumentNullException(nameof(context));
        _dashboardService = dashboardService ?? throw new ArgumentNullException(nameof(dashboardService));
        _logger = logger ?? throw new ArgumentNullException(nameof(logger));
    }

    /// <summary>
    /// 创建看板版本快照
    /// </summary>
    public async Task<DashboardVersion> CreateVersionAsync(string dashboardId, string userId, string? comment = null)
    {
        if (string.IsNullOrEmpty(dashboardId))
            throw new ArgumentException("看板ID不能为空", nameof(dashboardId));
        if (string.IsNullOrEmpty(userId))
            throw new ArgumentException("用户ID不能为空", nameof(userId));

        // 获取当前看板信息
        var dashboard = await _context.Set<Dashboard>().FirstOrDefaultAsync(d => d.Id == dashboardId);
        if (dashboard == null)
            throw new ArgumentException("看板不存在", nameof(dashboardId));

        // 获取看板的卡片列表
        var cards = await _context.Set<DashboardCard>()
            .Where(c => c.DashboardId == dashboardId)
            .ToListAsync();

        // 序列化卡片列表为JSON
        var cardsSnapshot = JsonSerializer.Serialize(cards.Select(c => new
        {
            c.Id,
            c.CardType,
            c.Title,
            c.PositionX,
            c.PositionY,
            c.Width,
            c.Height,
            c.DataSource,
            c.StyleConfig,
            c.RefreshInterval
        }));

        // 获取下一个版本号
        var nextVersionNumber = await GetNextVersionNumberAsync(dashboardId);

        // 取消当前版本标记
        var currentVersion = await GetCurrentVersionAsync(dashboardId);
        if (currentVersion != null)
        {
            currentVersion.IsCurrentVersion = false;
        }

        // 创建新版本
        var version = new DashboardVersion
        {
            DashboardId = dashboardId,
            VersionNumber = nextVersionNumber,
            Name = dashboard.Name,
            Description = dashboard.Description,
            LayoutType = dashboard.LayoutType,
            Theme = dashboard.Theme,
            IsPublic = dashboard.IsPublic,
            CardsSnapshot = cardsSnapshot,
            Comment = comment ?? string.Empty,
            IsCurrentVersion = true,
            ChangedBy = userId
        };

        await _context.Set<DashboardVersion>().AddAsync(version);
        await _context.SaveChangesAsync();

        _logger.LogInformation("创建看板版本成功: DashboardId={DashboardId}, VersionNumber={VersionNumber}",
            dashboardId, nextVersionNumber);

        return version;
    }

    /// <summary>
    /// 获取版本历史（分页）
    /// </summary>
    public async Task<PagedResult<DashboardVersion>> GetVersionHistoryPaginatedAsync(string dashboardId, ProTableRequest request)
    {
        var query = _context.Set<DashboardVersion>()
            .Where(v => v.DashboardId == dashboardId)
            .OrderByDescending(v => v.VersionNumber);

        return query.ToPagedList(request);
    }

    /// <summary>
    /// 获取版本历史列表
    /// </summary>
    public async Task<List<DashboardVersion>> GetVersionHistoryAsync(string dashboardId)
    {
        return await _context.Set<DashboardVersion>()
            .Where(v => v.DashboardId == dashboardId)
            .OrderByDescending(v => v.VersionNumber)
            .ToListAsync();
    }

    /// <summary>
    /// 获取版本详情
    /// </summary>
    public async Task<DashboardVersion?> GetVersionAsync(string versionId)
    {
        return await _context.Set<DashboardVersion>().FirstOrDefaultAsync(v => v.Id == versionId);
    }

    /// <summary>
    /// 恢复到指定版本
    /// </summary>
    public async Task<DashboardVersion> RestoreVersionAsync(string dashboardId, int versionNumber, string userId)
    {
        var versions = await _context.Set<DashboardVersion>()
            .Where(v => v.DashboardId == dashboardId)
            .ToListAsync();

        var targetVersion = versions.FirstOrDefault(v => v.VersionNumber == versionNumber);
        if (targetVersion == null)
            throw new ArgumentException($"版本 {versionNumber} 不存在");

        // 检查是否为当前版本
        var current = versions.FirstOrDefault(v => v.IsCurrentVersion);
        if (current != null)
        {
            if (current.VersionNumber == versionNumber)
                throw new InvalidOperationException("指定版本已经是当前版本");
            current.IsCurrentVersion = false;
        }

        // 恢复看板基本信息
        var dashboard = await _context.Set<Dashboard>().FirstOrDefaultAsync(d => d.Id == dashboardId);
        if (dashboard == null)
            throw new ArgumentException("看板不存在");

        dashboard.Name = targetVersion.Name;
        dashboard.Description = targetVersion.Description;
        dashboard.LayoutType = targetVersion.LayoutType;
        dashboard.Theme = targetVersion.Theme;
        dashboard.IsPublic = targetVersion.IsPublic;

        // 恢复卡片列表
        // 先删除现有卡片
        var existingCards = await _context.Set<DashboardCard>()
            .Where(c => c.DashboardId == dashboardId)
            .ToListAsync();
        _context.Set<DashboardCard>().RemoveRange(existingCards);

        // 反序列化并恢复卡片
        if (!string.IsNullOrEmpty(targetVersion.CardsSnapshot))
        {
            var snapshotCards = JsonSerializer.Deserialize<List<DashboardCardSnapshot>>(targetVersion.CardsSnapshot);
            if (snapshotCards != null)
            {
                foreach (var snapshotCard in snapshotCards)
                {
                    var card = new DashboardCard
                    {
                        DashboardId = dashboardId,
                        CardType = snapshotCard.CardType,
                        Title = snapshotCard.Title,
                        PositionX = snapshotCard.PositionX,
                        PositionY = snapshotCard.PositionY,
                        Width = snapshotCard.Width,
                        Height = snapshotCard.Height,
                        DataSource = snapshotCard.DataSource ?? string.Empty,
                        StyleConfig = snapshotCard.StyleConfig ?? string.Empty,
                        RefreshInterval = snapshotCard.RefreshInterval
                    };
                    await _context.Set<DashboardCard>().AddAsync(card);
                }
            }
        }

        // 设置目标版本为当前版本
        targetVersion.IsCurrentVersion = true;

        await _context.SaveChangesAsync();

        _logger.LogInformation("恢复看板版本成功: DashboardId={DashboardId}, VersionNumber={VersionNumber}",
            dashboardId, versionNumber);

        return targetVersion;
    }

    /// <summary>
    /// 删除指定版本
    /// </summary>
    public async Task DeleteVersionAsync(string versionId, string userId)
    {
        var version = await GetVersionAsync(versionId);
        if (version == null)
            throw new ArgumentException("版本不存在");

        if (version.IsCurrentVersion)
            throw new InvalidOperationException("不能删除当前版本");

        _context.Set<DashboardVersion>().Remove(version);
        await _context.SaveChangesAsync();

        _logger.LogInformation("删除看板版本成功: VersionId={VersionId}", versionId);
    }

    /// <summary>
    /// 获取当前版本
    /// </summary>
    public async Task<DashboardVersion?> GetCurrentVersionAsync(string dashboardId)
    {
        return await _context.Set<DashboardVersion>()
            .FirstOrDefaultAsync(v => v.DashboardId == dashboardId && v.IsCurrentVersion);
    }

    /// <summary>
    /// 设置指定版本为当前版本
    /// </summary>
    public async Task<DashboardVersion> SetAsCurrentVersionAsync(string versionId, string userId)
    {
        var version = await GetVersionAsync(versionId);
        if (version == null)
            throw new ArgumentException("版本不存在");

        if (version.IsCurrentVersion)
            return version;

        // 取消当前版本标记
        var current = await GetCurrentVersionAsync(version.DashboardId);
        if (current != null)
        {
            current.IsCurrentVersion = false;
        }

        version.IsCurrentVersion = true;
        await _context.SaveChangesAsync();

        _logger.LogInformation("设置看板当前版本成功: VersionId={VersionId}", versionId);

        return version;
    }

    /// <summary>
    /// 比较两个版本差异
    /// </summary>
    public async Task<DashboardVersionComparison> CompareVersionsAsync(string versionId1, string versionId2)
    {
        var version1 = await GetVersionAsync(versionId1);
        var version2 = await GetVersionAsync(versionId2);

        if (version1 == null || version2 == null)
            throw new ArgumentException("无效的版本比较请求");

        if (version1.DashboardId != version2.DashboardId)
            throw new ArgumentException("只能比较同一看板的版本");

        var comparison = new DashboardVersionComparison
        {
            Version1Id = versionId1,
            Version2Id = versionId2,
            Version1 = version1,
            Version2 = version2,
            HasDifferences = version1.CardsSnapshot != version2.CardsSnapshot,
            ComparisonType = "json"
        };

        // 生成差异内容
        try
        {
            var snapshot1 = JsonSerializer.Deserialize<object>(version1.CardsSnapshot);
            var snapshot2 = JsonSerializer.Deserialize<object>(version2.CardsSnapshot);

            comparison.DiffContent = new
            {
                Version1 = snapshot1,
                Version2 = snapshot2,
                Differences = GenerateDiff(version1.CardsSnapshot, version2.CardsSnapshot)
            };
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "生成版本差异时发生错误");
        }

        return comparison;
    }

    /// <summary>
    /// 获取版本统计信息
    /// </summary>
    public async Task<DashboardVersionStatistics> GetVersionStatisticsAsync(string dashboardId)
    {
        var versions = await _context.Set<DashboardVersion>()
            .Where(v => v.DashboardId == dashboardId)
            .ToListAsync();

        var currentVersion = versions.FirstOrDefault(v => v.IsCurrentVersion);

        return new DashboardVersionStatistics
        {
            TotalVersions = versions.Count,
            CurrentVersionNumber = currentVersion?.VersionNumber ?? 0
        };
    }

    /// <summary>
    /// 获取下一个版本号
    /// </summary>
    private async Task<int> GetNextVersionNumberAsync(string dashboardId)
    {
        var maxVersion = await _context.Set<DashboardVersion>()
            .Where(v => v.DashboardId == dashboardId)
            .MaxAsync(v => (int?)v.VersionNumber);

        return (maxVersion ?? 0) + 1;
    }

    /// <summary>
    /// 生成差异内容（简单实现）
    /// </summary>
    private object GenerateDiff(string json1, string json2)
    {
        // 简单比较：返回两个版本的信息
        return new
        {
            Message = "请查看版本1和版本2的内容进行对比",
            Hint = "卡片数量或配置可能有所不同"
        };
    }

    /// <summary>
    /// 卡片快照内部类（用于反序列化）
    /// </summary>
    private class DashboardCardSnapshot
    {
        public string Id { get; set; } = string.Empty;
        public string CardType { get; set; } = string.Empty;
        public string Title { get; set; } = string.Empty;
        public int PositionX { get; set; }
        public int PositionY { get; set; }
        public int Width { get; set; }
        public int Height { get; set; }
        public string? DataSource { get; set; }
        public string? StyleConfig { get; set; }
        public int RefreshInterval { get; set; }
    }
}
