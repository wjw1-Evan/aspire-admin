using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Platform.ServiceDefaults.Models;
using Platform.ServiceDefaults.Services;
using Platform.ServiceDefaults.Exceptions;

namespace Platform.ServiceDefaults.Controllers;

[ApiController]
public abstract class BaseApiController : ControllerBase
{
    protected string? CurrentUserId
        => HttpContext.Items["UserId"] as string;

    protected async Task<string?> GetCompanyId(bool required = false)
    {
        var tenantContext = HttpContext.RequestServices.GetService(typeof(ITenantContext)) as ITenantContext;
        var companyId = tenantContext != null
            ? await tenantContext.GetCurrentCompanyIdAsync()
            : null;

        if (required && string.IsNullOrEmpty(companyId))
            throw new BusinessException("未找到当前用户的企业信息", "NOT_FOUND", 404);

        return companyId;
    }

    protected IActionResult Success(object data, string? message = null)
        => Ok(CreateResponse(true, "OK", data, message));

    protected IActionResult Fail(string code, string message, int? httpStatusCode = null)
    {
        var statusCode = httpStatusCode ?? GetStatusCodeFromErrorCode(code);
        var response = CreateResponse(false, code, null, message);
        return statusCode switch
        {
            401 => Unauthorized(response),
            403 => StatusCode(403, response),
            404 => NotFound(response),
            500 => StatusCode(500, response),
            _ => BadRequest(response)
        };
    }

    private static int GetStatusCodeFromErrorCode(string code)
    {
        if (code.Contains("UNAUTHORIZED") || code.Contains("AUTH") || code.Contains("TOKEN") || code.Contains("CREDENTIAL"))
            return 401;
        if (code.Contains("FORBIDDEN") || code.Contains("PERMISSION"))
            return 403;
        if (code.Contains("NOT_FOUND") || code.Contains("USER_NOT_FOUND") || code.Contains("COMPANY") || code.Contains("EXPIRED") || code.Contains("INACTIVE"))
            return 404;
        if (code.Contains("ERROR") || code.Contains("FAILED") || code.Contains("EXCEPTION"))
            return 500;
        return 400;
    }

    protected IActionResult? ValidateModelState()
        => ModelState.IsValid ? null : Fail("VALIDATION_ERROR",
            string.Join("; ", ModelState.Values
                .Where(x => x?.Errors.Count > 0)
                .SelectMany(x => x!.Errors)
                .Select(x => x.ErrorMessage)));

    protected string GetClientIpAddress()
        => Request.Headers["X-Forwarded-For"].FirstOrDefault()?.Split(',')[0].Trim()
        ?? Request.Headers["X-Real-IP"].FirstOrDefault()
        ?? HttpContext.Connection.RemoteIpAddress?.ToString()
        ?? "Unknown";

    private ApiResponse CreateResponse(bool success, string code, object? data, string? message)
        => new(success, code, message, data, HttpContext.TraceIdentifier);
}
