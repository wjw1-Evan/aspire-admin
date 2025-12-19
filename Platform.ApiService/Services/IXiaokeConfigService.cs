using Platform.ApiService.Models;

namespace Platform.ApiService.Services;

/// <summary>
/// 小科配置服务接口
/// </summary>
public interface IXiaokeConfigService
{
    /// <summary>
    /// 获取配置列表（分页）
    /// </summary>
    /// <param name="queryParams">查询参数</param>
    /// <returns>配置列表响应</returns>
    Task<XiaokeConfigListResponse> GetConfigsAsync(XiaokeConfigQueryParams queryParams);

    /// <summary>
    /// 根据ID获取配置详情
    /// </summary>
    /// <param name="id">配置ID</param>
    /// <returns>配置信息，如果不存在则返回 null</returns>
    Task<XiaokeConfigDto?> GetConfigByIdAsync(string id);

    /// <summary>
    /// 获取当前企业的默认配置
    /// </summary>
    /// <returns>默认配置信息，如果不存在则返回 null</returns>
    Task<XiaokeConfigDto?> GetDefaultConfigAsync();

    /// <summary>
    /// 创建配置
    /// </summary>
    /// <param name="request">创建配置请求</param>
    /// <returns>创建的配置信息</returns>
    Task<XiaokeConfigDto> CreateConfigAsync(CreateXiaokeConfigRequest request);

    /// <summary>
    /// 更新配置
    /// </summary>
    /// <param name="id">配置ID</param>
    /// <param name="request">更新配置请求</param>
    /// <returns>更新后的配置信息</returns>
    Task<XiaokeConfigDto?> UpdateConfigAsync(string id, UpdateXiaokeConfigRequest request);

    /// <summary>
    /// 删除配置（软删除）
    /// </summary>
    /// <param name="id">配置ID</param>
    /// <returns>是否删除成功</returns>
    Task<bool> DeleteConfigAsync(string id);

    /// <summary>
    /// 设置默认配置（自动取消其他默认配置）
    /// </summary>
    /// <param name="id">配置ID</param>
    /// <returns>是否设置成功</returns>
    Task<bool> SetDefaultConfigAsync(string id);
}
