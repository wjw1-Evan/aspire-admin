using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Platform.ApiService.Attributes;
using Platform.ServiceDefaults.Models;
using Platform.ApiService.Models;
using Platform.ApiService.Models.Response;
using Platform.ApiService.Services;
using Platform.ServiceDefaults.Controllers;
using Platform.ServiceDefaults.Models;

namespace Platform.ApiService.Controllers;

/// <summary>
/// 用户管理控制器 - 处理用户注册、信息修改、头像管理等操作
/// </summary>
[ApiController]
[Route("api/users")]
public class UserController : BaseApiController
{
    private readonly IUserService _userService;
    private readonly IAuthService _authService;
    private readonly IUserActivityLogService _activityLogService;

    public UserController(
        IUserService userService,
        IAuthService authService,
        IUserActivityLogService activityLogService)
    {
        _userService = userService;
        _authService = authService;
        _activityLogService = activityLogService;
    }

    #region User Management

    /// <summary>
    /// 获取用户详情
    /// </summary>
    [HttpGet("{id}")]
    public async Task<IActionResult> GetUserById(string id)
    {
        await _userService.EnsureUserAccessAsync(RequiredUserId!, id);
        return Success(await _userService.GetUserByIdAsync(id));
    }

    /// <summary>
    /// 创建用户
    /// </summary>
    [HttpPost]
    [RequireMenu(SystemConstants.Permissions.UserManagement)]
    public async Task<IActionResult> CreateUser([FromBody] CreateUserManagementRequest request)
        => Success(await _userService.CreateUserManagementAsync(request), SuccessMessages.CreateSuccess);

    /// <summary>
    /// 更新用户
    /// </summary>
    [HttpPut("{id}")]
    [RequireMenu(SystemConstants.Permissions.UserManagement)]
    public async Task<IActionResult> UpdateUser(string id, [FromBody] UpdateUserManagementRequest request)
        => Success(await _userService.UpdateUserManagementAsync(id, request), SuccessMessages.UpdateSuccess);

    /// <summary>
    /// 删除用户
    /// </summary>
    [HttpDelete("{id}")]
    [RequireMenu(SystemConstants.Permissions.UserManagement)]
    public async Task<IActionResult> DeleteUser(string id, [FromQuery] string? reason = null)
    {
        if (RequiredUserId == id)
            throw new ArgumentException("不能删除当前登录用户");
        var deleted = await _userService.DeleteUserAsync(id, reason);
        if (!deleted) throw new KeyNotFoundException("用户不存在");
        return NoContent();
    }

    /// <summary>
    /// 获取用户列表
    /// </summary>
    [HttpGet("list")]
    public async Task<IActionResult> GetUsersList([FromQuery] ProTableRequest request)
        => Success(await _userService.GetUsersWithRolesAsync(request));

    /// <summary>
    /// 获取所有用户
    /// </summary>
    [HttpGet("all")]
    public async Task<IActionResult> GetAllUsers()
    {
        var users = await _userService.GetAllUsersAsync();
        return Success(new { users, total = users.Count });
    }

    /// <summary>
    /// 获取用户统计信息
    /// </summary>
    [HttpGet("statistics")]
    [RequireMenu(SystemConstants.Permissions.UserManagement)]
    public async Task<IActionResult> GetUserStatistics()
        => Success(await _userService.GetUserStatisticsAsync());

    /// <summary>
    /// 批量操作用户
    /// </summary>
    [HttpPost("bulk")]
    [RequireMenu(SystemConstants.Permissions.UserManagement)]
    public async Task<IActionResult> BulkUserAction([FromBody] BulkUserActionRequest request)
    {
        var success = await _userService.BulkUpdateUsersAsync(request, request.Reason);
        if (!success) throw new InvalidOperationException(ErrorCode.OperationFailed);
        return Success(null, SuccessMessages.OperationSuccess);
    }

    /// <summary>
    /// 启用用户
    /// </summary>
    [HttpPut("{id}/activate")]
    [RequireMenu(SystemConstants.Permissions.UserManagement)]
    public async Task<IActionResult> ActivateUser(string id)
        => Success(null, "用户已启用");

