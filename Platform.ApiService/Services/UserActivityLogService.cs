using MongoDB.Driver;
using Platform.ApiService.Models;

namespace Platform.ApiService.Services;

public class UserActivityLogService : IUserActivityLogService
{
    private readonly IMongoCollection<UserActivityLog> _activityLogs;
    private readonly IHttpContextAccessor _httpContextAccessor;
    private readonly ILogger<UserActivityLogService> _logger;

    public UserActivityLogService(
        IMongoDatabase database, 
        IHttpContextAccessor httpContextAccessor,
        ILogger<UserActivityLogService> logger)
    {
        _activityLogs = database.GetCollection<UserActivityLog>("user_activity_logs");
        _httpContextAccessor = httpContextAccessor;
        _logger = logger;
    }

    /// <summary>
    /// 记录用户活动
    /// </summary>
    public async Task LogActivityAsync(string userId, string username, string action, string description)
    {
        var httpContext = _httpContextAccessor.HttpContext;
        
        var log = new UserActivityLog
        {
            UserId = userId,
            Username = username,
            Action = action,
            Description = description,
            IpAddress = httpContext?.Connection.RemoteIpAddress?.ToString(),
            UserAgent = httpContext?.Request.Headers["User-Agent"].ToString(),
            IsDeleted = false,
            CreatedAt = DateTime.UtcNow
        };

        await _activityLogs.InsertOneAsync(log);
    }

