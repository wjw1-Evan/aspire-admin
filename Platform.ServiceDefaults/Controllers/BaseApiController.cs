using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.DependencyInjection;
using Platform.ServiceDefaults.Models;
using Platform.ServiceDefaults.Services;

namespace Platform.ServiceDefaults.Controllers;

/// <summary>
/// 所有业务 API 控制器的基类，提供租户上下文获取和统一响应封装
/// </summary>
[ApiController]
public abstract class BaseApiController : ControllerBase
{
    /// <summary>
    /// 当前请求的租户上下文，通过依赖注入获取
    /// 在中间件中已从 JWT Claims 解析并写入 AsyncLocal
    /// </summary>
    private ITenantContext? _tenantContext;

    /// <summary>
    /// 获取当前请求的租户上下文实例
    /// 首次访问时延迟从 IServiceProvider 解析
    /// </summary>
    protected ITenantContext TenantContext
        => _tenantContext ??= HttpContext.RequestServices.GetRequiredService<ITenantContext>();

    /// <summary>
    /// 当前登录用户的 ID（可空版本）
    /// 从租户上下文中获取，可能为 null（未登录或 Token 无效）
    /// </summary>
    protected string? CurrentUserId => TenantContext.GetCurrentUserId();

    /// <summary>
    /// 当前登录用户的 ID（必填版本）
    /// 若用户未登录则抛出 UnauthorizedAccessException
    /// 用于需要强制登录的业务接口
    /// </summary>
    protected string RequiredUserId
        => CurrentUserId ?? throw new UnauthorizedAccessException("未找到用户信息");

    /// <summary>
    /// 当前用户所属企业的 ID（可空版本）
    /// 从租户上下文中获取，可能为 null（用户无企业归属）
    /// </summary>
    protected string? CurrentCompanyId => TenantContext.GetCurrentCompanyId();

    /// <summary>
    /// 当前用户所属企业的 ID（必填版本）
    /// 若企业信息不存在则抛出 KeyNotFoundException
    /// 用于需要多租户隔离的业务接口
    /// </summary>
    protected string RequiredCompanyId
        => CurrentCompanyId ?? throw new KeyNotFoundException("未找到当前用户的企业信息");

    /// <summary>
    /// 创建成功响应，将数据包装为统一的 ApiResponse 格式
    /// </summary>
    /// <param name="data">要返回的业务数据（对象、数组、PagedResult 等）</param>
    /// <param name="message">可选的成功消息，前端可展示</param>
    /// <returns>Ok 200，封装了 Success=true 的 ApiResponse</returns>
    protected IActionResult Success(object? data, string? message = null)
        => Ok(CreateResponse(true, message, data));

    /// <summary>
    /// 验证模型状态，收集所有验证错误并抛出 ArgumentException
    /// 在控制器方法入口调用，用于自动校验 [FromBody] 参数
    /// </summary>
    /// <returns>验证通过返回 null，验证失败抛出 ArgumentException</returns>
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

    /// <summary>
    /// 内部方法：构建 ApiResponse 实例
    /// </summary>
    /// <param name="success">是否成功</param>
    /// <param name="message">响应消息</param>
    /// <param name="data">业务数据</param>
    /// <param name="errorCode">错误码（失败时使用 ErrorCode 常量）</param>
    /// <returns>完整的 ApiResponse 对象</returns>
    private ApiResponse CreateResponse(bool success, string? message, object? data, string? errorCode = null)
        => new(success, message, data, errorCode, HttpContext.TraceIdentifier);
}