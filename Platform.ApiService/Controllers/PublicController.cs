using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Platform.ApiService.Models;
using Platform.ServiceDefaults.Controllers;
using Platform.ServiceDefaults.Models;

namespace Platform.ApiService.Controllers;

/// <summary>
/// 公共接口控制器 - 提供无需认证的公共接口
/// </summary>
[ApiController]
[Route("api/public")]
[AllowAnonymous]
public class PublicController : BaseApiController
{
    private readonly ILogger<PublicController> _logger;

    public PublicController(ILogger<PublicController> logger)
    {
        _logger = logger ?? throw new ArgumentNullException(nameof(logger));
    }

    [HttpGet("system-info")]
    public IActionResult GetSystemInfo()
    {
        var systemInfo = new
        {
            Version = "1.0.0",
            Uptime = DateTime.UtcNow.Subtract(DateTime.Parse("2024-01-01")).ToString(),
            Environment = Environment.GetEnvironmentVariable("ASPNETCORE_ENVIRONMENT") ?? "Unknown"
        };

        return Success(systemInfo);
    }

    [HttpGet("test")]
    public IActionResult TestEndpoint()
    {
        return Success(null, "公共接口测试成功");
    }
}