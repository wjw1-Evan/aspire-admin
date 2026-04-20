using Platform.ServiceDefaults.Models;
using Microsoft.EntityFrameworkCore;
using Platform.ServiceDefaults.Services;
using Platform.ApiService.Models;
using System.Linq.Expressions;
using System.Linq.Dynamic.Core;
using Platform.ServiceDefaults.Extensions;
using Platform.ApiService.Models.Response;

namespace Platform.ApiService.Services;

/// <summary>
/// 用户活动日志服务实现
/// </summary>
public class UserActivityLogService : IUserActivityLogService
{
    private readonly DbContext _context;

    /// <summary>
    /// 初始化用户活动日志服务
    /// </summary>
    public UserActivityLogService(DbContext context)
    {
        _context = context;
    }

    /// <summary>
    /// 记录用户活动
    /// </summary>
    public async Task LogUserActivityAsync(string userId, string action, string description, string? ipAddress = null, string? userAgent = null)
    {
        var log = new UserActivityLog
        {
            Action = action,
            Description = description,
            IpAddress = ipAddress,
            UserAgent = userAgent,
        };

        await _context.Set<UserActivityLog>().AddAsync(log);
        await _context.SaveChangesAsync();
    }

    /// <summary>
    /// 获取用户活动日志（分页）
    /// </summary>
    public async Task<System.Linq.Dynamic.Core.PagedResult<UserActivityLog>> GetActivityLogsAsync(ProTableRequest request)
    {
        return _context.Set<UserActivityLog>().ToPagedList(request);
    }

    /// <inheritdoc/>
    public async Task<List<UserActivityLog>> GetUserActivityLogsAsync(string createdBy, int limit = 50)
    {
        Expression<Func<UserActivityLog, bool>> filter = log => log.CreatedBy == createdBy;

        return await _context.Set<UserActivityLog>().Where(filter).OrderByDescending(log => log.CreatedAt).Take(limit).ToListAsync();
    }

    /// <inheritdoc/>
    public async Task<System.Linq.Dynamic.Core.PagedResult<ActivityLogListItemResponse>> GetCurrentUserActivityLogsAsync(
        string userId,
        ProTableRequest request,
        string? action = null,
        string? httpMethod = null,
        int? statusCode = null,
        string? ipAddress = null,
        DateTime? startDate = null,
        DateTime? endDate = null)
    {
        if (string.IsNullOrEmpty(userId)) throw new UnauthorizedAccessException();

        var query = _context.Set<UserActivityLog>().Where(l => l.CreatedBy == userId);

        if (!string.IsNullOrEmpty(action)) query = query.Where(l => l.Action != null && l.Action.Contains(action));
        if (!string.IsNullOrEmpty(httpMethod)) query = query.Where(l => l.HttpMethod == httpMethod);
        if (statusCode.HasValue) query = query.Where(l => l.StatusCode == statusCode.Value);
        if (!string.IsNullOrEmpty(ipAddress)) query = query.Where(l => l.IpAddress != null && l.IpAddress.Contains(ipAddress));
        if (startDate.HasValue) query = query.Where(l => l.CreatedAt >= startDate.Value);
        if (endDate.HasValue) query = query.Where(l => l.CreatedAt <= endDate.Value);

        var pagedResult = query.ToPagedList(request);
        var logs = pagedResult.Queryable.ToList();

        var userNames = await _context.Set<AppUser>().ToDictionaryAsync(u => u.Id!, u => u.Username);

        return new System.Linq.Dynamic.Core.PagedResult<ActivityLogListItemResponse>
        {
            RowCount = pagedResult.RowCount,
            CurrentPage = pagedResult.CurrentPage,
            PageSize = pagedResult.PageSize,
            Queryable = logs.Select(log => new ActivityLogListItemResponse
            {
                Id = log.Id ?? string.Empty,
                CreatedBy = log.CreatedBy,
                Action = log.Action,
                Description = log.Description,
                IpAddress = log.IpAddress,
                HttpMethod = log.HttpMethod,
                FullUrl = log.FullUrl,
                StatusCode = log.StatusCode,
                Duration = log.Duration,
                Username = userNames.GetValueOrDefault(log.CreatedBy ?? "") ?? "Unknown"
            }).AsQueryable()
        };
    }

