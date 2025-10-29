using Platform.ServiceDefaults.Services;
using Platform.ServiceDefaults.Models;
using Platform.ApiService.Models;

namespace Platform.ApiService.Services;

public class UserActivityLogService : IUserActivityLogService
{
    private readonly IDatabaseOperationFactory<UserActivityLog> _activityLogFactory;
    private readonly IDatabaseOperationFactory<AppUser> _userFactory;
    private readonly IHttpContextAccessor _httpContextAccessor;
    private readonly ILogger<UserActivityLogService> _logger;

    public UserActivityLogService(
        IDatabaseOperationFactory<UserActivityLog> activityLogFactory,
        IDatabaseOperationFactory<AppUser> userFactory,
        IHttpContextAccessor httpContextAccessor,
        ILogger<UserActivityLogService> logger)
    {
        _activityLogFactory = activityLogFactory;
        _userFactory = userFactory;
        _httpContextAccessor = httpContextAccessor;
        _logger = logger;
    }
    
    /// <summary>
    /// 尝试获取当前用户的企业ID（从数据库获取，不使用 JWT token）
    /// 如果没有用户上下文或用户未登录，返回 null
    /// </summary>
    private async Task<string?> TryGetCurrentCompanyIdAsync()
    {
        try
        {
            // ⚠️ 已移除 JWT token 中的 CurrentCompanyId，从当前用户获取
            var currentUserId = _userFactory.GetCurrentUserId();
            if (string.IsNullOrEmpty(currentUserId))
            {
                return null;
            }
            
            var currentUser = await _userFactory.GetByIdAsync(currentUserId);
            return currentUser?.CurrentCompanyId;
        }
        catch
        {
            // 如果无法获取（如用户未登录），返回 null
            return null;
        }
    }

