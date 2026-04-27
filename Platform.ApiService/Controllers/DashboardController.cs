using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Platform.ApiService.Attributes;
using Platform.ApiService.Models;
using Platform.ApiService.Services;
using Platform.ServiceDefaults.Controllers;

namespace Platform.ApiService.Controllers;

/// <summary>
/// 数据看板管理控制器
/// </summary>
[ApiController]
[Route("api/dashboard")]

public class DashboardController : BaseApiController
{
    private readonly IDashboardService _dashboardService;
    private readonly ILogger<DashboardController> _logger;

    public DashboardController(
        IDashboardService dashboardService,
        ILogger<DashboardController> logger)
    {
        _dashboardService = dashboardService ?? throw new ArgumentNullException(nameof(dashboardService));
        _logger = logger ?? throw new ArgumentNullException(nameof(logger));
    }

    /// <summary>
    /// 创建看板
    /// </summary>
    [HttpPost]
    [RequireMenu("data-dashboard")]
    public async Task<IActionResult> CreateDashboard([FromBody] CreateDashboardRequest request)
    {
        if (string.IsNullOrEmpty(request.Name))
            throw new ArgumentException("看板名称不能为空");

        var userId = RequiredUserId;
        var companyId = RequiredCompanyId;
        var dashboard = await _dashboardService.CreateDashboardAsync(request, userId, companyId);
        return Success(dashboard);
    }

    /// <summary>
    /// 获取看板详情
    /// </summary>
    [HttpGet("{id}")]
    [RequireMenu("data-dashboard")]
    public async Task<IActionResult> GetDashboard(string id)
    {
        var userId = RequiredUserId;
        var dashboard = await _dashboardService.GetDashboardByIdAsync(id, userId);
        if (dashboard == null)
            throw new ArgumentException("看板不存在");
        return Success(dashboard);
    }

    /// <summary>
    /// 分页查询看板列表
    /// </summary>
    [HttpGet("list")]
    [RequireMenu("data-dashboard")]
    public async Task<IActionResult> GetDashboards([FromQuery] Platform.ServiceDefaults.Models.ProTableRequest request)
    {
        var userId = RequiredUserId;
        var companyId = RequiredCompanyId;
        var result = await _dashboardService.GetDashboardsAsync(request, userId, companyId);
        return Success(result);
    }

    /// <summary>
    /// 更新看板
    /// </summary>
    [HttpPut("{id}")]
    [RequireMenu("data-dashboard")]
    public async Task<IActionResult> UpdateDashboard(string id, [FromBody] UpdateDashboardRequest request)
    {
        var userId = RequiredUserId;
        var dashboard = await _dashboardService.UpdateDashboardAsync(id, request, userId);
        if (dashboard == null)
            throw new ArgumentException("看板不存在");
        return Success(dashboard);
    }

    /// <summary>
    /// 删除看板
    /// </summary>
    [HttpDelete("{id}")]
    [RequireMenu("data-dashboard")]
    public async Task<IActionResult> DeleteDashboard(string id)
    {
        var userId = RequiredUserId;
        try
        {
            var result = await _dashboardService.DeleteDashboardAsync(id, userId);
            if (!result)
                throw new ArgumentException("看板不存在");
            return Success(true);
        }
        catch (UnauthorizedAccessException)
        {
            throw new ArgumentException("无权删除此看板");
        }
    }

    /// <summary>
    /// 复制看板
    /// </summary>
    [HttpPost("{id}/copy")]
    [RequireMenu("data-dashboard")]
    public async Task<IActionResult> CopyDashboard(string id)
    {
        var userId = RequiredUserId;
        var dashboard = await _dashboardService.CopyDashboardAsync(id, userId);
        if (dashboard == null)
            throw new ArgumentException("看板不存在");
        return Success(dashboard);
    }

    /// <summary>
    /// 生成分享链接
    /// </summary>
    [HttpPost("{id}/share")]
    [RequireMenu("data-dashboard")]
    public async Task<IActionResult> GenerateShareToken(string id)
    {
        var userId = RequiredUserId;
        var token = await _dashboardService.GenerateShareTokenAsync(id, userId);
        if (token == null)
            throw new ArgumentException("看板不存在");
        return Success(new { token, shareUrl = $"/dashboard/share/{token}" });
    }

    /// <summary>
    /// 通过分享令牌访问看板
    /// </summary>
    [HttpGet("share/{token}")]
    public async Task<IActionResult> GetDashboardByShareToken(string token)
    {
        if (string.IsNullOrEmpty(token))
            throw new ArgumentException("分享令牌不能为空");

        var dashboard = await _dashboardService.GetDashboardByShareTokenAsync(token);
        if (dashboard == null)
            throw new ArgumentException("分享链接无效或已过期");
        return Success(dashboard);
    }