    /// <summary>
    /// 禁用用户
    /// </summary>
    [HttpPut("{id}/deactivate")]
    [RequireMenu(SystemConstants.Permissions.UserManagement)]
    public async Task<IActionResult> DeactivateUser(string id)
        => Success(null, "用户已禁用");

    #endregion

    #region Validation

    /// <summary>
    /// 检查邮箱是否存在
    /// </summary>
    [HttpGet("check-email")]
    [AllowAnonymous]
    public async Task<IActionResult> CheckEmailExists([FromQuery] string email, [FromQuery] string? excludeUserId = null)
        => Success(new { exists = await _userService.CheckEmailExistsAsync(email, excludeUserId) });

    /// <summary>
    /// 检查用户名是否存在
    /// </summary>
    [HttpGet("check-username")]
    [AllowAnonymous]
    public async Task<IActionResult> CheckUsernameExists([FromQuery] string username, [FromQuery] string? excludeUserId = null)
        => Success(new { exists = await _userService.CheckUsernameExistsAsync(username, excludeUserId) });

    #endregion

    #region Activity Logs

    /// <summary>
    /// 获取用户活动日志
    /// </summary>
    [HttpGet("{id}/activity-logs")]
    public async Task<IActionResult> GetUserActivityLogs(string id, [FromQuery] int limit = 50)
    {
        if (!string.IsNullOrEmpty(CurrentUserId))
            await _userService.EnsureUserAccessAsync(CurrentUserId, id);
        return Success(await _activityLogService.GetUserActivityLogsAsync(id, limit));
    }

    /// <summary>
    /// 获取所有活动日志
    /// </summary>
    [HttpGet("activity-logs")]
    [RequireMenu("user-log")]
    public async Task<IActionResult> GetAllActivityLogs([FromQuery] ProTableRequest query)
        => Success(await _activityLogService.GetAllActivityLogsWithUsersAsync(query));

    /// <summary>
    /// 获取活动日志统计
    /// </summary>
    [HttpGet("activity-logs/statistics")]
    [RequireMenu("user-log")]
    public async Task<IActionResult> GetActivityLogStatistics()
        => Success(await _activityLogService.GetActivityLogStatisticsAsync());

    /// <summary>
    /// 获取活动日志详情
    /// </summary>
    [HttpGet("activity-logs/{logId}")]
    [RequireMenu("user-log")]
    public async Task<IActionResult> GetActivityLogById(string logId)
    {
        var log = await _activityLogService.GetActivityLogByIdAsync(logId);
        if (log == null) throw new KeyNotFoundException("活动日志不存在");
        return Success(log);
    }

    #endregion

    #region Profile

    /// <summary>
    /// 获取当前用户资料
    /// </summary>
    [HttpGet("me")]
    public async Task<IActionResult> GetCurrentUserProfile()
        => Success(await _authService.GetCurrentUserAsync(RequiredUserId));

    /// <summary>
    /// 更新当前用户资料
    /// </summary>
    [HttpPut("me")]
    public async Task<IActionResult> UpdateCurrentUserProfile([FromBody] UpdateProfileRequest request)
    {
        if (!string.IsNullOrWhiteSpace(request.PhoneNumber))
        {
            var phoneNumber = request.PhoneNumber.Trim();
            if (phoneNumber.Length != 11 || !phoneNumber.StartsWith("1") || !phoneNumber.All(char.IsDigit))
                throw new ArgumentException("手机号格式不正确");
        }
        await _userService.UpdateUserProfileAsync(RequiredUserId, request);
        return Success(await _authService.GetCurrentUserAsync(RequiredUserId));
    }

    /// <summary>
    /// 修改当前用户密码
    /// </summary>
    [HttpPut("me/password")]
    public async Task<IActionResult> ChangeCurrentUserPassword([FromBody] ChangePasswordRequest request)
    {
        var success = await _userService.ChangePasswordAsync(RequiredUserId, request);
        if (!success) throw new ArgumentException("当前密码错误或修改失败");
        return Success(null, "密码修改成功");
    }

