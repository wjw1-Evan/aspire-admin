using Microsoft.EntityFrameworkCore;
using Platform.ApiService.Models;
using Platform.ServiceDefaults.Models;
using Platform.ServiceDefaults.Extensions;
using System.Text.Json;
using System.Linq.Dynamic.Core;

namespace Platform.ApiService.Services;

/// <summary>
/// 数据看板服务实现
/// </summary>
public class DashboardService : IDashboardService
{
    private readonly DbContext _context;
    private readonly ILogger<DashboardService> _logger;
    private readonly IDataQueryService _dataQueryService;

    public DashboardService(
        DbContext context,
        ILogger<DashboardService> logger,
        IDataQueryService dataQueryService)
    {
        _context = context ?? throw new ArgumentNullException(nameof(context));
        _logger = logger ?? throw new ArgumentNullException(nameof(logger));
        _dataQueryService = dataQueryService ?? throw new ArgumentNullException(nameof(dataQueryService));
    }

    /// <summary>
    /// 创建看板
    /// </summary>
    public async Task<Dashboard> CreateDashboardAsync(CreateDashboardRequest request, string userId, string companyId)
    {
        if (string.IsNullOrEmpty(request.Name))
            throw new ArgumentException("看板名称不能为空", nameof(request));
        if (string.IsNullOrEmpty(userId))
            throw new ArgumentException("用户ID不能为空", nameof(userId));
        if (string.IsNullOrEmpty(companyId))
            throw new ArgumentException("企业ID不能为空", nameof(companyId));

        var dashboard = new Dashboard
        {
            Name = request.Name,
            Description = request.Description,
            LayoutType = request.LayoutType,
            Theme = request.Theme,
            IsPublic = request.IsPublic,
            UserId = userId,
            CompanyId = companyId,
            Cards = new List<DashboardCard>()
        };

        await _context.Set<Dashboard>().AddAsync(dashboard);
        await _context.SaveChangesAsync();

        _logger.LogInformation("创建看板成功: {DashboardId}, 名称: {Name}", dashboard.Id, dashboard.Name);

        return dashboard;
    }

    /// <summary>
    /// 获取看板详情
    /// </summary>
    public async Task<DashboardDto?> GetDashboardByIdAsync(string id, string userId)
    {
        if (string.IsNullOrEmpty(userId))
            throw new ArgumentException("用户ID不能为空", nameof(userId));

        var dashboard = await _context.Set<Dashboard>()
            .Include(d => d.Cards)
            .FirstOrDefaultAsync(x => x.Id == id);

        if (dashboard == null)
            return null;

        if (dashboard.UserId != userId && !dashboard.IsPublic)
            throw new UnauthorizedAccessException("无权访问此看板");

        return ConvertToDto(dashboard);
    }

    /// <summary>
    /// 分页查询看板列表
    /// </summary>
    public async Task<PagedResult<Dashboard>> GetDashboardsAsync(ProTableRequest request, string userId, string companyId)
    {
        if (string.IsNullOrEmpty(userId))
            throw new ArgumentException("用户ID不能为空", nameof(userId));
        if (string.IsNullOrEmpty(companyId))
            throw new ArgumentException("企业ID不能为空", nameof(companyId));

        var query = _context.Set<Dashboard>()
            .Where(d => d.CompanyId == companyId && (d.UserId == userId || d.IsPublic));

        return query.ToPagedList(request);
    }

    /// <summary>
    /// 更新看板
    /// </summary>
    public async Task<Dashboard?> UpdateDashboardAsync(string id, UpdateDashboardRequest request, string userId)
    {
        if (string.IsNullOrEmpty(userId))
            throw new ArgumentException("用户ID不能为空", nameof(userId));

        var dashboard = await _context.Set<Dashboard>()
            .Include(d => d.Cards)
            .FirstOrDefaultAsync(x => x.Id == id);

        if (dashboard == null)
            return null;

        if (dashboard.UserId != userId)
            throw new UnauthorizedAccessException("无权更新此看板");

        if (!string.IsNullOrEmpty(request.Name))
            dashboard.Name = request.Name;
        if (request.Description != null)
            dashboard.Description = request.Description;
        if (!string.IsNullOrEmpty(request.LayoutType))
            dashboard.LayoutType = request.LayoutType;
        if (!string.IsNullOrEmpty(request.Theme))
            dashboard.Theme = request.Theme;
        if (request.IsPublic.HasValue)
            dashboard.IsPublic = request.IsPublic.Value;

        await _context.SaveChangesAsync();

        _logger.LogInformation("更新看板成功: {DashboardId}", dashboard.Id);

        return dashboard;
    }

