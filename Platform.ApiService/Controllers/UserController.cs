using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Platform.ApiService.Attributes;
using Platform.ApiService.Constants;
using Platform.ApiService.Extensions;
using Platform.ApiService.Models;
using Platform.ApiService.Models.Response;
using Platform.ApiService.Services;
using Platform.ServiceDefaults.Controllers;
using Platform.ServiceDefaults.Models;

namespace Platform.ApiService.Controllers;

/// <summary>
/// 用户管理控制器 - 处理用户相关的 CRUD 操作
/// </summary>
[ApiController]
[Route("api/user")]
public class UserController : BaseApiController
{
    private readonly IUserService _userService;
    private readonly IAuthService _authService;

    /// <summary>
    /// 初始化用户控制器
    /// </summary>
    /// <param name="userService">用户服务</param>
    /// <param name="authService">认证服务</param>
    public UserController(IUserService userService, IAuthService authService)
    {
        _userService = userService;
        _authService = authService;
    }

    /// <summary>
    /// 根据ID获取用户信息
    /// </summary>
    /// <param name="id">用户ID</param>
    /// <remarks>
    /// 获取指定用户的详细信息。用户只能查看自己的信息，管理员可以查看所有用户信息。
    /// 
    /// 权限要求：
    /// - 普通用户：只能查看自己的信息
    /// - 管理员：需要 user-management 菜单权限
    /// 
    /// 示例请求：
    /// ```
    /// GET /api/user/{id}
    /// Authorization: Bearer {token}
    /// ```
    /// 
    /// 示例响应：
    /// ```json
    /// {
    ///   "success": true,
    ///   "data": {
    ///     "id": "user123",
    ///     "username": "admin",
    ///     "email": "admin@example.com",
    ///     "isActive": true,
    ///     "createdAt": "2024-01-01T00:00:00Z"
    ///   }
    /// }
    /// ```
    /// </remarks>
    /// <returns>用户信息</returns>
    /// <response code="200">成功返回用户信息</response>
    /// <response code="401">未授权，需要登录</response>
    /// <response code="403">权限不足，无法查看该用户信息</response>
    /// <response code="404">用户不存在</response>
    [HttpGet("{id}")]
    [Authorize]
    public async Task<IActionResult> GetUserById(string id)
    {
        // ✅ 完整的权限检查：只能查看自己，或者有用户管理权限
        var currentUserId = CurrentUserId;
        if (currentUserId != id)
        {
            // 检查是否有用户管理菜单权限
            var menuAccessService = HttpContext.RequestServices
                .GetRequiredService<IMenuAccessService>();
            
            var hasMenuAccess = await menuAccessService
                .HasMenuAccessAsync(currentUserId!, "user-management");
            
            if (!hasMenuAccess)
            {
                throw new UnauthorizedAccessException("无权查看其他用户信息");
            }
        }
        
        var user = await _userService.GetUserByIdAsync(id);
        return Success(user.EnsureFound("用户", id));
    }

    /// <summary>
    /// 创建新用户（管理员功能）
    /// 自动将用户加入当前企业并分配角色
    /// </summary>
    /// <param name="request">创建用户请求</param>
    /// <remarks>
    /// 管理员创建新用户账户，可以指定用户名、密码、邮箱和角色。
    /// 
    /// 权限要求：需要 user-management 菜单权限
    /// 
    /// 角色分配说明：
    /// - 如果请求中提供了 RoleIds，会自动创建 UserCompany 关联并分配角色
    /// - 角色必须属于当前企业，否则会返回错误
    /// - 新创建的用户默认不是管理员（IsAdmin = false）
    /// - 用户会自动加入当前企业，状态为 active
    /// 
    /// 示例请求：
    /// ```json
    /// POST /api/user/management
    /// Authorization: Bearer {token}
    /// Content-Type: application/json
    /// 
    /// {
    ///   "username": "newuser",
    ///   "password": "password123",
    ///   "email": "newuser@example.com",
    ///   "roleIds": ["role123", "role456"],
    ///   "isActive": true
    /// }
    /// ```
    /// 
    /// 示例响应：
    /// ```json
    /// {
    ///   "success": true,
    ///   "data": {
    ///     "id": "user123",
    ///     "username": "newuser",
    ///     "email": "newuser@example.com",
    ///     "isActive": true,
    ///     "createdAt": "2024-01-01T00:00:00Z"
    ///   },
    ///   "message": "创建成功"
    /// }
    /// ```
    /// </remarks>
    /// <returns>创建的用户信息</returns>
    /// <response code="200">用户创建成功</response>
    /// <response code="400">参数验证失败或用户名/邮箱已存在</response>
    /// <response code="401">未授权，需要登录</response>
    /// <response code="403">权限不足，需要用户管理权限</response>
    [HttpPost("management")]
    [RequireMenu("user-management")]
    public async Task<IActionResult> CreateUserManagement([FromBody] CreateUserManagementRequest request)
    {
        // 使用扩展方法简化参数验证
        request.Username.EnsureNotEmpty("用户名");
        request.Password.EnsureNotEmpty("密码");

        var user = await _userService.CreateUserManagementAsync(request);
        return Success(user, ErrorMessages.CreateSuccess);
    }

