using Platform.ServiceDefaults.Services;
using Platform.ServiceDefaults.Models;
using Platform.ApiService.Models;
using System.Linq.Expressions;

using Platform.ApiService.Models.Response;

namespace Platform.ApiService.Services;

/// <summary>
/// 用户活动日志服务实现
/// </summary>
public class UserActivityLogService : IUserActivityLogService
{
    private readonly IDataFactory<UserActivityLog> _activityLogFactory;
    private readonly IDataFactory<AppUser> _userFactory;
    private readonly ITenantContext _tenantContext;

    /// <summary>
    /// 初始化用户活动日志服务
    /// </summary>
    public UserActivityLogService(
        IDataFactory<UserActivityLog> activityLogFactory,
        IDataFactory<AppUser> userFactory,
        ITenantContext tenantContext)
    {
        _activityLogFactory = activityLogFactory;
        _userFactory = userFactory;
        _tenantContext = tenantContext;
    }


    /// <summary>
    /// 记录用户活动
    /// </summary>
    public async Task LogUserActivityAsync(string userId, string action, string description, string? ipAddress = null, string? userAgent = null)
    {
        // 使用 ITenantContext 获取实时企业 ID
        var companyId = await _tenantContext.GetCurrentCompanyIdAsync();

        // 获取用户信息用于显示名（仅在必要时查询）
        var user = await _userFactory.GetByIdAsync(userId);
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
        var userId = request.UserId;
        var action = request.Action;
        var startDate = request.StartDate;
        var endDate = request.EndDate;

        Expression<Func<UserActivityLog, bool>> filter = log =>
            (string.IsNullOrEmpty(userId) || log.UserId == userId) &&
            (string.IsNullOrEmpty(action) || log.Action == action) &&
            (!startDate.HasValue || log.CreatedAt >= startDate.Value) &&
            (!endDate.HasValue || log.CreatedAt <= endDate.Value);

        var total = await _activityLogFactory.CountAsync(filter);
        var (logs, _) = await _activityLogFactory.FindPagedAsync(
            filter,
            query => query.OrderByDescending(log => log.CreatedAt),
            request.Page,
            request.PageSize);
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
        Expression<Func<UserActivityLog, bool>> filter = log => log.UserId == userId;

        return await _activityLogFactory.FindAsync(
            filter,
            orderBy: query => query.OrderByDescending(log => log.CreatedAt),
            limit: limit);
    }

