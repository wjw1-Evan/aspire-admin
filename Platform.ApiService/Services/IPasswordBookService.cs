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
    Task<PasswordBookEntry> CreateEntryAsync(CreatePasswordBookEntryRequest request, string userId);

    /// <summary>
    /// 更新密码本条目
    /// </summary>
    Task<PasswordBookEntry?> UpdateEntryAsync(string id, UpdatePasswordBookEntryRequest request, string userId);

    /// <summary>
    /// 获取条目详情（包含解密后的密码）
    /// </summary>
    Task<PasswordBookEntryDetailDto?> GetEntryByIdAsync(string id, string userId);

    /// <summary>
    /// 分页查询条目列表（不返回密码）
    /// </summary>
    Task<(List<PasswordBookEntryDto> Items, long Total)> GetEntriesAsync(PasswordBookQueryRequest request);

    /// <summary>
    /// 删除条目（软删除）
    /// </summary>
    Task<bool> DeleteEntryAsync(string id, string userId);

    /// <summary>
    /// 获取所有分类
    /// </summary>
    Task<List<string>> GetCategoriesAsync();

    /// <summary>
    /// 导出条目（解密后导出）
    /// </summary>
    Task<List<PasswordBookEntryDetailDto>> ExportEntriesAsync(ExportPasswordBookRequest request, string userId);

    /// <summary>
    /// 获取统计信息
    /// </summary>
    Task<PasswordBookStatistics> GetStatisticsAsync();
}
