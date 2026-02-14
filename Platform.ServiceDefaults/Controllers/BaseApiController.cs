using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Platform.ServiceDefaults.Models;

namespace Platform.ServiceDefaults.Controllers;

/// <summary>
/// API 控制器基类 - 提供统一的响应格式和常用的用户上下文属性
/// </summary>
/// <remarks>
/// 所有的 Web API 控制器都应该继承此类。
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
    protected string GetRequiredUserId()
    {
        if (string.IsNullOrEmpty(CurrentUserId))
            throw new UnauthorizedAccessException("未找到用户信息");
        return CurrentUserId;
    }

    /// <summary>
    /// 返回标准成功的 API 响应（含数据和可选消息）
    /// </summary>
    protected IActionResult Success<T>(T data, string? message = null)
        => Ok(CreateResponse(true, "OK", data, message));

    /// <summary>
    /// 返回无具体数据的标准成功响应
    /// </summary>
    protected IActionResult Success() => Success<object>(null!);

    /// <summary>
    /// 返回仅包含成功消息的标准响应
    /// </summary>
    protected IActionResult SuccessMessage(string message) => Success<object>(null!, message);

    /// <summary>
    /// 返回标准分页成功的 API 响应
    /// </summary>
    protected IActionResult SuccessPaged<T>(IEnumerable<T> data, long total, int page, int pageSize, string? message = null)
    {
        var pagedData = new
        {
            list = data.ToList(),
            total,
            page,
            pageSize,
            totalPages = (int)Math.Ceiling((double)total / pageSize)
        };
        return Ok(CreateResponse(true, "OK", pagedData, message));
    }

    /// <summary>
    /// 返回自定义错误信息的标准响应
    /// </summary>
    protected IActionResult Error(string code, string message)
        => BadRequest(CreateResponse(false, code, null, message));

    /// <summary>
    /// 返回数据校验错误的响应 (HTTP 400)
    /// </summary>
    protected IActionResult ValidationError(string message)
        => BadRequest(CreateResponse(false, "VALIDATION_ERROR", null, message));

    /// <summary>
    /// 返回资源未找到的响应 (HTTP 404)
    /// </summary>
    protected IActionResult NotFoundError(string resource, string id)
        => NotFound(CreateResponse(false, "NOT_FOUND", null, $"{resource} {id} 不存在"));

    /// <summary>
    /// 返回未授权的响应 (HTTP 401)
    /// </summary>
    protected IActionResult UnauthorizedError(string message = "未授权访问")
        => Unauthorized(CreateResponse(false, "UNAUTHORIZED", null, message));

    /// <summary>
    /// 返回无权访问/禁止访问的响应 (HTTP 403)
    /// </summary>
    protected IActionResult ForbiddenError(string message = "禁止访问")
        => StatusCode(403, CreateResponse(false, "FORBIDDEN", null, message));

    /// <summary>
    /// 返回服务器内部错误的响应 (HTTP 500)
    /// </summary>
    protected IActionResult ServerError(string message = "服务器内部错误")
        => StatusCode(500, CreateResponse(false, "INTERNAL_ERROR", null, message));

    /// <summary>
    /// 根据 ServiceResult 结果自动判定并返回对应 HTTP 状态码的响应
    /// </summary>
    protected IActionResult Result<T>(ServiceResult<T> result)
    {
        var response = CreateResponse(result.IsSuccess,
            result.Code ?? (result.IsSuccess ? "OK" : "ERROR"),
            result.Data,
            result.Message ?? (result.IsSuccess ? null : "操作失败"));

        if (result.IsSuccess) return Ok(response);

        return result.Code switch
        {
            "NOT_FOUND" => NotFound(response),
            "UNAUTHORIZED" => Unauthorized(response),
            "FORBIDDEN" => StatusCode(403, response),
            "VALIDATION_ERROR" => BadRequest(response),
            "ALREADY_EXISTS" => Conflict(response),
            _ => BadRequest(response)
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
            var errorMessage = string.Join("; ", ModelState
                .Where(x => x.Value?.Errors.Count > 0)
                .SelectMany(x => x.Value!.Errors)
                .Select(x => x.ErrorMessage));
            return ValidationError(errorMessage);
        }
        return null;
    }

    /// <summary>
    /// 获取客户端真实的 IP 地址，考虑了 X-Forwarded-For 和 X-Real-IP 等代理头
    /// </summary>
    protected string GetClientIpAddress()
    {
        return Request.Headers["X-Forwarded-For"].FirstOrDefault()?.Split(',')[0].Trim()
            ?? Request.Headers["X-Real-IP"].FirstOrDefault()
            ?? HttpContext.Connection.RemoteIpAddress?.ToString()
            ?? "Unknown";
    }

    /// <summary>
    /// 创建统一的 API 响应载体
    /// </summary>
    private object CreateResponse(bool success, string code, object? data, string? message) => new
    {
        success,
        code,
        data,
        message,
        timestamp = DateTime.UtcNow.ToString("yyyy-MM-ddTHH:mm:ss.fffZ"),
        traceId = HttpContext.TraceIdentifier
    };
}
