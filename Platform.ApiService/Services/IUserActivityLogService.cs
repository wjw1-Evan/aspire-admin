using Platform.ApiService.Models;

namespace Platform.ApiService.Services;

/// <summary>
/// 用户活动日志服务接口
/// </summary>
public interface IUserActivityLogService
{
    /// <summary>
    /// 获取用户活动日志
    /// </summary>
    /// <param name="userId">用户ID</param>
    /// <param name="limit">返回数量限制（默认50）</param>
    /// <returns>活动日志列表</returns>
    Task<List<UserActivityLog>> GetUserActivityLogsAsync(string userId, int limit = 50);
    
    /// <summary>
    /// 获取用户活动日志（分页）
    /// </summary>
    /// <param name="request">查询请求</param>
    /// <returns>分页的活动日志响应</returns>
    Task<UserActivityLogPagedResponse> GetActivityLogsAsync(GetUserActivityLogsRequest request);
    
    /// <summary>
    /// 记录HTTP请求日志
    /// </summary>
    /// <param name="request">HTTP请求日志请求</param>
    Task LogHttpRequestAsync(LogHttpRequestRequest request);
}

