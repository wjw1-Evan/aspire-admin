using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Filters;
using Platform.ApiService.Services;

namespace Platform.ApiService.Attributes;

/// <summary>
/// 菜单访问权限验证特性
/// 用于控制器和方法级别的菜单权限检查
/// 替代原有的 RequirePermission 特性
/// </summary>
[AttributeUsage(AttributeTargets.Class | AttributeTargets.Method, AllowMultiple = true)]
public class RequireMenuAttribute : Attribute, IAsyncAuthorizationFilter
{
    /// <summary>
    /// 所需访问的菜单名称
    /// </summary>
    public string MenuName { get; }

    /// <summary>
    /// 初始化菜单访问权限验证特性
    /// </summary>
    /// <param name="menuName">所需访问的菜单名称</param>
    public RequireMenuAttribute(string menuName)
    {
        MenuName = menuName;
    }

    /// <summary>
    /// 执行授权验证
    /// </summary>
    /// <param name="context">授权过滤器上下文</param>
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

        // 获取菜单访问服务
        var menuAccessService = context.HttpContext.RequestServices
            .GetService<IMenuAccessService>();

        if (menuAccessService == null)
        {
            context.Result = new StatusCodeResult(500);
            return;
        }

        // 验证菜单访问权限
        var hasAccess = await menuAccessService.HasMenuAccessAsync(userId, MenuName);

        if (!hasAccess)
        {
            context.Result = new ObjectResult(new
            {
                success = false,
                error = $"无权访问菜单: {MenuName}",
                errorCode = "FORBIDDEN",
                showType = 2
            })
            {
                StatusCode = 403
            };
        }
    }
}

