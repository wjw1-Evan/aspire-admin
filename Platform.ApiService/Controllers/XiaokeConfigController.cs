using Microsoft.AspNetCore.Mvc;
using Platform.ApiService.Attributes;
using Platform.ApiService.Extensions;
using Platform.ApiService.Models;
using Platform.ApiService.Services;
using Platform.ServiceDefaults.Controllers;
using Platform.ServiceDefaults.Models;

namespace Platform.ApiService.Controllers;

/// <summary>
/// 小科配置管理控制器 - 处理小科配置相关的 CRUD 操作
/// </summary>
[ApiController]
[Route("api/xiaoke/config")]
public class XiaokeConfigController : BaseApiController
{
    private readonly IXiaokeConfigService _xiaokeConfigService;

    /// <summary>
    /// 初始化小科配置控制器
    /// </summary>
    /// <param name="xiaokeConfigService">小科配置服务</param>
    public XiaokeConfigController(IXiaokeConfigService xiaokeConfigService)
    {
        _xiaokeConfigService = xiaokeConfigService ?? throw new ArgumentNullException(nameof(xiaokeConfigService));
    }

    /// <summary>
    /// 获取配置列表
    /// </summary>
    /// <param name="request">分页参数</param>
    /// <param name="isEnabled">是否启用（筛选）</param>
    /// <returns>配置列表</returns>
    [HttpGet]
    [RequireMenu("xiaoke-management-config")]
    public async Task<IActionResult> GetConfigs(
        [FromQuery] PageParams request,
        [FromQuery] bool? isEnabled = null)
    {
        var result = await _xiaokeConfigService.GetConfigsAsync(request, isEnabled);
        return Success(result);
    }

    /// <summary>
    /// 根据ID获取配置详情
    /// </summary>
    /// <param name="id">配置ID</param>
    [HttpGet("{id}")]
    [RequireMenu("xiaoke-management-config")]
    public async Task<IActionResult> GetConfigById(string id)
    {
        var config = await _xiaokeConfigService.GetConfigByIdAsync(id);
        return Success(config);
    }

    /// <summary>
    /// 获取默认配置
    /// </summary>
    [HttpGet("default")]
    [RequireMenu("xiaoke-management-config")]
    public async Task<IActionResult> GetDefaultConfig()
    {
        var config = await _xiaokeConfigService.GetDefaultConfigAsync();
        return Success(config);
    }

    /// <summary>
    /// 创建配置
    /// </summary>
    /// <param name="request">创建配置请求</param>
    [HttpPost]
    [RequireMenu("xiaoke-management-config")]
    public async Task<IActionResult> CreateConfig([FromBody] CreateXiaokeConfigRequest request)
    {
        var newConfig = await _xiaokeConfigService.CreateConfigAsync(request);
        return Success(newConfig);
    }

    /// <summary>
    /// 更新配置
    /// </summary>
    /// <param name="id">配置ID</param>
    /// <param name="request">更新配置请求</param>
    [HttpPut("{id}")]
    [RequireMenu("xiaoke-management-config")]
    public async Task<IActionResult> UpdateConfig(string id, [FromBody] UpdateXiaokeConfigRequest request)
    {
        var config = await _xiaokeConfigService.UpdateConfigAsync(id, request);
        return Success(config);
    }

    /// <summary>
    /// 删除配置
    /// </summary>
    /// <param name="id">配置ID</param>
    [HttpDelete("{id}")]
    [RequireMenu("xiaoke-management-config")]
    public async Task<IActionResult> DeleteConfig(string id)
    {
        var deleted = await _xiaokeConfigService.DeleteConfigAsync(id);
        return Success(true);
    }

    /// <summary>
    /// 设置默认配置
    /// </summary>
    /// <param name="id">配置ID</param>
    [HttpPost("{id}/set-default")]
    [RequireMenu("xiaoke-management-config")]
    public async Task<IActionResult> SetDefaultConfig(string id)
    {
        var success = await _xiaokeConfigService.SetDefaultConfigAsync(id);
        return Success(true);
    }
}
