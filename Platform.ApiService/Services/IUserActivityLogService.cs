using Platform.ApiService.Models;

namespace Platform.ApiService.Services;

/// <summary>
/// 用户活动日志服务接口
/// </summary>
public interface IUserActivityLogService
{
    Task<List<UserActivityLog>> GetUserActivityLogsAsync(string userId, int limit = 50);
    Task LogHttpRequestAsync(
        string? userId,
        string? username,
        string httpMethod,
        string path,
        string? queryString,
        int statusCode,
        long durationMs,
        string? ipAddress,
        string? userAgent);
}

