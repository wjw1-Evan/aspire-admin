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

    /// <summary>
    /// 记录用户活动日志
    /// </summary>
    /// <param name="userId">用户ID</param>
    /// <param name="action">操作类型</param>
    /// <param name="description">操作描述</param>
    /// <param name="ipAddress">IP地址（可选）</param>
    /// <param name="userAgent">用户代理（可选）</param>
    Task LogUserActivityAsync(string userId, string action, string description, string? ipAddress = null, string? userAgent = null);

    /// <summary>
    /// 获取当前用户的活动日志（分页）
    /// </summary>
    Task<(List<UserActivityLog> logs, long total)> GetCurrentUserActivityLogsAsync(
        int page = 1,
        int pageSize = 20,
        string? action = null,
        string? httpMethod = null,
        int? statusCode = null,
        string? ipAddress = null,
        DateTime? startDate = null,
        DateTime? endDate = null,
        string? sortBy = null,
        string? sortOrder = null);

    /// <summary>
    /// 获取当前用户的活动日志详情（根据日志ID）
    /// </summary>
    Task<UserActivityLog?> GetCurrentUserActivityLogByIdAsync(string logId);

    /// <summary>
    /// 获取指定活动日志详情（管理员查看）
    /// </summary>
    Task<UserActivityLog?> GetActivityLogByIdAsync(string logId);

    /// <summary>
    /// 获取所有活动日志（分页，管理员功能，兼容旧方法）
    /// </summary>
    Task<(List<UserActivityLog> logs, long total)> GetAllActivityLogsAsync(
        int page = 1,
        int pageSize = 20,
        string? userId = null,
        string? action = null,
        string? httpMethod = null,
        int? statusCode = null,
        string? ipAddress = null,
        DateTime? startDate = null,
        DateTime? endDate = null);

    /// <summary>
    /// 获取所有活动日志（包含用户信息，分页，管理员功能）
    /// </summary>
    Task<(List<UserActivityLog> logs, long total, Dictionary<string, string> userMap)> GetAllActivityLogsWithUsersAsync(
        int page = 1,
        int pageSize = 20,
        string? userId = null,
        string? action = null,
        string? httpMethod = null,
        int? statusCode = null,
        string? ipAddress = null,
        DateTime? startDate = null,
        DateTime? endDate = null);
}