    /// <summary>
    /// 更新用户信息（管理员功能）
    /// </summary>
    /// <param name="id">用户ID</param>
    /// <param name="request">更新用户请求</param>
    /// <remarks>
    /// 管理员更新用户的基本信息和角色。可以同时更新用户名、邮箱、激活状态和角色。
    /// 
    /// 权限要求：需要 user-management 菜单权限
    /// 
    /// 角色更新说明：
    /// - 如果请求中提供了 RoleIds，会自动更新用户在当前企业的角色
    /// - 角色必须属于当前企业，否则会返回错误
    /// - 角色更新会同步更新 UserCompany 表中的角色关联
    /// 
    /// 示例请求：
    /// ```json
    /// PUT /api/user/{id}
    /// Authorization: Bearer {token}
    /// Content-Type: application/json
    /// 
    /// {
    ///   "username": "updateduser",
    ///   "email": "updated@example.com",
    ///   "isActive": true,
    ///   "roleIds": ["role1", "role2"]
    /// }
    /// ```
    /// 
    /// 示例响应：
    /// ```json
    /// {
    ///   "success": true,
    ///   "data": {
    ///     "id": "user123",
    ///     "username": "updateduser",
    ///     "email": "updated@example.com",
    ///     "isActive": true,
    ///     "updatedAt": "2024-01-01T12:00:00Z"
    ///   },
    ///   "message": "更新成功"
    /// }
    /// ```
    /// </remarks>
    /// <returns>更新后的用户信息</returns>
    /// <response code="200">用户更新成功</response>
    /// <response code="400">参数验证失败或用户名/邮箱已存在</response>
    /// <response code="401">未授权，需要登录</response>
    /// <response code="403">权限不足，需要用户管理权限</response>
    /// <response code="404">用户不存在</response>
    [HttpPut("{id}")]
    [RequireMenu("user-management")]
    public async Task<IActionResult> UpdateUserManagement(string id, [FromBody] UpdateUserManagementRequest request)
    {
        // v6.2: 支持在更新用户时同时更新角色
        // 如果请求中提供了 RoleIds，会自动更新用户在当前企业的角色
        
        var user = await _userService.UpdateUserManagementAsync(id, request);
        if (user == null)
            throw new KeyNotFoundException(string.Format(ErrorMessages.ResourceNotFound, "用户"));
        
        return Success(user, ErrorMessages.UpdateSuccess);
    }

    /// <summary>
    /// 软删除用户（管理员功能）
    /// </summary>
    /// <param name="id">用户ID</param>
    /// <param name="reason">删除原因（可选，最大长度200字符）</param>
    /// <remarks>
    /// 管理员软删除用户账户，用户数据将被标记为已删除但不会物理删除。
    /// 
    /// 权限要求：需要 user-management 菜单权限
    /// 
    /// 限制：不能删除自己的账户
    /// 
    /// 示例请求：
    /// ```
    /// DELETE /api/user/{id}?reason=违反公司规定
    /// Authorization: Bearer {token}
    /// ```
    /// 
    /// 示例响应：
    /// ```
    /// HTTP 204 No Content
    /// ```
    /// </remarks>
    /// <returns>删除结果</returns>
    /// <response code="204">用户删除成功</response>
    /// <response code="400">不能删除自己的账户</response>
    /// <response code="401">未授权，需要登录</response>
    /// <response code="403">权限不足，需要用户管理权限</response>
    /// <response code="404">用户不存在</response>
    [HttpDelete("{id}")]
    [RequireMenu("user-management")]
    public async Task<IActionResult> DeleteUser(string id, [FromQuery] string? reason = null)
    {
        // 检查是否删除自己（不允许）
        var currentUserId = CurrentUserId;
        if (currentUserId == id)
        {
            throw new InvalidOperationException(ErrorMessages.CannotDeleteSelf);
        }
        
        var deleted = await _userService.DeleteUserAsync(id, reason);
        if (!deleted)
            throw new KeyNotFoundException(string.Format(ErrorMessages.ResourceNotFound, "用户"));
        
        return NoContent();
    }

