using Platform.ApiService.Models;

namespace Platform.ApiService.Services;

/// <summary>
/// 用户活动日志服务接口
/// </summary>
public interface IUserActivityLogService
{
    Task<List<UserActivityLog>> GetUserActivityLogsAsync(string userId, int limit = 50);
    Task LogHttpRequestAsync(LogHttpRequestRequest request);
}

