using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.DependencyInjection;
using Platform.ServiceDefaults.Models;
using Platform.ServiceDefaults.Services;

namespace Platform.ServiceDefaults.Controllers;

[ApiController]
public abstract class BaseApiController : ControllerBase
{
    private ITenantContext? _tenantContext;

    protected ITenantContext TenantContext
        => _tenantContext ??= HttpContext.RequestServices.GetRequiredService<ITenantContext>();

    protected string? CurrentUserId => TenantContext.GetCurrentUserId();

    protected string RequiredUserId
        => CurrentUserId ?? throw new UnauthorizedAccessException("未找到用户信息");

    protected string? CurrentCompanyId => TenantContext.GetCurrentCompanyId();

    protected string RequiredCompanyId
        => CurrentCompanyId ?? throw new KeyNotFoundException("未找到当前用户的企业信息");

    protected IActionResult Success(object? data, string? message = null)
        => Ok(CreateResponse(true, message, data));

    protected IActionResult? ValidateModelState()
    {
        if (!ModelState.IsValid)
        {
            var message = string.Join("; ", ModelState.Values
                .Where(x => x?.Errors.Count > 0)
                .SelectMany(x => x!.Errors)
                .Select(x => x.ErrorMessage));
            throw new ArgumentException(message);
        }
        return null;
    }

    private ApiResponse CreateResponse(bool success, string? message, object? data)
        => new(success, message, data, HttpContext.TraceIdentifier);
}