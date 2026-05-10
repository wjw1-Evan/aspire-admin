using Microsoft.AspNetCore.Mvc;
using Platform.ApiService.Attributes;
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
        _tenantService = tenantService ?? throw new ArgumentNullException(nameof(tenantService));
        _logger = logger ?? throw new ArgumentNullException(nameof(logger));
    }

    #region 租户管理

    /// <summary>
    /// 获取租户列表
    /// </summary>
    [HttpGet("tenants/list")]
    [RequireMenu("park-management-tenant")]
    public async Task<IActionResult> GetTenants([FromQuery] Platform.ServiceDefaults.Models.ProTableRequest request)
    {
        var result = await _tenantService.GetTenantsAsync(request);
        return Success(result);
    }

    /// <summary>
    /// 获取单个租户
    /// </summary>
    [HttpGet("tenants/{id}")]
    [RequireMenu("park-management-tenant")]
    public async Task<IActionResult> GetTenant(string id)
    {
        var result = await _tenantService.GetTenantByIdAsync(id);
        if (result == null)
            throw new KeyNotFoundException(ErrorCode.ResourceNotFound);
        return Success(result);
    }

    /// <summary>
    /// 创建租户
    /// </summary>
    [HttpPost("tenants")]
    [RequireMenu("park-management-tenant")]
    public async Task<IActionResult> CreateTenant([FromBody] CreateParkTenantRequest request)
    {
        if (string.IsNullOrEmpty(request.TenantName))
            throw new ArgumentException("租户名称不能为空", nameof(request));

        var result = await _tenantService.CreateTenantAsync(request);
        return Success(result);
    }

    /// <summary>
    /// 更新租户
    /// </summary>
    [HttpPut("tenants/{id}")]
    [RequireMenu("park-management-tenant")]
    public async Task<IActionResult> UpdateTenant(string id, [FromBody] CreateParkTenantRequest request)
    {
        var result = await _tenantService.UpdateTenantAsync(id, request);
        if (result == null)
            throw new KeyNotFoundException(ErrorCode.ResourceNotFound);
        return Success(result);
    }

    /// <summary>
    /// 删除租户
    /// </summary>
    [HttpDelete("tenants/{id}")]
    [RequireMenu("park-management-tenant")]
    public async Task<IActionResult> DeleteTenant(string id)
    {
        var result = await _tenantService.DeleteTenantAsync(id);
        if (!result)
            throw new KeyNotFoundException(ErrorCode.ResourceNotFound);
        return Success(true);
    }

    #endregion

    #region 合同管理

    /// <summary>
    /// 获取合同列表
    /// </summary>
    [HttpGet("contracts/list")]
    [RequireMenu("park-management-tenant")]
    public async Task<IActionResult> GetContracts([FromQuery] Platform.ServiceDefaults.Models.ProTableRequest request)
    {
        var result = await _tenantService.GetContractsAsync(request);
        return Success(result);
    }

    /// <summary>
    /// 获取单个合同
    /// </summary>
    [HttpGet("contracts/{id}")]
    [RequireMenu("park-management-tenant")]
    public async Task<IActionResult> GetContract(string id)
    {
        var result = await _tenantService.GetContractByIdAsync(id);
        if (result == null)
            throw new KeyNotFoundException(ErrorCode.ResourceNotFound);
        return Success(result);
    }

    /// <summary>
    /// 创建合同
    /// </summary>
    [HttpPost("contracts")]
    [RequireMenu("park-management-tenant")]
    public async Task<IActionResult> CreateContract([FromBody] CreateLeaseContractRequest request)
    {
        var result = await _tenantService.CreateContractAsync(request);
        return Success(result);
    }

    /// <summary>
    /// 更新合同
    /// </summary>
    [HttpPut("contracts/{id}")]
    [RequireMenu("park-management-tenant")]
    public async Task<IActionResult> UpdateContract(string id, [FromBody] CreateLeaseContractRequest request)
    {
        var result = await _tenantService.UpdateContractAsync(id, request);
        if (result == null)
            throw new KeyNotFoundException(ErrorCode.ResourceNotFound);
        return Success(result);
    }

    /// <summary>
    /// 删除合同
    /// </summary>
    [HttpDelete("contracts/{id}")]
    [RequireMenu("park-management-tenant")]
    public async Task<IActionResult> DeleteContract(string id)
    {
        var result = await _tenantService.DeleteContractAsync(id);
        if (!result)
            throw new KeyNotFoundException(ErrorCode.ResourceNotFound);
        return Success(true);
    }

    /// <summary>
    /// 续签合同
    /// </summary>
    [HttpPost("contracts/{id}/renew")]
    [RequireMenu("park-management-tenant")]
    public async Task<IActionResult> RenewContract(string id, [FromBody] CreateLeaseContractRequest request)
    {
        var result = await _tenantService.RenewContractAsync(id, request);
        if (result == null)
            throw new KeyNotFoundException(ErrorCode.ResourceNotFound);
        return Success(result);
    }

    /// <summary>
    /// 创建合同付款记录
    /// </summary>
    [HttpPost("contracts/payments")]
    [RequireMenu("park-management-tenant")]
    public async Task<IActionResult> CreatePaymentRecord([FromBody] CreateLeasePaymentRecordRequest request)
    {
        var result = await _tenantService.CreatePaymentRecordAsync(request);
        return Success(result);
    }

    /// <summary>
    /// 获取合同付款记录列表
    /// </summary>
    [HttpGet("contracts/{id}/payments")]
    [RequireMenu("park-management-tenant")]
    public async Task<IActionResult> GetPaymentRecords(string id)
    {
        var result = await _tenantService.GetPaymentRecordsByContractIdAsync(id);
        return Success(result);
    }

    /// <summary>
    /// 删除合同付款记录
    /// </summary>
    [HttpDelete("contracts/payments/{id}")]
    [RequireMenu("park-management-tenant")]
    public async Task<IActionResult> DeletePaymentRecord(string id)
    {
        var result = await _tenantService.DeletePaymentRecordAsync(id);
        if (!result)
            throw new KeyNotFoundException(ErrorCode.ResourceNotFound);
        return Success(true);
    }
    #endregion

    #region 统计

    /// <summary>
    /// 获取租户统计
    /// </summary>
    /// <param name="startDate">开始日期</param>
    /// <param name="endDate">结束日期</param>
    [HttpGet("tenant/statistics")]
    [RequireMenu("park-management-tenant")]
    public async Task<IActionResult> GetStatistics([FromQuery] DateTime? startDate = null, [FromQuery] DateTime? endDate = null)
    {
        var result = await _tenantService.GetStatisticsAsync(startDate, endDate);
        return Success(result);
    }

    #endregion
}
