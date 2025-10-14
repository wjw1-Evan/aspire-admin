using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Platform.ApiService.Attributes;
using Platform.ApiService.Extensions;
using Platform.ApiService.Models;
using Platform.ApiService.Services;

namespace Platform.ApiService.Controllers;

/// <summary>
/// 通知管理控制器
/// 权限策略（开放模式）：
/// - 查看通知：所有登录用户可访问
/// - 标记已读：所有登录用户可访问  
/// - 删除通知：所有登录用户可访问（清理个人通知）
/// - 创建通知：需要 'notice' 菜单权限（管理员功能）
/// </summary>
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
    /// 获取所有通知
    /// 权限策略：所有登录用户可访问
    /// </summary>
    /// <returns>通知列表</returns>
    [HttpGet("notices")]
    public async Task<IActionResult> GetNotices()
    {
        var result = await _noticeService.GetNoticesAsync();
        return Ok(result);
    }

    /// <summary>
    /// 根据ID获取通知
    /// 权限策略：所有登录用户可访问
    /// </summary>
    /// <param name="id">通知ID</param>
    /// <returns>通知详情</returns>
    [HttpGet("notices/{id}")]
    public async Task<IActionResult> GetNoticeById(string id)
    {
        var notice = await _noticeService.GetNoticeByIdAsync(id);
        return Success(notice.EnsureFound("通知", id));
    }

    /// <summary>
    /// 更新通知状态（标记为已读/未读）
    /// 权限策略：所有登录用户可以标记通知的已读状态，但不能修改通知内容
    /// </summary>
    /// <param name="id">通知ID</param>
    /// <param name="request">更新请求</param>
    /// <returns>更新后的通知信息</returns>
    [HttpPut("notices/{id}")]
    public async Task<IActionResult> UpdateNotice(string id, [FromBody] UpdateNoticeRequest request)
    {
        // 权限检查：普通用户只能修改 Read 状态（已读/未读），不能修改通知内容
        var isOnlyReadStatusChange = request.Read.HasValue && 
            string.IsNullOrEmpty(request.Title) && 
            string.IsNullOrEmpty(request.Description) &&
            string.IsNullOrEmpty(request.Avatar) &&
            string.IsNullOrEmpty(request.Status) &&
            string.IsNullOrEmpty(request.Extra) &&
            !request.Type.HasValue &&
            !request.ClickClose.HasValue &&
            !request.Datetime.HasValue;

        if (isOnlyReadStatusChange)
        {
            // 只修改已读状态，所有登录用户都可以执行
            var notice = await _noticeService.UpdateNoticeAsync(id, request);
            return Success(notice.EnsureFound("通知", id), "标记成功");
        }
        
        // 修改通知内容需要管理权限，但这里不提供此功能
        // 如果需要修改通知内容，应该通过具有 notice 菜单权限的管理员重新创建
        throw new UnauthorizedAccessException("普通用户只能标记通知为已读/未读状态，无法修改通知内容");
    }

    /// <summary>
    /// 创建新通知
    /// 权限要求：需要 'notice' 菜单权限（管理员功能）
    /// </summary>
    /// <param name="request">创建通知请求</param>
    /// <returns>创建的通知信息</returns>
    [HttpPost("notices")]
    [RequireMenu("notice")]
    public async Task<IActionResult> CreateNotice([FromBody] CreateNoticeRequest request)
    {
        var notice = await _noticeService.CreateNoticeAsync(request);
        return Success(notice, "创建成功");
    }

    /// <summary>
    /// 删除通知
    /// 权限策略：所有登录用户可以删除通知（用于清理个人通知列表）
    /// </summary>
    /// <param name="id">通知ID</param>
    /// <returns>删除结果</returns>
    [HttpDelete("notices/{id}")]
    public async Task<IActionResult> DeleteNotice(string id)
    {
        var deleted = await _noticeService.DeleteNoticeAsync(id);
        deleted.EnsureSuccess("通知", id);
        return Success("删除成功");
    }
}