    /// <summary>
    /// 获取用户列表（分页、搜索、过滤）
    /// v6.0: 修复返回数据包含roleIds字段
    /// </summary>
    /// <param name="request">查询请求参数</param>
    [HttpPost("list")]
    public async Task<IActionResult> GetUsersList([FromBody] UserListRequest request)
    {
        var result = await _userService.GetUsersWithRolesAsync(request);
        return Success(result);
    }

    /// <summary>
    /// 获取当前企业的所有用户（避免 /api/user/all 命中 /api/user/{id} 导致 ObjectId 解析错误）
    /// </summary>
    [HttpGet("all")]
    [Authorize]
    public async Task<IActionResult> GetAllUsers()
    {
        var users = await _userService.GetAllUsersAsync();
        return Success(new { users, total = users.Count });
    }

    /// <summary>
    /// 获取用户统计信息（需要权限）
    /// </summary>
    [HttpGet("statistics")]
    [RequireMenu("user-management")]
    public async Task<IActionResult> GetUserStatistics()
    {
        var statistics = await _userService.GetUserStatisticsAsync();
        return Success(statistics);
    }


    /// <summary>
    /// 批量操作用户（激活、停用、软删除）
    /// </summary>
    /// <param name="request">批量操作请求</param>
    [HttpPost("bulk-action")]
    [RequireMenu("user-management")]
    public async Task<IActionResult> BulkUserAction([FromBody] BulkUserActionRequest request)
    {
        // ✅ 添加批量操作数量限制
        const int MaxBatchSize = 100;
        
        request.UserIds.EnsureNotEmpty("用户ID列表");
        
        if (request.UserIds.Count > MaxBatchSize)
        {
            throw new ArgumentException(
                $"批量操作最多支持 {MaxBatchSize} 个用户，当前请求: {request.UserIds.Count} 个");
        }

        var success = await _userService.BulkUpdateUsersAsync(request, request.Reason);
        if (!success)
            throw new InvalidOperationException(ErrorMessages.OperationFailed);

        return Success(ErrorMessages.OperationSuccess);
    }


    /// <summary>
    /// 获取用户活动日志
    /// </summary>
    /// <param name="id">用户ID</param>
    /// <param name="limit">限制数量</param>
    [HttpGet("{id}/activity-logs")]
    [Authorize]
    public async Task<IActionResult> GetUserActivityLogs(string id, [FromQuery] int limit = 50)
    {
        var logs = await _userService.GetUserActivityLogsAsync(id, limit);
        return Success(logs);
    }