    /// <inheritdoc/>
    public async Task<UserActivityLog?> GetCurrentUserActivityLogByIdAsync(string userId, string logId)
    {
        var log = await _context.Set<UserActivityLog>().FirstOrDefaultAsync(x => x.Id == logId && x.CreatedBy == userId);

        return log;
    }

    /// <inheritdoc/>
    public async Task<UserActivityLog?> GetActivityLogByIdAsync(string logId)
    {
        return await _context.Set<UserActivityLog>().FirstOrDefaultAsync(x => x.Id == logId);
    }

    /// <inheritdoc/>
    public Task<System.Linq.Dynamic.Core.PagedResult<UserActivityLog>> GetAllActivityLogsAsync(ProTableRequest request)
    {
        return Task.FromResult(_context.Set<UserActivityLog>().ToPagedList(request));
    }

    /// <inheritdoc/>
    public async Task<System.Linq.Dynamic.Core.PagedResult<ActivityLogListItemResponse>> GetAllActivityLogsWithUsersAsync(ProTableRequest request)
    {
        var pagedResult = _context.Set<UserActivityLog>().ToPagedList(request);
        var logs = pagedResult.Queryable.ToList();
        var userNames = await _context.Set<AppUser>().ToDictionaryAsync(u => u.Id!, u => u.Username);

        return new System.Linq.Dynamic.Core.PagedResult<ActivityLogListItemResponse>
        {
            RowCount = pagedResult.RowCount,
            CurrentPage = pagedResult.CurrentPage,
            PageSize = pagedResult.PageSize,
            Queryable = logs.Select(log => new ActivityLogListItemResponse
            {
                Id = log.Id ?? string.Empty,
                CreatedBy = log.CreatedBy,
                Action = log.Action,
                Description = log.Description,
                IpAddress = log.IpAddress,
                HttpMethod = log.HttpMethod,
                FullUrl = log.FullUrl,
                StatusCode = log.StatusCode,
                Duration = log.Duration,
                Username = userNames.GetValueOrDefault(log.CreatedBy ?? "") ?? "Unknown"
            }).AsQueryable()
        };
    }

    /// <summary>
    /// 删除旧的活动日志（软删除）
    /// </summary>
    public async Task<long> DeleteOldLogsAsync(DateTime olderThan)
    {
        Expression<Func<UserActivityLog, bool>> filter = log => log.CreatedAt < olderThan;

        var logs = await _context.Set<UserActivityLog>().Where(filter).ToListAsync();
        var logIds = logs.Select(log => log.Id!).ToList();

        if (logIds.Any())
        {
            var logsToDelete = await _context.Set<UserActivityLog>().Where(log => log.Id != null && logIds.Contains(log.Id)).ToListAsync();
            _context.Set<UserActivityLog>().RemoveRange(logsToDelete);
            await _context.SaveChangesAsync();
        }

        return logIds.Count;
    }

    /// <summary>
    /// 记录 HTTP 请求（中间件专用）
    /// </summary>
    public async Task LogHttpRequestAsync(LogHttpRequestRequest request)
    {
        var pathWithQuery = string.IsNullOrEmpty(request.QueryString)
            ? request.Path
            : $"{request.Path}{request.QueryString}";
        var fullUrl = $"{request.Scheme}://{request.Host}{pathWithQuery}";

        var log = new UserActivityLog
        {
            CreatedBy = request.CreatedBy,
            CompanyId = request.CompanyId ?? string.Empty,
            Action = request.HttpMethod + request.Path,
            HttpMethod = request.HttpMethod,
            Path = request.Path,
            QueryString = request.QueryString,
            FullUrl = fullUrl,
            StatusCode = request.StatusCode,
            Duration = request.DurationMs,
            IpAddress = request.IpAddress,
            UserAgent = request.UserAgent,
            ResponseBody = request.ResponseBody,
            Metadata = request.Metadata,
        };

        await _context.Set<UserActivityLog>().AddAsync(log);
        await _context.SaveChangesAsync();
    }

