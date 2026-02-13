using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using Platform.ServiceDefaults.Models;

namespace Platform.ServiceDefaults.Controllers;

/// <summary>
/// API 控制器基类 - 提供统一的响应格式和常用的用户上下文属性
/// </summary>
/// <remarks>
/// 所有的 Web API 控制器都应该继承此类，以确保响应格式的一致性（使用 ApiResponse 对象封装）。
/// 提供了成功、错误、分页、验证失败等多种标准返回方法。
/// </remarks>
/// <example>
/// <code>
/// [Route("api/[controller]")]
/// public class MyController : BaseApiController {
///     [HttpGet]
///     public IActionResult Get() => Success(new { Name = "Test" });
/// }
/// </code>
/// </example>
[ApiController]
public abstract class BaseApiController : ControllerBase
{
    /// <summary>
    /// 从 JWT Claim 中获取当前登录用户的 ID
    /// </summary>
    protected string? CurrentUserId => User.FindFirst("userId")?.Value;

    /// <summary>
    /// 从 JWT Claim 中获取当前登录用户的用户名
    /// </summary>
    protected string? CurrentUsername => User.FindFirst("username")?.Value;

    /// <summary>
    /// 从 JWT Claim 中获取当前登录用户的角色标识
    /// </summary>
    protected string? CurrentUserRole => User.FindFirst("role")?.Value;

    /// <summary>
    /// 检查当前用户是否拥有管理员 (admin) 角色
    /// </summary>
    protected bool IsAdmin => CurrentUserRole == "admin";

    /// <summary>
    /// 检查当前请求是否已通过身份验证
    /// </summary>
    protected bool IsAuthenticated => User.Identity?.IsAuthenticated == true;

    /// <summary>
    /// 获取必需的用户 ID，如果未登录则抛出异常
    /// </summary>
    /// <exception cref="UnauthorizedAccessException">当用户信息不存在时抛出</exception>
    /// <returns>当前用户 ID</returns>
    protected string GetRequiredUserId()
    {
        if (string.IsNullOrEmpty(CurrentUserId))
            throw new UnauthorizedAccessException("未找到用户信息");
        return CurrentUserId;
    }


    /// <summary>
    /// 返回标准成功的 API 响应（含数据和可选消息）
    /// </summary>
    /// <typeparam name="T">数据类型</typeparam>
    /// <param name="data">要返回给前端的数据对象</param>
    /// <param name="message">可选的成功提示消息，默认为 null</param>
    /// <example>
    /// <code>
    /// return Success(userInfo, "获取成功");
    /// </code>
    /// </example>
    protected IActionResult Success<T>(T data, string? message = null)
    {
        var response = ApiResponse<T>.SuccessResult(data, HttpContext.TraceIdentifier, message);
        return Ok(response);
    }

    /// <summary>
    /// 返回无具体数据的标准成功响应
    /// </summary>
    /// <example>
    /// <code>
    /// return Success(); // 返回 { "success": true, "data": null ... }
    /// </code>
    /// </example>
    protected IActionResult Success()
    {
        return Success<object>(null!);
    }

    /// <summary>
    /// 返回仅包含成功消息的标准响应
    /// </summary>
    /// <param name="message">成功提示信息</param>
    /// <example>
    /// <code>
    /// return SuccessMessage("操作已入队");
    /// </code>
    /// </example>
    protected IActionResult SuccessMessage(string message)
    {
        return Success<object>(null!, message);
    }

    /// <summary>
    /// 返回标准分页成功的 API 响应
    /// </summary>
    /// <typeparam name="T">数据项类型</typeparam>
    /// <param name="data">数据列表</param>
    /// <param name="total">总记录数</param>
    /// <param name="page">当前页码</param>
    /// <param name="pageSize">每页大小</param>
    /// <example>
    /// <code>
    /// return SuccessPaged(users, totalCount, 1, 10);
    /// </code>
    /// </example>
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
    /// 返回自定义错误信息的标准响应
    /// </summary>
    /// <param name="errorCode">错误代码，如 "USER_NOT_FOUND"</param>
    /// <param name="errorMessage">错误描述信息</param>
    /// <example>
    /// <code>
    /// return Error("INSUFFICIENT_BALANCE", "余额不足以完成支付");
    /// </code>
    /// </example>
    protected IActionResult Error(string errorCode, string errorMessage)
    {
        var response = ApiResponse<object>.ErrorResult(errorCode, errorMessage, HttpContext.TraceIdentifier);
        return BadRequest(response);
    }

    /// <summary>
    /// 返回数据校验错误的响应 (HTTP 400)
    /// </summary>
    /// <param name="errorMessage">具体的校验错误描述</param>
    /// <example>
    /// <code>
    /// if (string.IsNullOrEmpty(name)) return ValidationError("名称不能为空");
    /// </code>
    /// </example>
    protected IActionResult ValidationError(string errorMessage)
    {
        var response = ApiResponse<object>.ValidationErrorResult(errorMessage, HttpContext.TraceIdentifier);
        return BadRequest(response);
    }

