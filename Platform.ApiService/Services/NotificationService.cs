using System.Linq.Dynamic.Core;
using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Platform.ApiService.Models.Entities;
using Platform.ServiceDefaults.Extensions;
using Platform.ServiceDefaults.Models;
using Platform.ServiceDefaults.Services;

namespace Platform.ApiService.Services;

public interface INotificationService
{
    /// <summary>
    /// 发布通知并推送到前端
    /// </summary>
    Task PublishAsync(string recipientId, string title, string? content = null,
        NotificationCategory category = NotificationCategory.System,
        NotificationLevel level = NotificationLevel.Info,
        string? actionUrl = null,
        Dictionary<string, string>? metadata = null,
        string? companyId = null);

    /// <summary>
    /// 获取用户的最新通知（包含已读和未读）
    /// </summary>
    Task<List<AppNotification>> GetLatestAsync(string userId, int count = 20);

    /// <summary>
    /// 获取用户的未读通知
    /// </summary>
    Task<List<AppNotification>> GetUnreadAsync(string userId);

    /// <summary>
    /// 获取通知分页列表
    /// </summary>
    Task<PagedResult<AppNotification>> GetPagedListAsync(string userId, ProTableRequest request);

    /// <summary>
    /// 统计各项未读数
    /// </summary>
    Task<Dictionary<string, int>> GetStatisticsAsync(string userId);

    /// <summary>
    /// 标记为已读
    /// </summary>
    Task<bool> MarkAsReadAsync(string userId, string notificationId);

    /// <summary>
    /// 标记为未读
    /// </summary>
    Task<bool> MarkAsUnreadAsync(string userId, string notificationId);

    /// <summary>
    /// 全部标记为已读
    /// </summary>
    Task<int> MarkAllAsReadAsync(string userId, NotificationCategory? category = null);

    /// <summary>
    /// 推送统计更新到 SSE 客户端
    /// </summary>
    Task PushStatsUpdateAsync(string userId, string? companyId = null);
}

public class NotificationService : INotificationService
{
    private readonly DbContext _context;
    private readonly IChatSseConnectionManager _streamManager;
    private readonly ILogger<NotificationService> _logger;

    public NotificationService(
        DbContext context,
        IChatSseConnectionManager streamManager,
        ILogger<NotificationService> logger)
    {
        _context = context;
        _streamManager = streamManager;
        _logger = logger;
    }

    public async Task PublishAsync(string recipientId, string title, string? content = null,
        NotificationCategory category = NotificationCategory.System,
        NotificationLevel level = NotificationLevel.Info,
        string? actionUrl = null,
        Dictionary<string, string>? metadata = null,
        string? companyId = null)
    {
        var notification = new AppNotification
        {
            RecipientId = recipientId,
            Title = title,
            Content = content,
            Category = category,
            Level = level,
            ActionUrl = actionUrl,
            Metadata = metadata ?? new(),
            Status = NotificationStatus.Unread,
        };

        await _context.Set<AppNotification>().AddAsync(notification);
        await _context.SaveChangesAsync();

        _logger.LogInformation("正在准备向用户推送实时通知. [RecipientId: {UserId}, CompanyId: {CompanyId}, Title: {Title}]", 
            recipientId, companyId, title);

        // SSE 实时推送一个 "notification" 事件给前端（按企业ID过滤）
        var json = JsonSerializer.Serialize(new { Type = "notification", Notification = notification });
        var sseMessage = $"event: notification\ndata: {json}\n\n";
        _logger.LogInformation("准备发送通知 SSE 消息: {RecipientId}, CompanyId={CompanyId}, messageLength={Length}", 
            recipientId, companyId, sseMessage.Length);
        await _streamManager.SendToUserAsync(recipientId, sseMessage, companyId);
        _logger.LogInformation("通知 SSE 消息已发送: {RecipientId}, CompanyId={CompanyId}", recipientId, companyId);

        // 新通知发布后同步推送统计更新（按企业ID过滤）
        await PushStatsUpdateAsync(recipientId, companyId);
    }

