using System.Linq.Dynamic.Core;
using Microsoft.EntityFrameworkCore;
using Platform.ApiService.Models;
using Platform.ApiService.Models.DTOs;
using Platform.ApiService.Models.Entities;
using Platform.ServiceDefaults.Extensions;
using Platform.ServiceDefaults.Models;
using Platform.ServiceDefaults.Services;

namespace Platform.ApiService.Services;

public class NotificationManageService : INotificationManageService
{
    private readonly DbContext _context;
    private readonly INotificationService _notificationService;
    private readonly IUserService _userService;
    private readonly ILogger<NotificationManageService> _logger;

    public NotificationManageService(
        DbContext context,
        INotificationService notificationService,
        IUserService userService,
        ILogger<NotificationManageService> logger)
    {
        _context = context;
        _notificationService = notificationService;
        _userService = userService;
        _logger = logger;
    }

    public async Task<NotificationSendRecordDto> SendToUsersAsync(
        AdminSendRequest request, string senderId, string companyId)
    {
        if (request.RecipientIds.Count == 0)
            throw new ArgumentException("请选择至少一个接收用户");

        var sender = await _userService.GetUserByIdWithoutTenantFilterAsync(senderId);
        var senderName = sender?.Name ?? sender?.Username ?? senderId;

        var record = new NotificationSendRecord
        {
            Title = request.Title,
            Content = request.Content,
            Category = request.Category,
            Level = request.Level,
            ActionUrl = request.ActionUrl,
            SenderId = senderId,
            SenderName = senderName,
            TargetType = SendTargetType.Specific,
            RecipientIds = request.RecipientIds,
            RecipientCount = request.RecipientIds.Count,
            Status = SendJobStatus.Sending,
        };

        await _context.Set<NotificationSendRecord>().AddAsync(record);
        await _context.SaveChangesAsync();

        int success = 0, fail = 0;
        var recipientDetails = new List<RecipientSendDetail>();

        foreach (var recipientId in request.RecipientIds)
        {
            try
            {
                await _notificationService.PublishAsync(
                    recipientId,
                    request.Title,
                    request.Content,
                    request.Category,
                    request.Level,
                    request.ActionUrl,
                    companyId: companyId,
                    batchId: record.Id);

                var user = await _userService.GetUserByIdWithoutTenantFilterAsync(recipientId);
                recipientDetails.Add(new RecipientSendDetail
                {
                    UserId = recipientId,
                    UserName = user?.Username ?? recipientId,
                    DisplayName = user?.Name,
                    IsSent = true,
                    IsRead = false,
                });
                success++;
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "发送通知给用户 {RecipientId} 失败", recipientId);
                var user = await _userService.GetUserByIdWithoutTenantFilterAsync(recipientId);
                recipientDetails.Add(new RecipientSendDetail
                {
                    UserId = recipientId,
                    UserName = user?.Username ?? recipientId,
                    DisplayName = user?.Name,
                    IsSent = false,
                    ErrorMessage = ex.Message,
                });
                fail++;
            }
        }

        record.SuccessCount = success;
        record.FailCount = fail;
        record.RecipientDetails = recipientDetails;
        record.Status = fail == 0 ? SendJobStatus.Sent
            : success > 0 ? SendJobStatus.PartialFailed
            : SendJobStatus.Failed;

        await _context.SaveChangesAsync();

