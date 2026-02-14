using Microsoft.AspNetCore.Mvc;
using System.ComponentModel.DataAnnotations;
using Platform.ApiService.Attributes;
using Platform.ApiService.Models;
using Platform.ApiService.Services;
using Platform.ServiceDefaults.Controllers;

namespace Platform.ApiService.Controllers;

/// <summary>
/// 存储配额控制器
/// 提供存储配额管理、使用统计、警告通知等功能
/// </summary>
[ApiController]
[Route("api/storage-quota")]
[RequireMenu("cloud-storage-quota")]
public class StorageQuotaController : BaseApiController
{
    private readonly IStorageQuotaService _storageQuotaService;
    private readonly ILogger<StorageQuotaController> _logger;

    /// <summary>
    /// 初始化存储配额控制器
    /// </summary>
    public StorageQuotaController(
        IStorageQuotaService storageQuotaService,
        ILogger<StorageQuotaController> logger)
    {
        _storageQuotaService = storageQuotaService ?? throw new ArgumentNullException(nameof(storageQuotaService));
        _logger = logger ?? throw new ArgumentNullException(nameof(logger));
    }

    #region 配额管理

    /// <summary>
    /// 获取当前用户存储配额信息
    /// </summary>
    /// <returns>当前用户的存储配额信息</returns>
    [HttpGet("my-quota")]
    public async Task<IActionResult> GetMyQuota()
    {
        try
        {
            var quota = await _storageQuotaService.GetUserQuotaAsync();
            return Success(quota);
        }
        catch (InvalidOperationException ex)
        {
            return ValidationError(ex.Message);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "获取我的配额失败");
            return ServerError("获取我的配额失败，请稍后重试");
        }
    }

    /// <summary>
    /// 获取用户存储配额信息
    /// </summary>
    /// <param name="userId">用户ID（可选，为空时获取当前用户）</param>
    /// <returns>存储配额信息</returns>
    [HttpGet("user/{userId?}")]
    public async Task<IActionResult> GetUserQuota(string? userId = null)
    {
        try
        {
            var quota = await _storageQuotaService.GetUserQuotaAsync(userId);
            return Success(quota);
        }
        catch (ArgumentException ex)
        {
            return ValidationError(ex.Message);
        }
        catch (InvalidOperationException ex)
        {
            return ValidationError(ex.Message);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "获取用户配额失败, UserId: {UserId}", userId);
            return ServerError("获取用户配额失败，请稍后重试");
        }
    }

    /// <summary>
    /// 设置用户存储配额
    /// </summary>
    /// <param name="userId">用户ID</param>
    /// <param name="request">配额设置请求</param>
    /// <returns>更新后的配额信息</returns>
    [HttpPut("user/{userId}")]
    [RequireMenu("cloud-storage-quota")]
    public async Task<IActionResult> SetUserQuota(string userId, [FromBody] SetQuotaRequest request)
    {
        if (string.IsNullOrWhiteSpace(userId))
            return ValidationError("用户ID不能为空");

        var validation = ValidateModelState();
        if (validation != null) return validation;

        try
        {
            var quota = await _storageQuotaService.SetUserQuotaAsync(
                userId,
                request.TotalQuota,
                request.WarningThreshold,
                request.IsEnabled);
            _logger.LogInformation("设置用户配额, UserId: {UserId}, TotalQuota: {TotalQuota}", userId, request.TotalQuota);
            return Success(quota, "配额设置成功");
        }
        catch (ArgumentException ex)
        {
            return ValidationError(ex.Message);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "设置用户配额失败, UserId: {UserId}", userId);
            return ServerError("设置用户配额失败，请稍后重试");
        }
    }

    /// <summary>
    /// 批量设置用户配额
    /// </summary>
    /// <param name="request">批量配额设置请求</param>
    /// <returns>批量操作结果</returns>
    [HttpPost("batch/set")]
    [RequireMenu("cloud-storage-quota")]
    public async Task<IActionResult> BatchSetUserQuotas([FromBody] BatchSetQuotasRequest request)
    {
        var validation = ValidateModelState();
        if (validation != null) return validation;

        if (request.QuotaSettings == null || request.QuotaSettings.Count == 0)
            return ValidationError("配额设置列表不能为空");

        if (request.QuotaSettings.Count > 100)
            return ValidationError("批量操作最多支持100个用户");

        try
        {
            var result = await _storageQuotaService.BatchSetUserQuotasAsync(request.QuotaSettings);
            _logger.LogInformation("批量设置配额, Count: {Count}, Success: {SuccessCount}", request.QuotaSettings.Count, result.SuccessCount);
            return Success(result, $"批量设置完成，成功 {result.SuccessCount} 个，失败 {result.FailureCount} 个");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "批量设置配额失败");
            return ServerError("批量设置配额失败，请稍后重试");
        }
    }

    /// <summary>
    /// 重新计算用户存储使用量
    /// </summary>
    /// <param name="userId">用户ID</param>
    /// <returns>重新计算后的配额信息</returns>
    [HttpPost("user/{userId}/recalculate")]
    [RequireMenu("cloud-storage-quota")]
    public async Task<IActionResult> RecalculateUserStorage(string userId)
    {
        if (string.IsNullOrWhiteSpace(userId))
            return ValidationError("用户ID不能为空");

        try
        {
            var quota = await _storageQuotaService.RecalculateUserStorageAsync(userId);
            _logger.LogInformation("重新计算用户存储, UserId: {UserId}", userId);
            return Success(quota, "存储使用量重新计算完成");
        }
        catch (ArgumentException ex)
        {
            return ValidationError(ex.Message);
        }
        catch (InvalidOperationException ex)
        {
            return ValidationError(ex.Message);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "重新计算存储失败, UserId: {UserId}", userId);
            return ServerError("重新计算存储使用量失败，请稍后重试");
        }
    }

    /// <summary>
    /// 删除用户存储配额（恢复为默认配额）
    /// </summary>
    /// <param name="userId">用户ID</param>
    /// <returns>恢复后的配额信息</returns>
    [HttpDelete("user/{userId}")]
    [RequireMenu("cloud-storage-quota")]
    public async Task<IActionResult> DeleteUserQuota(string userId)
    {
        if (string.IsNullOrWhiteSpace(userId))
            return ValidationError("用户ID不能为空");

        try
        {
            // 清除配额，恢复为未分配状态
            const long defaultQuota = 0;
            var quota = await _storageQuotaService.SetUserQuotaAsync(userId, defaultQuota, 0, false);
            _logger.LogInformation("删除用户配额, UserId: {UserId}", userId);
            return Success(quota, "已清除用户配额，需管理员重新分配后才能使用网盘");
        }
        catch (ArgumentException ex)
        {
            return ValidationError(ex.Message);
        }
        catch (InvalidOperationException ex)
        {
            return ValidationError(ex.Message);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "删除配额失败, UserId: {UserId}", userId);
            return ServerError("删除配额失败，请稍后重试");
        }
    }

    #endregion

    #region 使用统计

    /// <summary>
    /// 获取存储使用统计信息
    /// </summary>
    /// <param name="userId">用户ID（可选，为空时获取当前用户）</param>
    /// <returns>存储使用统计信息</returns>
    [HttpGet("usage-stats")]
    public async Task<IActionResult> GetUsageStats([FromQuery] string? userId = null)
    {
        try
        {
            var stats = await _storageQuotaService.GetStorageUsageStatsAsync(userId);
            return Success(stats);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "获取存储统计失败");
            return ServerError("获取存储统计失败，请稍后重试");
        }
    }

    #endregion

    #region 列表查询

    /// <summary>
    /// 获取存储配额列表（分页）
    /// </summary>
    /// <param name="page">页码</param>
    /// <param name="pageSize">每页数量</param>
    /// <param name="sortBy">排序字段</param>
    /// <param name="sortOrder">排序方向</param>
    /// <param name="keyword">搜索关键词</param>
    /// <param name="companyId">企业ID（可选）</param>
    /// <param name="isEnabled">启用状态筛选（可选）</param>
    /// <returns>分页的存储配额列表</returns>
    [HttpGet("list")]
    [RequireMenu("cloud-storage-quota")]
    public async Task<IActionResult> GetStorageQuotaList(
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20,
        [FromQuery] string sortBy = "usedQuota",
        [FromQuery] string sortOrder = "desc",
        [FromQuery] string? keyword = null,
        [FromQuery] string? companyId = null,
        [FromQuery] bool? isEnabled = null)
    {
        // 验证分页参数
        if (page < 1 || page > 10000)
            return ValidationError("页码必须在 1-10000 之间");

        if (pageSize < 1 || pageSize > 100)
            return ValidationError("每页数量必须在 1-100 之间");

        // 验证排序参数
        var validSortFields = new[] { "usedQuota", "totalQuota", "usagePercentage", "fileCount", "createdAt", "lastCalculatedAt" };
        if (!validSortFields.Contains(sortBy))
            return ValidationError($"排序字段必须是以下之一: {string.Join(", ", validSortFields)}");

        if (sortOrder != "asc" && sortOrder != "desc")
            return ValidationError("排序方向必须是 asc 或 desc");

        try
        {
            var query = new StorageQuotaListQuery
            {
                Page = page,
                PageSize = pageSize,
                SortBy = sortBy,
                SortOrder = sortOrder,
                Keyword = keyword,
                CompanyId = companyId,
                IsEnabled = isEnabled
            };

            var result = await _storageQuotaService.GetStorageQuotaListAsync(query);
            return Success(result);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "获取存储配额列表失败");
            return ServerError("获取存储配额列表失败，请稍后重试");
        }
    }

    #endregion

    #region 统计和监控

    /// <summary>
    /// 获取企业存储统计
    /// </summary>
    /// <param name="companyId">企业ID（可选，为空时获取当前企业）</param>
    /// <returns>企业存储统计信息</returns>
    [HttpGet("company/usage")]
    [RequireMenu("cloud-storage-quota")]
    public async Task<IActionResult> GetCompanyUsage([FromQuery] string? companyId = null)
    {
        try
        {
            var statistics = await _storageQuotaService.GetCompanyStorageStatisticsAsync(companyId);
            return Success(statistics);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "获取企业存储统计失败");
            return ServerError("获取企业存储统计失败，请稍后重试");
        }
    }

    /// <summary>
    /// 获取存储使用量排行榜
    /// </summary>
    /// <param name="topCount">返回数量</param>
    /// <param name="companyId">企业ID（可选）</param>
    /// <returns>存储使用量排行</returns>
    [HttpGet("ranking")]
    [RequireMenu("cloud-storage-quota")]
    public async Task<IActionResult> GetStorageUsageRanking([FromQuery] int topCount = 10, [FromQuery] string? companyId = null)
    {
        if (topCount < 1 || topCount > 100)
            return ValidationError("返回数量必须在 1-100 之间");

        try
        {
            var ranking = await _storageQuotaService.GetStorageUsageRankingAsync(topCount, companyId);
            return Success(ranking);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "获取存储排行失败");
            return ServerError("获取存储使用量排行失败，请稍后重试");
        }
    }

    /// <summary>
    /// 获取存储配额警告列表
    /// </summary>
    /// <param name="warningThreshold">警告阈值（百分比，默认80%）</param>
    /// <param name="companyId">企业ID（可选）</param>
    /// <returns>配额警告列表</returns>
    [HttpGet("warnings")]
    [RequireMenu("cloud-storage-quota")]
    public async Task<IActionResult> GetQuotaWarnings([FromQuery] double warningThreshold = 0.8, [FromQuery] string? companyId = null)
    {
        if (warningThreshold < 0.1 || warningThreshold > 1.0)
            return ValidationError("警告阈值必须在 0.1-1.0 之间");

        try
        {
            var warnings = await _storageQuotaService.GetQuotaWarningsAsync(warningThreshold, companyId);
            return Success(new
            {
                data = warnings,
                total = warnings.Count
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "获取配额警告失败");
            return ServerError("获取配额警告失败，请稍后重试");
        }
    }

    #endregion

    #region 维护操作

    /// <summary>
    /// 清理未使用的存储配额记录
    /// </summary>
    /// <param name="companyId">企业ID（可选）</param>
    /// <returns>清理结果</returns>
    [HttpPost("cleanup")]
    [RequireMenu("cloud-storage-quota")]
    public async Task<IActionResult> CleanupUnusedQuotas([FromQuery] string? companyId = null)
    {
        try
        {
            var result = await _storageQuotaService.CleanupUnusedQuotasAsync(companyId);
            _logger.LogInformation("清理未使用配额, CompanyId: {CompanyId}, Count: {Count}", companyId, result.SuccessCount);
            return Success(result, $"清理完成，删除了 {result.SuccessCount} 个未使用的配额记录");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "清理配额记录失败");
            return ServerError("清理配额记录失败，请稍后重试");
        }
    }

    /// <summary>
    /// 检查存储可用性
    /// </summary>
    /// <param name="userId">用户ID</param>
    /// <param name="requiredSize">需要的空间大小（字节）</param>
    /// <returns>是否有足够空间</returns>
    [HttpGet("user/{userId}/check-availability")]
    public async Task<IActionResult> CheckStorageAvailability(string userId, [FromQuery] long requiredSize)
    {
        if (string.IsNullOrWhiteSpace(userId))
            return ValidationError("用户ID不能为空");

        if (requiredSize < 0)
            return ValidationError("需要的空间大小不能为负数");

        try
        {
            var isAvailable = await _storageQuotaService.CheckStorageAvailabilityAsync(userId, requiredSize);
            var result = new
            {
                UserId = userId,
                RequiredSize = requiredSize,
                IsAvailable = isAvailable,
                Message = isAvailable ? "存储空间充足" : "存储空间不足或未分配配额"
            };
            return Success(result);
        }
        catch (ArgumentException ex)
        {
            return ValidationError(ex.Message);
        }
        catch (InvalidOperationException ex)
        {
            return ValidationError(ex.Message);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "检查存储可用性失败, UserId: {UserId}", userId);
            return ServerError("检查存储可用性失败，请稍后重试");
        }
    }

    /// <summary>
    /// 更新用户存储使用量
    /// </summary>
    /// <param name="userId">用户ID</param>
    /// <param name="request">更新请求</param>
    /// <returns>更新后的配额信息</returns>
    [HttpPost("user/{userId}/update-usage")]
    [RequireMenu("cloud-storage-quota")]
    public async Task<IActionResult> UpdateStorageUsage(string userId, [FromBody] UpdateStorageUsageRequest request)
    {
        if (string.IsNullOrWhiteSpace(userId))
            return ValidationError("用户ID不能为空");

        var validation = ValidateModelState();
        if (validation != null) return validation;

        try
        {
            var quota = await _storageQuotaService.UpdateStorageUsageAsync(userId, request.SizeChange);
            _logger.LogInformation("更新存储使用量, UserId: {UserId}, SizeChange: {SizeChange}", userId, request.SizeChange);
            return Success(quota, "存储使用量更新成功");
        }
        catch (ArgumentException ex)
        {
            return ValidationError(ex.Message);
        }
        catch (InvalidOperationException ex)
        {
            return ValidationError(ex.Message);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "更新存储使用量失败, UserId: {UserId}", userId);
            return ServerError("更新存储使用量失败，请稍后重试");
        }
    }

    #endregion
}

#region 请求模型

/// <summary>
/// 设置配额请求模型
/// </summary>
public class SetQuotaRequest
{
    /// <summary>总配额（字节）</summary>
    public long TotalQuota { get; set; }

    /// <summary>警告阈值（百分比，0-100，可选）</summary>
    [Range(0, 100)]
    public int? WarningThreshold { get; set; }

    /// <summary>是否启用（可选）</summary>
    public bool? IsEnabled { get; set; }
}

/// <summary>
/// 批量设置配额请求模型
/// </summary>
public class BatchSetQuotasRequest
{
    /// <summary>配额设置列表</summary>
    public List<UserQuotaSetting> QuotaSettings { get; set; } = [];
}

/// <summary>
/// 更新存储使用量请求模型
/// </summary>
public class UpdateStorageUsageRequest
{
    /// <summary>大小变化（字节，可为负数）</summary>
    public long SizeChange { get; set; }
}


#endregion
