using System.Linq.Dynamic.Core;
using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Platform.ApiService.Models.Entities;
using Platform.ServiceDefaults.Extensions;
using Platform.ServiceDefaults.Models;
using Platform.ServiceDefaults.Services;
using StackExchange.Redis;

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
    private readonly IConnectionMultiplexer _redis;
    private readonly JsonSerializerOptions _jsonOptions;

    public NotificationService(
        DbContext context,
        IChatSseConnectionManager streamManager,
        ILogger<NotificationService> logger,
        IConnectionMultiplexer redis)
    {
        _context = context;
        _streamManager = streamManager;
        _logger = logger;
        _redis = redis ?? throw new ArgumentNullException(nameof(redis));

        _jsonOptions = new JsonSerializerOptions
        {
            PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
            DefaultIgnoreCondition = System.Text.Json.Serialization.JsonIgnoreCondition.WhenWritingNull
        };
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
        
        // 通过 Redis Pub/Sub 广播通知消息（支持多副本）
        await BroadcastViaRedisAsync(new List<string> { recipientId }, sseMessage);
        
        _logger.LogInformation("通知 SSE 消息已通过 Redis 发布: {RecipientId}, CompanyId={CompanyId}", recipientId, companyId);

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
        var stats = await GetStatisticsAsync(userId);
        var statsData = new { Type = "stats", Statistics = stats };
        var json = JsonSerializer.Serialize(statsData, _jsonOptions);
        var sseMessage = $"event: stats\ndata: {json}\n\n";
        
        _logger.LogInformation("PushStatsUpdateAsync: 正在推送统计更新, userId={UserId}, companyId={CompanyId}, stats={Stats}", 
            userId, companyId, stats);
        
        // 通过 Redis Pub/Sub 广播统计更新（支持多副本）
        await BroadcastViaRedisAsync(new List<string> { userId }, sseMessage);
        
        _logger.LogInformation("PushStatsUpdateAsync: 统计更新已通过 Redis 发布, userId={UserId}, companyId={CompanyId}", userId, companyId);
    }

    /// <summary>
    /// 通过 Redis Pub/Sub 广播消息给指定参与者
    /// </summary>
    private async Task BroadcastViaRedisAsync(List<string> participants, string message)
    {
        try
        {
            var broadcastData = new
            {
                Participants = participants,
                Message = message,
                Timestamp = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds()
            };
            
            var json = JsonSerializer.Serialize(broadcastData, _jsonOptions);
            var sub = _redis.GetSubscriber();
            await sub.PublishAsync(RedisChannel.Literal("sse:broadcast"), json);
            
            _logger.LogDebug("已通过 Redis 广播消息: 参与者数 {Count}, 消息长度 {Length}", 
                participants.Count, message.Length);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Redis 广播失败，回退到本地发送");
            // 回退到本地发送
            foreach (var userId in participants)
            {
                try
                {
                    await _streamManager.SendToUserAsync(userId, message);
                }
                catch (Exception fallbackEx)
                {
                    _logger.LogWarning(fallbackEx, "本地回退发送也失败: 用户 {UserId}", userId);
                }
            }
        }
    }
}