    public async Task<List<AppNotification>> GetLatestAsync(string userId, int count = 20)
    {
        return await _context.Set<AppNotification>()
            .Where(n => n.RecipientId == userId)
            .OrderByDescending(n => n.CreatedAt)
            .Take(count)
            .ToListAsync();
    }

    public async Task<List<AppNotification>> GetUnreadAsync(string userId)
    {
        return await _context.Set<AppNotification>()
            .Where(n => n.RecipientId == userId && n.Status == NotificationStatus.Unread)
            .OrderByDescending(n => n.CreatedAt)
            .ToListAsync();
    }

    public async Task<PagedResult<AppNotification>> GetPagedListAsync(string userId, ProTableRequest request)
    {
        var query = _context.Set<AppNotification>()
            .Where(n => n.RecipientId == userId);

        return await Task.FromResult(query.ToPagedList(request));
    }

    public async Task<Dictionary<string, int>> GetStatisticsAsync(string userId)
    {
        var allItems = await _context.Set<AppNotification>()
            .Where(n => n.RecipientId == userId)
            .ToListAsync();

        var unreadItems = allItems.Where(n => n.Status == NotificationStatus.Unread).ToList();

        var stats = unreadItems
            .GroupBy(n => n.Category)
            .ToDictionary(g => g.Key.ToString(), g => g.Count());

        foreach (var category in Enum.GetNames<NotificationCategory>())
        {
            if (!stats.ContainsKey(category)) stats[category] = 0;
        }

        stats["UnreadTotal"] = unreadItems.Count;
        stats["Total"] = allItems.Count;
        return stats;
    }

    public async Task<bool> MarkAsReadAsync(string userId, string notificationId)
    {
        var notification = await _context.Set<AppNotification>()
            .FirstOrDefaultAsync(n => n.Id == notificationId && n.RecipientId == userId);

        if (notification == null) return false;

        notification.Status = NotificationStatus.Read;
        notification.ReadAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();

        // 推送统计数据更新
        await PushStatsUpdateAsync(userId);

        return true;
    }

    public async Task<bool> MarkAsUnreadAsync(string userId, string notificationId)
    {
        var notification = await _context.Set<AppNotification>()
            .FirstOrDefaultAsync(n => n.Id == notificationId && n.RecipientId == userId);

        if (notification == null) return false;

        notification.Status = NotificationStatus.Unread;
        notification.ReadAt = null;

        await _context.SaveChangesAsync();

        // 推送统计数据更新
        await PushStatsUpdateAsync(userId);

        return true;
    }

    public async Task<int> MarkAllAsReadAsync(string userId, NotificationCategory? category = null)
    {
        var query = _context.Set<AppNotification>()
            .Where(n => n.RecipientId == userId && n.Status == NotificationStatus.Unread);

        if (category.HasValue)
        {
            query = query.Where(n => n.Category == category.Value);
        }

        var unreadItems = await query.ToListAsync();
        foreach (var item in unreadItems)
        {
            item.Status = NotificationStatus.Read;
            item.ReadAt = DateTime.UtcNow;
        }

        var count = await _context.SaveChangesAsync();

        // 推送统计数据更新
        await PushStatsUpdateAsync(userId);

        return count;
    }

    public async Task PushStatsUpdateAsync(string userId, string? companyId = null)
    {
        var hasConnection = _streamManager.HasUserConnection(userId);
        if (!hasConnection)
        {
            return;
        }

        var stats = await GetStatisticsAsync(userId);
        var statsData = new { Type = "stats", Statistics = stats };
        var json = JsonSerializer.Serialize(statsData, new JsonSerializerOptions { PropertyNamingPolicy = JsonNamingPolicy.CamelCase });
        var sseMessage = $"event: stats\ndata: {json}\n\n";
        _logger.LogInformation("PushStatsUpdateAsync: 正在推送统计更新, userId={UserId}, companyId={CompanyId}, stats={Stats}", 
            userId, companyId, stats);
        
        try
        {
            await _streamManager.SendToUserAsync(userId, sseMessage, companyId);
            _logger.LogInformation("PushStatsUpdateAsync: 统计更新已发送, userId={UserId}, companyId={CompanyId}", userId, companyId);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "PushStatsUpdateAsync: 发送失败, userId={UserId}", userId);
        }
    }
}
