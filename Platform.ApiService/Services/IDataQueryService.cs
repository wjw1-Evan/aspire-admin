using Platform.ApiService.Models;

namespace Platform.ApiService.Services;

/// <summary>
/// 数据查询服务接口
/// </summary>
public interface IDataQueryService
{
    /// <summary>
    /// 查询数据
    /// </summary>
    Task<object> QueryDataAsync(DataSourceConfig config, string userId, string companyId);

    /// <summary>
    /// 获取可用模块列表
    /// </summary>
    Task<List<string>> GetAvailableModulesAsync();

    /// <summary>
    /// 获取模块可用字段
    /// </summary>
    Task<List<string>> GetModuleFieldsAsync(string module);
}
