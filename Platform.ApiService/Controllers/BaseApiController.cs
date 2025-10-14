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
    /// 注意：v6.0 已改为菜单级权限系统，不再使用 role claim
    /// </summary>
    [Obsolete("v6.0 已改为菜单级权限系统，请使用 HasMenuAccessAsync 进行权限检查")]
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
    /// v3.1: 当前企业ID（从JWT Token获取）
    /// </summary>
    protected string? CurrentCompanyId => User?.FindFirst("currentCompanyId")?.Value 
                                        ?? User?.FindFirst("companyId")?.Value;

    /// <summary>
    /// v3.1: 获取必需的企业 ID（如果为空则抛出异常）
    /// </summary>
    protected string GetRequiredCompanyId()
    {
        if (string.IsNullOrEmpty(CurrentCompanyId))
            throw new UnauthorizedAccessException("未找到企业信息");
        return CurrentCompanyId;
    }

    /// <summary>
    /// v3.1: 验证当前用户是否是指定企业的成员
    /// 注意：此方法为占位实现，实际验证应在具体控制器中通过 UserCompanyService 进行
    /// </summary>
    /// <param name="companyId">企业ID</param>
    /// <returns>是否为成员</returns>
    [Obsolete("请在控制器中直接注入 IUserCompanyService 进行成员身份验证", false)]
    protected bool IsMemberOfCompany(string companyId)
    {
        if (string.IsNullOrEmpty(CurrentUserId) || string.IsNullOrEmpty(companyId))
            return false;

        // 占位实现，实际应该调用 UserCompanyService.GetUserCompanyAsync()
        return true;
    }

    /// <summary>
    /// 检查当前用户是否为管理员
    /// 注意：v6.0 已改为菜单级权限系统，不再使用 IsAdmin
    /// </summary>
    [Obsolete("v6.0 已改为菜单级权限系统，请使用 HasMenuAccessAsync 进行权限检查")]
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
    /// 检查当前用户是否有访问指定菜单的权限
    /// </summary>
    protected async Task<bool> HasMenuAccessAsync(string menuName)
    {
        var menuAccessService = HttpContext.RequestServices.GetRequiredService<IMenuAccessService>();
        var userId = GetRequiredUserId();
        return await menuAccessService.HasMenuAccessAsync(userId, menuName);
    }

    /// <summary>
    /// 要求当前用户有访问指定菜单的权限，否则抛出异常
    /// </summary>
    protected async Task RequireMenuAccessAsync(string menuName)
    {
        if (!await HasMenuAccessAsync(menuName))
        {
            throw new UnauthorizedAccessException($"无权访问菜单: {menuName}");
        }
    }

    /// <summary>
    /// 检查当前用户是否有访问任意一个菜单的权限
    /// </summary>
    protected async Task<bool> HasAnyMenuAccessAsync(params string[] menuNames)
    {
        var menuAccessService = HttpContext.RequestServices.GetRequiredService<IMenuAccessService>();
        var userId = GetRequiredUserId();
        return await menuAccessService.HasAnyMenuAccessAsync(userId, menuNames);
    }
}