    /// <summary>
    /// 删除看板（软删除）
    /// </summary>
    public async Task<bool> DeleteDashboardAsync(string id, string userId)
    {
        if (string.IsNullOrEmpty(userId))
            throw new ArgumentException("用户ID不能为空", nameof(userId));

        var dashboard = await _context.Set<Dashboard>().FirstOrDefaultAsync(x => x.Id == id);
        if (dashboard == null)
            return false;

        if (dashboard.UserId != userId)
            throw new UnauthorizedAccessException("无权删除此看板");

        _context.Set<Dashboard>().Remove(dashboard);
        await _context.SaveChangesAsync();

        _logger.LogInformation("删除看板成功: {DashboardId}", id);

        return true;
    }

    /// <summary>
    /// 复制看板
    /// </summary>
    public async Task<Dashboard?> CopyDashboardAsync(string id, string userId)
    {
        if (string.IsNullOrEmpty(userId))
            throw new ArgumentException("用户ID不能为空", nameof(userId));

        var originalDashboard = await _context.Set<Dashboard>()
            .Include(d => d.Cards)
            .FirstOrDefaultAsync(x => x.Id == id);

        if (originalDashboard == null)
            return null;

        if (originalDashboard.UserId != userId && !originalDashboard.IsPublic)
            throw new UnauthorizedAccessException("无权复制此看板");

        var newDashboard = new Dashboard
        {
            Name = $"{originalDashboard.Name} (副本)",
            Description = originalDashboard.Description,
            LayoutType = originalDashboard.LayoutType,
            Theme = originalDashboard.Theme,
            IsPublic = false,
            UserId = userId,
            CompanyId = originalDashboard.CompanyId,
            Cards = originalDashboard.Cards.Select(c => new DashboardCard
            {
                DashboardId = string.Empty,
                CardType = c.CardType,
                Title = c.Title,
                PositionX = c.PositionX,
                PositionY = c.PositionY,
                Width = c.Width,
                Height = c.Height,
                DataSource = c.DataSource,
                StyleConfig = c.StyleConfig,
                RefreshInterval = c.RefreshInterval
            }).ToList()
        };

        await _context.Set<Dashboard>().AddAsync(newDashboard);
        await _context.SaveChangesAsync();

        _logger.LogInformation("复制看板成功: 原看板={OriginalId}, 新看板={NewId}", id, newDashboard.Id);

        return newDashboard;
    }

    /// <summary>
    /// 生成分享链接
    /// </summary>
    public async Task<string?> GenerateShareTokenAsync(string id, string userId)
    {
        if (string.IsNullOrEmpty(userId))
            throw new ArgumentException("用户ID不能为空", nameof(userId));

        var dashboard = await _context.Set<Dashboard>().FirstOrDefaultAsync(x => x.Id == id);
        if (dashboard == null)
            return null;

        if (dashboard.UserId != userId)
            throw new UnauthorizedAccessException("无权分享此看板");

        var shareToken = Guid.NewGuid().ToString("N");
        dashboard.ShareToken = shareToken;
        dashboard.IsPublic = true;

        await _context.SaveChangesAsync();

        _logger.LogInformation("生成分享链接成功: {DashboardId}, Token: {Token}", id, shareToken);

        return shareToken;
    }

    /// <summary>
    /// 通过分享令牌获取看板
    /// </summary>
    public async Task<DashboardDto?> GetDashboardByShareTokenAsync(string token)
    {
        if (string.IsNullOrEmpty(token))
            throw new ArgumentException("分享令牌不能为空", nameof(token));

        var dashboard = await _context.Set<Dashboard>()
            .Include(d => d.Cards)
            .FirstOrDefaultAsync(x => x.ShareToken == token && x.IsPublic);

        if (dashboard == null)
            return null;

        return ConvertToDto(dashboard);
    }

    /// <summary>
    /// 添加卡片
    /// </summary>
    public async Task<DashboardCard> AddCardAsync(string dashboardId, CreateDashboardCardRequest request, string userId)
    {
        if (string.IsNullOrEmpty(userId))
            throw new ArgumentException("用户ID不能为空", nameof(userId));

        var dashboard = await _context.Set<Dashboard>().FirstOrDefaultAsync(x => x.Id == dashboardId);
        if (dashboard == null)
            throw new ArgumentException("看板不存在", nameof(dashboardId));

        if (dashboard.UserId != userId)
            throw new UnauthorizedAccessException("无权在此看板添加卡片");

        var card = new DashboardCard
        {
            DashboardId = dashboardId,
            CardType = request.CardType,
            Title = request.Title,
            PositionX = request.PositionX,
            PositionY = request.PositionY,
            Width = request.Width,
            Height = request.Height,
            DataSource = request.DataSource,
            StyleConfig = request.StyleConfig,
            RefreshInterval = request.RefreshInterval
        };

        await _context.Set<DashboardCard>().AddAsync(card);
        await _context.SaveChangesAsync();

        _logger.LogInformation("添加卡片成功: {CardId}, 看板: {DashboardId}", card.Id, dashboardId);

        return card;
    }

