using Microsoft.AspNetCore.Mvc;
using Platform.ApiService.Models;
using Platform.ApiService.Services;

namespace Platform.ApiService.Controllers;

/// <summary>
/// API 控制器基类，提供常用的辅助方法和属性
/// </summary>
public abstract class BaseApiController : ControllerBase
{
    /// <summary>
    /// 当前用户 ID（从 JWT token）
    /// </summary>
    protected string? CurrentUserId => User.FindFirst("userId")?.Value;

    /// <summary>
    /// 当前用户名（从 JWT token）
    /// </summary>
    protected string? CurrentUsername => User.FindFirst("username")?.Value
                                        ?? User.FindFirst("name")?.Value
                                        ?? User.Identity?.Name;

    /// <summary>
    /// 当前用户角色（从 JWT token）
    /// 注意：JWT token 不再包含 role claim，此属性已废弃
    /// </summary>
    [Obsolete("JWT token 不再包含 role claim，请使用权限系统进行权限检查")]
    protected string? CurrentUserRole => null;

    /// <summary>
    /// 获取必需的用户 ID（如果为空则抛出异常）
    /// </summary>
    /// <exception cref="UnauthorizedAccessException">用户未认证</exception>
    protected string GetRequiredUserId()
    {
        if (string.IsNullOrEmpty(CurrentUserId))
            throw new UnauthorizedAccessException("未找到用户信息");
        return CurrentUserId;
    }

    /// <summary>
    /// 检查当前用户是否为管理员
    /// 注意：此方法已废弃，请使用 HasPermissionAsync 进行权限检查
    /// </summary>
    [Obsolete("请使用 HasPermissionAsync 进行权限检查，而不是依赖 IsAdmin")]
    protected bool IsAdmin => false;

    /// <summary>
    /// 检查当前用户是否已认证
    /// </summary>
    protected bool IsAuthenticated => User?.Identity?.IsAuthenticated ?? false;

    /// <summary>
    /// 成功响应（带数据）
    /// </summary>
    protected IActionResult Success<T>(T data, string message = "操作成功")
    {
        return Ok(new { success = true, data, message });
    }

    /// <summary>
    /// 成功响应（无数据）
    /// </summary>
    protected IActionResult Success(string message = "操作成功")
    {
        return Ok(new { success = true, message });
    }

    /// <summary>
    /// 成功响应（使用 ApiResponse）
    /// </summary>
    protected IActionResult SuccessResponse<T>(T data, string message = "操作成功")
    {
        return Ok(ApiResponse<T>.SuccessResult(data, message));
    }

    /// <summary>
    /// 错误响应
    /// </summary>
    protected IActionResult Error(string message, string? errorCode = null)
    {
        return Ok(new { success = false, error = message, errorCode, showType = 2 });
    }

    /// <summary>
    /// 未找到响应
    /// </summary>
    protected IActionResult NotFoundError(string message)
    {
        return NotFound(new { success = false, error = message, errorCode = "NOT_FOUND", showType = 2 });
    }

    /// <summary>
    /// 未授权响应
    /// </summary>
    protected IActionResult UnauthorizedError(string message = "未授权访问")
    {
        return Unauthorized(new { success = false, error = message, errorCode = "UNAUTHORIZED", showType = 2 });
    }

    /// <summary>
    /// 检查当前用户是否有指定权限
    /// </summary>
    protected async Task<bool> HasPermissionAsync(string resource, string action)
    {
        var permissionService = HttpContext.RequestServices.GetRequiredService<IPermissionCheckService>();
        var userId = GetRequiredUserId();
        return await permissionService.HasPermissionAsync(userId, $"{resource}:{action}");
    }

    /// <summary>
    /// 要求当前用户有指定权限，否则抛出异常
    /// </summary>
    protected async Task RequirePermissionAsync(string resource, string action)
    {
        if (!await HasPermissionAsync(resource, action))
        {
            throw new UnauthorizedAccessException($"无权执行操作: {resource}:{action}");
        }
    }

    /// <summary>
    /// 检查当前用户是否有任意一个权限
    /// </summary>
    protected async Task<bool> HasAnyPermissionAsync(params string[] permissionCodes)
    {
        var permissionService = HttpContext.RequestServices.GetRequiredService<IPermissionCheckService>();
        var userId = GetRequiredUserId();
        return await permissionService.HasAnyPermissionAsync(userId, permissionCodes);
    }

    /// <summary>
    /// 检查当前用户是否拥有所有指定权限
    /// </summary>
    protected async Task<bool> HasAllPermissionsAsync(params string[] permissionCodes)
    {
        var permissionService = HttpContext.RequestServices.GetRequiredService<IPermissionCheckService>();
        var userId = GetRequiredUserId();
        return await permissionService.HasAllPermissionsAsync(userId, permissionCodes);
    }
}

