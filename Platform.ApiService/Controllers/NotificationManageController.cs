using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Platform.ApiService.Attributes;
using Platform.ApiService.Models.DTOs;
using Platform.ApiService.Services;
using Platform.ServiceDefaults.Controllers;
using Platform.ServiceDefaults.Models;

namespace Platform.ApiService.Controllers;

[Authorize]
[ApiController]
[Route("api/notification-manage")]
[RequireMenu("notification-management")]
public class NotificationManageController : BaseApiController
{
    private readonly INotificationManageService _service;
    private readonly ILogger<NotificationManageController> _logger;

    public NotificationManageController(
        INotificationManageService service,
        ILogger<NotificationManageController> logger)
    {
        _service = service ?? throw new ArgumentNullException(nameof(service));
        _logger = logger;
    }

    [HttpPost("send")]
    public async Task<IActionResult> SendToUsers([FromBody] AdminSendRequest request)
    {
        var result = await _service.SendToUsersAsync(request, RequiredUserId, RequiredCompanyId);
        return Success(result);
    }

    [HttpPost("broadcast")]
    public async Task<IActionResult> Broadcast([FromBody] AdminBroadcastRequest request)
    {
        var result = await _service.BroadcastToAllAsync(request, RequiredUserId, RequiredCompanyId);
        return Success(result);
    }

    [HttpGet("history")]
    public async Task<IActionResult> GetHistory([FromQuery] ProTableRequest request)
    {
        var result = await _service.GetHistoryAsync(request, RequiredCompanyId);
        return Success(result);
    }

    [HttpGet("history/{id}")]
    public async Task<IActionResult> GetDetail(string id)
    {
        var result = await _service.GetDetailAsync(id, RequiredCompanyId);
        return Success(result);
    }

    [HttpGet("statistics")]
    public async Task<IActionResult> GetStatistics()
    {
        var result = await _service.GetStatisticsAsync(RequiredCompanyId);
        return Success(result);
    }
}