    /// <summary>
    /// 获取所有用户活动日志（需要权限）
    /// </summary>
    /// <param name="page">页码</param>
    /// <param name="pageSize">每页数量</param>
    /// <param name="userId">用户ID（可选）</param>
    /// <param name="action">操作类型（可选）</param>
    /// <param name="startDate">开始日期（可选）</param>
    /// <param name="endDate">结束日期（可选）</param>
    [HttpGet("/api/users/activity-logs")]
    [RequireMenu("user-log")]
    public async Task<IActionResult> GetAllActivityLogs(
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20,
        [FromQuery] string? userId = null,
        [FromQuery] string? action = null,
        [FromQuery] DateTime? startDate = null,
        [FromQuery] DateTime? endDate = null)
    {
        // ✅ 添加输入验证
        if (page < 1 || page > 10000)
            throw new ArgumentException("页码必须在 1-10000 之间");
        
        if (pageSize < 1 || pageSize > 100)
            throw new ArgumentException("每页数量必须在 1-100 之间");
        
        // 验证userId格式
        if (!string.IsNullOrEmpty(userId) && 
            !MongoDB.Bson.ObjectId.TryParse(userId, out _))
            throw new ArgumentException("用户ID格式不正确");
        
        // 验证action参数
        if (!string.IsNullOrEmpty(action))
        {
            var allowedActions = new[] { 
                "login", "logout", "create", "update", "delete", 
                "view", "export", "import", "change_password", "refresh_token"
            };
            if (!allowedActions.Contains(action.ToLower()))
                throw new ArgumentException($"不支持的操作类型: {action}");
        }
        
        // 验证日期范围
        if (startDate.HasValue && endDate.HasValue && startDate.Value > endDate.Value)
            throw new ArgumentException("开始日期不能晚于结束日期");
        
        // 优化后的查询：使用批量查询替代 N+1 查询
        var (logs, total, userMap) = await _userService.GetAllActivityLogsWithUsersAsync(
            page, 
            pageSize, 
            userId, 
            action, 
            startDate, 
            endDate);

        // 组装返回数据，包含用户信息和完整的日志字段
        var logsWithUserInfo = logs.Select(log => new ActivityLogWithUserResponse
        {
            Id = log.Id ?? string.Empty,
            UserId = log.UserId,
            Username = userMap.ContainsKey(log.UserId) ? userMap[log.UserId] : "未知用户",
            Action = log.Action,
            Description = log.Description,
            IpAddress = log.IpAddress,
            UserAgent = log.UserAgent,
            HttpMethod = log.HttpMethod,
            Path = log.Path,
            QueryString = log.QueryString,
            StatusCode = log.StatusCode,
            Duration = log.Duration,
            CreatedAt = log.CreatedAt
        }).ToList();

        var response = new PaginatedResponse<ActivityLogWithUserResponse>
        {
            Data = logsWithUserInfo,
            Total = total,
            Page = page,
            PageSize = pageSize
        };

        return Success(response);
    }

    /// <summary>
    /// 检查邮箱是否存在
    /// </summary>
    /// <param name="email">邮箱地址</param>
    /// <param name="excludeUserId">排除的用户ID</param>
    [HttpGet("check-email")]
    public async Task<IActionResult> CheckEmailExists([FromQuery] string email, [FromQuery] string? excludeUserId = null)
    {
        var exists = await _userService.CheckEmailExistsAsync(email, excludeUserId);
        return Success(new { exists });
    }

    /// <summary>
    /// 检查用户名是否存在
    /// </summary>
    /// <param name="username">用户名</param>
    /// <param name="excludeUserId">排除的用户ID</param>
    [HttpGet("check-username")]
    public async Task<IActionResult> CheckUsernameExists([FromQuery] string username, [FromQuery] string? excludeUserId = null)
    {
        var exists = await _userService.CheckUsernameExistsAsync(username, excludeUserId);
        return Success(new { exists });
    }

    /// <summary>
    /// 启用用户
    /// </summary>
    /// <param name="id">用户ID</param>
    [HttpPut("{id}/activate")]
    [Authorize]
    public async Task<IActionResult> ActivateUser(string id)
    {
        var success = await _userService.ActivateUserAsync(id);
        success.EnsureSuccess("用户", id);
        return Success("用户已启用");
    }

    /// <summary>
    /// 禁用用户
    /// </summary>
    /// <param name="id">用户ID</param>
    [HttpPut("{id}/deactivate")]
    [Authorize]
    public async Task<IActionResult> DeactivateUser(string id)
    {
        var success = await _userService.DeactivateUserAsync(id);
        success.EnsureSuccess("用户", id);
        return Success("用户已禁用");
    }

    /// <summary>
    /// 获取当前用户信息（个人中心）
    /// </summary>
    /// <remarks>
    /// RESTful 路径: /api/user/me 表示当前用户
    /// </remarks>
    [HttpGet("me")]
    [Authorize]
    public async Task<IActionResult> GetCurrentUserProfile()
    {
        var userId = GetRequiredUserId();
        // v3.1: 获取用户信息时不使用多租户过滤，因为用户可以属于多个企业
        var user = await _userService.GetUserByIdWithoutTenantFilterAsync(userId);
        if (user == null)
            throw new KeyNotFoundException("用户不存在");

        return Success(user);
    }