        return MapToDto(record);
    }

    public async Task<NotificationSendRecordDto> BroadcastToAllAsync(
        AdminBroadcastRequest request, string senderId, string companyId)
    {
        var allUsers = await _userService.GetAllUsersAsync();
        var activeUsers = allUsers.Where(u => u.IsActive).ToList();

        if (activeUsers.Count == 0)
            throw new ArgumentException("暂无活跃用户可发送");

        var sender = await _userService.GetUserByIdWithoutTenantFilterAsync(senderId);
        var senderName = sender?.Name ?? sender?.Username ?? senderId;

        var recipientIds = activeUsers.Select(u => u.Id).ToList();

        var record = new NotificationSendRecord
        {
            Title = request.Title,
            Content = request.Content,
            Category = request.Category,
            Level = request.Level,
            ActionUrl = request.ActionUrl,
            SenderId = senderId,
            SenderName = senderName,
            TargetType = SendTargetType.All,
            RecipientIds = recipientIds,
            RecipientCount = recipientIds.Count,
            Status = SendJobStatus.Sending,
        };

        await _context.Set<NotificationSendRecord>().AddAsync(record);
        await _context.SaveChangesAsync();

        int success = 0, fail = 0;
        var recipientDetails = new List<RecipientSendDetail>();

        foreach (var user in activeUsers)
        {
            try
            {
                await _notificationService.PublishAsync(
                    user.Id,
                    request.Title,
                    request.Content,
                    request.Category,
                    request.Level,
                    request.ActionUrl,
                    companyId: companyId,
                    batchId: record.Id);

                recipientDetails.Add(new RecipientSendDetail
                {
                    UserId = user.Id,
                    UserName = user.Username,
                    DisplayName = user.Name,
                    IsSent = true,
                    IsRead = false,
                });
                success++;
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "广播通知给用户 {RecipientId} 失败", user.Id);
                recipientDetails.Add(new RecipientSendDetail
                {
                    UserId = user.Id,
                    UserName = user.Username,
                    DisplayName = user.Name,
                    IsSent = false,
                    ErrorMessage = ex.Message,
                });
                fail++;
            }
        }

        record.SuccessCount = success;
        record.FailCount = fail;
        record.RecipientDetails = recipientDetails;
        record.Status = fail == 0 ? SendJobStatus.Sent
            : success > 0 ? SendJobStatus.PartialFailed
            : SendJobStatus.Failed;

        await _context.SaveChangesAsync();

        return MapToDto(record);
    }

    public async Task<PagedResult<NotificationSendRecordDto>> GetHistoryAsync(
        ProTableRequest request, string companyId)
    {
        var query = _context.Set<NotificationSendRecord>().AsQueryable();

        if (!string.IsNullOrWhiteSpace(request.Search))
        {
            var search = request.Search.ToLower();
            query = query.Where(r => r.Title.ToLower().Contains(search)
                || r.SenderName.ToLower().Contains(search));
        }

        query = query.OrderByDescending(r => r.CreatedAt);

        var paged = query.ToPagedList(request);

        return new PagedResult<NotificationSendRecordDto>
        {
            Queryable = paged.Queryable.Select(MapToDto).AsQueryable(),
            CurrentPage = paged.CurrentPage,
            PageSize = paged.PageSize,
            RowCount = paged.RowCount,
            PageCount = paged.PageCount,
        };
    }

    public async Task<NotificationManageStatisticsDto> GetStatisticsAsync(string companyId)
    {
        var records = await _context.Set<NotificationSendRecord>().ToListAsync();

        return new NotificationManageStatisticsDto
        {
            TotalSent = records.Count,
            TotalSuccess = records.Count(r => r.Status == SendJobStatus.Sent),
            TotalFailed = records.Count(r => r.Status == SendJobStatus.Failed),
            TotalRecipients = records.Sum(r => r.RecipientCount),
            TotalBroadcasts = records.Count(r => r.TargetType == SendTargetType.All),
        };
    }

    public async Task<NotificationSendDetailDto> GetDetailAsync(string id, string companyId)
    {
        var record = await _context.Set<NotificationSendRecord>()
            .FirstOrDefaultAsync(r => r.Id == id);

        if (record == null)
            throw new ArgumentException("发送记录不存在");

        var dto = MapToDetailDto(record);

        var notifications = await _context.Set<AppNotification>()
            .Where(n => n.BatchId == id)
            .ToListAsync();

        var readCount = notifications.Count(n => n.Status == NotificationStatus.Read);
        var unreadCount = notifications.Count(n => n.Status == NotificationStatus.Unread);

        dto.ReadCount = readCount;
        dto.UnreadCount = unreadCount;

        if (record.TargetType == SendTargetType.Specific && record.RecipientDetails != null)
        {
            var userIds = record.RecipientDetails.Select(r => r.UserId).ToList();
            var userMap = await _userService.GetUsersByIdsAsync(userIds);

            dto.RecipientStatus = record.RecipientDetails.Select(d =>
            {
                var notification = notifications.FirstOrDefault(n => n.RecipientId == d.UserId);
                return new RecipientReadStatusDto
                {
                    UserId = d.UserId,
                    UserName = d.UserName,
                    DisplayName = userMap.TryGetValue(d.UserId, out var u) ? u.Name : d.DisplayName,
                    IsSent = d.IsSent,
                    IsRead = notification?.Status == NotificationStatus.Read,
                    ReadAt = notification?.ReadAt,
                    ErrorMessage = d.ErrorMessage,
                };
            }).ToList();
        }
        else if (record.TargetType == SendTargetType.All)
        {
            var userIds = notifications.Select(n => n.RecipientId).Distinct().ToList();
            var userMap = await _userService.GetUsersByIdsAsync(userIds);

            dto.RecipientStatus = notifications.Select(n =>
            {
                userMap.TryGetValue(n.RecipientId, out var user);
                return new RecipientReadStatusDto
                {
                    UserId = n.RecipientId,
                    UserName = user?.Username ?? n.RecipientId,
                    DisplayName = user?.Name,
                    IsSent = true,
                    IsRead = n.Status == NotificationStatus.Read,
                    ReadAt = n.ReadAt,
                };
            }).ToList();
        }

        return dto;
    }

    private static NotificationSendRecordDto MapToDto(NotificationSendRecord record)
    {
        return new NotificationSendRecordDto
        {
            Id = record.Id,
            Title = record.Title,
            Content = record.Content,
            Category = record.Category.ToString(),
            Level = record.Level.ToString(),
            ActionUrl = record.ActionUrl,
            SenderId = record.SenderId,
            SenderName = record.SenderName,
            TargetType = record.TargetType.ToString(),
            RecipientCount = record.RecipientCount,
            SuccessCount = record.SuccessCount,
            FailCount = record.FailCount,
            Status = record.Status.ToString(),
            ErrorMessage = record.ErrorMessage,
            CreatedAt = record.CreatedAt ?? DateTime.UtcNow,
            RecipientIds = record.RecipientIds,
        };
    }

    private static NotificationSendDetailDto MapToDetailDto(NotificationSendRecord record)
    {
        return new NotificationSendDetailDto
        {
            Id = record.Id,
            Title = record.Title,
            Content = record.Content,
            Category = record.Category.ToString(),
            Level = record.Level.ToString(),
            ActionUrl = record.ActionUrl,
            SenderId = record.SenderId,
            SenderName = record.SenderName,
            TargetType = record.TargetType.ToString(),
            RecipientCount = record.RecipientCount,
            SuccessCount = record.SuccessCount,
            FailCount = record.FailCount,
            Status = record.Status.ToString(),
            ErrorMessage = record.ErrorMessage,
            CreatedAt = record.CreatedAt ?? DateTime.UtcNow,
            RecipientIds = record.RecipientIds,
        };
    }
}
