using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using System.Security.Claims;

namespace Platform.ServiceDefaults.Services;

public class TenantContextMiddleware
{
    private readonly RequestDelegate _next;

    public TenantContextMiddleware(RequestDelegate next)
    {
        _next = next;
    }

    public async Task InvokeAsync(HttpContext context)
    {
        var userId = JwtHelper.GetUserId(context.User);
        var companyId = JwtHelper.GetCompanyId(context.User);

        if (!string.IsNullOrEmpty(companyId))
        {
            PlatformDbContext.SetContext(companyId, userId);
        }

        await _next(context);
    }
}

public static class TenantContextMiddlewareExtensions
{
    public static IApplicationBuilder UseTenantContext(this IApplicationBuilder builder)
    {
        return builder.UseMiddleware<TenantContextMiddleware>();
    }
}

/// <summary>
/// JWT Claims 解析辅助方法（静态）
/// </summary>
public static class JwtHelper
{
    /// <summary>
    /// 从 ClaimsPrincipal 获取企业ID
    /// </summary>
    public static string? GetCompanyId(ClaimsPrincipal? principal)
        => principal?.FindFirst("companyId")?.Value;

    /// <summary>
    /// 从 ClaimsPrincipal 获取用户ID
    /// </summary>
    public static string? GetUserId(ClaimsPrincipal? principal)
        => principal?.FindFirst("userId")?.Value;
}