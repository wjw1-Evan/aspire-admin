using Microsoft.AspNetCore.Mvc;
using Platform.ApiService.Models;
using Platform.ApiService.Services;

namespace Platform.ApiService.Controllers;

[ApiController]
[Route("api")]
public class NoticeController : ControllerBase
{
    private readonly NoticeService _noticeService;

    public NoticeController(NoticeService noticeService)
    {
        _noticeService = noticeService;
    }

    /// <summary>
    /// 获取所有通知
    /// </summary>
    [HttpGet("notices")]
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
    public async Task<IActionResult> GetNoticeById(string id)
    {
        var notice = await _noticeService.GetNoticeByIdAsync(id);
        if (notice == null)
            return NotFound($"Notice with ID {id} not found");
        
        return Ok(notice);
    }

    /// <summary>
    /// 创建新通知
    /// </summary>
    /// <param name="request">创建通知请求</param>
    [HttpPost]
    public async Task<IActionResult> CreateNotice([FromBody] CreateNoticeRequest request)
    {
        var notice = await _noticeService.CreateNoticeAsync(request);
        return Created($"/api/notices/{notice.Id}", notice);
    }

    /// <summary>
    /// 更新通知
    /// </summary>
    /// <param name="id">通知ID</param>
    /// <param name="request">更新通知请求</param>
    [HttpPut("{id}")]
    public async Task<IActionResult> UpdateNotice(string id, [FromBody] UpdateNoticeRequest request)
    {
        var notice = await _noticeService.UpdateNoticeAsync(id, request);
        if (notice == null)
            return NotFound($"Notice with ID {id} not found");
        
        return Ok(notice);
    }

    /// <summary>
    /// 删除通知
    /// </summary>
    /// <param name="id">通知ID</param>
    [HttpDelete("{id}")]
    public async Task<IActionResult> DeleteNotice(string id)
    {
        var deleted = await _noticeService.DeleteNoticeAsync(id);
        if (!deleted)
            return NotFound($"Notice with ID {id} not found");
        
        return NoContent();
    }
}
