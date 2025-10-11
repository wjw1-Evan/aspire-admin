using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Filters;
using Platform.ApiService.Services;

namespace Platform.ApiService.Attributes;

/// <summary>
/// 权限验证特性 - 用于控制器和方法级别的权限检查
/// </summary>
[AttributeUsage(AttributeTargets.Class | AttributeTargets.Method, AllowMultiple = true)]
public class RequirePermissionAttribute : Attribute, IAsyncAuthorizationFilter
{
    public string Resource { get; }
    public string Action { get; }

    public RequirePermissionAttribute(string resource, string action)
    {
        Resource = resource;
        Action = action;
    }

    public async Task OnAuthorizationAsync(AuthorizationFilterContext context)
    {
        // 检查用户是否已认证
        if (!context.HttpContext.User.Identity?.IsAuthenticated ?? true)
        {
            context.Result = new UnauthorizedObjectResult(new
            {
                success = false,
                error = "未授权访问",
                errorCode = "UNAUTHORIZED",
                showType = 2
            });
            return;
        }

        // 获取用户ID
        var userId = context.HttpContext.User.FindFirst("userId")?.Value;
        if (string.IsNullOrEmpty(userId))
        {
            context.Result = new UnauthorizedObjectResult(new
            {
                success = false,
                error = "用户信息无效",
                errorCode = "INVALID_USER",
                showType = 2
            });
            return;
        }

        // 检查是否为超级管理员（super-admin 拥有所有权限）
        var userRole = context.HttpContext.User.FindFirst("role")?.Value;
        if (userRole == "super-admin")
        {
            return; // 超级管理员拥有所有权限
        }

        // 获取权限检查服务
        var permissionCheckService = context.HttpContext.RequestServices
            .GetService<IPermissionCheckService>();
        
        if (permissionCheckService == null)
        {
            context.Result = new StatusCodeResult(500);
            return;
        }

        // 验证权限
        var permissionCode = $"{Resource}:{Action}";
        var hasPermission = await permissionCheckService.HasPermissionAsync(userId, permissionCode);

        if (!hasPermission)
        {
            context.Result = new ObjectResult(new
            {
                success = false,
                error = $"无权执行此操作：{permissionCode}",
                errorCode = "FORBIDDEN",
                showType = 2
            })
            {
                StatusCode = 403
            };
        }
    }
}

