using Platform.ApiService.Extensions;
using Platform.ServiceDefaults.Services;
using Platform.ServiceDefaults.Models;
using Platform.ApiService.Models;

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
    /// 尝试获取用户的企业ID（从数据库获取，不使用 JWT token）
    /// 如果没有用户上下文或用户未登录，返回 null
    /// ⚠️ 重要：后台线程无法访问 HttpContext，因此直接查询数据库
    /// </summary>
    private async Task<string?> TryGetUserCompanyIdAsync(string? userId)
    {
        if (string.IsNullOrEmpty(userId))
        {
            return null;
        }

        try
        {
            var user = await _userFactory.GetByIdAsync(userId);
            return user?.CurrentCompanyId;
        }
        catch
        {
            return null;
        }
    }

    /// <summary>
    /// 记录用户活动
    /// </summary>
    public async Task LogActivityAsync(string userId, string username, string action, string description)
    {
        // 获取当前企业上下文（如果有的话，从数据库获取，不使用 JWT token）
        var companyId = await TryGetUserCompanyIdAsync(userId);

        var log = new UserActivityLog
        {
            UserId = userId,
            Username = username,
            Action = action,
            Description = description,
            IpAddress = null,  // 此方法未提供 IP 信息
            UserAgent = null,  // 此方法未提供 UserAgent
            CompanyId = companyId ?? string.Empty
            // ✅ DatabaseOperationFactory.CreateAsync 会自动设置 IsDeleted = false, CreatedAt, UpdatedAt
        };

        await _activityLogFactory.CreateAsync(log);
    }

    /// <summary>
    /// 获取用户活动日志（分页）
    /// ✅ 使用数据工厂的自动企业过滤（UserActivityLog 实现了 IMultiTenant）
    /// </summary>
    public async Task<UserActivityLogPagedResponse> GetActivityLogsAsync(GetUserActivityLogsRequest request)
    {
        var filterBuilder = _activityLogFactory.CreateFilterBuilder();

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

        // ✅ 数据工厂会自动添加企业过滤（因为 UserActivityLog 实现了 IMultiTenant）
        // 计算总数
        var total = await _activityLogFactory.CountAsync(filter);

        // 分页查询
        var sortBuilder = _activityLogFactory.CreateSortBuilder()
            .Descending(log => log.CreatedAt);
        
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

    /// <summary>
    /// 获取用户的活动日志
    /// ✅ 使用数据工厂的自动企业过滤（UserActivityLog 实现了 IMultiTenant）
    /// </summary>
    public async Task<List<UserActivityLog>> GetUserActivityLogsAsync(string userId, int limit = 50)
    {
        var filter = _activityLogFactory.CreateFilterBuilder()
            .Equal(log => log.UserId, userId)
            .Build();
        
        var sort = _activityLogFactory.CreateSortBuilder()
            .Descending(log => log.CreatedAt)
            .Build();

        // ✅ 数据工厂会自动添加企业过滤（因为 UserActivityLog 实现了 IMultiTenant）
        return await _activityLogFactory.FindAsync(filter, sort: sort, limit: limit);
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
        // 获取当前企业上下文（如果有的话，从数据库获取，不使用 JWT token）
        var companyId = await TryGetUserCompanyIdAsync(request.UserId) 
                        ?? "system"; // 登录/匿名场景无企业上下文时使用系统租户占位，避免写入失败

        // 构建完整URL（包含协议、主机、端口、路径和查询字符串）
        var pathWithQuery = string.IsNullOrEmpty(request.QueryString) 
            ? request.Path 
            : $"{request.Path}{request.QueryString}"; // queryString 已经包含了 "?"
        
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
            CompanyId = companyId ?? string.Empty
            // ✅ DatabaseOperationFactory.CreateAsync 会自动设置 IsDeleted = false, CreatedAt, UpdatedAt
        };

        // ⚠️ 使用重载方法，传入 userId 和 username，避免在后台线程中访问已释放的 HttpContext
        await _activityLogFactory.CreateAsync(log, request.UserId, request.Username);
    }
}