    /// <summary>
    /// 记录用户活动
    /// </summary>
    public async Task LogActivityAsync(string userId, string username, string action, string description)
    {
        var httpContext = _httpContextAccessor.HttpContext;

        // 获取当前企业上下文（如果有的话，从数据库获取，不使用 JWT token）
        var companyId = await TryGetCurrentCompanyIdAsync();

        var log = new UserActivityLog
        {
            UserId = userId,
            Username = username,
            Action = action,
            Description = description,
            IpAddress = httpContext?.Connection.RemoteIpAddress?.ToString(),
            UserAgent = httpContext?.Request.Headers["User-Agent"].ToString(),
            CompanyId = companyId ?? string.Empty,
            IsDeleted = false,
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

        // 获取当前企业ID进行多租户过滤（从数据库获取，不使用 JWT token）
        var companyId = await TryGetCurrentCompanyIdAsync();
        if (!string.IsNullOrEmpty(companyId))
        {
            filterBuilder.Equal(log => log.CompanyId, companyId);
        }
        else
        {
            // 如果无法获取企业上下文，返回空结果
            return new UserActivityLogPagedResponse
            {
                Data = new List<UserActivityLog>(),
                Total = 0,
                Page = request.Page,
                PageSize = request.PageSize,
                TotalPages = 0
            };
        }

        // 按用户ID筛选
        if (!string.IsNullOrEmpty(request.UserId))
        {
            filterBuilder.Equal(log => log.UserId, request.UserId);
        }

        // 按操作类型筛选
        if (!string.IsNullOrEmpty(request.Action))
        {
            filterBuilder.Equal(log => log.Action, request.Action);
        }

        // 按日期范围筛选
        if (request.StartDate.HasValue)
        {
            filterBuilder.GreaterThanOrEqual(log => log.CreatedAt, request.StartDate.Value);
        }

        if (request.EndDate.HasValue)
        {
            filterBuilder.LessThanOrEqual(log => log.CreatedAt, request.EndDate.Value);
        }

        var filter = filterBuilder.Build();

        // 计算总数
        var total = await _activityLogFactory.CountAsync(filter);

        // 分页查询
        var sortBuilder = _activityLogFactory.CreateSortBuilder()
            .Descending(log => log.CreatedAt);
        
        var skip = (request.Page - 1) * request.PageSize;
        var (logs, _) = await _activityLogFactory.FindPagedAsync(filter, sortBuilder.Build(), skip, request.PageSize);

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
        var filterBuilder = _activityLogFactory.CreateFilterBuilder()
            .Equal(log => log.UserId, userId);

        // 获取当前企业ID进行多租户过滤（从数据库获取，不使用 JWT token）
        var companyId = await TryGetCurrentCompanyIdAsync();
        if (!string.IsNullOrEmpty(companyId))
        {
            filterBuilder.Equal(log => log.CompanyId, companyId);
        }

        var filter = filterBuilder.Build();
        var sortBuilder = _activityLogFactory.CreateSortBuilder()
            .Descending(log => log.CreatedAt);

        return await _activityLogFactory.FindAsync(filter, 
            limit: limit, 
            sort: sortBuilder.Build());
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
        var description = GenerateDescription(httpMethod, path, statusCode, username, ipAddress, queryString);

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
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        await _activityLogFactory.CreateAsync(log);
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
    /// 根据路径和状态码生成描述（重新设计：关注上下文而非重复操作类型）
    /// </summary>
    private static string GenerateDescription(
        string httpMethod, 
        string path, 
        int statusCode, 
        string? username = null, 
        string? ipAddress = null,
        string? queryString = null)
    {
        var success = statusCode >= 200 && statusCode < 300;
        var statusIcon = success ? "✓" : "✗";
        var lowerPath = path.ToLower();
        var ipInfo = !string.IsNullOrEmpty(ipAddress) ? $"IP: {ipAddress}" : "";

        // 登录登出（关注IP和结果）
        if (lowerPath.Contains("/login/account")) 
            return success ? $"{statusIcon} {ipInfo}" : $"{statusIcon} 登录失败 - {ipInfo}";
        if (lowerPath.Contains("/login/outlogin")) 
            return $"{statusIcon} 用户主动登出";
        if (lowerPath.Contains("/refresh-token")) 
            return $"{statusIcon} Token自动刷新";
        if (lowerPath.Contains("/register")) 
            return success ? $"{statusIcon} 新用户注册 - {ipInfo}" : $"{statusIcon} 注册失败 - {ipInfo}";

        // 用户操作（关注目标和结果）
        if (lowerPath.Contains("/user"))
        {
            var targetUserId = ExtractIdFromPath(path, "user");
            var targetInfo = !string.IsNullOrEmpty(targetUserId) 
                ? $"目标用户: {targetUserId}" 
                : "";
            
            if (lowerPath.Contains("/profile"))
            {
                if (lowerPath.Contains("/password")) 
                    return success ? $"{statusIcon} 密码已更新" : $"{statusIcon} 密码更新失败 - 原密码错误";
                if (lowerPath.Contains("/activity-logs")) 
                    return $"{statusIcon} 查询个人活动记录 - {path}" + (!string.IsNullOrEmpty(queryString) ? $"?{queryString}" : "");
                
                if (httpMethod == "GET")
                    return $"{statusIcon} 访问个人中心";
                
                return success ? $"{statusIcon} 个人信息已更新" : $"{statusIcon} 更新失败";
            }
            if (lowerPath.Contains("/activate")) 
                return success ? $"{statusIcon} {targetInfo} - 已启用" : $"{statusIcon} {targetInfo} - 启用失败";
            if (lowerPath.Contains("/deactivate")) 
                return success ? $"{statusIcon} {targetInfo} - 已禁用" : $"{statusIcon} {targetInfo} - 禁用失败";
            if (lowerPath.Contains("/bulk-action"))
            {
                var count = ExtractCountFromQuery(queryString);
                var countInfo = count > 0 ? $"影响 {count} 个用户" : "批量操作";
                return success ? $"{statusIcon} {countInfo}" : $"{statusIcon} {countInfo} - 操作失败";
            }
            if (lowerPath.Contains("/role")) 
                return success ? $"{statusIcon} {targetInfo} - 角色已变更" : $"{statusIcon} {targetInfo} - 变更失败";
            if (lowerPath.Contains("/management")) 
                return success ? $"{statusIcon} 新用户账号已创建" : $"{statusIcon} 创建失败 - 可能用户名重复";
            if (lowerPath.Contains("/list")) 
                return $"{statusIcon} 查询用户列表数据";
            if (lowerPath.Contains("/statistics")) 
                return $"{statusIcon} 查询统计数据";
            
            return httpMethod switch
            {
                "GET" => $"{statusIcon} {targetInfo}",
                "POST" => success ? $"{statusIcon} 新用户创建成功" : $"{statusIcon} 创建失败",
                "PUT" => success ? $"{statusIcon} {targetInfo} - 信息已更新" : $"{statusIcon} {targetInfo} - 更新失败",
                "DELETE" => success ? $"{statusIcon} {targetInfo} - 已删除" : $"{statusIcon} {targetInfo} - 删除失败",
                _ => $"{statusIcon} {targetInfo}"
            };
        }

        // 角色操作（关注目标和结果）
        if (lowerPath.Contains("/role") && !lowerPath.Contains("/user"))
        {
            var roleId = ExtractIdFromPath(path, "role");
            var roleInfo = !string.IsNullOrEmpty(roleId) ? $"角色ID: {roleId}" : "";
            
            return httpMethod switch
            {
                "GET" => roleInfo != "" ? $"{statusIcon} {roleInfo}" : $"{statusIcon} 查询角色列表",
                "POST" => success ? $"{statusIcon} 新角色已添加" : $"{statusIcon} 创建失败",
                "PUT" => success ? $"{statusIcon} {roleInfo} - 已更新" : $"{statusIcon} {roleInfo} - 更新失败",
                "DELETE" => success ? $"{statusIcon} {roleInfo} - 已移除" : $"{statusIcon} {roleInfo} - 删除失败",
                _ => $"{statusIcon} {roleInfo}"
            };
        }

        // 菜单操作（关注目标和结果）
        if (lowerPath.Contains("/menu"))
        {
            var menuId = ExtractIdFromPath(path, "menu");
            var menuInfo = !string.IsNullOrEmpty(menuId) ? $"菜单ID: {menuId}" : "";
            
            if (lowerPath.Contains("/tree")) 
                return $"{statusIcon} 加载菜单树结构";
            
            return httpMethod switch
            {
                "GET" => menuInfo != "" ? $"{statusIcon} {menuInfo}" : $"{statusIcon} 查询菜单列表",
                "POST" => success ? $"{statusIcon} 新菜单项已添加" : $"{statusIcon} 创建失败",
                "PUT" => success ? $"{statusIcon} {menuInfo} - 已更新" : $"{statusIcon} {menuInfo} - 更新失败",
                "DELETE" => success ? $"{statusIcon} {menuInfo} - 已移除" : $"{statusIcon} {menuInfo} - 删除失败",
                _ => $"{statusIcon} {menuInfo}"
            };
        }

        // 通知操作（关注目标和结果）
        if (lowerPath.Contains("/notice"))
        {
            var noticeId = ExtractIdFromPath(path, "notice");
            var noticeInfo = !string.IsNullOrEmpty(noticeId) ? $"通知ID: {noticeId}" : "";
            
            return httpMethod switch
            {
                "GET" => noticeInfo != "" ? $"{statusIcon} {noticeInfo}" : $"{statusIcon} 查询通知列表",
                "POST" => success ? $"{statusIcon} 新通知已发布" : $"{statusIcon} 发布失败",
                "PUT" => success ? $"{statusIcon} {noticeInfo} - 已更新/已读" : $"{statusIcon} {noticeInfo} - 操作失败",
                "DELETE" => success ? $"{statusIcon} {noticeInfo} - 已清除" : $"{statusIcon} {noticeInfo} - 删除失败",
                _ => $"{statusIcon} {noticeInfo}"
            };
        }

        // 标签操作（关注目标和结果）
        if (lowerPath.Contains("/tag"))
        {
            var tagId = ExtractIdFromPath(path, "tag");
            var tagInfo = !string.IsNullOrEmpty(tagId) ? $"标签ID: {tagId}" : "";
            
            return httpMethod switch
            {
                "GET" => tagInfo != "" ? $"{statusIcon} {tagInfo}" : $"{statusIcon} 查询标签列表",
                "POST" => success ? $"{statusIcon} 新标签已创建" : $"{statusIcon} 创建失败",
                "PUT" => success ? $"{statusIcon} {tagInfo} - 已更新" : $"{statusIcon} {tagInfo} - 更新失败",
                "DELETE" => success ? $"{statusIcon} {tagInfo} - 已移除" : $"{statusIcon} {tagInfo} - 删除失败",
                _ => $"{statusIcon} {tagInfo}"
            };
        }

        // 规则操作（关注目标和结果）
        if (lowerPath.Contains("/rule"))
        {
            var ruleId = ExtractIdFromPath(path, "rule");
            var ruleInfo = !string.IsNullOrEmpty(ruleId) ? $"规则ID: {ruleId}" : "";
            
            return httpMethod switch
            {
                "GET" => ruleInfo != "" ? $"{statusIcon} {ruleInfo}" : $"{statusIcon} 查询规则列表",
                "POST" => success ? $"{statusIcon} 新规则已创建" : $"{statusIcon} 创建失败",
                "PUT" => success ? $"{statusIcon} {ruleInfo} - 已更新" : $"{statusIcon} {ruleInfo} - 更新失败",
                "DELETE" => success ? $"{statusIcon} {ruleInfo} - 已移除" : $"{statusIcon} {ruleInfo} - 删除失败",
                _ => $"{statusIcon} {ruleInfo}"
            };
        }

        // 权限操作（关注目标和结果）
        if (lowerPath.Contains("/permission"))
        {
            var permId = ExtractIdFromPath(path, "permission");
            var permInfo = !string.IsNullOrEmpty(permId) ? $"权限ID: {permId}" : "";
            
            return httpMethod switch
            {
                "GET" => permInfo != "" ? $"{statusIcon} {permInfo}" : $"{statusIcon} 查询权限列表",
                "POST" => success ? $"{statusIcon} 新权限已创建" : $"{statusIcon} 创建失败",
                "PUT" => success ? $"{statusIcon} {permInfo} - 已更新" : $"{statusIcon} {permInfo} - 更新失败",
                "DELETE" => success ? $"{statusIcon} {permInfo} - 已移除" : $"{statusIcon} {permInfo} - 删除失败",
                _ => $"{statusIcon} {permInfo}"
            };
        }

        // 当前用户
        if (lowerPath.Contains("/currentuser")) 
            return $"{statusIcon} 验证登录状态";

        // 默认描述（关注请求路径）
        return $"{statusIcon} {httpMethod} {path}";
    }

    /// <summary>
    /// 从路径中提取资源ID
    /// </summary>
    private static string? ExtractIdFromPath(string path, string resourceType)
    {
        try
        {
            var segments = path.Split('/', StringSplitOptions.RemoveEmptyEntries);
            for (int i = 0; i < segments.Length - 1; i++)
            {
                if (segments[i].ToLower().Contains(resourceType.ToLower()) && i + 1 < segments.Length)
                {
                    var potentialId = segments[i + 1];
                    // 检查是否不是子资源路径（如 /user/{id}/profile）
                    if (!potentialId.Contains("-") || potentialId.Length > 20)
                    {
                        return potentialId;
                    }
                }
            }
        }
        catch
        {
            // 提取失败则返回null
        }
        return null;
    }

    /// <summary>
    /// 从查询字符串中提取计数（如批量操作的数量）
    /// </summary>
    private static int ExtractCountFromQuery(string? queryString)
    {
        if (string.IsNullOrEmpty(queryString)) return 0;
        
        try
        {
            // 尝试从查询字符串中提取userIds数组的长度
            if (queryString.Contains("userIds") || queryString.Contains("ids"))
            {
                // 简单统计逗号数量 + 1 作为数组长度估算
                var commaCount = queryString.Count(c => c == ',');
                return commaCount > 0 ? commaCount + 1 : 0;
            }
        }
        catch
        {
            // 提取失败返回0
        }
        return 0;
    }
}


