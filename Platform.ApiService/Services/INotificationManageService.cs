using System.Linq.Dynamic.Core;
using Platform.ApiService.Models;
using Platform.ApiService.Models.DTOs;
using Platform.ServiceDefaults.Models;

namespace Platform.ApiService.Services;

public interface INotificationManageService
{
    Task<NotificationSendRecordDto> SendToUsersAsync(AdminSendRequest request, string senderId, string companyId);

    Task<NotificationSendRecordDto> BroadcastToAllAsync(AdminBroadcastRequest request, string senderId, string companyId);

    Task<PagedResult<NotificationSendRecordDto>> GetHistoryAsync(ProTableRequest request, string companyId);

    Task<NotificationSendDetailDto> GetDetailAsync(string id, string companyId);

    Task<NotificationManageStatisticsDto> GetStatisticsAsync(string companyId);
}