    /// <summary>
    /// 获取当前用户活动日志
    /// </summary>
    [HttpGet("me/activity-logs")]
    public async Task<IActionResult> GetCurrentUserActivityLogs([FromQuery] int limit = 20)
        => Success(await _userService.GetUserActivityLogsAsync(RequiredUserId, limit));

    /// <summary>
    /// 获取当前用户活动日志（分页）
    /// </summary>
    [HttpGet("me/activity-logs-paged")]
    public async Task<IActionResult> GetCurrentUserActivityLogsPaged(
        [FromQuery] ProTableRequest request,
        [FromQuery] string? action = null,
        [FromQuery] string? httpMethod = null,
        [FromQuery] int? statusCode = null,
        [FromQuery] string? ipAddress = null,
        [FromQuery] DateTime? startDate = null,
        [FromQuery] DateTime? endDate = null)
    {
        if (startDate.HasValue && endDate.HasValue && startDate.Value > endDate.Value)
            throw new ArgumentException("开始日期不能晚于结束日期");
        return Success(await _activityLogService.GetCurrentUserActivityLogsAsync(RequiredUserId, request, action, httpMethod, statusCode, ipAddress, startDate, endDate));
    }

    /// <summary>
    /// 获取当前用户活动日志统计
    /// </summary>
    [HttpGet("me/activity-logs/statistics")]
    public async Task<IActionResult> GetCurrentUserActivityLogStatistics()
        => Success(await _activityLogService.GetCurrentUserActivityLogStatisticsAsync(RequiredUserId));

    /// <summary>
    /// 获取当前用户活动日志详情
    /// </summary>
    [HttpGet("me/activity-logs/{logId}")]
    public async Task<IActionResult> GetCurrentUserActivityLogById(string logId)
    {
        if (!MongoDB.Bson.ObjectId.TryParse(logId, out _))
            throw new ArgumentException("日志ID格式不正确");
        var log = await _activityLogService.GetCurrentUserActivityLogByIdAsync(RequiredUserId, logId);
        if (log == null) throw new KeyNotFoundException("日志不存在");
        return Success(log);
    }

    /// <summary>
    /// 获取我的权限
    /// </summary>
    [HttpGet("me/permissions")]
    public async Task<IActionResult> GetMyPermissions()
        => Success(await _userService.GetUserPermissionsAsync(RequiredUserId));

    #endregion

    #region AI & Layout

    /// <summary>
    /// 获取AI角色定义
    /// </summary>
    [HttpGet("me/ai-role-definition")]
    public async Task<IActionResult> GetAiRoleDefinition()
    {
        var roleDefinition = await _userService.GetAiRoleDefinitionAsync(RequiredUserId);
        if (string.IsNullOrWhiteSpace(roleDefinition))
            roleDefinition = "你是小科，请使用简体中文提供简洁、专业且友好的回复。";
        return Success(roleDefinition);
    }

    /// <summary>
    /// 更新AI角色定义
    /// </summary>
    [HttpPut("me/ai-role-definition")]
    public async Task<IActionResult> UpdateAiRoleDefinition([FromBody] UpdateAiRoleDefinitionRequest request)
    {
        var validationResult = ValidateModelState();
        if (validationResult != null) return validationResult;
        var success = await _userService.UpdateAiRoleDefinitionAsync(RequiredUserId, request.RoleDefinition);
        if (!success) throw new InvalidOperationException("更新角色定义失败");
        return Success(null, "角色定义更新成功");
    }

    /// <summary>
    /// 获取欢迎页面布局
    /// </summary>
    [HttpGet("welcome-layout")]
    public async Task<IActionResult> GetWelcomeLayout()
        => Success(await _userService.GetWelcomeLayoutAsync(RequiredUserId));

    /// <summary>
    /// 保存欢迎页面布局
    /// </summary>
    [HttpPost("welcome-layout")]
    public async Task<IActionResult> SaveWelcomeLayout([FromBody] SaveWelcomeLayoutRequest request)
    {
        var validationResult = ValidateModelState();
        if (validationResult != null) return validationResult;
        var success = await _userService.SaveWelcomeLayoutAsync(RequiredUserId, request);
        if (!success) throw new InvalidOperationException("保存布局配置失败");
        return Success(null, "布局配置保存成功");
    }

    #endregion
}
