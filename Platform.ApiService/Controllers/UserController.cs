using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Platform.ApiService.Models;
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
    /// 获取所有用户
    /// </summary>
    [HttpGet]
    public async Task<IActionResult> GetAllUsers()
    {
        var users = await _userService.GetAllUsersAsync();
        return Success(users);
    }

    /// <summary>
    /// 根据ID获取用户
    /// </summary>
    /// <param name="id">用户ID</param>
    [HttpGet("{id}")]
    public async Task<IActionResult> GetUserById(string id)
    {
        var user = await _userService.GetUserByIdAsync(id);
        if (user == null)
            throw new KeyNotFoundException($"User with ID {id} not found");
        
        return Success(user);
    }

    /// <summary>
    /// 创建新用户（旧版本）
    /// </summary>
    /// <param name="request">创建用户请求</param>
    [HttpPost("legacy")]
    public async Task<IActionResult> CreateUser([FromBody] CreateUserRequest request)
    {
        if (string.IsNullOrEmpty(request.Name) || string.IsNullOrEmpty(request.Email))
            throw new ArgumentException("Name and Email are required");
        
        var user = await _userService.CreateUserAsync(request);
        return Created($"/api/users/{user.Id}", user);
    }

    /// <summary>
    /// 创建新用户（用户管理）
    /// </summary>
    /// <param name="request">创建用户请求</param>
    [HttpPost("management")]
    [Authorize]
    public async Task<IActionResult> CreateUserManagement([FromBody] CreateUserManagementRequest request)
    {
        if (string.IsNullOrEmpty(request.Username))
            throw new ArgumentException("用户名不能为空");
        
        if (string.IsNullOrEmpty(request.Password))
            throw new ArgumentException("密码不能为空");

        var user = await _userService.CreateUserManagementAsync(request);
        return Success(user);
    }

    /// <summary>
    /// 更新用户信息
    /// </summary>
    /// <param name="id">用户ID</param>
    /// <param name="request">更新用户请求</param>
    [HttpPut("{id}")]
    public async Task<IActionResult> UpdateUser(string id, [FromBody] UpdateUserRequest request)
    {
        var user = await _userService.UpdateUserAsync(id, request);
        if (user == null)
            throw new KeyNotFoundException($"User with ID {id} not found");
        
        return Success(user);
    }

    /// <summary>
    /// 更新用户信息（用户管理）
    /// </summary>
    /// <param name="id">用户ID</param>
    /// <param name="request">更新用户请求</param>
    [HttpPut("{id}/update")]
    [Authorize]
    public async Task<IActionResult> UpdateUserManagement(string id, [FromBody] UpdateUserManagementRequest request)
    {
        var user = await _userService.UpdateUserManagementAsync(id, request);
        if (user == null)
            throw new KeyNotFoundException($"用户ID {id} 不存在");
        
        return Success(user);
    }

    /// <summary>
    /// 软删除用户
    /// </summary>
    /// <param name="id">用户ID</param>
    /// <param name="reason">删除原因（可选）</param>
    [HttpDelete("{id}")]
    [Authorize]
    public async Task<IActionResult> DeleteUser(string id, [FromQuery] string? reason = null)
    {
        var deleted = await _userService.DeleteUserAsync(id, reason);
        if (!deleted)
            throw new KeyNotFoundException($"用户ID {id} 不存在");
        
        return NoContent();
    }

    /// <summary>
    /// 根据姓名搜索用户
    /// </summary>
    /// <param name="name">用户姓名</param>
    [HttpGet("search/{name}")]
    public async Task<IActionResult> SearchUsersByName(string name)
    {
        var users = await _userService.SearchUsersByNameAsync(name);
        return Ok(users);
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
    /// 获取用户统计信息
    /// </summary>
    [HttpGet("statistics")]
    public async Task<IActionResult> GetUserStatistics()
    {
        var statistics = await _userService.GetUserStatisticsAsync();
        return Success(statistics);
    }

    /// <summary>
    /// 测试用户列表接口
    /// </summary>
    [HttpGet("test-list")]
    public async Task<IActionResult> TestUserList()
    {
        var users = await _userService.GetAllUsersAsync();
        return Success(new
        {
            count = users.Count,
            users = users.Select(u => new
            {
                id = u.Id,
                username = u.Username,
                email = u.Email,
                role = u.Role,
                isActive = u.IsActive
            })
        });
    }

    /// <summary>
    /// 批量操作用户（激活、停用、软删除）
    /// </summary>
    /// <param name="request">批量操作请求</param>
    [HttpPost("bulk-action")]
    [Authorize]
    public async Task<IActionResult> BulkUserAction([FromBody] BulkUserActionRequest request)
    {
        if (request.UserIds == null || !request.UserIds.Any())
            throw new ArgumentException("用户ID列表不能为空");

        var success = await _userService.BulkUpdateUsersAsync(request, request.Reason);
        if (!success)
            throw new InvalidOperationException("批量操作失败");

        return Success("批量操作成功");
    }

    /// <summary>
    /// 更新用户角色
    /// </summary>
    /// <param name="id">用户ID</param>
    /// <param name="role">新角色</param>
    [HttpPut("{id}/role")]
    [Authorize]
    public async Task<IActionResult> UpdateUserRole(string id, [FromBody] UpdateUserRoleRequest request)
    {
        if (string.IsNullOrEmpty(request.Role))
            throw new ArgumentException("角色不能为空");

        var success = await _userService.UpdateUserRoleAsync(id, request.Role);
        if (!success)
            throw new KeyNotFoundException($"用户ID {id} 不存在");

        return Success("角色更新成功");
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
    /// 获取所有用户活动日志（仅管理员）
    /// </summary>
    /// <param name="page">页码</param>
    /// <param name="pageSize">每页数量</param>
    /// <param name="userId">用户ID（可选）</param>
    /// <param name="action">操作类型（可选）</param>
    /// <param name="startDate">开始日期（可选）</param>
    /// <param name="endDate">结束日期（可选）</param>
    [HttpGet("/api/users/activity-logs")]
    [Authorize(Roles = "admin")]
    public async Task<IActionResult> GetAllActivityLogs(
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20,
        [FromQuery] string? userId = null,
        [FromQuery] string? action = null,
        [FromQuery] DateTime? startDate = null,
        [FromQuery] DateTime? endDate = null)
    {
        var (logs, total) = await _userService.GetAllActivityLogsAsync(
            page, 
            pageSize, 
            userId, 
            action, 
            startDate, 
            endDate);

        // 获取日志关联的用户信息
        var userIds = logs.Select(log => log.UserId).Distinct().ToList();
        var users = new Dictionary<string, AppUser>();
        
        foreach (var uid in userIds)
        {
            var user = await _userService.GetUserByIdAsync(uid);
            if (user != null)
            {
                users[uid] = user;
            }
        }

        // 组装返回数据，包含用户信息
        var logsWithUserInfo = logs.Select(log => new
        {
            log.Id,
            log.UserId,
            Username = users.ContainsKey(log.UserId) ? users[log.UserId].Username : "未知用户",
            log.Action,
            log.Description,
            log.IpAddress,
            log.UserAgent,
            log.CreatedAt
        }).ToList();

        return Success(new
        {
            data = logsWithUserInfo,
            total,
            page,
            pageSize,
            totalPages = (int)Math.Ceiling((double)total / pageSize)
        });
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
}

public class UpdateUserRoleRequest
{
    public string Role { get; set; } = string.Empty;
}
