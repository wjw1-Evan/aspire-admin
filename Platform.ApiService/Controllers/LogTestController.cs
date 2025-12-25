using Microsoft.AspNetCore.Mvc;
using Platform.ServiceDefaults.Controllers;

namespace Platform.ApiService.Controllers;

/// <summary>
/// 日志测试控制器 - 用于验证日志输出功能
/// </summary>
[ApiController]
[Route("api/[controller]")]
public class LogTestController : BaseApiController
{
    private readonly ILogger<LogTestController> _logger;

    /// <summary>
    /// 初始化日志测试控制器
    /// </summary>
    /// <param name="logger">日志记录器</param>
    public LogTestController(ILogger<LogTestController> logger)
    {
        _logger = logger;
    }

    /// <summary>
    /// 测试日志输出
    /// </summary>
    [HttpGet("test")]
    public IActionResult TestLogs()
    {
        _logger.LogInformation("📝 这是一条信息日志 - 来自 ApiService");
        _logger.LogWarning("⚠️ 这是一条警告日志 - 来自 ApiService");
        _logger.LogError("❌ 这是一条错误日志 - 来自 ApiService");

        using (_logger.BeginScope("TestScope"))
        {
            _logger.LogInformation("🔍 这是一条带作用域的日志 - 来自 ApiService");
        }

        return Success(new
        {
            message = "日志测试完成",
            timestamp = DateTime.UtcNow,
            service = "Platform.ApiService"
        });
    }

    /// <summary>
    /// 测试结构化日志
    /// </summary>
    [HttpGet("structured")]
    public IActionResult TestStructuredLogs()
    {
        var userId = "test-user-123";
        var action = "TestAction";
        var duration = 150;

        _logger.LogInformation("🎯 用户 {UserId} 执行了 {Action}，耗时 {Duration}ms",
            userId, action, duration);

        _logger.LogInformation("📊 结构化日志测试: {@LogData}", new
        {
            UserId = userId,
            Action = action,
            Duration = duration,
            Timestamp = DateTime.UtcNow,
            Success = true
        });

        return Success(new
        {
            message = "结构化日志测试完成",
            userId,
            action,
            duration
        });
    }
}