    /// <summary>
    /// 获取卡片详情
    /// </summary>
    public async Task<DashboardCard?> GetCardByIdAsync(string id, string userId)
    {
        if (string.IsNullOrEmpty(userId))
            throw new ArgumentException("用户ID不能为空", nameof(userId));

        var card = await _context.Set<DashboardCard>().FirstOrDefaultAsync(x => x.Id == id);
        if (card == null)
            return null;

        var dashboard = await _context.Set<Dashboard>().FirstOrDefaultAsync(x => x.Id == card.DashboardId);
        if (dashboard == null)
            return null;

        if (dashboard.UserId != userId && !dashboard.IsPublic)
            throw new UnauthorizedAccessException("无权访问此卡片");

        return card;
    }

    /// <summary>
    /// 更新卡片
    /// </summary>
    public async Task<DashboardCard?> UpdateCardAsync(string id, UpdateDashboardCardRequest request, string userId)
    {
        if (string.IsNullOrEmpty(userId))
            throw new ArgumentException("用户ID不能为空", nameof(userId));

        var card = await _context.Set<DashboardCard>().FirstOrDefaultAsync(x => x.Id == id);
        if (card == null)
            return null;

        var dashboard = await _context.Set<Dashboard>().FirstOrDefaultAsync(x => x.Id == card.DashboardId);
        if (dashboard == null)
            return null;

        if (dashboard.UserId != userId)
            throw new UnauthorizedAccessException("无权更新此卡片");

        if (!string.IsNullOrEmpty(request.Title))
            card.Title = request.Title;
        if (request.PositionX.HasValue)
            card.PositionX = request.PositionX.Value;
        if (request.PositionY.HasValue)
            card.PositionY = request.PositionY.Value;
        if (request.Width.HasValue)
            card.Width = request.Width.Value;
        if (request.Height.HasValue)
            card.Height = request.Height.Value;
        if (!string.IsNullOrEmpty(request.DataSource))
            card.DataSource = request.DataSource;
        if (!string.IsNullOrEmpty(request.StyleConfig))
            card.StyleConfig = request.StyleConfig;
        if (request.RefreshInterval.HasValue)
            card.RefreshInterval = request.RefreshInterval.Value;

        await _context.SaveChangesAsync();

        _logger.LogInformation("更新卡片成功: {CardId}", id);

        return card;
    }

    /// <summary>
    /// 删除卡片
    /// </summary>
    public async Task<bool> DeleteCardAsync(string id, string userId)
    {
        if (string.IsNullOrEmpty(userId))
            throw new ArgumentException("用户ID不能为空", nameof(userId));

        var card = await _context.Set<DashboardCard>().FirstOrDefaultAsync(x => x.Id == id);
        if (card == null)
            return false;

        var dashboard = await _context.Set<Dashboard>().FirstOrDefaultAsync(x => x.Id == card.DashboardId);
        if (dashboard == null)
            return false;

        if (dashboard.UserId != userId)
            throw new UnauthorizedAccessException("无权删除此卡片");

        _context.Set<DashboardCard>().Remove(card);
        await _context.SaveChangesAsync();

        _logger.LogInformation("删除卡片成功: {CardId}", id);

        return true;
    }

    /// <summary>
    /// 批量调整卡片位置
    /// </summary>
    public async Task<bool> ReorderCardsAsync(string dashboardId, ReorderCardsRequest request, string userId)
    {
        if (string.IsNullOrEmpty(userId))
            throw new ArgumentException("用户ID不能为空", nameof(userId));

        var dashboard = await _context.Set<Dashboard>().FirstOrDefaultAsync(x => x.Id == dashboardId);
        if (dashboard == null)
            throw new ArgumentException("看板不存在", nameof(dashboardId));

        if (dashboard.UserId != userId)
            throw new UnauthorizedAccessException("无权调整此看板的卡片");

        foreach (var cardPosition in request.Cards)
        {
            var card = await _context.Set<DashboardCard>().FirstOrDefaultAsync(x => x.Id == cardPosition.Id);
            if (card != null && card.DashboardId == dashboardId)
            {
                card.PositionX = cardPosition.PositionX;
                card.PositionY = cardPosition.PositionY;
                card.Width = cardPosition.Width;
                card.Height = cardPosition.Height;
            }
        }

        await _context.SaveChangesAsync();

        _logger.LogInformation("批量调整卡片位置成功: {DashboardId}", dashboardId);

        return true;
    }

