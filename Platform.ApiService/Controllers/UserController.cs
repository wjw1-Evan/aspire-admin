using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Platform.ApiService.Attributes;
using Platform.ApiService.Constants;
using Platform.ApiService.Models;
using Platform.ApiService.Models.Response;
using Platform.ApiService.Services;
using Platform.ServiceDefaults.Controllers;
using Platform.ServiceDefaults.Models;

namespace Platform.ApiService.Controllers;

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

    [HttpGet("{id}")]
    public async Task<IActionResult> GetUserById(string id)
    {
        await _userService.EnsureUserAccessAsync(RequiredUserId!, id);
        return Success(await _userService.GetUserByIdAsync(id));
    }

    [HttpPost]
    [RequireMenu(SystemConstants.Permissions.UserManagement)]
    public async Task<IActionResult> CreateUser([FromBody] CreateUserManagementRequest request)
        => Success(await _userService.CreateUserManagementAsync(request), ErrorMessages.CreateSuccess);

    [HttpPut("{id}")]
    [RequireMenu(SystemConstants.Permissions.UserManagement)]
    public async Task<IActionResult> UpdateUser(string id, [FromBody] UpdateUserManagementRequest request)
        => Success(await _userService.UpdateUserManagementAsync(id, request), ErrorMessages.UpdateSuccess);

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

    [HttpGet("list")]
    public async Task<IActionResult> GetUsersList([FromQuery] PageParams request)
        => Success(await _userService.GetUsersWithRolesAsync(request));

    [HttpGet("all")]
    public async Task<IActionResult> GetAllUsers()
    {
        var users = await _userService.GetAllUsersAsync();
        return Success(new { users, total = users.Count });
    }

    [HttpGet("statistics")]
    [RequireMenu(SystemConstants.Permissions.UserManagement)]
    public async Task<IActionResult> GetUserStatistics()
        => Success(await _userService.GetUserStatisticsAsync());

    [HttpPost("bulk")]
    [RequireMenu(SystemConstants.Permissions.UserManagement)]
    public async Task<IActionResult> BulkUserAction([FromBody] BulkUserActionRequest request)
    {
        var success = await _userService.BulkUpdateUsersAsync(request, request.Reason);
        if (!success) throw new InvalidOperationException(ErrorMessages.OperationFailed);
        return Success(null, ErrorMessages.OperationSuccess);
    }

    [HttpPut("{id}/activate")]
    [RequireMenu(SystemConstants.Permissions.UserManagement)]
    public async Task<IActionResult> ActivateUser(string id)
        => Success(null, "用户已启用");

    [HttpPut("{id}/deactivate")]
    [RequireMenu(SystemConstants.Permissions.UserManagement)]
    public async Task<IActionResult> DeactivateUser(string id)
        => Success(null, "用户已禁用");

    #endregion

    #region Validation

    [HttpGet("check-email")]
    [AllowAnonymous]
    public async Task<IActionResult> CheckEmailExists([FromQuery] string email, [FromQuery] string? excludeUserId = null)
        => Success(new { exists = await _userService.CheckEmailExistsAsync(email, excludeUserId) });

    [HttpGet("check-username")]
    [AllowAnonymous]
    public async Task<IActionResult> CheckUsernameExists([FromQuery] string username, [FromQuery] string? excludeUserId = null)
        => Success(new { exists = await _userService.CheckUsernameExistsAsync(username, excludeUserId) });

    #endregion

    #region Activity Logs

    [HttpGet("{id}/activity-logs")]
    public async Task<IActionResult> GetUserActivityLogs(string id, [FromQuery] int limit = 50)
    {
        if (!string.IsNullOrEmpty(CurrentUserId))
            await _userService.EnsureUserAccessAsync(CurrentUserId, id);
        return Success(await _activityLogService.GetUserActivityLogsAsync(id, limit));
    }

    [HttpGet("activity-logs")]
    [RequireMenu("user-log")]
    public async Task<IActionResult> GetAllActivityLogs([FromQuery] PageParams query)
        => Success(await _activityLogService.GetAllActivityLogsWithUsersAsync(query));

    [HttpGet("activity-logs/statistics")]
    [RequireMenu("user-log")]
    public async Task<IActionResult> GetActivityLogStatistics()
        => Success(await _activityLogService.GetActivityLogStatisticsAsync());

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

    [HttpGet("me")]
    public async Task<IActionResult> GetCurrentUserProfile()
        => Success(await _authService.GetCurrentUserAsync());

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
        return Success(await _authService.GetCurrentUserAsync());
    }

    [HttpPut("me/password")]
    public async Task<IActionResult> ChangeCurrentUserPassword([FromBody] ChangePasswordRequest request)
    {
        var success = await _userService.ChangePasswordAsync(RequiredUserId, request);
        if (!success) throw new ArgumentException("当前密码错误或修改失败");
        return Success(null, "密码修改成功");
    }

    [HttpGet("me/activity-logs")]
    public async Task<IActionResult> GetCurrentUserActivityLogs([FromQuery] int limit = 20)
        => Success(await _userService.GetUserActivityLogsAsync(RequiredUserId, limit));

    [HttpGet("me/activity-logs-paged")]
    public async Task<IActionResult> GetCurrentUserActivityLogsPaged(
        [FromQuery] PageParams request,
        [FromQuery] string? action = null,
        [FromQuery] string? httpMethod = null,
        [FromQuery] int? statusCode = null,
        [FromQuery] string? ipAddress = null,
        [FromQuery] DateTime? startDate = null,
        [FromQuery] DateTime? endDate = null)
    {
        if (startDate.HasValue && endDate.HasValue && startDate.Value > endDate.Value)
            throw new ArgumentException("开始日期不能晚于结束日期");
        return Success(await _activityLogService.GetCurrentUserActivityLogsAsync(request, action, httpMethod, statusCode, ipAddress, startDate, endDate));
    }

    [HttpGet("me/activity-logs/statistics")]
    public async Task<IActionResult> GetCurrentUserActivityLogStatistics(
        [FromQuery] string? action = null,
        [FromQuery] string? httpMethod = null,
        [FromQuery] int? statusCode = null,
        [FromQuery] string? ipAddress = null,
        [FromQuery] DateTime? startDate = null,
        [FromQuery] DateTime? endDate = null)
        => Success(await _activityLogService.GetCurrentUserActivityLogStatisticsAsync(action, httpMethod, statusCode, ipAddress, startDate, endDate));

    [HttpGet("me/activity-logs/{logId}")]
    public async Task<IActionResult> GetCurrentUserActivityLogById(string logId)
    {
        if (!MongoDB.Bson.ObjectId.TryParse(logId, out _))
            throw new ArgumentException("日志ID格式不正确");
        var log = await _activityLogService.GetCurrentUserActivityLogByIdAsync(logId);
        if (log == null) throw new KeyNotFoundException("日志不存在");
        return Success(log);
    }

    [HttpGet("me/permissions")]
    public async Task<IActionResult> GetMyPermissions()
        => Success(await _userService.GetUserPermissionsAsync(RequiredUserId));

    #endregion

    #region AI & Layout

    [HttpGet("me/ai-role-definition")]
    public async Task<IActionResult> GetAiRoleDefinition()
    {
        var roleDefinition = await _userService.GetAiRoleDefinitionAsync(RequiredUserId);
        if (string.IsNullOrWhiteSpace(roleDefinition))
            roleDefinition = "你是小科，请使用简体中文提供简洁、专业且友好的回复。";
        return Success(roleDefinition);
    }

    [HttpPut("me/ai-role-definition")]
    public async Task<IActionResult> UpdateAiRoleDefinition([FromBody] UpdateAiRoleDefinitionRequest request)
    {
        var validationResult = ValidateModelState();
        if (validationResult != null) return validationResult;
        var success = await _userService.UpdateAiRoleDefinitionAsync(RequiredUserId, request.RoleDefinition);
        if (!success) throw new InvalidOperationException("更新角色定义失败");
        return Success(null, "角色定义更新成功");
    }

    [HttpGet("welcome-layout")]
    public async Task<IActionResult> GetWelcomeLayout()
        => Success(await _userService.GetWelcomeLayoutAsync(RequiredUserId));

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
