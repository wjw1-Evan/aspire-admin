using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Platform.ApiService.Attributes;
using Platform.ApiService.Models;
using Platform.ApiService.Services;

namespace Platform.ApiService.Controllers;

[ApiController]
[Route("api")]
[Authorize] // 所有接口默认需要登录
public class NoticeController : BaseApiController
{
    private readonly INoticeService _noticeService;

    public NoticeController(INoticeService noticeService)
    {
        _noticeService = noticeService;
    }

    /// <summary>
    /// 获取所有通知（所有登录用户可访问）
    /// </summary>
    [HttpGet("notices")]
    public async Task<IActionResult> GetNotices()
    {
        var result = await _noticeService.GetNoticesAsync();
        return Ok(result);
    }

    /// <summary>
    /// 根据ID获取通知（所有登录用户可访问）
    /// </summary>
    /// <param name="id">通知ID</param>
    [HttpGet("notices/{id}")]
    public async Task<IActionResult> GetNoticeById(string id)
    {
        var notice = await _noticeService.GetNoticeByIdAsync(id);
        if (notice == null)
            throw new KeyNotFoundException($"通知 {id} 不存在");
        
        return Success(notice);
    }

    /// <summary>
    /// 更新通知（标记为已读/未读）（所有登录用户可访问）
    /// </summary>
    /// <param name="id">通知ID</param>
    /// <param name="request">更新请求</param>
    [HttpPut("notices/{id}")]
    public async Task<IActionResult> UpdateNotice(string id, [FromBody] UpdateNoticeRequest request)
    {
        // 普通用户只能修改 Read 状态（已读/未读），不能修改其他属性
        if (request.Read.HasValue && 
            string.IsNullOrEmpty(request.Title) && 
            string.IsNullOrEmpty(request.Description) &&
            string.IsNullOrEmpty(request.Avatar) &&
            string.IsNullOrEmpty(request.Status) &&
            string.IsNullOrEmpty(request.Extra) &&
            !request.Type.HasValue &&
            !request.ClickClose.HasValue &&
            !request.Datetime.HasValue)
        {
            // 只修改 Read 状态，允许
            var notice = await _noticeService.UpdateNoticeAsync(id, request);
            if (notice == null)
                throw new KeyNotFoundException($"通知 {id} 不存在");
            
            return Success(notice, "更新成功");
        }
        
        // 其他修改需要权限
        throw new UnauthorizedAccessException("没有权限修改通知内容，只能标记为已读/未读");
    }

    /// <summary>
    /// 创建新通知（需要权限）
    /// </summary>
    /// <param name="request">创建通知请求</param>
    [HttpPost("notices")]
    [RequirePermission("notice", "create")]
    public async Task<IActionResult> CreateNotice([FromBody] CreateNoticeRequest request)
    {
        var notice = await _noticeService.CreateNoticeAsync(request);
        return Success(notice, "创建成功");
    }

    /// <summary>
    /// 删除通知（所有登录用户可删除自己的通知）
    /// </summary>
    /// <param name="id">通知ID</param>
    [HttpDelete("notices/{id}")]
    public async Task<IActionResult> DeleteNotice(string id)
    {
        var deleted = await _noticeService.DeleteNoticeAsync(id);
        if (!deleted)
            throw new KeyNotFoundException($"通知 {id} 不存在");
        
        return Success("删除成功");
    }
}
