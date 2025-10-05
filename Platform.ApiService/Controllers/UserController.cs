using Microsoft.AspNetCore.Mvc;
using Platform.ApiService.Models;
using Platform.ApiService.Services;

namespace Platform.ApiService.Controllers;

[ApiController]
[Route("api/[controller]")]
public class UserController : ControllerBase
{
    private readonly UserService _userService;

    public UserController(UserService userService)
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
        return Ok(users);
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
            return NotFound($"User with ID {id} not found");
        
        return Ok(user);
    }

    /// <summary>
    /// 创建新用户
    /// </summary>
    /// <param name="request">创建用户请求</param>
    [HttpPost]
    public async Task<IActionResult> CreateUser([FromBody] CreateUserRequest request)
    {
        if (string.IsNullOrEmpty(request.Name) || string.IsNullOrEmpty(request.Email))
            return BadRequest("Name and Email are required");
        
        var user = await _userService.CreateUserAsync(request);
        return Created($"/api/users/{user.Id}", user);
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
            return NotFound($"User with ID {id} not found");
        
        return Ok(user);
    }

    /// <summary>
    /// 删除用户
    /// </summary>
    /// <param name="id">用户ID</param>
    [HttpDelete("{id}")]
    public async Task<IActionResult> DeleteUser(string id)
    {
        var deleted = await _userService.DeleteUserAsync(id);
        if (!deleted)
            return NotFound($"User with ID {id} not found");
        
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
        try
        {
            var result = await _userService.GetUsersWithPaginationAsync(request);
            return Ok(new { success = true, data = result });
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { success = false, error = ex.Message, stackTrace = ex.StackTrace });
        }
    }

    /// <summary>
    /// 获取用户统计信息
    /// </summary>
    [HttpGet("statistics")]
    public async Task<IActionResult> GetUserStatistics()
    {
        try
        {
            var statistics = await _userService.GetUserStatisticsAsync();
            return Ok(new { success = true, data = statistics });
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { success = false, error = ex.Message, stackTrace = ex.StackTrace });
        }
    }

    /// <summary>
    /// 测试用户列表接口
    /// </summary>
    [HttpGet("test-list")]
    public async Task<IActionResult> TestUserList()
    {
        try
        {
            var users = await _userService.GetAllUsersAsync();
            return Ok(new { 
                success = true, 
                count = users.Count, 
                users = users.Select(u => new { 
                    id = u.Id, 
                    username = u.Username, 
                    email = u.Email, 
                    role = u.Role,
                    isActive = u.IsActive 
                }) 
            });
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { 
                success = false, 
                error = ex.Message, 
                stackTrace = ex.StackTrace 
            });
        }
    }

    /// <summary>
    /// 批量操作用户
    /// </summary>
    /// <param name="request">批量操作请求</param>
    [HttpPost("bulk-action")]
    public async Task<IActionResult> BulkUserAction([FromBody] BulkUserActionRequest request)
    {
        if (request.UserIds == null || !request.UserIds.Any())
            return BadRequest("用户ID列表不能为空");

        var success = await _userService.BulkUpdateUsersAsync(request);
        if (!success)
            return BadRequest("批量操作失败");

        return Ok(new { message = "批量操作成功" });
    }

    /// <summary>
    /// 更新用户角色
    /// </summary>
    /// <param name="id">用户ID</param>
    /// <param name="role">新角色</param>
    [HttpPut("{id}/role")]
    public async Task<IActionResult> UpdateUserRole(string id, [FromBody] UpdateUserRoleRequest request)
    {
        if (string.IsNullOrEmpty(request.Role))
            return BadRequest("角色不能为空");

        var success = await _userService.UpdateUserRoleAsync(id, request.Role);
        if (!success)
            return NotFound($"用户ID {id} 不存在");

        return Ok(new { message = "角色更新成功" });
    }

    /// <summary>
    /// 获取用户活动日志
    /// </summary>
    /// <param name="id">用户ID</param>
    /// <param name="limit">限制数量</param>
    [HttpGet("{id}/activity-logs")]
    public async Task<IActionResult> GetUserActivityLogs(string id, [FromQuery] int limit = 50)
    {
        var logs = await _userService.GetUserActivityLogsAsync(id, limit);
        return Ok(logs);
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
        return Ok(new { exists });
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
        return Ok(new { exists });
    }

    /// <summary>
    /// 启用用户
    /// </summary>
    /// <param name="id">用户ID</param>
    [HttpPut("{id}/activate")]
    public async Task<IActionResult> ActivateUser(string id)
    {
        var success = await _userService.ActivateUserAsync(id);
        if (!success)
            return NotFound($"用户ID {id} 不存在");

        return Ok(new { message = "用户已启用" });
    }

    /// <summary>
    /// 禁用用户
    /// </summary>
    /// <param name="id">用户ID</param>
    [HttpPut("{id}/deactivate")]
    public async Task<IActionResult> DeactivateUser(string id)
    {
        var success = await _userService.DeactivateUserAsync(id);
        if (!success)
            return NotFound($"用户ID {id} 不存在");

        return Ok(new { message = "用户已禁用" });
    }
}

public class UpdateUserRoleRequest
{
    public string Role { get; set; } = string.Empty;
}
