using System.Security.Claims;
using Microsoft.Extensions.Logging;

namespace Platform.ApiService.Middleware;

public class UserContextMiddleware
{
    private readonly RequestDelegate _next;
    private readonly ILogger<UserContextMiddleware> _logger;

    public UserContextMiddleware(RequestDelegate next, ILogger<UserContextMiddleware> logger)
    {
        _next = next;
        _logger = logger;
    }

    public async Task InvokeAsync(HttpContext context)
    {

        var userId = GetUserIdFromToken(context.User);
        if (!string.IsNullOrEmpty(userId))
        {
            context.Items["UserId"] = userId;
        }

        await _next(context);
    }

    private static string? GetUserIdFromToken(ClaimsPrincipal? user)
    {
        if (user == null) return null;

        var userId = user.FindFirst("userId")?.Value
               ?? user.FindFirst(ClaimTypes.NameIdentifier)?.Value
               ?? user.FindFirst("sub")?.Value;

        return userId;
    }
}

public static class UserContextMiddlewareExtensions
{
    public static IApplicationBuilder UseUserContext(this IApplicationBuilder builder)
    {
        return builder.UseMiddleware<UserContextMiddleware>();
    }
}
