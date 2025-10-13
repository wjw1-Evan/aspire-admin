using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Platform.ApiService.Attributes;
using Platform.ApiService.Constants;
using Platform.ApiService.Extensions;
using Platform.ApiService.Models;
using Platform.ApiService.Models.Response;
using Platform.ApiService.Services;

namespace Platform.ApiService.Controllers;

[ApiController]
[Route("api/user")]
public class UserController : BaseApiController
{
    private readonly IUserService _userService;

    public UserController(IUserService userService)
    {
        _userService = userService;
    }

    /// <summary>
    /// 根据ID获取用户（需要权限）
    /// </summary>
    /// <param name="id">用户ID</param>
    [HttpGet("{id}")]
    [Authorize]
    public async Task<IActionResult> GetUserById(string id)
    {
        // 检查权限：只能查看自己的信息，或者需要 user:read 权限
        var currentUserId = CurrentUserId;
        if (currentUserId != id && !await HasPermissionAsync(PermissionResources.User, PermissionActions.Read))
        {
            throw new UnauthorizedAccessException(ErrorMessages.Unauthorized);
        }
        
        var user = await _userService.GetUserByIdAsync(id);
        return Success(user.EnsureFound("用户", id));
    }

    /// <summary>
    /// 创建新用户（用户管理）
    /// </summary>
    /// <param name="request">创建用户请求</param>
    [HttpPost("management")]
    [RequirePermission(PermissionResources.User, PermissionActions.Create)]
    public async Task<IActionResult> CreateUserManagement([FromBody] CreateUserManagementRequest request)
    {
        if (string.IsNullOrEmpty(request.Username))
            throw new ArgumentException(string.Format(ErrorMessages.ParameterRequired, "用户名"));
        
        if (string.IsNullOrEmpty(request.Password))
            throw new ArgumentException(string.Format(ErrorMessages.ParameterRequired, "密码"));

        var user = await _userService.CreateUserManagementAsync(request);
        return Success(user, ErrorMessages.CreateSuccess);
    }

    /// <summary>
    /// 更新用户信息（用户管理）
    /// </summary>
    /// <param name="id">用户ID</param>
    /// <param name="request">更新用户请求</param>
    [HttpPut("{id}")]
    [RequirePermission(PermissionResources.User, PermissionActions.Update)]
    public async Task<IActionResult> UpdateUserManagement(string id, [FromBody] UpdateUserManagementRequest request)
    {
        // 检查是否修改自己的角色（不允许）
        var currentUserId = CurrentUserId;
        if (currentUserId == id && request.RoleIds != null)
        {
            throw new InvalidOperationException(ErrorMessages.CannotModifyOwnRole);
        }
        
        var user = await _userService.UpdateUserManagementAsync(id, request);
        if (user == null)
            throw new KeyNotFoundException(string.Format(ErrorMessages.ResourceNotFound, "用户"));
        
        return Success(user, ErrorMessages.UpdateSuccess);
    }

    /// <summary>
    /// 软删除用户
    /// </summary>
    /// <param name="id">用户ID</param>
    /// <param name="reason">删除原因（可选，最大长度200字符）</param>
    [HttpDelete("{id}")]
    [RequirePermission(PermissionResources.User, PermissionActions.Delete)]
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
    /// </summary>
    /// <param name="request">查询请求参数</param>
    [HttpPost("list")]
    public async Task<IActionResult> GetUsersList([FromBody] UserListRequest request)
    {
        var result = await _userService.GetUsersWithPaginationAsync(request);
        return Success(result);
    }

