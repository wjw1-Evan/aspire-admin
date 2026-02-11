using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using Platform.ServiceDefaults.Models;

namespace Platform.ServiceDefaults.Controllers;

/// <summary>
/// API控制器基类 - 所有微服务通用
/// </summary>
[ApiController]
public abstract class BaseApiController : ControllerBase
{
    /// <summary>
    /// 当前用户ID
    /// </summary>
    protected string? CurrentUserId => User.FindFirst("userId")?.Value;

    /// <summary>
    /// 当前用户名
    /// </summary>
    protected string? CurrentUsername => User.FindFirst("username")?.Value;

    /// <summary>
    /// 当前用户角色
    /// </summary>
    protected string? CurrentUserRole => User.FindFirst("role")?.Value;

    /// <summary>
    /// 是否为管理员
    /// </summary>
    protected bool IsAdmin => CurrentUserRole == "admin";

    /// <summary>
    /// 是否已认证
    /// </summary>
    protected bool IsAuthenticated => User.Identity?.IsAuthenticated == true;

    /// <summary>
    /// 获取必需的用户ID
    /// </summary>
    protected string GetRequiredUserId()
    {
        if (string.IsNullOrEmpty(CurrentUserId))
            throw new UnauthorizedAccessException("未找到用户信息");
        return CurrentUserId;
    }


    /// <summary>
    /// 返回成功响应
    /// </summary>
    protected IActionResult Success<T>(T data, string? message = null)
    {
        var response = ApiResponse<T>.SuccessResult(data, HttpContext.TraceIdentifier);
        if (!string.IsNullOrEmpty(message))
        {
            // 可以在这里添加消息到响应头或其他地方
        }
        return Ok(response);
    }

    /// <summary>
    /// 返回成功响应（无数据）
    /// </summary>
    protected IActionResult Success(string? message = null)
    {
        var response = ApiResponse<object>.SuccessResult(null!, HttpContext.TraceIdentifier);
        if (!string.IsNullOrEmpty(message))
        {
            // 可以在这里添加消息到响应头或其他地方
        }
        return Ok(response);
    }

    /// <summary>
    /// 返回分页成功响应
    /// </summary>
    protected IActionResult SuccessPaged<T>(IEnumerable<T> data, long total, int page, int pageSize)
    {
        var pagedData = new PagedResult<T>
        {
            list = data.ToList(),
            total = total,
            page = page,
            pageSize = pageSize
        };
        var response = ApiResponse<PagedResult<T>>.SuccessResult(pagedData, HttpContext.TraceIdentifier);
        return Ok(response);
    }

    /// <summary>
    /// 返回错误响应
    /// </summary>
    protected IActionResult Error(string errorCode, string errorMessage)
    {
        var response = ApiResponse<object>.ErrorResult(errorCode, errorMessage, HttpContext.TraceIdentifier);
        return BadRequest(response);
    }

    /// <summary>
    /// 返回验证错误响应
    /// </summary>
    protected IActionResult ValidationError(string errorMessage)
    {
        var response = ApiResponse<object>.ValidationErrorResult(errorMessage, HttpContext.TraceIdentifier);
        return BadRequest(response);
    }

    /// <summary>
    /// 返回未找到响应
    /// </summary>
    protected IActionResult NotFoundError(string resource, string id)
    {
        var response = ApiResponse<object>.NotFoundResult(resource, id, HttpContext.TraceIdentifier);
        return NotFound(response);
    }

  

    /// <summary>
    /// 返回禁止访问响应
    /// </summary>
    protected IActionResult ForbiddenError(string message = "禁止访问")
    {
        var response = ApiResponse<object>.ErrorResult("FORBIDDEN", message, HttpContext.TraceIdentifier);
        return StatusCode(403, response);
    }

    /// <summary>
    /// 返回服务器错误响应
    /// </summary>
    protected IActionResult ServerError(string message = "服务器内部错误")
    {
        var response = ApiResponse<object>.ErrorResult("INTERNAL_ERROR", message, HttpContext.TraceIdentifier);
        return StatusCode(500, response);
    }

    /// <summary>
    /// 验证模型状态
    /// </summary>
    protected IActionResult? ValidateModelState()
    {
        if (!ModelState.IsValid)
        {
            var errors = ModelState
                .Where(x => x.Value?.Errors.Count > 0)
                .SelectMany(x => x.Value!.Errors)
                .Select(x => x.ErrorMessage)
                .ToList();
            
            var errorMessage = string.Join("; ", errors);
            return ValidationError(errorMessage);
        }
        return null;
    }

    /// <summary>
    /// 检查权限
    /// </summary>
    protected bool HasPermission(string permission)
    {
        // 管理员拥有所有权限
        if (IsAdmin) return true;
        
        // 检查用户权限
        var permissions = User.FindAll("permission").Select(x => x.Value);
        return permissions.Contains(permission);
    }

  
  
    /// <summary>
    /// 获取客户端IP地址
    /// </summary>
    protected string GetClientIpAddress()
    {
        var xForwardedFor = Request.Headers["X-Forwarded-For"].FirstOrDefault();
        if (!string.IsNullOrEmpty(xForwardedFor))
        {
            return xForwardedFor.Split(',')[0].Trim();
        }

        var xRealIp = Request.Headers["X-Real-IP"].FirstOrDefault();
        if (!string.IsNullOrEmpty(xRealIp))
        {
            return xRealIp;
        }

        return HttpContext.Connection.RemoteIpAddress?.ToString() ?? "Unknown";
    }

    /// <summary>
    /// 获取用户代理
    /// </summary>
    protected string GetUserAgent()
    {
        return Request.Headers["User-Agent"].FirstOrDefault() ?? "Unknown";
    }

    /// <summary>
    /// 记录操作日志
    /// </summary>
    protected void LogOperation(string operation, string? entityId = null, object? data = null)
    {
        var logger = HttpContext.RequestServices.GetRequiredService<ILogger<BaseApiController>>();
        logger.LogInformation("API操作: {Operation}, 用户: {UserId}, 实体ID: {EntityId}, 客户端IP: {ClientIp}, 数据: {@Data}",
            operation, CurrentUserId, entityId, GetClientIpAddress(), data);
    }

    /// <summary>
    /// 记录错误日志
    /// </summary>
    protected void LogError(string operation, Exception exception, string? entityId = null)
    {
        var logger = HttpContext.RequestServices.GetRequiredService<ILogger<BaseApiController>>();
        logger.LogError(exception, "API操作失败: {Operation}, 用户: {UserId}, 实体ID: {EntityId}, 客户端IP: {ClientIp}",
            operation, CurrentUserId, entityId, GetClientIpAddress());
    }
}
