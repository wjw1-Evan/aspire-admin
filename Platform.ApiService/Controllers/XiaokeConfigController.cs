using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Platform.ApiService.Attributes;
using Platform.ApiService.Extensions;
using Platform.ApiService.Models;
using Platform.ApiService.Services;
using Platform.ServiceDefaults.Controllers;

namespace Platform.ApiService.Controllers;

/// <summary>
/// 小科配置管理控制器 - 处理小科配置相关的 CRUD 操作
/// </summary>
[ApiController]
[Route("api/xiaoke/config")]
[Authorize]
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
    /// <param name="current">当前页码</param>
    /// <param name="pageSize">页面大小</param>
    /// <param name="name">配置名称（搜索关键词）</param>
    /// <param name="isEnabled">是否启用（筛选）</param>
    /// <param name="sorter">排序字段</param>
    [HttpGet]
    [RequireMenu("xiaoke-management-config")]
    public async Task<IActionResult> GetConfigs(
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 10,
        [FromQuery] string? name = null,
        [FromQuery] bool? isEnabled = null,
        [FromQuery] string? sorter = null)
    {
        // 验证分页参数
        if (page < 1 || page > 10000)
            throw new ArgumentException("页码必须在 1-10000 之间");
        
        if (pageSize < 1 || pageSize > 100)
            throw new ArgumentException("每页数量必须在 1-100 之间");

        var queryParams = new XiaokeConfigQueryParams
        {
            Current = page, // PageParams 使用 Current，但 API 参数使用 page
            PageSize = pageSize,
            Name = name,
            IsEnabled = isEnabled,
            Sorter = sorter
        };

        var result = await _xiaokeConfigService.GetConfigsAsync(queryParams);
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
        return Success(config.EnsureFound("配置", id));
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
        return Success(config.EnsureFound("配置", id));
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
        deleted.EnsureSuccess("配置", id);
        return Success();
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
        success.EnsureSuccess("配置", id);
        return Success();
    }
}