    /// <summary>
    /// 更新当前用户信息（个人中心）
    /// </summary>
    /// <remarks>
    /// RESTful 路径: PUT /api/user/me 更新当前用户
    /// </remarks>
    /// <param name="request">更新用户信息请求</param>
    [HttpPut("me")]
    [Authorize]
    public async Task<IActionResult> UpdateCurrentUserProfile([FromBody] UpdateProfileRequest request)
    {
        // 验证模型状态（邮箱、姓名、年龄等）
        var validationResult = ValidateModelState();
        if (validationResult != null)
            return validationResult;

        // 手动验证手机号（只在有值且不为空时验证）
        if (!string.IsNullOrWhiteSpace(request.PhoneNumber))
        {
            var phoneNumber = request.PhoneNumber.Trim();
            // 简化的中国手机号验证：11位数字，以1开头，第二位为3-9
            if (phoneNumber.Length != 11 || !phoneNumber.StartsWith("1") || phoneNumber[1] < '3' || phoneNumber[1] > '9' || !phoneNumber.All(char.IsDigit))
            {
                return ValidationError("手机号格式不正确，请输入符合中国手机号标准的11位数字");
            }
        }

        var userId = GetRequiredUserId();

        // 禁止修改用户名 - 过滤掉Username字段
        var filteredRequest = new UpdateProfileRequest
        {
            Name = request.Name,
            Email = request.Email,
            Age = request.Age,
            Avatar = request.Avatar,
            PhoneNumber = request.PhoneNumber,
            // Username 字段被过滤掉，不允许修改
        };

        var user = await _userService.UpdateUserProfileAsync(userId, filteredRequest);
        if (user == null)
            throw new KeyNotFoundException("用户不存在");

        // 返回 CurrentUser 格式，确保前端能正确接收手机号等字段
        // 使用 AuthService 的 GetCurrentUserAsync 方法获取转换后的用户信息
        var currentUser = await _authService.GetCurrentUserAsync();
        if (currentUser == null)
            throw new KeyNotFoundException("获取用户信息失败");

        return Success(currentUser);
    }

    /// <summary>
    /// 修改当前用户密码
    /// </summary>
    /// <remarks>
    /// RESTful 路径: PUT /api/user/me/password 更新当前用户密码
    /// </remarks>
    /// <param name="request">修改密码请求</param>
    [HttpPut("me/password")]
    [Authorize]
    public async Task<IActionResult> ChangeCurrentUserPassword([FromBody] ChangePasswordRequest request)
    {
        var userId = GetRequiredUserId();
        var success = await _userService.ChangePasswordAsync(userId, request);
        if (!success)
            throw new InvalidOperationException("当前密码错误或修改失败");

        return Success("密码修改成功");
    }

    /// <summary>
    /// 获取当前用户活动日志
    /// </summary>
    /// <remarks>
    /// RESTful 路径: GET /api/user/me/activity-logs 获取当前用户的活动日志
    /// </remarks>
    /// <param name="limit">限制数量</param>
    [HttpGet("me/activity-logs")]
    [Authorize]
    public async Task<IActionResult> GetCurrentUserActivityLogs([FromQuery] int limit = 20)
    {
        var userId = GetRequiredUserId();
        var logs = await _userService.GetUserActivityLogsAsync(userId, limit);
        return Success(logs);
    }