    /// <summary>
    /// 添加卡片
    /// </summary>
    [HttpPost("{dashboardId}/cards")]
    [RequireMenu("data-dashboard")]
    public async Task<IActionResult> AddCard(string dashboardId, [FromBody] CreateDashboardCardRequest request)
    {
        if (string.IsNullOrEmpty(request.CardType))
            throw new ArgumentException("卡片类型不能为空");
        if (string.IsNullOrEmpty(request.Title))
            throw new ArgumentException("卡片标题不能为空");

        var userId = RequiredUserId;
        var card = await _dashboardService.AddCardAsync(dashboardId, request, userId);
        return Success(card);
    }

    /// <summary>
    /// 获取卡片详情
    /// </summary>
    [HttpGet("cards/{id}")]
    [RequireMenu("data-dashboard")]
    public async Task<IActionResult> GetCard(string id)
    {
        var userId = RequiredUserId;
        var card = await _dashboardService.GetCardByIdAsync(id, userId);
        if (card == null)
            throw new ArgumentException("卡片不存在");
        return Success(card);
    }

    /// <summary>
    /// 更新卡片
    /// </summary>
    [HttpPut("cards/{id}")]
    [RequireMenu("data-dashboard")]
    public async Task<IActionResult> UpdateCard(string id, [FromBody] UpdateDashboardCardRequest request)
    {
        var userId = RequiredUserId;
        var card = await _dashboardService.UpdateCardAsync(id, request, userId);
        if (card == null)
            throw new ArgumentException("卡片不存在");
        return Success(card);
    }

    /// <summary>
    /// 删除卡片
    /// </summary>
    [HttpDelete("cards/{id}")]
    [RequireMenu("data-dashboard")]
    public async Task<IActionResult> DeleteCard(string id)
    {
        var userId = RequiredUserId;
        try
        {
            var result = await _dashboardService.DeleteCardAsync(id, userId);
            if (!result)
                throw new ArgumentException("卡片不存在");
            return Success(true);
        }
        catch (UnauthorizedAccessException)
        {
            throw new ArgumentException("无权删除此卡片");
        }
    }

    /// <summary>
    /// 批量调整卡片位置
    /// </summary>
    [HttpPost("{dashboardId}/cards/reorder")]
    [RequireMenu("data-dashboard")]
    public async Task<IActionResult> ReorderCards(string dashboardId, [FromBody] ReorderCardsRequest request)
    {
        var userId = RequiredUserId;
        var result = await _dashboardService.ReorderCardsAsync(dashboardId, request, userId);
        return Success(result);
    }

    /// <summary>
    /// 获取卡片数据
    /// </summary>
    [HttpGet("cards/{cardId}/data")]
    [RequireMenu("data-dashboard")]
    public async Task<IActionResult> GetCardData(string cardId)
    {
        var userId = RequiredUserId;
        var companyId = RequiredCompanyId;
        var data = await _dashboardService.GetCardDataAsync(cardId, userId, companyId);
        if (data == null)
            throw new ArgumentException("卡片不存在");
        return Success(data);
    }

    /// <summary>
    /// 刷新卡片数据
    /// </summary>
    [HttpPost("cards/{cardId}/refresh")]
    [RequireMenu("data-dashboard")]
    public async Task<IActionResult> RefreshCardData(string cardId)
    {
        var userId = RequiredUserId;
        var companyId = RequiredCompanyId;
        var data = await _dashboardService.RefreshCardDataAsync(cardId, userId, companyId);
        if (data == null)
            throw new ArgumentException("卡片不存在");
        return Success(data);
    }

    /// <summary>
    /// 获取可用数据源列表
    /// </summary>
    [HttpGet("data-sources")]
    [RequireMenu("data-dashboard")]
    public async Task<IActionResult> GetAvailableDataSources()
    {
        var dataSources = await _dashboardService.GetAvailableDataSourcesAsync();
        return Success(dataSources);
    }

    /// <summary>
    /// 获取模块可用字段
    /// </summary>
    [HttpGet("data-sources/{module}/fields")]
    [RequireMenu("data-dashboard")]
    public async Task<IActionResult> GetModuleFields(string module)
    {
        if (string.IsNullOrEmpty(module))
            throw new ArgumentException("模块不能为空");

        var fields = await _dashboardService.GetModuleFieldsAsync(module);
        return Success(fields);
    }

    /// <summary>
    /// 获取统计信息
    /// </summary>
    [HttpGet("statistics")]
    [RequireMenu("data-dashboard")]
    public async Task<IActionResult> GetStatistics()
    {
        var userId = RequiredUserId;
        var companyId = RequiredCompanyId;
        var statistics = await _dashboardService.GetStatisticsAsync(userId, companyId);
        return Success(statistics);
    }
}
