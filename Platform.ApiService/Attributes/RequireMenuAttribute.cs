using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Filters;
using Platform.ApiService.Services;
using Platform.ServiceDefaults.Models;

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
        var traceId = context.HttpContext.TraceIdentifier;

        // 检查用户是否已认证
        if (!context.HttpContext.User.Identity?.IsAuthenticated ?? true)
        {
            var response = ApiResponse<object>.UnauthorizedResult("未授权访问", traceId);
            context.Result = new UnauthorizedObjectResult(response);
            return;
        }

        // 获取用户ID
        var userId = context.HttpContext.User.FindFirst("userId")?.Value;
        if (string.IsNullOrEmpty(userId))
        {
            var response = ApiResponse<object>.ErrorResult("INVALID_USER", "用户信息无效", traceId);
            context.Result = new UnauthorizedObjectResult(response);
            return;
        }

        // 获取菜单访问服务
        var menuAccessService = context.HttpContext.RequestServices
            .GetService<IMenuAccessService>();

        if (menuAccessService == null)
        {
            var response = ApiResponse<object>.ErrorResult("INTERNAL_ERROR", "菜单访问服务未配置", traceId);
            context.Result = new ObjectResult(response)
            {
                StatusCode = 500
            };
            return;
        }

        // 验证菜单访问权限
        var hasAccess = await menuAccessService.HasMenuAccessAsync(userId, MenuName);

        if (!hasAccess)
        {
            var response = ApiResponse<object>.ErrorResult("FORBIDDEN", $"无权访问菜单: {MenuName}", traceId);
            context.Result = new ObjectResult(response)
            {
                StatusCode = 403
            };
        }
    }
}

