using Microsoft.AspNetCore.Mvc;
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
    public async Task<IActionResult> GetTags()
    {
        var result = await _tagService.GetTagsAsync();
        return Ok(result);
    }

    /// <summary>
    /// 根据ID获取标签
    /// </summary>
    /// <param name="id">标签ID</param>
    [HttpGet("{id}")]
    public async Task<IActionResult> GetTagById(string id)
    {
        var tag = await _tagService.GetTagByIdAsync(id);
        if (tag == null)
            return NotFound($"Tag with ID {id} not found");
        
        return Ok(tag);
    }

    /// <summary>
    /// 创建新标签
    /// </summary>
    /// <param name="request">创建标签请求</param>
    [HttpPost]
    public async Task<IActionResult> CreateTag([FromBody] CreateTagRequest request)
    {
        var tag = await _tagService.CreateTagAsync(request);
        return Created($"/api/tags/{tag.Id}", tag);
    }

    /// <summary>
    /// 更新标签
    /// </summary>
    /// <param name="id">标签ID</param>
    /// <param name="request">更新标签请求</param>
    [HttpPut("{id}")]
    public async Task<IActionResult> UpdateTag(string id, [FromBody] UpdateTagRequest request)
    {
        var tag = await _tagService.UpdateTagAsync(id, request);
        if (tag == null)
            return NotFound($"Tag with ID {id} not found");
        
        return Ok(tag);
    }

    /// <summary>
    /// 删除标签
    /// </summary>
    /// <param name="id">标签ID</param>
    [HttpDelete("{id}")]
    public async Task<IActionResult> DeleteTag(string id)
    {
        var deleted = await _tagService.DeleteTagAsync(id);
        if (!deleted)
            return NotFound($"Tag with ID {id} not found");
        
        return NoContent();
    }
}
