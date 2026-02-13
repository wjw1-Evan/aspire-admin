using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Filters;
using Platform.ApiService.Services;

namespace Platform.ApiService.Attributes;

/// <summary>
/// 菜单访问权限验证特性
/// 用于控制器和方法级别的菜单权限检查
/// 只支持菜单名称（如 "user-management"、"cloud-storage-files"）
/// </summary>
[AttributeUsage(AttributeTargets.Class | AttributeTargets.Method, AllowMultiple = true)]
public class RequireMenuAttribute : Attribute, IAsyncAuthorizationFilter
{
    /// <summary>
    /// 所需访问的菜单名称列表
    /// 只要用户拥有其中任意一个菜单的权限即可访问
    /// </summary>
    public string[] MenuNames { get; }

    /// <summary>
    /// 初始化菜单访问权限验证特性
    /// </summary>
    /// <param name="menuNames">一个或多个菜单名称</param>
    public RequireMenuAttribute(params string[] menuNames)
    {
        MenuNames = menuNames;
    }

    /// <summary>
    /// 执行授权验证
    /// </summary>
    public async Task OnAuthorizationAsync(AuthorizationFilterContext context)
    {
        var traceId = context.HttpContext.TraceIdentifier;
        var timestamp = DateTime.UtcNow.ToString("yyyy-MM-ddTHH:mm:ss.fffZ");

        // 检查用户是否已认证
        if (!context.HttpContext.User.Identity?.IsAuthenticated ?? true)
        {
            var response = new
            {
                success = false,
                errorCode = "UNAUTHORIZED",
                errorMessage = "未授权访问",
                timestamp,
                traceId
            };
            context.Result = new UnauthorizedObjectResult(response);
            return;
        }

        // 获取用户ID
        var userId = context.HttpContext.User.FindFirst("userId")?.Value;
        if (string.IsNullOrEmpty(userId))
        {
            var response = new
            {
                success = false,
                errorCode = "INVALID_USER",
                errorMessage = "用户信息无效",
                timestamp,
                traceId
            };
            context.Result = new UnauthorizedObjectResult(response);
            return;
        }

        // 获取菜单访问服务
        var menuAccessService = context.HttpContext.RequestServices
            .GetService<IMenuAccessService>();

        if (menuAccessService == null)
        {
            var response = new
            {
                success = false,
                errorCode = "INTERNAL_ERROR",
                errorMessage = "菜单访问服务未配置",
                timestamp,
                traceId
            };
            context.Result = new ObjectResult(response)
            {
                StatusCode = 500
            };
            return;
        }

        // 验证菜单访问权限
        var hasAccess = await menuAccessService.HasAnyMenuAccessAsync(userId, MenuNames);

        if (!hasAccess)
        {
            var menuList = string.Join(", ", MenuNames);
            var response = new
            {
                success = false,
                errorCode = "FORBIDDEN",
                errorMessage = $"无权访问: {menuList}",
                timestamp,
                traceId
            };
            context.Result = new ObjectResult(response)
            {
                StatusCode = 403
            };
        }
    }
}
