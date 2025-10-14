using Microsoft.AspNetCore.Mvc;
using Platform.ApiService.Attributes;
using Platform.ApiService.Extensions;
using Platform.ApiService.Models;
using Platform.ApiService.Services;

namespace Platform.ApiService.Controllers;

[ApiController]
[Route("api/[controller]")]
public class TagController : BaseApiController
{
    private readonly ITagService _tagService;

    public TagController(ITagService tagService)
    {
        _tagService = tagService;
    }

    /// <summary>
    /// 获取所有标签
    /// </summary>
    [HttpGet]
    [RequireMenu("tag")]
    public async Task<IActionResult> GetTags()
    {
        var result = await _tagService.GetTagsAsync();
        return Success(result);
    }

    /// <summary>
    /// 根据ID获取标签
    /// </summary>
    /// <param name="id">标签ID</param>
    [HttpGet("{id}")]
    [RequireMenu("tag")]
    public async Task<IActionResult> GetTagById(string id)
    {
        var tag = await _tagService.GetTagByIdAsync(id);
        return Success(tag.EnsureFound("标签", id));
    }

    /// <summary>
    /// 创建新标签
    /// </summary>
    /// <param name="request">创建标签请求</param>
    [HttpPost]
    [RequireMenu("tag")]
    public async Task<IActionResult> CreateTag([FromBody] CreateTagRequest request)
    {
        var tag = await _tagService.CreateTagAsync(request);
        return Success(tag, "创建成功");
    }

    /// <summary>
    /// 更新标签
    /// </summary>
    /// <param name="id">标签ID</param>
    /// <param name="request">更新标签请求</param>
    [HttpPut("{id}")]
    [RequireMenu("tag")]
    public async Task<IActionResult> UpdateTag(string id, [FromBody] UpdateTagRequest request)
    {
        var tag = await _tagService.UpdateTagAsync(id, request);
        return Success(tag.EnsureFound("标签", id), "更新成功");
    }

    /// <summary>
    /// 删除标签
    /// </summary>
    /// <param name="id">标签ID</param>
    [HttpDelete("{id}")]
    [RequireMenu("tag")]
    public async Task<IActionResult> DeleteTag(string id)
    {
        var deleted = await _tagService.DeleteTagAsync(id);
        deleted.EnsureSuccess("标签", id);
        return Success("删除成功");
    }
}
