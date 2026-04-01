using Microsoft.AspNetCore.Mvc;
using Platform.ServiceDefaults.Models;
using Platform.ServiceDefaults.Services;

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
            throw new InvalidOperationException("未找到当前用户的企业信息");

        return companyId;
    }

    protected IActionResult Success(object data, string? message = null)
        => Ok(CreateResponse(true, message, data));

    protected IActionResult Fail(string message, int httpStatusCode = 400)
    {
        var response = CreateResponse(false, message, null);
        return httpStatusCode switch
        {
            401 => Unauthorized(response),
            403 => StatusCode(403, response),
            404 => NotFound(response),
            500 => StatusCode(500, response),
            _ => BadRequest(response)
        };
    }

    protected IActionResult? ValidateModelState()
        => ModelState.IsValid ? null : Fail(
            string.Join("; ", ModelState.Values
                .Where(x => x?.Errors.Count > 0)
                .SelectMany(x => x!.Errors)
                .Select(x => x.ErrorMessage)));

    protected string GetClientIpAddress()
        => Request.Headers["X-Forwarded-For"].FirstOrDefault()?.Split(',')[0].Trim()
        ?? Request.Headers["X-Real-IP"].FirstOrDefault()
        ?? HttpContext.Connection.RemoteIpAddress?.ToString()
        ?? "Unknown";

    private ApiResponse CreateResponse(bool success, string? message, object? data)
        => new(success, message, data, HttpContext.TraceIdentifier);
}
