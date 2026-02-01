using Platform.ApiService.Extensions;
using Platform.ServiceDefaults.Services;
using Platform.ServiceDefaults.Models;
using Platform.ApiService.Models;
using MongoDB.Driver;
using MongoDB.Bson;

namespace Platform.ApiService.Services;

/// <summary>
/// 用户活动日志服务实现
/// </summary>
public class UserActivityLogService : IUserActivityLogService
{
    private readonly IDatabaseOperationFactory<UserActivityLog> _activityLogFactory;
    private readonly IDatabaseOperationFactory<AppUser> _userFactory;

    /// <summary>
    /// 初始化用户活动日志服务
    /// </summary>
    /// <param name="activityLogFactory">活动日志数据操作工厂</param>
    /// <param name="userFactory">用户数据操作工厂</param>
    public UserActivityLogService(
        IDatabaseOperationFactory<UserActivityLog> activityLogFactory,
        IDatabaseOperationFactory<AppUser> userFactory)
    {
        _activityLogFactory = activityLogFactory;
        _userFactory = userFactory;
    }

    /// <summary>
    /// 尝试获取用户实体（从数据库获取，不使用 JWT token）
    /// </summary>
    private async Task<AppUser?> TryGetUserAsync(string? userId)
    {
        if (string.IsNullOrEmpty(userId))
        {
            return null;
        }

        try
        {
            return await _userFactory.GetByIdAsync(userId);
        }
        catch
        {
            return null;
        }
    }

