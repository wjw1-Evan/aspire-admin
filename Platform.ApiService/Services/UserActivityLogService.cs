using Microsoft.EntityFrameworkCore;
using Platform.ServiceDefaults.Services;
using Platform.ServiceDefaults.Models;
using Platform.ApiService.Models;
using System.Linq.Expressions;
using System.Linq.Dynamic.Core;

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
    public async Task<PagedResult<UserActivityLog>> GetActivityLogsAsync(GetUserActivityLogsRequest request)
    {
        var createdBy = request.CreatedBy;
        var action = request.Action;
        var startDate = request.StartDate;
        var endDate = request.EndDate;

        Expression<Func<UserActivityLog, bool>> filter = log =>
            (string.IsNullOrEmpty(createdBy) || log.CreatedBy == createdBy) &&
            (string.IsNullOrEmpty(action) || log.Action == action) &&
            (!startDate.HasValue || log.CreatedAt >= startDate.Value) &&
            (!endDate.HasValue || log.CreatedAt <= endDate.Value);

        var query = _context.Set<UserActivityLog>().Where(filter);
        var pagedResult = query.OrderByDescending(log => log.CreatedAt).PageResult(request.Page, request.PageSize);

        return new PagedResult<UserActivityLog>
        {
            Queryable = pagedResult.Queryable,
            CurrentPage = request.Page,
            PageSize = request.PageSize,
            RowCount = pagedResult.RowCount,
            PageCount = (int)Math.Ceiling(pagedResult.RowCount / (double)request.PageSize)
        };
    }

    /// <inheritdoc/>
    public async Task<List<UserActivityLog>> GetUserActivityLogsAsync(string createdBy, int limit = 50)
    {
        Expression<Func<UserActivityLog, bool>> filter = log => log.CreatedBy == createdBy;

        return await _context.Set<UserActivityLog>().Where(filter).OrderByDescending(log => log.CreatedAt).Take(limit).ToListAsync();
    }

    /// <inheritdoc/>
    public async Task<PagedResult<ActivityLogListItemResponse>> GetCurrentUserActivityLogsAsync(
        int page = 1,
        int pageSize = 20,
        string? action = null,
        string? httpMethod = null,
        int? statusCode = null,
        string? ipAddress = null,
        DateTime? startDate = null,
        DateTime? endDate = null,
        string? sortBy = null,
        string? sortOrder = null)
    {
        var actionLower = action?.ToLowerInvariant();
        var ipLower = ipAddress?.ToLowerInvariant();
        var httpMethodUpper = httpMethod?.ToUpperInvariant();

        Expression<Func<UserActivityLog, bool>> filter = log =>

            (string.IsNullOrEmpty(actionLower) || (log.Action != null && log.Action.ToLower().Contains(actionLower))) &&
            (string.IsNullOrEmpty(httpMethodUpper) || log.HttpMethod == httpMethodUpper) &&
            (!statusCode.HasValue || log.StatusCode == statusCode.Value) &&
            (string.IsNullOrEmpty(ipLower) || (log.IpAddress != null && log.IpAddress.ToLower().Contains(ipLower))) &&
            (!startDate.HasValue || log.CreatedAt >= startDate.Value) &&
            (!endDate.HasValue || log.CreatedAt <= endDate.Value);

        // 核心：在后台线程中并行执行统计查询，提高响应速度
        var totalTask = _context.Set<UserActivityLog>().LongCountAsync(filter);

        // 成功记录统计 (2xx)
        var successTask = _context.Set<UserActivityLog>().LongCountAsync(log =>

            (string.IsNullOrEmpty(actionLower) || (log.Action != null && log.Action.ToLower().Contains(actionLower))) &&
            (string.IsNullOrEmpty(httpMethodUpper) || log.HttpMethod == httpMethodUpper) &&
            (!statusCode.HasValue || log.StatusCode == statusCode.Value) &&
            (string.IsNullOrEmpty(ipLower) || (log.IpAddress != null && log.IpAddress.ToLower().Contains(ipLower))) &&
            (!startDate.HasValue || log.CreatedAt >= startDate.Value) &&
            (!endDate.HasValue || log.CreatedAt <= endDate.Value) &&
            log.StatusCode >= 200 && log.StatusCode < 300);

        // 错误记录统计 (>= 400)
        var errorTask = _context.Set<UserActivityLog>().LongCountAsync(log =>

            (string.IsNullOrEmpty(actionLower) || (log.Action != null && log.Action.ToLower().Contains(actionLower))) &&
            (string.IsNullOrEmpty(httpMethodUpper) || log.HttpMethod == httpMethodUpper) &&
            (!statusCode.HasValue || log.StatusCode == statusCode.Value) &&
            (string.IsNullOrEmpty(ipLower) || (log.IpAddress != null && log.IpAddress.ToLower().Contains(ipLower))) &&
            (!startDate.HasValue || log.CreatedAt >= startDate.Value) &&
            (!endDate.HasValue || log.CreatedAt <= endDate.Value) &&
            log.StatusCode >= 400);

        await Task.WhenAll(totalTask, successTask, errorTask);

        var total = totalTask.Result;
        var successCount = successTask.Result;
        var errorCount = errorTask.Result;

        Func<IQueryable<UserActivityLog>, IOrderedQueryable<UserActivityLog>> orderBy = query =>
        {
            if (string.IsNullOrEmpty(sortBy) || sortBy.Equals("createdAt", StringComparison.OrdinalIgnoreCase))
            {
                return string.IsNullOrEmpty(sortOrder) || sortOrder.Equals("desc", StringComparison.OrdinalIgnoreCase)
                    ? query.OrderByDescending(log => log.CreatedAt)
                    : query.OrderBy(log => log.CreatedAt);
            }

            if (sortBy.Equals("action", StringComparison.OrdinalIgnoreCase))
            {
                return string.IsNullOrEmpty(sortOrder) || sortOrder.Equals("desc", StringComparison.OrdinalIgnoreCase)
                    ? query.OrderByDescending(log => log.Action).ThenByDescending(log => log.CreatedAt)
                    : query.OrderBy(log => log.Action).ThenByDescending(log => log.CreatedAt);
            }

            return query.OrderByDescending(log => log.CreatedAt);
        };

        var query = _context.Set<UserActivityLog>().Where(filter);
        var pagedResult = orderBy(query).PageResult(page, pageSize);
        var logs = await pagedResult.Queryable.ToListAsync();
        var totalCount = pagedResult.RowCount;

        var logDtos = logs.Select(log => new ActivityLogListItemResponse
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
            CreatedAt = log.CreatedAt
        }).ToList();

        return new PagedResult<ActivityLogListItemResponse>
        {
            Queryable = logDtos.AsQueryable(),
            CurrentPage = page,
            PageSize = pageSize,
            RowCount = (int)totalCount,
            PageCount = (int)Math.Ceiling(totalCount / (double)pageSize)
        };
    }

    /// <inheritdoc/>
    public async Task<UserActivityLog?> GetCurrentUserActivityLogByIdAsync(string logId)
    {
        var log = await _context.Set<UserActivityLog>().FirstOrDefaultAsync(x => x.Id == logId);

        return log;
    }

    /// <inheritdoc/>
    public async Task<UserActivityLog?> GetActivityLogByIdAsync(string logId)
    {
        return await _context.Set<UserActivityLog>().FirstOrDefaultAsync(x => x.Id == logId);
    }

    /// <inheritdoc/>
    public Task<PagedResult<UserActivityLog>> GetAllActivityLogsAsync(
        int page = 1,
        int pageSize = 20,
        string? userId = null,
        string? action = null,
        string? httpMethod = null,
        int? statusCode = null,
        string? ipAddress = null,
        DateTime? startDate = null,
        DateTime? endDate = null)
    {
        var actionLower = action?.ToLowerInvariant();
        var ipLower = ipAddress?.ToLowerInvariant();

        Expression<Func<UserActivityLog, bool>> filter = log =>
            (string.IsNullOrEmpty(userId) || log.CreatedBy == userId) &&
            (string.IsNullOrEmpty(actionLower) || (log.Action != null && log.Action.ToLower().Contains(actionLower))) &&
            (string.IsNullOrEmpty(httpMethod) || log.HttpMethod == httpMethod) &&
            (!statusCode.HasValue || log.StatusCode == statusCode.Value) &&
            (string.IsNullOrEmpty(ipLower) || (log.IpAddress != null && log.IpAddress.ToLower().Contains(ipLower))) &&
            (!startDate.HasValue || log.CreatedAt >= startDate.Value) &&
            (!endDate.HasValue || log.CreatedAt <= endDate.Value);

        var query = _context.Set<UserActivityLog>().Where(filter);
        return Task.FromResult(query.OrderByDescending(log => log.CreatedAt).PageResult(page, pageSize));
    }

    /// <inheritdoc/>
    public async Task<PagedResult<ActivityLogListItemResponse>> GetAllActivityLogsWithUsersAsync(
        int page = 1,
        int pageSize = 20,
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

        Expression<Func<UserActivityLog, bool>> filter = log =>
            (string.IsNullOrEmpty(createdBy) || log.CreatedBy == createdBy) &&
            (string.IsNullOrEmpty(actionLower) || (log.Action != null && log.Action.ToLower().Contains(actionLower))) &&
            (string.IsNullOrEmpty(httpMethod) || log.HttpMethod == httpMethod) &&
            (!statusCode.HasValue || log.StatusCode == statusCode.Value) &&
            (string.IsNullOrEmpty(ipLower) || (log.IpAddress != null && log.IpAddress.ToLower().Contains(ipLower))) &&
            (!startDate.HasValue || log.CreatedAt >= startDate.Value) &&
            (!endDate.HasValue || log.CreatedAt <= endDate.Value);

        var query = _context.Set<UserActivityLog>().Where(filter);
        var pagedResult = query.OrderByDescending(log => log.CreatedAt).PageResult(page, pageSize);
        var logs = await pagedResult.Queryable.ToListAsync();
        var total = pagedResult.RowCount;

        var validUserIds = logs
            .Select(log => log.CreatedBy)
            .Distinct()
            .Where(uid => !string.IsNullOrEmpty(uid) && IsValidObjectId(uid))
            .ToList();

        var users = new List<AppUser>();
        if (validUserIds.Any())
        {
            users = await _context.Set<AppUser>().Where(u => validUserIds.Contains(u.Id)).ToListAsync();
        }

        var userMap = users.ToDictionary(u => u.Id!, u => u.Username);
        var invalidUserIds = logs
            .Select(log => log.CreatedBy)
            .Distinct()
            .Where(uid => !string.IsNullOrEmpty(uid) && !IsValidObjectId(uid!))
            .Where(uid => !userMap.ContainsKey(uid!))
            .ToList();

        foreach (var invalidUserId in invalidUserIds)
        {
            string defaultUsername = invalidUserId switch
            {
                _ => $"用户({invalidUserId})"
            };
            userMap[invalidUserId!] = defaultUsername;
        }

        var logDtos = logs.Select(log => new ActivityLogListItemResponse
        {
            Id = log.Id ?? string.Empty,
            CreatedBy = log.CreatedBy,
            Username = userMap.ContainsKey(log.CreatedBy ?? "") ? userMap[log.CreatedBy ?? ""] : null,
            Action = log.Action,
            Description = log.Description,
            IpAddress = log.IpAddress,
            HttpMethod = log.HttpMethod,
            FullUrl = log.FullUrl,
            StatusCode = log.StatusCode,
            Duration = log.Duration,
            CreatedAt = log.CreatedAt
        }).ToList();

        return new PagedResult<ActivityLogListItemResponse>
        {
            Queryable = logDtos.AsQueryable(),
            CurrentPage = page,
            PageSize = pageSize,
            RowCount = (int)total,
            PageCount = (int)Math.Ceiling((double)total / pageSize)
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

        await Task.WhenAll(totalTask, successTask, errorTask);

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
            ActionTypes = actionTypeStats
        };
    }

    private static bool IsValidObjectId(string? value)
    {
        if (string.IsNullOrEmpty(value)) return false;
        if (value.Length != 24) return false;
        return value.All(c => (c >= '0' && c <= '9') || (c >= 'a' && c <= 'f') || (c >= 'A' && c <= 'F'));
    }

}