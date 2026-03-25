using Platform.ApiService.Models;

namespace Platform.ApiService.Services;

/// <summary>
/// 密码本服务接口
/// </summary>
public interface IPasswordBookService
{
    /// <summary>
    /// 创建密码本条目
    /// </summary>
    /// <param name="request">创建请求</param>
    /// <param name="userId">当前用户ID（用于加密密钥派生）</param>
    Task<PasswordBookEntry> CreateEntryAsync(CreatePasswordBookEntryRequest request, string userId);

    /// <summary>
    /// 更新密码本条目
    /// </summary>
    /// <param name="id">条目ID</param>
    /// <param name="request">更新请求</param>
    /// <param name="userId">当前用户ID</param>
    Task<PasswordBookEntry?> UpdateEntryAsync(string id, UpdatePasswordBookEntryRequest request, string userId);

    /// <summary>
    /// 获取条目详情（包含解密后的密码）
    /// </summary>
    /// <param name="id">条目ID</param>
    /// <param name="userId">当前用户ID</param>
    Task<PasswordBookEntryDetailDto?> GetEntryByIdAsync(string id, string userId);

    /// <summary>
    /// 分页查询条目列表（不返回密码）
    /// </summary>
    /// <param name="request">查询请求</param>
    /// <param name="userId">当前用户ID</param>
    Task<(List<PasswordBookEntryDto> Items, long Total)> GetEntriesAsync(PasswordBookQueryRequest request, string userId);

    /// <summary>
    /// 删除条目（软删除）
    /// </summary>
    /// <param name="id">条目ID</param>
    /// <param name="userId">当前用户ID</param>
    Task<bool> DeleteEntryAsync(string id, string userId);

    /// <summary>
    /// 获取所有分类
    /// </summary>
    Task<List<string>> GetCategoriesAsync();

    /// <summary>
    /// 获取所有标签
    /// </summary>
    Task<List<string>> GetTagsAsync();

    /// <summary>
    /// 导出条目（解密后导出）
    /// </summary>
    /// <param name="request">导出请求</param>
    /// <param name="userId">当前用户ID</param>
    Task<List<PasswordBookEntryDetailDto>> ExportEntriesAsync(ExportPasswordBookRequest request, string userId);

    /// <summary>
    /// 获取统计信息
    /// </summary>
    Task<PasswordBookStatistics> GetStatisticsAsync();
}
