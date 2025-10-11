using Platform.ApiService.Models;

namespace Platform.ApiService.Services;

/// <summary>
/// 标签服务接口
/// </summary>
public interface ITagService
{
    Task<TagListResponse> GetTagsAsync();
    Task<TagItem?> GetTagByIdAsync(string id);
    Task<TagItem> CreateTagAsync(CreateTagRequest request);
    Task<TagItem?> UpdateTagAsync(string id, UpdateTagRequest request);
    Task<bool> DeleteTagAsync(string id);
}

