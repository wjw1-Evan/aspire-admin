using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using MongoDB.Driver;
using Platform.ApiService.Scripts;
using Platform.ServiceDefaults.Controllers;

namespace Platform.ApiService.Controllers;

/// <summary>
/// 系统维护控制器
/// </summary>
[ApiController]
[Route("api/maintenance")]
[Authorize] // 需要登录
public class MaintenanceController : BaseApiController
{
    private readonly IMongoDatabase _database;
    private readonly ILogger<MaintenanceController> _logger;

    /// <summary>
    /// 初始化系统维护控制器
    /// </summary>
    /// <param name="database">MongoDB 数据库</param>
    /// <param name="logger">日志记录器</param>
    public MaintenanceController(IMongoDatabase database, ILogger<MaintenanceController> logger)
    {
        _database = database ?? throw new ArgumentNullException(nameof(database));
        _logger = logger ?? throw new ArgumentNullException(nameof(logger));
    }

    /// <summary>
    /// P0修复：补充缺失的 UserCompany 记录
    /// </summary>
    /// <remarks>
    /// 修复企业注册时创建了用户但没有创建 UserCompany 关联记录的问题。
    /// 
    /// **注意**：此操作只能由管理员执行。
    /// 
    /// 示例请求：
    /// ```
    /// POST /api/maintenance/fix-user-company-records
    /// Authorization: Bearer {admin-token}
    /// ```
    /// 
    /// 示例响应：
    /// ```json
    /// {
    ///   "success": true,
    ///   "data": {
    ///     "success": true,
    ///     "totalCompanies": 5,
    ///     "fixedUsers": 8,
    ///     "skippedUsers": 2,
    ///     "skippedCompanies": 0,
    ///     "errorMessage": null
    ///   }
    /// }
    /// ```
    /// </remarks>
    /// <returns>修复结果</returns>
    /// <response code="200">修复成功</response>
    /// <response code="401">未授权</response>
    /// <response code="403">权限不足（需要管理员）</response>
    [HttpPost("fix-user-company-records")]
    public async Task<IActionResult> FixUserCompanyRecords()
    {
        // 检查是否为管理员（可以根据实际情况调整权限检查）
        if (!IsAdmin && CurrentUserRole != "管理员")
        {
            _logger.LogWarning("非管理员用户 {UserId} 尝试执行数据修复", CurrentUserId);
            throw new UnauthorizedAccessException("此操作需要管理员权限");
        }

        _logger.LogInformation("管理员 {UserId} 开始执行 UserCompany 记录修复", CurrentUserId);

        var fixerLogger = _logger as ILogger<FixMissingUserCompanyRecords> ?? 
            LoggerFactory.Create(builder => builder.AddConsole()).CreateLogger<FixMissingUserCompanyRecords>();
        var fixer = new FixMissingUserCompanyRecords(_database, fixerLogger);
        var result = await fixer.FixAsync();

        if (result.Success)
        {
            _logger.LogInformation("UserCompany 记录修复成功: 修复 {Fixed} 个用户", result.FixedUsers);
            return Success(result, "修复完成");
        }
        else
        {
            _logger.LogError("UserCompany 记录修复失败: {Error}", result.ErrorMessage);
            throw new InvalidOperationException($"修复失败: {result.ErrorMessage}");
        }
    }

    /// <summary>
    /// 验证 UserCompany 记录完整性
    /// </summary>
    /// <remarks>
    /// 检查所有用户是否都有对应的 UserCompany 记录。
    /// 
    /// 示例请求：
    /// ```
    /// GET /api/maintenance/validate-user-company-records
    /// Authorization: Bearer {admin-token}
    /// ```
    /// 
    /// 示例响应：
    /// ```json
    /// {
    ///   "success": true,
    ///   "data": {
    ///     "isValid": true,
    ///     "totalUsers": 10,
    ///     "usersWithUserCompany": 10,
    ///     "usersWithoutUserCompany": 0,
    ///     "usersWithoutCompany": 0,
    ///     "errorMessage": null
    ///   }
    /// }
    /// ```
    /// </remarks>
    /// <returns>验证结果</returns>
    /// <response code="200">验证成功</response>
    /// <response code="401">未授权</response>
    /// <response code="403">权限不足（需要管理员）</response>
    [HttpGet("validate-user-company-records")]
    public async Task<IActionResult> ValidateUserCompanyRecords()
    {
        // 检查是否为管理员
        if (!IsAdmin && CurrentUserRole != "管理员")
        {
            _logger.LogWarning("非管理员用户 {UserId} 尝试执行数据验证", CurrentUserId);
            throw new UnauthorizedAccessException("此操作需要管理员权限");
        }

        _logger.LogInformation("管理员 {UserId} 开始验证 UserCompany 记录", CurrentUserId);

        var fixerLogger = _logger as ILogger<FixMissingUserCompanyRecords> ?? 
            LoggerFactory.Create(builder => builder.AddConsole()).CreateLogger<FixMissingUserCompanyRecords>();
        var fixer = new FixMissingUserCompanyRecords(_database, fixerLogger);
        var result = await fixer.ValidateAsync();

        if (result.IsValid)
        {
            _logger.LogInformation("✅ UserCompany 记录验证通过: 所有 {Count} 个用户都有记录", 
                result.UsersWithUserCompany);
            return Success(result, "验证通过");
        }
        else
        {
            _logger.LogWarning("⚠️ UserCompany 记录验证失败: {Count} 个用户缺少记录", 
                result.UsersWithoutUserCompany);
            return Success(result, "验证发现问题");
        }
    }

    /// <summary>
    /// 健康检查
    /// </summary>
    [HttpGet("health")]
    [AllowAnonymous]
    public IActionResult Health()
    {
        return Success(new { status = "healthy", timestamp = DateTime.UtcNow });
    }
}