    /// <summary>
    /// 返回资源未找到的响应 (HTTP 404)
    /// </summary>
    /// <param name="resource">资源名称</param>
    /// <param name="id">资源唯一标识</param>
    /// <example>
    /// <code>
    /// return NotFoundError("User", userId);
    /// </code>
    /// </example>
    protected IActionResult NotFoundError(string resource, string id)
    {
        var response = ApiResponse<object>.NotFoundResult(resource, id, HttpContext.TraceIdentifier);
        return NotFound(response);
    }



    /// <summary>
    /// 返回无权访问/禁止访问的响应 (HTTP 403)
    /// </summary>
    /// <param name="message">拒绝访问的原因消息</param>
    protected IActionResult ForbiddenError(string message = "禁止访问")
    {
        var response = ApiResponse<object>.ErrorResult("FORBIDDEN", message, HttpContext.TraceIdentifier);
        return StatusCode(403, response);
    }

    /// <summary>
    /// 返回服务器内部错误的响应 (HTTP 500)
    /// </summary>
    /// <param name="message">错误说明</param>
    protected IActionResult ServerError(string message = "服务器内部错误")
    {
        var response = ApiResponse<object>.ErrorResult("INTERNAL_ERROR", message, HttpContext.TraceIdentifier);
        return StatusCode(500, response);
    }

    /// <summary>
    /// 根据 ApiResponse 结果自动判定并返回对应 HTTP 状态码的响应
    /// 通常用于透传 Service 层返回的 ApiResponse 结果。
    /// </summary>
    /// <typeparam name="T">数据类型</typeparam>
    /// <param name="result">Service层或其他模块返回的 ApiResponse 对象</param>
    /// <example>
    /// <code>
    /// var result = await _authService.LoginAsync(dto);
    /// return Result(result); // 内部会自动判定 success 与否并映射状态码
    /// </code>
    /// </example>
    protected IActionResult Result<T>(ApiResponse<T> result)
    {
        if (result.success)
        {
            return Ok(result);
        }

        // 处理特定错误代码对应的 HTTP 状态码
        return result.errorCode switch
        {
            "NOT_FOUND" => NotFound(result),
            "UNAUTHORIZED" => Unauthorized(result),
            "FORBIDDEN" => StatusCode(403, result),
            "VALIDATION_ERROR" => BadRequest(result),
            _ => BadRequest(result)
        };
    }

    /// <summary>
    /// 验证控制器中的 ModelState 模型状态
    /// </summary>
    /// <returns>如果验证失败返回 IActionResult (ValidationError)，否则返回 null</returns>
    /// <example>
    /// <code>
    /// var validationResult = ValidateModelState();
    /// if (validationResult != null) return validationResult;
    /// </code>
    /// </example>
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
    /// 检查当前用户是否具备指定的权限标识
    /// </summary>
    /// <param name="permission">权限字符串，如 "user.view"</param>
    /// <returns>拥有权限返回 true，否则返回 false</returns>
    protected bool HasPermission(string permission)
    {
        // 管理员拥有所有权限
        if (IsAdmin) return true;

        // 检查用户权限
        var permissions = User.FindAll("permission").Select(x => x.Value);
        return permissions.Contains(permission);
    }



    /// <summary>
    /// 获取客户端真实的 IP 地址
    /// 考虑了 X-Forwarded-For 和 X-Real-IP 等代理头。
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
    /// 获取当前请求的浏览器 User-Agent 字符串
    /// </summary>
    protected string GetUserAgent()
    {
        return Request.Headers["User-Agent"].FirstOrDefault() ?? "Unknown";
    }

    /// <summary>
    /// 记录业务操作日志
    /// </summary>
    /// <param name="operation">操作描述</param>
    /// <param name="entityId">涉及的实体 ID（可选）</param>
    /// <param name="data">额外的数据对象，将以 JSON 序列化形式记录（可选）</param>
    protected void LogOperation(string operation, string? entityId = null, object? data = null)
    {
        var logger = HttpContext.RequestServices.GetRequiredService<ILogger<BaseApiController>>();
        logger.LogInformation("API操作: {Operation}, 用户: {UserId}, 实体ID: {EntityId}, 客户端IP: {ClientIp}, 数据: {@Data}",
            operation, CurrentUserId, entityId, GetClientIpAddress(), data);
    }

    /// <summary>
    /// 记录 API 执行过程中的异常日志
    /// </summary>
    /// <param name="operation">操作描述</param>
    /// <param name="exception">捕获到的异常对象</param>
    /// <param name="entityId">涉及的实体 ID（可选）</param>
    protected void LogError(string operation, Exception exception, string? entityId = null)
    {
        var logger = HttpContext.RequestServices.GetRequiredService<ILogger<BaseApiController>>();
        logger.LogError(exception, "API操作失败: {Operation}, 用户: {UserId}, 实体ID: {EntityId}, 客户端IP: {ClientIp}",
            operation, CurrentUserId, entityId, GetClientIpAddress());
    }
}

