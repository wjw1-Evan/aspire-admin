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
        var userId = GetUserIdFromToken(context.User);
        if (!string.IsNullOrEmpty(userId))
        {
            context.Items["UserId"] = userId;
            PlatformDbContext.SetContext(null, userId);
        }

        var dbContext = context.RequestServices.GetService(typeof(PlatformDbContext)) as PlatformDbContext;
        if (dbContext != null)
        {
            await dbContext.InitializeAsync();
        }

        await _next(context);
    }

    private static string? GetUserIdFromToken(ClaimsPrincipal? user)
    {
        if (user == null) return null;
        return user.FindFirst("userId")?.Value
            ?? user.FindFirst(ClaimTypes.NameIdentifier)?.Value
            ?? user.FindFirst("sub")?.Value;
    }
}

public static class TenantContextMiddlewareExtensions
{
    public static IApplicationBuilder UseTenantContext(this IApplicationBuilder builder)
    {
        return builder.UseMiddleware<TenantContextMiddleware>();
    }
}