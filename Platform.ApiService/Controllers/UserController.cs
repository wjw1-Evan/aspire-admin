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
}
