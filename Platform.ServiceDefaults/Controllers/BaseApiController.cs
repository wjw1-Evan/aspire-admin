using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Platform.ServiceDefaults.Models;
using Platform.ServiceDefaults.Services;
using Platform.ServiceDefaults.Exceptions;

namespace Platform.ServiceDefaults.Controllers;

/// <summary>
/// API 控制器基类 - 提供统一的响应格式和常用的用户上下文属性
/// </summary>
[ApiController]
public abstract class BaseApiController : ControllerBase
{
    protected string? CurrentUserId 
        => HttpContext.Items["UserId"] as string;

    protected bool IsAuthenticated => !string.IsNullOrEmpty(CurrentUserId);

    protected string GetRequiredUserId()
        => CurrentUserId ?? throw new UnauthorizedAccessException("未找到用户信息");

    protected async Task<string?> GetCurrentCompanyIdAsync()
    {
        var tenantContext = HttpContext.RequestServices.GetService(typeof(ITenantContext)) as ITenantContext;
        if (tenantContext != null)
        {
            return await tenantContext.GetCurrentCompanyIdAsync();
        }
        return null;
    }

    protected async Task<string> GetRequiredCompanyIdAsync()
    {
        var companyId = await GetCurrentCompanyIdAsync();
        return companyId ?? throw new BusinessException("未找到当前用户的企业信息", "NOT_FOUND", 404);
    }

    /// <summary>
    /// 返回标准成功的 API 响应（含数据和可选消息）
    /// </summary>
    protected IActionResult Success(object? data = null, string? message = null)
        => Ok(CreateResponse(true, "OK", data, message));

    /// <summary>
    /// 返回仅包含成功消息的标准响应
    /// </summary>
    protected IActionResult SuccessMessage(string message)
        => Ok(CreateResponse(true, "OK", null, message));

    /// <summary>
    /// 返回标准分页成功的 API 响应 (可附加复杂的统计报告或汇总数据)
    /// </summary>
    protected IActionResult SuccessPaged<T>(IEnumerable<T> data, long total, int page, int pageSize, object? summary = null, string? message = null)
        => Ok(CreateResponse(true, "OK", new
        {
            list = data,
            total,
            page,
            pageSize,
            totalPages = (int)Math.Ceiling((double)total / pageSize),
            summary
        }, message));

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

        // 如果 Result 返回的是特定的业务错误码，可以直接交由 Result 映射
        return result.Code switch
        {
            "NOT_FOUND" => NotFound(response),
            "UNAUTHORIZED" => Unauthorized(response),
            "FORBIDDEN" => StatusCode(403, response),
            "VALIDATION_ERROR" => BadRequest(response),
            "ALREADY_EXISTS" => Conflict(response),
            "INTERNAL_ERROR" => StatusCode(500, response),
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
        => ModelState.IsValid ? null : ValidationError(string.Join("; ", ModelState
            .Where(x => x.Value?.Errors.Count > 0)
            .SelectMany(x => x.Value!.Errors)
            .Select(x => x.ErrorMessage)));

    /// <summary>
    /// 获取客户端真实的 IP 地址，考虑了 X-Forwarded-For 和 X-Real-IP 等代理头
    /// </summary>
    protected string GetClientIpAddress()
        => Request.Headers["X-Forwarded-For"].FirstOrDefault()?.Split(',')[0].Trim()
        ?? Request.Headers["X-Real-IP"].FirstOrDefault()
        ?? HttpContext.Connection.RemoteIpAddress?.ToString()
        ?? "Unknown";

    /// <summary>
    /// 创建统一的 API 响应载体
    /// </summary>
    private ApiResponse CreateResponse(bool success, string code, object? data, string? message)
        => new(success, code, message, data, HttpContext.TraceIdentifier);
}