    /// <summary>
    /// 获取用户活动日志（分页）
    /// </summary>
    public async Task<UserActivityLogPagedResponse> GetActivityLogsAsync(GetUserActivityLogsRequest request)
    {
        var filterBuilder = Builders<UserActivityLog>.Filter;
        var filter = filterBuilder.Eq(log => log.IsDeleted, false);

        // 按用户ID筛选
        if (!string.IsNullOrEmpty(request.UserId))
        {
            filter &= filterBuilder.Eq(log => log.UserId, request.UserId);
        }

        // 按操作类型筛选
        if (!string.IsNullOrEmpty(request.Action))
        {
            filter &= filterBuilder.Eq(log => log.Action, request.Action);
        }

        // 按日期范围筛选
        if (request.StartDate.HasValue)
        {
            filter &= filterBuilder.Gte(log => log.CreatedAt, request.StartDate.Value);
        }

        if (request.EndDate.HasValue)
        {
            filter &= filterBuilder.Lte(log => log.CreatedAt, request.EndDate.Value);
        }

        // 计算总数
        var total = await _activityLogs.CountDocumentsAsync(filter);

        // 分页查询
        var logs = await _activityLogs.Find(filter)
            .Sort(Builders<UserActivityLog>.Sort.Descending(log => log.CreatedAt))
            .Skip((request.Page - 1) * request.PageSize)
            .Limit(request.PageSize)
            .ToListAsync();

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

    /// <summary>
    /// 获取用户的活动日志
    /// </summary>
    public async Task<List<UserActivityLog>> GetUserActivityLogsAsync(string userId, int limit = 50)
    {
        var filter = Builders<UserActivityLog>.Filter.And(
            Builders<UserActivityLog>.Filter.Eq(log => log.UserId, userId),
            Builders<UserActivityLog>.Filter.Eq(log => log.IsDeleted, false)
        );

        return await _activityLogs.Find(filter)
            .Sort(Builders<UserActivityLog>.Sort.Descending(log => log.CreatedAt))
            .Limit(limit)
            .ToListAsync();
    }

    /// <summary>
    /// 删除旧的活动日志（软删除）
    /// </summary>
    public async Task<long> DeleteOldLogsAsync(DateTime olderThan)
    {
        var filter = Builders<UserActivityLog>.Filter.And(
            Builders<UserActivityLog>.Filter.Lt(log => log.CreatedAt, olderThan),
            Builders<UserActivityLog>.Filter.Eq(log => log.IsDeleted, false)
        );

        var update = Builders<UserActivityLog>.Update
            .Set(log => log.IsDeleted, true)
            .Set(log => log.DeletedAt, DateTime.UtcNow);

        var result = await _activityLogs.UpdateManyAsync(filter, update);
        return result.ModifiedCount;
    }

    /// <summary>
    /// 记录 HTTP 请求（中间件专用）
    /// </summary>
    public async Task LogHttpRequestAsync(
        string? userId,
        string? username,
        string httpMethod,
        string path,
        string? queryString,
        int statusCode,
        long durationMs,
        string? ipAddress,
        string? userAgent)
    {
        var action = GenerateActionFromPath(httpMethod, path);
        var description = GenerateDescription(httpMethod, path, statusCode);

        var log = new UserActivityLog
        {
            UserId = userId ?? "anonymous",
            Username = username ?? "匿名用户",
            Action = action,
            Description = description,
            HttpMethod = httpMethod,
            Path = path,
            QueryString = queryString,
            StatusCode = statusCode,
            Duration = durationMs,
            IpAddress = ipAddress,
            UserAgent = userAgent,
            IsDeleted = false,
            CreatedAt = DateTime.UtcNow
        };

        await _activityLogs.InsertOneAsync(log);
    }

    /// <summary>
    /// 根据路径生成操作类型
    /// </summary>
    private static string GenerateActionFromPath(string httpMethod, string path)
    {
        var lowerPath = path.ToLower();

        // 登录登出相关
        if (lowerPath.Contains("/login/account")) return "login";
        if (lowerPath.Contains("/login/outlogin")) return "logout";
        if (lowerPath.Contains("/refresh-token")) return "refresh_token";
        if (lowerPath.Contains("/register")) return "register";

        // 用户相关
        if (lowerPath.Contains("/user"))
        {
            if (lowerPath.Contains("/profile"))
            {
                if (lowerPath.Contains("/password")) return "change_password";
                if (lowerPath.Contains("/activity-logs")) return "view_activity_logs";
                return httpMethod == "GET" ? "view_profile" : "update_profile";
            }
            if (lowerPath.Contains("/activate")) return "activate_user";
            if (lowerPath.Contains("/deactivate")) return "deactivate_user";
            if (lowerPath.Contains("/bulk-action")) return "bulk_action";
            if (lowerPath.Contains("/role")) return "update_user_role";
            if (lowerPath.Contains("/management")) return "create_user";
            if (lowerPath.Contains("/list")) return "view_users";
            if (lowerPath.Contains("/statistics")) return "view_statistics";
            
            return httpMethod switch
            {
                "GET" => "view_user",
                "POST" => "create_user",
                "PUT" => "update_user",
                "DELETE" => "delete_user",
                _ => "user_operation"
            };
        }

        // 角色相关
        if (lowerPath.Contains("/role"))
        {
            return httpMethod switch
            {
                "GET" => "view_roles",
                "POST" => "create_role",
                "PUT" => "update_role",
                "DELETE" => "delete_role",
                _ => "role_operation"
            };
        }

        // 菜单相关
        if (lowerPath.Contains("/menu"))
        {
            return httpMethod switch
            {
                "GET" => "view_menus",
                "POST" => "create_menu",
                "PUT" => "update_menu",
                "DELETE" => "delete_menu",
                _ => "menu_operation"
            };
        }

        // 通知相关
        if (lowerPath.Contains("/notice"))
        {
            return httpMethod switch
            {
                "GET" => "view_notices",
                "POST" => "create_notice",
                "PUT" => "update_notice",
                "DELETE" => "delete_notice",
                _ => "notice_operation"
            };
        }

        // 标签相关
        if (lowerPath.Contains("/tag"))
        {
            return httpMethod switch
            {
                "GET" => "view_tags",
                "POST" => "create_tag",
                "PUT" => "update_tag",
                "DELETE" => "delete_tag",
                _ => "tag_operation"
            };
        }

        // 规则相关
        if (lowerPath.Contains("/rule"))
        {
            return httpMethod switch
            {
                "GET" => "view_rules",
                "POST" => "create_rule",
                "PUT" => "update_rule",
                "DELETE" => "delete_rule",
                _ => "rule_operation"
            };
        }

        // 当前用户相关
        if (lowerPath.Contains("/currentuser")) return "view_current_user";

        // 默认操作类型
        return $"{httpMethod.ToLower()}_request";
    }

    /// <summary>
    /// 根据路径和状态码生成描述
    /// </summary>
    private static string GenerateDescription(string httpMethod, string path, int statusCode)
    {
        var success = statusCode >= 200 && statusCode < 300;
        var statusText = success ? "成功" : "失败";
        var lowerPath = path.ToLower();

        // 登录登出
        if (lowerPath.Contains("/login/account")) return $"用户登录{statusText}";
        if (lowerPath.Contains("/login/outlogin")) return $"用户登出{statusText}";
        if (lowerPath.Contains("/refresh-token")) return $"刷新Token{statusText}";
        if (lowerPath.Contains("/register")) return $"用户注册{statusText}";

        // 用户操作
        if (lowerPath.Contains("/user"))
        {
            if (lowerPath.Contains("/profile"))
            {
                if (lowerPath.Contains("/password")) return $"修改密码{statusText}";
                if (lowerPath.Contains("/activity-logs")) return $"查看活动日志{statusText}";
                return httpMethod == "GET" ? $"查看个人信息{statusText}" : $"更新个人信息{statusText}";
            }
            if (lowerPath.Contains("/activate")) return $"启用用户{statusText}";
            if (lowerPath.Contains("/deactivate")) return $"禁用用户{statusText}";
            if (lowerPath.Contains("/bulk-action")) return $"批量操作用户{statusText}";
            if (lowerPath.Contains("/role")) return $"更新用户角色{statusText}";
            if (lowerPath.Contains("/management")) return $"创建用户{statusText}";
            if (lowerPath.Contains("/list")) return $"查看用户列表{statusText}";
            if (lowerPath.Contains("/statistics")) return $"查看用户统计{statusText}";
            
            return httpMethod switch
            {
                "GET" => $"查看用户{statusText}",
                "POST" => $"创建用户{statusText}",
                "PUT" => $"更新用户{statusText}",
                "DELETE" => $"删除用户{statusText}",
                _ => $"用户操作{statusText}"
            };
        }

        // 角色操作
        if (lowerPath.Contains("/role"))
        {
            return httpMethod switch
            {
                "GET" => $"查看角色{statusText}",
                "POST" => $"创建角色{statusText}",
                "PUT" => $"更新角色{statusText}",
                "DELETE" => $"删除角色{statusText}",
                _ => $"角色操作{statusText}"
            };
        }

        // 菜单操作
        if (lowerPath.Contains("/menu"))
        {
            return httpMethod switch
            {
                "GET" => $"查看菜单{statusText}",
                "POST" => $"创建菜单{statusText}",
                "PUT" => $"更新菜单{statusText}",
                "DELETE" => $"删除菜单{statusText}",
                _ => $"菜单操作{statusText}"
            };
        }

        // 通知操作
        if (lowerPath.Contains("/notice"))
        {
            return httpMethod switch
            {
                "GET" => $"查看通知{statusText}",
                "POST" => $"创建通知{statusText}",
                "PUT" => $"更新通知{statusText}",
                "DELETE" => $"删除通知{statusText}",
                _ => $"通知操作{statusText}"
            };
        }

        // 标签操作
        if (lowerPath.Contains("/tag"))
        {
            return httpMethod switch
            {
                "GET" => $"查看标签{statusText}",
                "POST" => $"创建标签{statusText}",
                "PUT" => $"更新标签{statusText}",
                "DELETE" => $"删除标签{statusText}",
                _ => $"标签操作{statusText}"
            };
        }

        // 规则操作
        if (lowerPath.Contains("/rule"))
        {
            return httpMethod switch
            {
                "GET" => $"查看规则{statusText}",
                "POST" => $"创建规则{statusText}",
                "PUT" => $"更新规则{statusText}",
                "DELETE" => $"删除规则{statusText}",
                _ => $"规则操作{statusText}"
            };
        }

        // 当前用户
        if (lowerPath.Contains("/currentuser")) return $"查看当前用户信息{statusText}";

        // 默认描述
        return $"{httpMethod} {path} {statusText}";
    }
}