    /// <summary>
    /// 获取用户统计信息（需要权限）
    /// </summary>
    [HttpGet("statistics")]
    [RequirePermission(PermissionResources.User, PermissionActions.Read)]
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
    [Authorize]
    public async Task<IActionResult> BulkUserAction([FromBody] BulkUserActionRequest request)
    {
        // 批量操作需要 user:update 或 user:delete 权限
        if (request.Action == BulkActionTypes.Delete)
        {
            await RequirePermissionAsync(PermissionResources.User, PermissionActions.Delete);
        }
        else
        {
            await RequirePermissionAsync(PermissionResources.User, PermissionActions.Update);
        }
        
        if (request.UserIds == null || !request.UserIds.Any())
            throw new ArgumentException(string.Format(ErrorMessages.ParameterRequired, "用户ID列表"));

        var success = await _userService.BulkUpdateUsersAsync(request, request.Reason);
        if (!success)
            throw new InvalidOperationException("批量操作失败");

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
    [RequirePermission(PermissionResources.ActivityLog, PermissionActions.Read)]
    public async Task<IActionResult> GetAllActivityLogs(
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20,
        [FromQuery] string? userId = null,
        [FromQuery] string? action = null,
        [FromQuery] DateTime? startDate = null,
        [FromQuery] DateTime? endDate = null)
    {
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
        if (!success)
            throw new KeyNotFoundException($"用户ID {id} 不存在");

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
        if (!success)
            throw new KeyNotFoundException($"用户ID {id} 不存在");

        return Success("用户已禁用");
    }

    /// <summary>
    /// 获取当前用户信息（个人中心）
    /// </summary>
    [HttpGet("profile")]
    [Authorize]
    public async Task<IActionResult> GetCurrentUserProfile()
    {
        var userId = GetRequiredUserId();
        var user = await _userService.GetUserByIdAsync(userId);
        if (user == null)
            throw new KeyNotFoundException("用户不存在");

        return Success(user);
    }

    /// <summary>
    /// 更新当前用户信息（个人中心）
    /// </summary>
    /// <param name="request">更新用户信息请求</param>
    [HttpPut("profile")]
    [Authorize]
    public async Task<IActionResult> UpdateCurrentUserProfile([FromBody] UpdateProfileRequest request)
    {
        var userId = GetRequiredUserId();

        // 禁止修改用户名 - 过滤掉Username字段
        var filteredRequest = new UpdateProfileRequest
        {
            Name = request.Name,
            Email = request.Email,
            Age = request.Age,
            // Username 字段被过滤掉，不允许修改
        };

        var user = await _userService.UpdateUserProfileAsync(userId, filteredRequest);
        if (user == null)
            throw new KeyNotFoundException("用户不存在");

        return Success(user);
    }

    /// <summary>
    /// 修改当前用户密码
    /// </summary>
    /// <param name="request">修改密码请求</param>
    [HttpPut("profile/password")]
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
    /// <param name="limit">限制数量</param>
    [HttpGet("profile/activity-logs")]
    [Authorize]
    public async Task<IActionResult> GetCurrentUserActivityLogs([FromQuery] int limit = 20)
    {
        var userId = GetRequiredUserId();
        var logs = await _userService.GetUserActivityLogsAsync(userId, limit);
        return Success(logs);
    }

    /// <summary>
    /// 获取用户的所有权限
    /// </summary>
    /// <param name="id">用户ID</param>
    [HttpGet("{id}/permissions")]
    [Authorize]
    public async Task<IActionResult> GetUserPermissions(string id)
    {
        var permissions = await _userService.GetUserAllPermissionsAsync(id);
        return Success(permissions);
    }

    /// <summary>
    /// 为用户分配自定义权限
    /// </summary>
    /// <param name="id">用户ID</param>
    /// <param name="request">分配权限请求</param>
    [HttpPost("{id}/custom-permissions")]
    [Authorize]
    public async Task<IActionResult> AssignCustomPermissions(string id, [FromBody] AssignPermissionsRequest request)
    {
        var success = await _userService.AssignCustomPermissionsAsync(id, request.PermissionIds);
        if (!success)
            throw new KeyNotFoundException($"用户ID {id} 不存在");
        
        return Success("权限分配成功");
    }

    /// <summary>
    /// 获取当前用户的所有权限
    /// </summary>
    [HttpGet("my-permissions")]
    [Authorize]
    public async Task<IActionResult> GetMyPermissions()
    {
        var userId = GetRequiredUserId();
        var permissions = await _userService.GetUserAllPermissionsAsync(userId);
        return Success(permissions);
    }
}