    /// <summary>
    /// 记录用户活动（已弃用，请使用 LogUserActivityAsync）
    /// </summary>
    public async Task LogActivityAsync(string userId, string username, string action, string description)
    {
        var user = await TryGetUserAsync(userId);
        var companyId = user?.CurrentCompanyId;

        var log = new UserActivityLog
        {
            UserId = userId,
            Username = username,
            Action = action,
            Description = description,
            CompanyId = companyId ?? string.Empty,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        await _activityLogFactory.CreateAsync(log);
    }

    /// <summary>
    /// 记录用户活动
    /// </summary>
    public async Task LogUserActivityAsync(string userId, string action, string description, string? ipAddress = null, string? userAgent = null)
    {
        // 获取用户信息（从数据库获取，不使用 JWT token）
        var user = await TryGetUserAsync(userId);
        var companyId = user?.CurrentCompanyId;
        var username = user?.Username ?? user?.Name;

        var log = new UserActivityLog
        {
            UserId = userId,
            Username = username ?? string.Empty, 
            Action = action,
            Description = description,
            IpAddress = ipAddress,
            UserAgent = userAgent,
            CompanyId = companyId ?? string.Empty,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        await _activityLogFactory.CreateAsync(log);
    }

    /// <summary>
    /// 获取用户活动日志（分页）
    /// </summary>
    public async Task<UserActivityLogPagedResponse> GetActivityLogsAsync(GetUserActivityLogsRequest request)
    {
        var filterBuilder = _activityLogFactory.CreateFilterBuilder();

        if (!string.IsNullOrEmpty(request.UserId))
            filterBuilder.Equal(log => log.UserId, request.UserId);

        if (!string.IsNullOrEmpty(request.Action))
            filterBuilder.Equal(log => log.Action, request.Action);

        if (request.StartDate.HasValue)
            filterBuilder.GreaterThanOrEqual(log => log.CreatedAt, request.StartDate.Value);

        if (request.EndDate.HasValue)
            filterBuilder.LessThanOrEqual(log => log.CreatedAt, request.EndDate.Value);

        var filter = filterBuilder.Build();
        var total = await _activityLogFactory.CountAsync(filter);
        var sortBuilder = _activityLogFactory.CreateSortBuilder().Descending(log => log.CreatedAt);
        var (logs, _) = await _activityLogFactory.FindPagedAsync(filter, sortBuilder.Build(), request.Page, request.PageSize);
        var totalPages = (int)Math.Ceiling(total / (double)request.PageSize);

        return new UserActivityLogPagedResponse
        {
            Data = logs,
            Total = total,
            Page = request.Page,
            PageSize = request.PageSize,
            TotalPages = totalPages
        };
    }

    /// <inheritdoc/>
    public async Task<List<UserActivityLog>> GetUserActivityLogsAsync(string userId, int limit = 50)
    {
        var filter = _activityLogFactory.CreateFilterBuilder()
            .Equal(log => log.UserId, userId)
            .Build();

        var sort = _activityLogFactory.CreateSortBuilder()
            .Descending(log => log.CreatedAt)
            .Build();

        return await _activityLogFactory.FindAsync(filter, sort: sort, limit: limit);
    }

    /// <inheritdoc/>
    public async Task<(List<UserActivityLog> logs, long total)> GetCurrentUserActivityLogsAsync(
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
        var currentUserId = _userFactory.GetRequiredUserId();
        var filterBuilder = _activityLogFactory.CreateFilterBuilder();
        filterBuilder.Equal(log => log.UserId, currentUserId);

        if (!string.IsNullOrEmpty(action)) filterBuilder.Regex(log => log.Action, action, "i");
        if (!string.IsNullOrEmpty(httpMethod)) filterBuilder.Equal(log => log.HttpMethod, httpMethod.ToUpperInvariant());
        if (statusCode.HasValue) filterBuilder.Equal(log => log.StatusCode, statusCode.Value);
        if (!string.IsNullOrEmpty(ipAddress))
        {
             var ipFilter = Builders<UserActivityLog>.Filter.And(
                Builders<UserActivityLog>.Filter.Ne(log => log.IpAddress, null),
                Builders<UserActivityLog>.Filter.Regex(log => log.IpAddress!, new BsonRegularExpression(ipAddress, "i"))
            );
            filterBuilder.Custom(ipFilter);
        }
        if (startDate.HasValue) filterBuilder.GreaterThanOrEqual(log => log.CreatedAt, startDate.Value);
        if (endDate.HasValue) filterBuilder.LessThanOrEqual(log => log.CreatedAt, endDate.Value);

        var filter = filterBuilder.Build();
        var total = await _activityLogFactory.CountAsync(filter);

        var sortBuilder = _activityLogFactory.CreateSortBuilder();
        if (string.IsNullOrEmpty(sortBy) || sortBy.Equals("createdAt", StringComparison.OrdinalIgnoreCase))
        {
            if (string.IsNullOrEmpty(sortOrder) || sortOrder.Equals("desc", StringComparison.OrdinalIgnoreCase))
                sortBuilder.Descending(log => log.CreatedAt);
            else
                sortBuilder.Ascending(log => log.CreatedAt);
        }
        else if (sortBy.Equals("action", StringComparison.OrdinalIgnoreCase))
        {
             if (string.IsNullOrEmpty(sortOrder) || sortOrder.Equals("desc", StringComparison.OrdinalIgnoreCase))
                sortBuilder.Descending(log => log.Action);
            else
                sortBuilder.Ascending(log => log.Action);
            sortBuilder.Descending(log => log.CreatedAt);
        }
        else
        {
            sortBuilder.Descending(log => log.CreatedAt);
        }

        var projection = _activityLogFactory.CreateProjectionBuilder()
            .Include(log => log.Id)
            .Include(log => log.UserId)
            .Include(log => log.Username)
            .Include(log => log.Action)
            .Include(log => log.Description)
            .Include(log => log.IpAddress)
            .Include(log => log.HttpMethod)
            .Include(log => log.Path)
            .Include(log => log.StatusCode)
            .Include(log => log.Duration)
            .Include(log => log.CreatedAt)
            .Build();

        var (logs, _) = await _activityLogFactory.FindPagedAsync(filter, sortBuilder.Build(), page, pageSize, projection);
        return (logs, total);
    }

    /// <inheritdoc/>
    public async Task<UserActivityLog?> GetCurrentUserActivityLogByIdAsync(string logId)
    {
        var currentUserId = _userFactory.GetRequiredUserId();
        var log = await _activityLogFactory.GetByIdAsync(logId);
        if (log == null || log.UserId != currentUserId)
        {
            return null;
        }
        return log;
    }

    /// <inheritdoc/>
    public async Task<UserActivityLog?> GetActivityLogByIdAsync(string logId)
    {
        return await _activityLogFactory.GetByIdAsync(logId);
    }

    /// <inheritdoc/>
    public async Task<(List<UserActivityLog> logs, long total)> GetAllActivityLogsAsync(
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
        var (logs, total, _) = await GetAllActivityLogsWithUsersAsync(page, pageSize, userId, action, httpMethod, statusCode, ipAddress, startDate, endDate);
        return (logs, total);
    }

    /// <inheritdoc/>
    public async Task<(List<UserActivityLog> logs, long total, Dictionary<string, string> userMap)> GetAllActivityLogsWithUsersAsync(
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
        var filterBuilder = _activityLogFactory.CreateFilterBuilder();

        if (!string.IsNullOrEmpty(userId)) filterBuilder.Equal(log => log.UserId, userId);
        if (!string.IsNullOrEmpty(action)) filterBuilder.Equal(log => log.Action, action);
        if (!string.IsNullOrEmpty(httpMethod)) filterBuilder.Equal(log => log.HttpMethod, httpMethod);
        if (statusCode.HasValue) filterBuilder.Equal(log => log.StatusCode, statusCode.Value);
        if (!string.IsNullOrEmpty(ipAddress)) filterBuilder.Contains(log => log.IpAddress!, ipAddress);
        if (startDate.HasValue) filterBuilder.GreaterThanOrEqual(log => log.CreatedAt, startDate.Value);
        if (endDate.HasValue) filterBuilder.LessThanOrEqual(log => log.CreatedAt, endDate.Value);

        var filter = filterBuilder.Build();
        var total = await _activityLogFactory.CountAsync(filter);
        var sort = _activityLogFactory.CreateSortBuilder().Descending(log => log.CreatedAt).Build();
        var logs = await _activityLogFactory.FindAsync(filter, sort, limit: pageSize);

        var validUserIds = logs
            .Select(log => log.UserId)
            .Distinct()
            .Where(uid => !string.IsNullOrEmpty(uid) && IsValidObjectId(uid))
            .ToList();

        var users = new List<AppUser>();
        if (validUserIds.Any())
        {
            var userFilter = _userFactory.CreateFilterBuilder().In(u => u.Id, validUserIds).Build();
            users = await _userFactory.FindAsync(userFilter);
        }

        var userMap = users.ToDictionary(u => u.Id!, u => u.Username);
        var invalidUserIds = logs
            .Select(log => log.UserId)
            .Distinct()
            .Where(uid => !string.IsNullOrEmpty(uid) && !IsValidObjectId(uid))
            .Where(uid => !userMap.ContainsKey(uid))
            .ToList();

        foreach (var invalidUserId in invalidUserIds)
        {
            string defaultUsername = invalidUserId switch
            {
                "anonymous" => "匿名用户",
                _ => $"用户({invalidUserId})"
            };
            userMap[invalidUserId] = defaultUsername;
        }

        return (logs, total, userMap);
    }

    /// <summary>
    /// 删除旧的活动日志（软删除）
    /// </summary>
    public async Task<long> DeleteOldLogsAsync(DateTime olderThan)
    {
        var filter = _activityLogFactory.CreateFilterBuilder()
            .LessThan(log => log.CreatedAt, olderThan)
            .Build();

        var logs = await _activityLogFactory.FindAsync(filter);
        var logIds = logs.Select(log => log.Id!).ToList();

        if (logIds.Any())
        {
            await _activityLogFactory.SoftDeleteManyAsync(logIds);
        }

        return logIds.Count;
    }

    /// <summary>
    /// 记录 HTTP 请求（中间件专用）
    /// </summary>
    public async Task LogHttpRequestAsync(LogHttpRequestRequest request)
    {
        var user = await TryGetUserAsync(request.UserId);
        var companyId = user?.CurrentCompanyId ?? "system";
        var pathWithQuery = string.IsNullOrEmpty(request.QueryString)
            ? request.Path
            : $"{request.Path}{request.QueryString}";
        var fullUrl = $"{request.Scheme}://{request.Host}{pathWithQuery}";

        var log = new UserActivityLog
        {
            UserId = request.UserId ?? "anonymous",
            Username = request.Username ?? "匿名用户",
            Action = $"{request.HttpMethod.ToLower()}_{request.Path.Replace("/", "_")}",
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
            CompanyId = companyId
        };

        // 使用重载方法，传入 userId 和 username
        await _activityLogFactory.CreateAsync(log, log.UserId, log.Username);
    }

    private static bool IsValidObjectId(string? value)
    {
        if (string.IsNullOrEmpty(value)) return false;
        if (value.Length != 24) return false;
        return value.All(c => (c >= '0' && c <= '9') || (c >= 'a' && c <= 'f') || (c >= 'A' && c <= 'F'));
    }
}
