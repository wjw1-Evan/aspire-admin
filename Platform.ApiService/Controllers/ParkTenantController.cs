using Microsoft.AspNetCore.Mvc;
using Platform.ApiService.Models;
using Platform.ApiService.Services;
using Platform.ServiceDefaults.Controllers;
using Platform.ServiceDefaults.Models;

namespace Platform.ApiService.Controllers;

/// <summary>
/// 园区租户管理控制器
/// </summary>
[ApiController]
[Route("api/park")]
public class ParkTenantController : BaseApiController
{
    private readonly IParkTenantService _tenantService;
    private readonly ILogger<ParkTenantController> _logger;

    /// <summary>
    /// 初始化租户管理控制器
    /// </summary>
    /// <param name="tenantService">租户管理服务</param>
    /// <param name="logger">日志服务</param>
    public ParkTenantController(IParkTenantService tenantService, ILogger<ParkTenantController> logger)
    {
        _tenantService = tenantService;
        _logger = logger;
    }

    #region 租户管理

    /// <summary>
    /// 获取租户列表
    /// </summary>
    [HttpPost("tenants/list")]
    public async Task<IActionResult> GetTenants([FromBody] ParkTenantListRequest request)
    {
        try
        {
            var result = await _tenantService.GetTenantsAsync(request);
            return Success(result);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "获取租户列表失败");
            return Error("ERROR", "获取租户列表失败");
        }
    }

    /// <summary>
    /// 获取单个租户
    /// </summary>
    [HttpGet("tenants/{id}")]
    public async Task<IActionResult> GetTenant(string id)
    {
        try
        {
            var result = await _tenantService.GetTenantByIdAsync(id);
            if (result == null)
                return Error("ERROR", "租户不存在");
            return Success(result);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "获取租户详情失败: {Id}", id);
            return Error("ERROR", "获取租户详情失败");
        }
    }

    /// <summary>
    /// 创建租户
    /// </summary>
    [HttpPost("tenants")]
    public async Task<IActionResult> CreateTenant([FromBody] CreateParkTenantRequest request)
    {
        try
        {
            var result = await _tenantService.CreateTenantAsync(request);
            return Success(result);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "创建租户失败");
            return Error("ERROR", "创建租户失败: " + ex.Message);
        }
    }

    /// <summary>
    /// 更新租户
    /// </summary>
    [HttpPut("tenants/{id}")]
    public async Task<IActionResult> UpdateTenant(string id, [FromBody] CreateParkTenantRequest request)
    {
        try
        {
            var result = await _tenantService.UpdateTenantAsync(id, request);
            if (result == null)
                return Error("ERROR", "租户不存在");
            return Success(result);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "更新租户失败: {Id}", id);
            return Error("ERROR", "更新租户失败: " + ex.Message);
        }
    }

    /// <summary>
    /// 删除租户
    /// </summary>
    [HttpDelete("tenants/{id}")]
    public async Task<IActionResult> DeleteTenant(string id)
    {
        try
        {
            var result = await _tenantService.DeleteTenantAsync(id);
            if (!result)
                return Error("ERROR", "租户不存在或无法删除");
            return Success(true);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "删除租户失败: {Id}", id);
            return Error("ERROR", "删除租户失败: " + ex.Message);
        }
    }

    #endregion

    #region 合同管理

    /// <summary>
    /// 获取合同列表
    /// </summary>
    [HttpPost("contracts/list")]
    public async Task<IActionResult> GetContracts([FromBody] LeaseContractListRequest request)
    {
        try
        {
            var result = await _tenantService.GetContractsAsync(request);
            return Success(result);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "获取合同列表失败");
            return Error("ERROR", "获取合同列表失败");
        }
    }

    /// <summary>
    /// 获取单个合同
    /// </summary>
    [HttpGet("contracts/{id}")]
    public async Task<IActionResult> GetContract(string id)
    {
        try
        {
            var result = await _tenantService.GetContractByIdAsync(id);
            if (result == null)
                return Error("ERROR", "合同不存在");
            return Success(result);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "获取合同详情失败: {Id}", id);
            return Error("ERROR", "获取合同详情失败");
        }
    }

    /// <summary>
    /// 创建合同
    /// </summary>
    [HttpPost("contracts")]
    public async Task<IActionResult> CreateContract([FromBody] CreateLeaseContractRequest request)
    {
        try
        {
            var result = await _tenantService.CreateContractAsync(request);
            return Success(result);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "创建合同失败");
            return Error("ERROR", "创建合同失败: " + ex.Message);
        }
    }

    /// <summary>
    /// 更新合同
    /// </summary>
    [HttpPut("contracts/{id}")]
    public async Task<IActionResult> UpdateContract(string id, [FromBody] CreateLeaseContractRequest request)
    {
        try
        {
            var result = await _tenantService.UpdateContractAsync(id, request);
            if (result == null)
                return Error("ERROR", "合同不存在");
            return Success(result);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "更新合同失败: {Id}", id);
            return Error("ERROR", "更新合同失败: " + ex.Message);
        }
    }

    /// <summary>
    /// 删除合同
    /// </summary>
    [HttpDelete("contracts/{id}")]
    public async Task<IActionResult> DeleteContract(string id)
    {
        try
        {
            var result = await _tenantService.DeleteContractAsync(id);
            if (!result)
                return Error("ERROR", "合同不存在或无法删除");
            return Success(true);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "删除合同失败: {Id}", id);
            return Error("ERROR", "删除合同失败: " + ex.Message);
        }
    }

    /// <summary>
    /// 续签合同
    /// </summary>
    [HttpPost("contracts/{id}/renew")]
    public async Task<IActionResult> RenewContract(string id, [FromBody] CreateLeaseContractRequest request)
    {
        try
        {
            var result = await _tenantService.RenewContractAsync(id, request);
            if (result == null)
                return Error("ERROR", "合同不存在或无法续签");
            return Success(result);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "续签合同失败: {Id}", id);
            return Error("ERROR", "续签合同失败: " + ex.Message);
        }
    }

    /// <summary>
    /// 创建合同付款记录
    /// </summary>
    [HttpPost("contracts/payments")]
    public async Task<IActionResult> CreatePaymentRecord([FromBody] CreateLeasePaymentRecordRequest request)
    {
        try
        {
            var result = await _tenantService.CreatePaymentRecordAsync(request);
            return Success(result);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "创建合同付款记录失败");
            return Error("ERROR", "创建合同付款记录失败: " + ex.Message);
        }
    }

    /// <summary>
    /// 获取合同付款记录列表
    /// </summary>
    [HttpGet("contracts/{id}/payments")]
    public async Task<IActionResult> GetPaymentRecords(string id)
    {
        try
        {
            var result = await _tenantService.GetPaymentRecordsByContractIdAsync(id);
            return Success(result);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "获取合同付款记录列表失败: {Id}", id);
            return Error("ERROR", "获取合同付款记录列表失败");
        }
    }

    /// <summary>
    /// 删除合同付款记录
    /// </summary>
    [HttpDelete("contracts/payments/{id}")]
    public async Task<IActionResult> DeletePaymentRecord(string id)
    {
        try
        {
            var result = await _tenantService.DeletePaymentRecordAsync(id);
            return Success(result);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "删除合同付款记录失败: {Id}", id);
            return Error("ERROR", "删除合同付款记录失败: " + ex.Message);
        }
    }
    #endregion

    #region 统计

    /// <summary>
    /// 获取租户统计
    /// </summary>
    /// <param name="startDate">开始日期</param>
    /// <param name="endDate">结束日期</param>
    [HttpGet("tenant/statistics")]
    public async Task<IActionResult> GetStatistics([FromQuery] DateTime? startDate = null, [FromQuery] DateTime? endDate = null)
    {
        try
        {
            var result = await _tenantService.GetStatisticsAsync(startDate, endDate);
            return Success(result);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "获取租户统计失败");
            return Error("ERROR", "获取租户统计失败");
        }
    }

    #endregion
}