    /// <inheritdoc/>
    public async Task<UserActivityPagedWithStatsResponse> GetCurrentUserActivityLogsAsync(
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
        var currentUserId = _tenantContext.GetCurrentUserId() ?? throw new UnauthorizedAccessException("USER_NOT_AUTHENTICATED");
        var actionLower = action?.ToLowerInvariant();
        var ipLower = ipAddress?.ToLowerInvariant();
        var httpMethodUpper = httpMethod?.ToUpperInvariant();

        Expression<Func<UserActivityLog, bool>> filter = log =>
            log.UserId == currentUserId &&
            (string.IsNullOrEmpty(actionLower) || (log.Action != null && log.Action.ToLower().Contains(actionLower))) &&
            (string.IsNullOrEmpty(httpMethodUpper) || log.HttpMethod == httpMethodUpper) &&
            (!statusCode.HasValue || log.StatusCode == statusCode.Value) &&
            (string.IsNullOrEmpty(ipLower) || (log.IpAddress != null && log.IpAddress.ToLower().Contains(ipLower))) &&
            (!startDate.HasValue || log.CreatedAt >= startDate.Value) &&
            (!endDate.HasValue || log.CreatedAt <= endDate.Value);

        // 核心：在后台线程中并行执行统计查询，提高响应速度
        var totalTask = _activityLogFactory.CountAsync(filter);

        // 成功记录统计 (2xx)
        var successTask = _activityLogFactory.CountAsync(log =>
            log.UserId == currentUserId &&
            (string.IsNullOrEmpty(actionLower) || (log.Action != null && log.Action.ToLower().Contains(actionLower))) &&
            (string.IsNullOrEmpty(httpMethodUpper) || log.HttpMethod == httpMethodUpper) &&
            (!statusCode.HasValue || log.StatusCode == statusCode.Value) &&
            (string.IsNullOrEmpty(ipLower) || (log.IpAddress != null && log.IpAddress.ToLower().Contains(ipLower))) &&
            (!startDate.HasValue || log.CreatedAt >= startDate.Value) &&
            (!endDate.HasValue || log.CreatedAt <= endDate.Value) &&
            log.StatusCode >= 200 && log.StatusCode < 300);

        // 错误记录统计 (>= 400)
        var errorTask = _activityLogFactory.CountAsync(log =>
            log.UserId == currentUserId &&
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
        var actionTypesCount = 0; // 暂时禁用，优化性能

        /*
        // 旧的统计逻辑（已废弃）
        var actionTypesResults = actionTypesTask.Result;
        var actionTypesCount = actionTypesResults
            .Select(log => log.Action)
            .Where(actionName => !string.IsNullOrEmpty(actionName))
            .Distinct()
            .Count();
        */

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

        var (logs, _) = await _activityLogFactory.FindPagedAsync(filter, orderBy, page, pageSize);

        var logDtos = logs.Select(log => new ActivityLogListItemResponse
        {
            Id = log.Id ?? string.Empty,
            UserId = log.UserId,
            Username = log.Username,
            Action = log.Action,
            Description = log.Description,
            IpAddress = log.IpAddress,
            HttpMethod = log.HttpMethod,
            FullUrl = log.FullUrl,
            StatusCode = log.StatusCode,
            Duration = log.Duration,
            CreatedAt = log.CreatedAt
        }).ToList();

        return new UserActivityPagedWithStatsResponse
        {
            Data = logDtos,
            Total = total,
            Page = page,
            PageSize = pageSize,
            Statistics = new UserActivityStatistics
            {
                TotalCount = total,
                SuccessCount = successCount,
                ErrorCount = errorCount,
                ActionTypesCount = actionTypesCount // 暂时禁用，优化性能
            }
        };
    }

    /// <inheritdoc/>
    public async Task<UserActivityLog?> GetCurrentUserActivityLogByIdAsync(string logId)
    {
        var currentUserId = _tenantContext.GetCurrentUserId() ?? throw new UnauthorizedAccessException("USER_NOT_AUTHENTICATED");
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
        var actionLower = action?.ToLowerInvariant();
        var ipLower = ipAddress?.ToLowerInvariant();

        Expression<Func<UserActivityLog, bool>> filter = log =>
            (string.IsNullOrEmpty(userId) || log.UserId == userId) &&
            (string.IsNullOrEmpty(actionLower) || (log.Action != null && log.Action.ToLower().Contains(actionLower))) &&
            (string.IsNullOrEmpty(httpMethod) || log.HttpMethod == httpMethod) &&
            (!statusCode.HasValue || log.StatusCode == statusCode.Value) &&
            (string.IsNullOrEmpty(ipLower) || (log.IpAddress != null && log.IpAddress.ToLower().Contains(ipLower))) &&
            (!startDate.HasValue || log.CreatedAt >= startDate.Value) &&
            (!endDate.HasValue || log.CreatedAt <= endDate.Value);

        var total = await _activityLogFactory.CountAsync(filter);
        var (logs, _) = await _activityLogFactory.FindPagedAsync(
            filter,
            query => query.OrderByDescending(log => log.CreatedAt),
            page,
            pageSize);

        var validUserIds = logs
            .Select(log => log.UserId)
            .Distinct()
            .Where(uid => !string.IsNullOrEmpty(uid) && IsValidObjectId(uid))
            .ToList();

        var users = new List<AppUser>();
        if (validUserIds.Any())
        {
            users = await _userFactory.FindAsync(u => validUserIds.Contains(u.Id));
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
        Expression<Func<UserActivityLog, bool>> filter = log => log.CreatedAt < olderThan;

        var logs = await _activityLogFactory.FindAsync(filter);
        var logIds = logs.Select(log => log.Id!).ToList();

        if (logIds.Any())
        {
            await _activityLogFactory.SoftDeleteManyAsync(log => log.Id != null && logIds.Contains(log.Id));
        }

        return logIds.Count;
    }

    /// <summary>
    /// 记录 HTTP 请求（中间件专用）
    /// </summary>
    public async Task LogHttpRequestAsync(LogHttpRequestRequest request)
    {
        // 优先从请求对象中获取已捕获的企业 ID，如果为空（如匿名请求）再尝试从当前上下文获取
        var companyId = request.CompanyId ?? await _tenantContext.GetCurrentCompanyIdAsync() ?? "system";
        var pathWithQuery = string.IsNullOrEmpty(request.QueryString)
            ? request.Path
            : $"{request.Path}{request.QueryString}";
        var fullUrl = $"{request.Scheme}://{request.Host}{pathWithQuery}";

        var log = new UserActivityLog
        {
            UserId = request.UserId ?? "anonymous",
            Username = request.Username ?? "匿名用户",
            Action = DetermineActionCode(request.HttpMethod, request.Path),
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

        await _activityLogFactory.CreateAsync(log);
    }

    private static bool IsValidObjectId(string? value)
    {
        if (string.IsNullOrEmpty(value)) return false;
        if (value.Length != 24) return false;
        return value.All(c => (c >= '0' && c <= '9') || (c >= 'a' && c <= 'f') || (c >= 'A' && c <= 'F'));
    }

    /// <summary>
    /// 将后端路由映射为前端定义的标准动作码
    /// </summary>
    private static string DetermineActionCode(string httpMethod, string path)
    {
        var method = httpMethod.ToUpper();
        var p = path.ToLower();

        // 认证 Auth
        if (p.EndsWith("/api/auth/login")) return "login";
        if (p.EndsWith("/api/auth/logout")) return "logout";
        if (p.EndsWith("/api/auth/refresh")) return "refresh_token";
        if (p.EndsWith("/api/auth/register")) return "register";

        // 用户 User
        if (p.Contains("/api/users/me/activity-logs")) return "view_activity_logs";
        if (p.EndsWith("/api/users/me/password") && method == "PUT") return "change_password";
        if (p.EndsWith("/api/users/me") && method == "PUT") return "update_profile";
        if (p.EndsWith("/api/users/me") && method == "GET") return "view_profile";
        if (p.Contains("/activate") && method == "PUT") return "activate_user";
        if (p.Contains("/deactivate") && method == "PUT") return "deactivate_user";
        if (p.EndsWith("/api/users/bulk") && method == "POST") return "bulk_action";
        if (p.EndsWith("/api/users/management") && method == "POST") return "create_user";
        if ((p.EndsWith("/api/users/list") || p.EndsWith("/api/users/all")) && (method == "GET" || method == "POST")) return "view_users";
        if (p.EndsWith("/api/users/statistics") && method == "GET") return "view_statistics";
        if (p.StartsWith("/api/users/") && method == "GET") return "view_user";
        if (p.StartsWith("/api/users/") && method == "PUT") return "update_user";
        if (p.StartsWith("/api/users/") && method == "DELETE") return "delete_user";

        // 角色 Role
        if (p.Contains("/api/roles"))
        {
            if (method == "POST") return "create_role";
            if (method == "PUT") return "update_role";
            if (method == "DELETE") return "delete_role";
            if (method == "GET") return "view_roles";
        }

        // 菜单/权限 Menu
        if (p.Contains("/api/menus"))
        {
            if (method == "POST") return "create_menu";
            if (method == "PUT") return "update_menu";
            if (method == "DELETE") return "delete_menu";
            if (method == "GET") return "view_menus";
        }

        // 字典 Dictionary
        if (p.Contains("/api/dictionaries"))
        {
            if (method == "POST") return "create_dictionary";
            if (method == "PUT") return "update_dictionary";
            if (method == "DELETE") return "delete_dictionary";
            if (method == "GET") return "view_dictionaries";
        }

        // 日志 Log (通用)
        if (p.Contains("/api/activity-logs") && method == "GET") return "view_activity_logs";
        if (p.Contains("/api/logs") && method == "GET") return "view_system_logs";

        // 默认回退：按动作前缀动态映射（为了兼容前端 dynamic mapping，如 create_xxx, view_xxx）
        var resource = p.Split('/', StringSplitOptions.RemoveEmptyEntries).LastOrDefault() ?? "resource";
        return method switch
        {
            "POST" => $"create_{resource}",
            "PUT" => $"update_{resource}",
            "DELETE" => $"delete_{resource}",
            "GET" => $"view_{resource}",
            _ => $"{method.ToLower()}_{resource}"
        };
    }
}
