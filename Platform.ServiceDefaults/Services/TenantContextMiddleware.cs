using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;

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
        var dbContext = context.RequestServices.GetService(typeof(PlatformDbContext)) as PlatformDbContext;
        if (dbContext != null)
        {
            await dbContext.InitializeAsync();
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