    /// <summary>
    /// 获取卡片数据
    /// </summary>
    public async Task<CardDataResponse?> GetCardDataAsync(string cardId, string userId, string companyId)
    {
        if (string.IsNullOrEmpty(userId))
            throw new ArgumentException("用户ID不能为空", nameof(userId));
        if (string.IsNullOrEmpty(companyId))
            throw new ArgumentException("企业ID不能为空", nameof(companyId));

        var card = await _context.Set<DashboardCard>().FirstOrDefaultAsync(x => x.Id == cardId);
        if (card == null)
            return null;

        var dashboard = await _context.Set<Dashboard>().FirstOrDefaultAsync(x => x.Id == card.DashboardId);
        if (dashboard == null)
            return null;

        if (dashboard.UserId != userId && !dashboard.IsPublic)
            throw new UnauthorizedAccessException("无权访问此卡片");

        var dataSourceConfig = JsonSerializer.Deserialize<DataSourceConfig>(card.DataSource);
        if (dataSourceConfig == null)
            throw new ArgumentException("数据源配置无效", nameof(card));

        var data = await _dataQueryService.QueryDataAsync(dataSourceConfig, userId, companyId);

        return new CardDataResponse
        {
            CardId = cardId,
            Data = data,
            RefreshedAt = DateTime.UtcNow
        };
    }

    /// <summary>
    /// 刷新卡片数据
    /// </summary>
    public async Task<CardDataResponse?> RefreshCardDataAsync(string cardId, string userId, string companyId)
    {
        var card = await _context.Set<DashboardCard>().FirstOrDefaultAsync(x => x.Id == cardId);
        if (card == null)
            return null;

        card.LastRefreshAt = DateTime.UtcNow;
        await _context.SaveChangesAsync();

        return await GetCardDataAsync(cardId, userId, companyId);
    }

    /// <summary>
    /// 获取可用数据源列表
    /// </summary>
    public async Task<List<string>> GetAvailableDataSourcesAsync()
    {
        return await _dataQueryService.GetAvailableModulesAsync();
    }

    /// <summary>
    /// 获取模块可用字段
    /// </summary>
    public async Task<List<string>> GetModuleFieldsAsync(string module)
    {
        return await _dataQueryService.GetModuleFieldsAsync(module);
    }

    /// <summary>
    /// 获取统计信息
    /// </summary>
    public async Task<DashboardStatistics> GetStatisticsAsync(string userId, string companyId)
    {
        if (string.IsNullOrEmpty(userId))
            throw new ArgumentException("用户ID不能为空", nameof(userId));
        if (string.IsNullOrEmpty(companyId))
            throw new ArgumentException("企业ID不能为空", nameof(companyId));

        var totalDashboards = await _context.Set<Dashboard>()
            .Where(d => d.CompanyId == companyId)
            .CountAsync();

        var publicDashboards = await _context.Set<Dashboard>()
            .Where(d => d.CompanyId == companyId && d.IsPublic)
            .CountAsync();

        var privateDashboards = totalDashboards - publicDashboards;

        // MongoDB EF Core Provider 不支持 Join，使用子查询方式
        var dashboardIds = await _context.Set<Dashboard>()
            .Where(d => d.CompanyId == companyId)
            .Select(d => d.Id)
            .ToListAsync();

        var totalCards = await _context.Set<DashboardCard>()
            .Where(c => dashboardIds.Contains(c.DashboardId))
            .CountAsync();

        var sevenDaysAgo = DateTime.UtcNow.AddDays(-7);
        var recentCreatedCount = await _context.Set<Dashboard>()
            .Where(d => d.CompanyId == companyId && d.CreatedAt.HasValue && d.CreatedAt.Value >= sevenDaysAgo)
            .CountAsync();

        return new DashboardStatistics
        {
            TotalDashboards = totalDashboards,
            PublicDashboards = publicDashboards,
            PrivateDashboards = privateDashboards,
            TotalCards = totalCards,
            RecentCreatedCount = recentCreatedCount
        };
    }

    /// <summary>
    /// 转换为DTO
    /// </summary>
    private DashboardDto ConvertToDto(Dashboard dashboard)
    {
        return new DashboardDto
        {
            Id = dashboard.Id,
            Name = dashboard.Name,
            Description = dashboard.Description,
            LayoutType = dashboard.LayoutType,
            Theme = dashboard.Theme,
            IsPublic = dashboard.IsPublic,
            UserId = dashboard.UserId,
            Cards = dashboard.Cards.Select(c => new DashboardCardDto
            {
                Id = c.Id,
                CardType = c.CardType,
                Title = c.Title,
                PositionX = c.PositionX,
                PositionY = c.PositionY,
                Width = c.Width,
                Height = c.Height,
                DataSource = c.DataSource,
                StyleConfig = c.StyleConfig,
                RefreshInterval = c.RefreshInterval,
                LastRefreshAt = c.LastRefreshAt
            }).ToList(),
            CreatedAt = dashboard.CreatedAt,
            UpdatedAt = dashboard.UpdatedAt
        };
    }
}
