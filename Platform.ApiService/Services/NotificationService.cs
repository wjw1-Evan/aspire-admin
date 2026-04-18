using System.Linq.Dynamic.Core;
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
        Dictionary<string, string>? metadata = null);

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
}

public class NotificationService : INotificationService
{
    private readonly DbContext _context;
    private readonly INotificationStreamManager _streamManager;
    private readonly ILogger<NotificationService> _logger;

    public NotificationService(
        DbContext context,
        INotificationStreamManager streamManager,
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
        Dictionary<string, string>? metadata = null)
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

        _logger.LogInformation("正在准备向用户推送实时通知. [RecipientId: {UserId}, Title: {Title}]", recipientId, title);

        // SSE 实时推送一个 "NewNotification" 事件给前端
        await _streamManager.SendToUserAsync(recipientId, new {
            Type = "NewNotification",
            Notification = notification
        });
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
        var unreadItems = await _context.Set<AppNotification>()
            .Where(n => n.RecipientId == userId && n.Status == NotificationStatus.Unread)
            .ToListAsync();

        var stats = unreadItems
            .GroupBy(n => n.Category)
            .ToDictionary(g => g.Key.ToString(), g => g.Count());

        // 补全缺失的分类到 0
        foreach (var category in Enum.GetNames<NotificationCategory>())
        {
            if (!stats.ContainsKey(category)) stats[category] = 0;
        }

        stats["Total"] = stats.Values.Sum();
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

    private async Task PushStatsUpdateAsync(string userId)
    {
        var stats = await GetStatisticsAsync(userId);
        var latestNotifications = await GetLatestAsync(userId);
        await _streamManager.SendToUserAsync(userId, new {
            Type = "StatsUpdate",
            Statistics = stats,
            LatestNotifications = latestNotifications.Take(10).ToList()
        });
    }
}
