using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Platform.ApiService.Attributes;
using Platform.ApiService.Models;
using Platform.ServiceDefaults.Controllers;
using Platform.ServiceDefaults.Services;
using System;
using System.Linq;
using System.Threading.Tasks;

namespace Platform.ApiService.Controllers;

/// <summary>
/// 表单定义管理控制器
/// </summary>
[ApiController]
[Route("api/forms")]
[Authorize]
public class FormController : BaseApiController
{
    private readonly IDatabaseOperationFactory<FormDefinition> _formFactory;

    /// <summary>
    /// 初始化表单管理控制器
    /// </summary>
    /// <param name="formFactory">表单定义工厂</param>
    public FormController(IDatabaseOperationFactory<FormDefinition> formFactory)
    {
        _formFactory = formFactory;
    }

    /// <summary>
    /// 获取表单列表
    /// </summary>
    [HttpGet]
    [RequireMenu("workflow:list")]
    public async Task<IActionResult> GetForms([FromQuery] int current = 1, [FromQuery] int pageSize = 10, [FromQuery] string? keyword = null, [FromQuery] bool? isActive = null)
    {
        try
        {
            var filterBuilder = _formFactory.CreateFilterBuilder();

            if (!string.IsNullOrEmpty(keyword))
            {
                filterBuilder.Regex(f => f.Name, keyword);
            }

            if (isActive.HasValue)
            {
                filterBuilder.Equal(f => f.IsActive, isActive.Value);
            }

            var filter = filterBuilder.Build();
            var sort = _formFactory.CreateSortBuilder()
                .Descending(f => f.CreatedAt)
                .Build();

            var result = await _formFactory.FindPagedAsync(filter, sort, current, pageSize);
            return SuccessPaged(result.items, result.total, current, pageSize);
        }
        catch (Exception ex)
        {
            return Error("GET_FAILED", ex.Message);
        }
    }

    /// <summary>
    /// 获取表单定义详情
    /// </summary>
    [HttpGet("{id}")]
    [RequireMenu("workflow:list")]
    public async Task<IActionResult> GetForm(string id)
    {
        try
        {
            var form = await _formFactory.GetByIdAsync(id);
            if (form == null)
            {
                return NotFoundError("表单定义", id);
            }

            return Success(form);
        }
        catch (Exception ex)
        {
            return Error("GET_FAILED", ex.Message);
        }
    }

    /// <summary>
    /// 创建表单定义
    /// </summary>
    [HttpPost]
    [RequireMenu("workflow:list")]
    public async Task<IActionResult> CreateForm([FromBody] FormDefinition form)
    {
        try
        {
            if (string.IsNullOrEmpty(form.Name))
            {
                return ValidationError("表单名称不能为空");
            }

            var companyId = await _formFactory.GetRequiredCompanyIdAsync();
            form.CompanyId = companyId;
            form.Key = string.IsNullOrWhiteSpace(form.Key) ? $"form_{Guid.NewGuid():N}" : form.Key;

            var created = await _formFactory.CreateAsync(form);
            return Success(created);
        }
        catch (Exception ex)
        {
            return Error("CREATE_FAILED", ex.Message);
        }
    }

    /// <summary>
    /// 更新表单定义
    /// </summary>
    [HttpPut("{id}")]
    [RequireMenu("workflow:list")]
    public async Task<IActionResult> UpdateForm(string id, [FromBody] FormDefinition form)
    {
        try
        {
            var existing = await _formFactory.GetByIdAsync(id);
            if (existing == null)
            {
                return NotFoundError("表单定义", id);
            }

            var updateBuilder = _formFactory.CreateUpdateBuilder()
                .Set(f => f.Name, form.Name)
                .Set(f => f.Description, form.Description)
                .Set(f => f.Fields, form.Fields)
                .Set(f => f.IsActive, form.IsActive)
                .Set(f => f.Version, form.Version);

            var update = updateBuilder.Build();
            var filter = _formFactory.CreateFilterBuilder()
                .Equal(f => f.Id, id)
                .Build();

            var updated = await _formFactory.FindOneAndUpdateAsync(filter, update);
            return Success(updated);
        }
        catch (Exception ex)
        {
            return Error("UPDATE_FAILED", ex.Message);
        }
    }

    /// <summary>
    /// 删除表单定义
    /// </summary>
    [HttpDelete("{id}")]
    [RequireMenu("workflow:list")]
    public async Task<IActionResult> DeleteForm(string id)
    {
        try
        {
            var filter = _formFactory.CreateFilterBuilder()
                .Equal(f => f.Id, id)
                .Build();

            var result = await _formFactory.FindOneAndSoftDeleteAsync(filter);
            if (result == null)
            {
                return NotFoundError("表单定义", id);
            }

            return Success("表单定义已删除");
        }
        catch (Exception ex)
        {
            return Error("DELETE_FAILED", ex.Message);
        }
    }
}