    /// <inheritdoc/>
    public async Task<ActivityLogStatisticsResponse> GetActivityLogStatisticsAsync(
        string? createdBy = null,
        string? action = null,
        string? httpMethod = null,
        int? statusCode = null,
        string? ipAddress = null,
        DateTime? startDate = null,
        DateTime? endDate = null)
    {
        var actionLower = action?.ToLowerInvariant();
        var ipLower = ipAddress?.ToLowerInvariant();
        var httpMethodUpper = httpMethod?.ToUpperInvariant();

        Expression<Func<UserActivityLog, bool>> baseFilter = log =>
            (string.IsNullOrEmpty(createdBy) || log.CreatedBy == createdBy) &&
            (string.IsNullOrEmpty(actionLower) || (log.Action != null && log.Action.ToLower().Contains(actionLower))) &&
            (string.IsNullOrEmpty(httpMethodUpper) || log.HttpMethod == httpMethodUpper) &&
            (!statusCode.HasValue || log.StatusCode == statusCode.Value) &&
            (string.IsNullOrEmpty(ipLower) || (log.IpAddress != null && log.IpAddress.ToLower().Contains(ipLower))) &&
            (!startDate.HasValue || log.CreatedAt >= startDate.Value) &&
            (!endDate.HasValue || log.CreatedAt <= endDate.Value);

        var totalTask = _context.Set<UserActivityLog>().LongCountAsync(baseFilter);

        var successFilter = baseFilter.And(log => log.StatusCode >= 200 && log.StatusCode < 300)!;
        var successTask = _context.Set<UserActivityLog>().LongCountAsync(successFilter);

        var errorFilter = baseFilter.And(log => log.StatusCode >= 400)!;
        var errorTask = _context.Set<UserActivityLog>().LongCountAsync(errorFilter);

        var avgDurationTask = _context.Set<UserActivityLog>()
            .Where(baseFilter)
            .Select(log => (long?)log.Duration)
            .AverageAsync();

        await Task.WhenAll(totalTask, successTask, errorTask, avgDurationTask);

        var allLogs = await _context.Set<UserActivityLog>()
            .Where(baseFilter)
            .Select(log => log.Action)
            .ToListAsync();

        var actionTypeStats = allLogs
            .Where(a => !string.IsNullOrEmpty(a))
            .GroupBy(a => a!)
            .Select(g => new ActionTypeStatistic
            {
                Action = g.Key,
                Count = g.LongCount()
            })
            .OrderByDescending(s => s.Count)
            .Take(10)
            .ToList();

        return new ActivityLogStatisticsResponse
        {
            Total = totalTask.Result,
            SuccessCount = successTask.Result,
            ErrorCount = errorTask.Result,
            AvgDuration = avgDurationTask.Result ?? 0,
            ActionTypes = actionTypeStats
        };
    }

    /// <inheritdoc/>
    public async Task<ActivityLogStatisticsResponse> GetCurrentUserActivityLogStatisticsAsync(string userId)
    {


        return await GetActivityLogStatisticsAsync(userId);
    }

    private static bool IsValidObjectId(string? value)
    {
        if (string.IsNullOrEmpty(value)) return false;
        if (value.Length != 24) return false;
        return value.All(c => (c >= '0' && c <= '9') || (c >= 'a' && c <= 'f') || (c >= 'A' && c <= 'F'));
    }

}
