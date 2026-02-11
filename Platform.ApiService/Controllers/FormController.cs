using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Platform.ApiService.Attributes;
using Platform.ApiService.Models;
using Platform.ServiceDefaults.Controllers;
using Platform.ServiceDefaults.Services;
using System.Linq.Expressions;

namespace Platform.ApiService.Controllers;

[ApiController]
[Route("api/forms")]
[Authorize]
public class FormController : BaseApiController
{
    private readonly IDataFactory<FormDefinition> _formFactory;
    private readonly ITenantContext _tenantContext;

    public FormController(IDataFactory<FormDefinition> formFactory, ITenantContext tenantContext)
    {
        _formFactory = formFactory;
        _tenantContext = tenantContext;
    }

    [HttpGet]
    [RequireMenu("workflow-list")]
    public async Task<IActionResult> GetForms([FromQuery] int current = 1, [FromQuery] int pageSize = 10, [FromQuery] string? keyword = null, [FromQuery] bool? isActive = null)
    {
        try
        {
            Expression<Func<FormDefinition, bool>>? filter = null;

            if (!string.IsNullOrEmpty(keyword))
            {
                filter = f => f.Name != null && f.Name.Contains(keyword);
            }

            if (isActive.HasValue)
            {
                var isActiveValue = isActive.Value;
                filter = filter == null 
                    ? f => f.IsActive == isActiveValue 
                    : f => (filter.Compile()(f) && f.IsActive == isActiveValue);
            }

            var orderBy = (IQueryable<FormDefinition> query) => query.OrderByDescending(f => f.CreatedAt);

            var (items, total) = await _formFactory.FindPagedAsync(filter, orderBy, current, pageSize);
            return SuccessPaged(items, total, current, pageSize);
        }
        catch (Exception ex)
        {
            return Error("GET_FAILED", ex.Message);
        }
    }

    [HttpGet("{id}")]
    [RequireMenu("workflow-list")]
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

    [HttpPost]
    [RequireMenu("workflow-list")]
    public async Task<IActionResult> CreateForm([FromBody] FormDefinition form)
    {
        try
        {
            if (string.IsNullOrEmpty(form.Name))
            {
                return ValidationError("表单名称不能为空");
            }

            var companyId = await _tenantContext.GetCurrentCompanyIdAsync();
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

    [HttpPut("{id}")]
    [RequireMenu("workflow-list")]
    public async Task<IActionResult> UpdateForm(string id, [FromBody] FormDefinition form)
    {
        try
        {
            var existing = await _formFactory.GetByIdAsync(id);
            if (existing == null)
            {
                return NotFoundError("表单定义", id);
            }

            await _formFactory.UpdateAsync(id, f =>
            {
                f.Name = form.Name;
                f.Description = form.Description;
                f.Fields = form.Fields;
                f.IsActive = form.IsActive;
                f.Version = form.Version;
            });

            var updated = await _formFactory.GetByIdAsync(id);
            return Success(updated);
        }
        catch (Exception ex)
        {
            return Error("UPDATE_FAILED", ex.Message);
        }
    }

    [HttpDelete("{id}")]
    [RequireMenu("workflow-list")]
    public async Task<IActionResult> DeleteForm(string id)
    {
        try
        {
            var result = await _formFactory.SoftDeleteAsync(id);
            if (!result)
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
