using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Platform.ApiService.Attributes;
using Platform.ApiService.Models;
using Platform.ServiceDefaults.Controllers;

namespace Platform.ApiService.Controllers;

/// <summary>
/// 公共接口控制器 - 示例展示如何配置全局认证
/// </summary>
[ApiController]
[Route("api/public")]
[SkipGlobalAuthentication("公共接口，允许匿名访问")]
public class PublicController : BaseApiController
{
    private readonly ILogger<PublicController> _logger;

    /// <summary>
    /// 初始化公共接口控制器
    /// </summary>
    /// <param name="logger">日志记录器</param>
    public PublicController(ILogger<PublicController> logger)
    {
        _logger = logger ?? throw new ArgumentNullException(nameof(logger));
    }

    /// <summary>
    /// 获取系统信息 - 公共接口
    /// </summary>
    /// <remarks>
    /// 返回系统基本信息，如版本、运行时间等。
    /// 
    /// 示例请求：
    /// ```
    /// GET /api/public/system-info
    /// ```
    /// 
    /// 示例响应：
    /// ```json
    /// {
    ///   "success": true,
    ///   "data": {
    ///     "version": "1.0.0",
    ///     "uptime": "2.15:30:45",
    ///     "environment": "Production"
    ///   }
    /// }
    /// ```
    /// </remarks>
    /// <returns>系统信息</returns>
    [HttpGet("system-info")]
    public IActionResult GetSystemInfo()
    {
        var systemInfo = new
        {
            Version = "1.0.0",
            Uptime = DateTime.UtcNow.Subtract(DateTime.Parse("2024-01-01")).ToString(),
            Environment = Environment.GetEnvironmentVariable("ASPNETCORE_ENVIRONMENT") ?? "Unknown"
        };

        return Ok(new { success = true, data = systemInfo });
    }

    /// <summary>
    /// 获取当前用户信息 - 需要认证
    /// </summary>
    /// <remarks>
    /// 演示在同一个控制器中如何要求特定接口需要认证。
    /// 即使控制器标记为跳过全局认证，但特定方法仍可以要求认证。
    /// 
    /// 示例请求：
    /// ```
    /// GET /api/public/current-user
    /// Authorization: Bearer {token}
    /// ```
    /// 
    /// 示例响应：
    /// ```json
    /// {
    ///   "success": true,
    ///   "data": {
    ///     "userId": "user123",
    ///     "userName": "john.doe",
    ///     "isAuthenticated": true
    ///   }
    /// }
    /// ```
    /// </remarks>
    /// <returns>当前用户信息</returns>
    [HttpGet("current-user")]
    [Authorize] // 覆盖控制器的SkipGlobalAuthentication属性
    [RequireGlobalAuthentication("获取用户信息需要认证")]
    public IActionResult GetCurrentUser()
    {
        if (User?.Identity?.IsAuthenticated != true)
        {
            return Unauthorized(new { 
                success = false, 
                errorMessage = "用户未认证",
                errorCode = "UNAUTHORIZED"
            });
        }

        var userInfo = new
        {
            UserId = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value,
            UserName = User.FindFirst(System.Security.Claims.ClaimTypes.Name)?.Value,
            IsAuthenticated = User.Identity.IsAuthenticated
        };

        return Ok(new { success = true, data = userInfo });
    }

    /// <summary>
    /// 测试接口 - 公共访问
    /// </summary>
    /// <remarks>
    /// 简单的测试接口，用于验证服务是否正常运行。
    /// </remarks>
    /// <returns>测试响应</returns>
    [HttpGet("test")]
    public IActionResult TestEndpoint()
    {
        return Ok(new 
        { 
            success = true, 
            message = "公共接口测试成功",
            timestamp = DateTime.UtcNow
        });
    }
}