    /// <summary>
    /// 获取当前用户的活动日志（分页）
    /// </summary>
    /// <param name="page">页码</param>
    /// <param name="pageSize">每页数量</param>
    /// <param name="action">操作类型（可选，支持模糊搜索，如：login、view_user等）</param>
    /// <param name="httpMethod">HTTP 请求方法（可选，如：GET、POST、PUT、DELETE、PATCH）</param>
    /// <param name="statusCode">HTTP 状态码（可选，如：200、404、500）</param>
    /// <param name="ipAddress">IP 地址（可选，支持模糊搜索）</param>
    /// <param name="startDate">开始日期（可选）</param>
    /// <param name="endDate">结束日期（可选）</param>
    /// <param name="sortBy">排序字段（可选，默认：createdAt，支持：createdAt、action）</param>
    /// <param name="sortOrder">排序方向（可选，默认：desc，支持：asc、desc）</param>
    /// <remarks>
    /// 获取当前登录用户的活动日志，支持分页、操作类型筛选（模糊搜索）、HTTP 方法筛选、状态码筛选、IP 地址筛选（模糊搜索）、日期范围筛选和排序。
    /// 
    /// 权限要求：用户必须已登录
    /// 
    /// 支持的排序字段：
    /// - createdAt：创建时间（默认）
    /// - action：操作类型
    /// 
    /// 示例请求：
    /// ```
    /// GET /api/user/my-activity-logs-paged?page=1&amp;pageSize=20&amp;action=login&amp;sortBy=createdAt&amp;sortOrder=desc
    /// Authorization: Bearer {token}
    /// ```
    /// 
    /// 示例响应：
    /// ```json
    /// {
    ///   "success": true,
    ///   "data": {
    ///     "data": [...],
    ///     "total": 100,
    ///     "page": 1,
    ///     "pageSize": 20
    ///   }
    /// }
    /// ```
    /// </remarks>
    /// <returns>当前用户的活动日志（分页）</returns>
    /// <response code="200">成功返回活动日志</response>
    /// <response code="401">未授权，需要登录</response>
    [HttpGet("me/activity-logs-paged")]
    [Authorize]
    public async Task<IActionResult> GetCurrentUserActivityLogsPaged(
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20,
        [FromQuery] string? action = null,
        [FromQuery] string? httpMethod = null,
        [FromQuery] int? statusCode = null,
        [FromQuery] string? ipAddress = null,
        [FromQuery] DateTime? startDate = null,
        [FromQuery] DateTime? endDate = null,
        [FromQuery] string? sortBy = null,
        [FromQuery] string? sortOrder = null)
    {
        // ✅ 添加输入验证
        if (page < 1 || page > 10000)
            throw new ArgumentException("页码必须在 1-10000 之间");
        
        if (pageSize < 1 || pageSize > 100)
            throw new ArgumentException("每页数量必须在 1-100 之间");
        
        // 验证日期范围
        if (startDate.HasValue && endDate.HasValue && startDate.Value > endDate.Value)
            throw new ArgumentException("开始日期不能晚于结束日期");
        
        // 验证排序参数
        if (!string.IsNullOrEmpty(sortBy))
        {
            var allowedSortFields = new[] { "createdAt", "action" };
            if (!allowedSortFields.Contains(sortBy, StringComparer.OrdinalIgnoreCase))
                throw new ArgumentException($"不支持的排序字段: {sortBy}，支持字段: {string.Join(", ", allowedSortFields)}");
        }
        
        if (!string.IsNullOrEmpty(sortOrder))
        {
            var allowedSortOrders = new[] { "asc", "desc" };
            if (!allowedSortOrders.Contains(sortOrder, StringComparer.OrdinalIgnoreCase))
                throw new ArgumentException($"不支持的排序方向: {sortOrder}，支持: asc、desc");
        }
        
        var (logs, total) = await _userService.GetCurrentUserActivityLogsAsync(
            page, 
            pageSize, 
            action,
            httpMethod,
            statusCode,
            ipAddress,
            startDate, 
            endDate,
            sortBy,
            sortOrder);
        
        return Success(new
        {
            data = logs,
            total = total,
            page = page,
            pageSize = pageSize
        });
    }

    /// <summary>
    /// 获取当前用户的活动日志详情
    /// </summary>
    /// <remarks>
    /// 根据日志ID获取当前用户的单条活动日志详情，返回完整的日志数据（包括 ResponseBody 等所有字段）。
    /// 
    /// 权限要求：用户必须已登录，且只能查看自己的日志
    /// 
    /// 示例请求：
    /// ```
    /// GET /api/user/my-activity-logs/{logId}
    /// Authorization: Bearer {token}
    /// ```
    /// 
    /// 示例响应：
    /// ```json
    /// {
    ///   "success": true,
    ///   "data": {
    ///     "id": "507f1f77bcf86cd799439011",
    ///     "userId": "507f191e810c19729de860ea",
    ///     "username": "admin",
    ///     "action": "get_user",
    ///     "description": "获取用户信息",
    ///     "ipAddress": "192.168.1.1",
    ///     "userAgent": "Mozilla/5.0...",
    ///     "httpMethod": "GET",
    ///     "path": "/api/user/123",
    ///     "queryString": "?page=1",
    ///     "fullUrl": "https://example.com/api/user/123?page=1",
    ///     "statusCode": 200,
    ///     "duration": 45,
    ///     "responseBody": "{...}",
    ///     "createdAt": "2024-01-01T00:00:00Z"
    ///   }
    /// }
    /// ```
    /// </remarks>
    /// <param name="logId">日志ID（MongoDB ObjectId）</param>
    /// <returns>活动日志详情</returns>
    /// <response code="200">成功返回日志详情</response>
    /// <response code="404">日志不存在或不属于当前用户</response>
    /// <response code="401">未授权，需要登录</response>
    [HttpGet("me/activity-logs/{logId}")]
    [Authorize]
    public async Task<IActionResult> GetCurrentUserActivityLogById(string logId)
    {
        // ✅ 验证日志ID格式
        if (string.IsNullOrEmpty(logId) || !MongoDB.Bson.ObjectId.TryParse(logId, out _))
            throw new ArgumentException("日志ID格式不正确");

        // ✅ 获取日志详情（返回完整数据，包括 ResponseBody 等所有字段）
        var log = await _userService.GetCurrentUserActivityLogByIdAsync(logId);
        
        if (log == null)
            throw new KeyNotFoundException("日志不存在或不属于当前用户");

        return Success(log);
    }

