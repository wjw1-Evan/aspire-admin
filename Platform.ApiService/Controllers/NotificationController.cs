using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Platform.ApiService.Models.Entities;
using Platform.ApiService.Services;
using Platform.ServiceDefaults.Controllers;
using Platform.ServiceDefaults.Models;

namespace Platform.ApiService.Controllers;

/// <summary>
/// 新版通知业务控制器
/// </summary>
[Authorize]
[ApiController]
[Route("api/notifications")]
public class NotificationController : BaseApiController
{
    private readonly INotificationService _notificationService;

    public NotificationController(INotificationService notificationService)
    {
        _notificationService = notificationService;
    }

    /// <summary>
    /// 获取通知列表（分页）
    /// </summary>
    [HttpGet]
    public async Task<IActionResult> GetList([FromQuery] ProTableRequest request)
    {
        var result = await _notificationService.GetPagedListAsync(RequiredUserId, request);
        return Success(result);
    }

    // --- 以下接口已废弃，改由 SSE 推送更新 ---
    // [HttpGet("statistics")]
    // public async Task<IActionResult> GetStatistics() { ... }


    /// <summary>
    /// 标记单条已读
    /// </summary>
    [HttpPut("{id}/read")]
    public async Task<IActionResult> MarkAsRead(string id)
    {
        var success = await _notificationService.MarkAsReadAsync(RequiredUserId, id);
        return success ? Success(null, "标记成功") : BadRequest("通知不存在或无权操作");
    }

    /// <summary>
    /// 标记单条未读
    /// </summary>
    [HttpPut("{id}/unread")]
    public async Task<IActionResult> MarkAsUnread(string id)
    {
        var success = await _notificationService.MarkAsUnreadAsync(RequiredUserId, id);
        return success ? Success(null, "标记成功") : BadRequest("通知不存在或无权操作");
    }

    /// <summary>
    /// 全部标记为已读
    /// </summary>
    [HttpPut("read-all")]
    public async Task<IActionResult> MarkAllAsRead([FromQuery] NotificationCategory? category = null)
    {
        var count = await _notificationService.MarkAllAsReadAsync(RequiredUserId, category);
        return Success(count, $"已处理 {count} 条通知");
    }

    /// <summary>
    /// 模拟发送通知 (仅用于测试)
    /// </summary>
    [HttpPost("test-publish")]
    public async Task<IActionResult> TestPublish([FromBody] TestPublishRequest request)
    {
        await _notificationService.PublishAsync(
            RequiredUserId, 
            request.Title, 
            request.Content, 
            request.Category, 
            request.Level, 
            request.ActionUrl);
            
        return Success(null, "模拟推送成功");
    }
}

public class TestPublishRequest
{
    public string Title { get; set; } = null!;
    public string? Content { get; set; }
    public NotificationCategory Category { get; set; } = NotificationCategory.System;
    public NotificationLevel Level { get; set; } = NotificationLevel.Info;
    public string? ActionUrl { get; set; }
}
