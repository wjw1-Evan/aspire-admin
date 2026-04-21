using Microsoft.AspNetCore.Mvc;
using Platform.ApiService.Attributes;
using Platform.ApiService.Models;
using Platform.ApiService.Services;
using Platform.ServiceDefaults.Controllers;

namespace Platform.ApiService.Controllers;

/// <summary>
/// 表单管理控制器
/// </summary>
[ApiController]
[Route("api/forms")]
public class FormController : BaseApiController
{
    private readonly IFormDefinitionService _formService;

    public FormController(IFormDefinitionService formService)
    {
        _formService = formService;
    }

    /// <summary>
    /// 获取表单定义列表
    /// </summary>
    [HttpGet]
    [RequireMenu("workflow-list")]
    public async Task<IActionResult> GetForms([FromQuery] Platform.ServiceDefaults.Models.ProTableRequest request, [FromQuery] bool? isActive = null)
    {
        try
        {
            var result = await _formService.GetFormsAsync(request, isActive);
            return Success(result);
        }
        catch (Exception ex)
        {
            throw new ArgumentException(ex.Message);
        }
    }

    /// <summary>
    /// 获取表单统计信息
    /// </summary>
    [HttpGet("statistics")]
    [RequireMenu("workflow-list")]
    public async Task<IActionResult> GetStatistics()
    {
        try
        {
            var result = await _formService.GetStatisticsAsync();
            return Success(result);
        }
        catch (Exception ex)
        {
            throw new ArgumentException(ex.Message);
        }
    }

    /// <summary>
    /// 获取表单定义详情
    /// </summary>
    [HttpGet("{id}")]
    [RequireMenu("workflow-list")]
    public async Task<IActionResult> GetForm(string id)
    {
        try
        {
            var form = await _formService.GetFormByIdAsync(id);
            if (form == null)
            {
                throw new ArgumentException("表单定义 {id} 不存在");
            }

            return Success(form);
        }
        catch (Exception ex)
        {
            throw new ArgumentException(ex.Message);
        }
    }

    /// <summary>
    /// 创建表单定义
    /// </summary>
    [HttpPost]
    [RequireMenu("workflow-list")]
    public async Task<IActionResult> CreateForm([FromBody] FormDefinition form)
    {
        try
        {
            var result = await _formService.CreateFormAsync(form);
            return Success(result);
        }
        catch (ArgumentException ex)
        {
            throw new ArgumentException(ex.Message);
        }
        catch (Exception ex)
        {
            throw new ArgumentException(ex.Message);
        }
    }

    /// <summary>
    /// 更新表单定义
    /// </summary>
    [HttpPut("{id}")]
    [RequireMenu("workflow-list")]
    public async Task<IActionResult> UpdateForm(string id, [FromBody] FormDefinition form)
    {
        try
        {
            var result = await _formService.UpdateFormAsync(id, form);
            if (result == null)
            {
                throw new ArgumentException("表单定义 {id} 不存在");
            }

            return Success(result);
        }
        catch (Exception ex)
        {
            throw new ArgumentException(ex.Message);
        }
    }

    /// <summary>
    /// 删除表单定义
    /// </summary>
    [HttpDelete("{id}")]
    [RequireMenu("workflow-list")]
    public async Task<IActionResult> DeleteForm(string id)
    {
        try
        {
            var result = await _formService.DeleteFormAsync(id);
            if (!result)
            {
                throw new ArgumentException("表单定义 {id} 不存在");
            }

            return Success(null, "表单定义已删除");
        }
        catch (Exception ex)
        {
            throw new ArgumentException(ex.Message);
        }
    }

    /// <summary>
    /// 获取表单版本历史
    /// </summary>
    [HttpGet("{id}/versions")]
    [RequireMenu("workflow-list")]
    public async Task<IActionResult> GetFormVersions(string id)
    {
        try
        {
            var versions = await _formService.GetFormVersionsAsync(id);
            return Success(versions);
        }
        catch (Exception ex)
        {
            throw new ArgumentException(ex.Message);
        }
    }

    /// <summary>
    /// 获取指定版本详情
    /// </summary>
    [HttpGet("version/{versionId}")]
    [RequireMenu("workflow-list")]
    public async Task<IActionResult> GetFormVersion(string versionId)
    {
        try
        {
            var version = await _formService.GetFormVersionByIdAsync(versionId);
            if (version == null)
            {
                throw new ArgumentException("版本不存在");
            }
            return Success(version);
        }
        catch (Exception ex)
        {
            throw new ArgumentException(ex.Message);
        }
    }
}
