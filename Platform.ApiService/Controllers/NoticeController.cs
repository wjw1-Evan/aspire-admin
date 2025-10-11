using Microsoft.AspNetCore.Mvc;
using Platform.ApiService.Attributes;
using Platform.ApiService.Models;
using Platform.ApiService.Services;

namespace Platform.ApiService.Controllers;

[ApiController]
[Route("api")]
public class NoticeController : BaseApiController
{
    private readonly INoticeService _noticeService;

    public NoticeController(INoticeService noticeService)
    {
        _noticeService = noticeService;
    }

    /// <summary>
    /// 获取所有通知
    /// </summary>
    [HttpGet("notices")]
    [RequirePermission("notice", "read")]
    public async Task<IActionResult> GetNotices()
    {
        var result = await _noticeService.GetNoticesAsync();
        return Ok(result);
    }

    /// <summary>
    /// 根据ID获取通知
    /// </summary>
    /// <param name="id">通知ID</param>
    [HttpGet("{id}")]
    [RequirePermission("notice", "read")]
    public async Task<IActionResult> GetNoticeById(string id)
    {
        var notice = await _noticeService.GetNoticeByIdAsync(id);
        if (notice == null)
            throw new KeyNotFoundException($"通知 {id} 不存在");
        
        return Success(notice);
    }

    /// <summary>
    /// 创建新通知
    /// </summary>
    /// <param name="request">创建通知请求</param>
    [HttpPost]
    [RequirePermission("notice", "create")]
    public async Task<IActionResult> CreateNotice([FromBody] CreateNoticeRequest request)
    {
        var notice = await _noticeService.CreateNoticeAsync(request);
        return Success(notice, "创建成功");
    }

    /// <summary>
    /// 更新通知
    /// </summary>
    /// <param name="id">通知ID</param>
    /// <param name="request">更新通知请求</param>
    [HttpPut("{id}")]
    [RequirePermission("notice", "update")]
    public async Task<IActionResult> UpdateNotice(string id, [FromBody] UpdateNoticeRequest request)
    {
        var notice = await _noticeService.UpdateNoticeAsync(id, request);
        if (notice == null)
            throw new KeyNotFoundException($"通知 {id} 不存在");
        
        return Success(notice, "更新成功");
    }

    /// <summary>
    /// 删除通知
    /// </summary>
    /// <param name="id">通知ID</param>
    [HttpDelete("{id}")]
    [RequirePermission("notice", "delete")]
    public async Task<IActionResult> DeleteNotice(string id)
    {
        var deleted = await _noticeService.DeleteNoticeAsync(id);
        if (!deleted)
            throw new KeyNotFoundException($"通知 {id} 不存在");
        
        return Success("删除成功");
    }
}
