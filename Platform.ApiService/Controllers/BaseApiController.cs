using Microsoft.AspNetCore.Mvc;
using Platform.ApiService.Models;

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
    /// </summary>
    protected string? CurrentUserRole => User.FindFirst("role")?.Value;

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
    /// </summary>
    protected bool IsAdmin => CurrentUserRole == "admin";

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
}