    /// <summary>
    /// 获取当前用户的所有权限
    /// </summary>
    /// <remarks>
    /// RESTful 路径: GET /api/user/me/permissions 获取当前用户的权限列表
    /// </remarks>
    [HttpGet("me/permissions")]
    [Authorize]
    public async Task<IActionResult> GetMyPermissions()
    {
        var userId = GetRequiredUserId();
        var permissions = await _userService.GetUserPermissionsAsync(userId);
        return Success(permissions);
    }

    /// <summary>
    /// 获取当前用户的 AI 角色定义
    /// </summary>
    /// <remarks>
    /// 获取当前登录用户为 AI 助手"小科"设置的角色定义。
    /// 
    /// 如果用户未设置过角色定义，将返回默认值："你是小科，请使用简体中文提供简洁、专业且友好的回复。"
    /// 
    /// 示例请求：
    /// ```
    /// GET /api/user/profile/ai-role-definition
    /// Authorization: Bearer {token}
    /// ```
    /// 
    /// 示例响应：
    /// ```json
    /// {
    ///   "success": true,
    ///   "data": "你是小科，请使用简体中文提供简洁、专业且友好的回复。"
    /// }
    /// ```
    /// </remarks>
    /// <returns>AI 角色定义</returns>
    /// <response code="200">成功返回角色定义</response>
    /// <response code="401">未授权，需要登录</response>
    [HttpGet("me/ai-role-definition")]
    [Authorize]
    public async Task<IActionResult> GetAiRoleDefinition()
    {
        var userId = GetRequiredUserId();
        var roleDefinition = await _userService.GetAiRoleDefinitionAsync(userId);
        
        // 确保返回的角色定义不为空（应该总是有值，要么是用户自定义的，要么是默认值）
        // 双重保障：即使服务层返回了空值，这里也会设置默认值
        if (string.IsNullOrWhiteSpace(roleDefinition))
        {
            roleDefinition = "你是小科，请使用简体中文提供简洁、专业且友好的回复。";
        }
        
        // 确保返回的字符串不为 null（JSON 序列化配置会忽略 null 值）
        var response = ApiResponse<string>.SuccessResult(roleDefinition, HttpContext.TraceIdentifier);
        return Ok(response);
    }

    /// <summary>
    /// 更新当前用户的 AI 角色定义
    /// </summary>
    /// <param name="request">更新角色定义请求</param>
    /// <remarks>
    /// 更新当前登录用户为 AI 助手"小科"设置的角色定义。
    /// 
    /// 角色定义长度限制：最多 2000 个字符。
    /// 
    /// 示例请求：
    /// ```json
    /// PUT /api/user/me/ai-role-definition
    /// Authorization: Bearer {token}
    /// Content-Type: application/json
    /// 
    /// {
    ///   "roleDefinition": "你是小科，一个专业的AI助手。请使用简体中文，提供简洁、专业且友好的回复。"
    /// }
    /// ```
    /// 
    /// 示例响应：
    /// ```json
    /// {
    ///   "success": true,
    ///   "message": "角色定义更新成功"
    /// }
    /// ```
    /// </remarks>
    /// <returns>操作结果</returns>
    /// <response code="200">角色定义更新成功</response>
    /// <response code="400">参数验证失败（角色定义为空或超过长度限制）</response>
    /// <response code="401">未授权，需要登录</response>
    [HttpPut("me/ai-role-definition")]
    [Authorize]
    public async Task<IActionResult> UpdateAiRoleDefinition([FromBody] UpdateAiRoleDefinitionRequest request)
    {
        var validationResult = ValidateModelState();
        if (validationResult != null)
            return validationResult;

        var userId = GetRequiredUserId();
        var success = await _userService.UpdateAiRoleDefinitionAsync(userId, request.RoleDefinition);
        
        if (!success)
            throw new InvalidOperationException("更新角色定义失败");

        return Success("角色定义更新成功");
    }

}
