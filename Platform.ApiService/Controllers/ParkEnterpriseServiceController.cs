using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Platform.ApiService.Models;
using Platform.ApiService.Services;
using Platform.ServiceDefaults.Controllers;
using Platform.ServiceDefaults.Models;

namespace Platform.ApiService.Controllers;

/// <summary>
/// 企业服务管理控制器
/// </summary>
[ApiController]
[Route("api/park/services")]
public class ParkEnterpriseServiceController : BaseApiController
{
    private readonly IParkEnterpriseServiceService _enterpriseService;
    private readonly ILogger<ParkEnterpriseServiceController> _logger;

    /// <summary>
    /// 初始化企业服务控制器
    /// </summary>
    /// <param name="enterpriseService">企业服务管理服务</param>
    /// <param name="logger">日志服务</param>
    public ParkEnterpriseServiceController(IParkEnterpriseServiceService enterpriseService, ILogger<ParkEnterpriseServiceController> logger)
    {
        _enterpriseService = enterpriseService;
        _logger = logger;
    }

    #region 服务类别管理

    /// <summary>
    /// 获取服务类别列表
    /// </summary>
    [HttpGet("categories")]
    public async Task<IActionResult> GetCategories()
    {
        try
        {
            var result = await _enterpriseService.GetCategoriesAsync();
            return Success(result);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "获取服务类别列表失败");
            throw new ArgumentException("获取服务类别列表失败");
        }
    }

    /// <summary>
    /// 创建服务类别
    /// </summary>
    [HttpPost("categories")]
    public async Task<IActionResult> CreateCategory([FromBody] CreateServiceCategoryRequest request)
    {
        try
        {
            var result = await _enterpriseService.CreateCategoryAsync(request);
            return Success(result);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "创建服务类别失败");
            throw new ArgumentException("创建服务类别失败: " + ex.Message);
        }
    }

    /// <summary>
    /// 更新服务类别
    /// </summary>
    [HttpPut("categories/{id}")]
    public async Task<IActionResult> UpdateCategory(string id, [FromBody] CreateServiceCategoryRequest request)
    {
        try
        {
            var result = await _enterpriseService.UpdateCategoryAsync(id, request);
            if (result == null)
                throw new ArgumentException("服务类别不存在");
            return Success(result);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "更新服务类别失败: {Id}", id);
            throw new ArgumentException("更新服务类别失败: " + ex.Message);
        }
    }

    /// <summary>
    /// 删除服务类别
    /// </summary>
    [HttpDelete("categories/{id}")]
    public async Task<IActionResult> DeleteCategory(string id)
    {
        try
        {
            var result = await _enterpriseService.DeleteCategoryAsync(id);
            if (!result)
                throw new ArgumentException("服务类别不存在或无法删除");
            return Success(true);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "删除服务类别失败: {Id}", id);
            throw new ArgumentException("删除服务类别失败: " + ex.Message);
        }
    }

    /// <summary>
    /// 切换服务类别状态
    /// </summary>
    [HttpPut("categories/{id}/toggle")]
    public async Task<IActionResult> ToggleCategoryStatus(string id)
    {
        try
        {
            var result = await _enterpriseService.ToggleCategoryStatusAsync(id);
            if (!result)
                throw new ArgumentException("服务类别不存在");
            return Success(true);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "切换服务类别状态失败: {Id}", id);
            throw new ArgumentException("切换服务类别状态失败: " + ex.Message);
        }
    }

    #endregion

    #region 服务申请管理

    /// <summary>
    /// 获取服务申请列表
    /// </summary>
    [HttpGet("requests/list")]
    public async Task<IActionResult> GetRequests([FromQuery] Platform.ServiceDefaults.Models.PageParams request)
    {
        try
        {
            var result = await _enterpriseService.GetRequestsAsync(request);
            return Success(result);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "获取服务申请列表失败");
            throw new ArgumentException("获取服务申请列表失败");
        }
    }

    /// <summary>
    /// 获取单个服务申请
    /// </summary>
    [HttpGet("requests/{id}")]
    public async Task<IActionResult> GetRequest(string id)
    {
        try
        {
            var result = await _enterpriseService.GetRequestByIdAsync(id);
            if (result == null)
                throw new ArgumentException("服务申请不存在");
            return Success(result);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "获取服务申请详情失败: {Id}", id);
            throw new ArgumentException("获取服务申请详情失败");
        }
    }

    /// <summary>
    /// 创建服务申请
    /// </summary>
    [HttpPost("requests")]
    public async Task<IActionResult> CreateRequest([FromBody] CreateServiceRequestRequest request)
    {
        try
        {
            var result = await _enterpriseService.CreateRequestAsync(request);
            return Success(result);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "创建服务申请失败");
            throw new ArgumentException("创建服务申请失败: " + ex.Message);
        }
    }

    /// <summary>
    /// 更新服务申请状态
    /// </summary>
    [HttpPut("requests/{id}/status")]
    public async Task<IActionResult> UpdateRequestStatus(string id, [FromBody] UpdateServiceRequestStatusRequest request)
    {
        try
        {
            var result = await _enterpriseService.UpdateRequestStatusAsync(id, request);
            if (result == null)
                throw new ArgumentException("服务申请不存在");
            return Success(result);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "更新服务申请状态失败: {Id}", id);
            throw new ArgumentException("更新服务申请状态失败: " + ex.Message);
        }
    }

    /// <summary>
    /// 删除服务申请
    /// </summary>
    [HttpDelete("requests/{id}")]
    public async Task<IActionResult> DeleteRequest(string id)
    {
        try
        {
            var result = await _enterpriseService.DeleteRequestAsync(id);
            if (!result)
                throw new ArgumentException("服务申请不存在或无法删除");
            return Success(true);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "删除服务申请失败: {Id}", id);
            throw new ArgumentException("删除服务申请失败: " + ex.Message);
        }
    }

    /// <summary>
    /// 评价服务
    /// </summary>
    [HttpPost("requests/{id}/rate")]
    public async Task<IActionResult> RateRequest(string id, [FromBody] RateServiceRequest request)
    {
        try
        {
            var result = await _enterpriseService.RateRequestAsync(id, request.Rating, request.Feedback);
            if (!result)
                throw new ArgumentException("服务申请不存在或未完成");
            return Success(true);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "评价服务失败: {Id}", id);
            throw new ArgumentException("评价服务失败: " + ex.Message);
        }
    }

    #endregion

    #region 统计

    /// <summary>
    /// 获取服务统计
    /// </summary>
    /// <param name="startDate">开始日期</param>
    /// <param name="endDate">结束日期</param>
    [HttpGet("statistics")]
    public async Task<IActionResult> GetServiceStatistics([FromQuery] DateTime? startDate = null, [FromQuery] DateTime? endDate = null)
    {
        try
        {
            var result = await _enterpriseService.GetStatisticsAsync(startDate, endDate);
            return Success(result);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "获取服务统计失败");
            throw new ArgumentException("获取服务统计失败");
        }
    }

    #endregion
}
