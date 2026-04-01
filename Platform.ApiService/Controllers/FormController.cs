using Microsoft.AspNetCore.Mvc;
using Platform.ApiService.Attributes;
using Platform.ApiService.Models;
using Platform.ApiService.Services;
using Platform.ServiceDefaults.Controllers;

namespace Platform.ApiService.Controllers;

[ApiController]
[Route("api/forms")]
public class FormController : BaseApiController
{
    private readonly IFormDefinitionService _formService;

    public FormController(IFormDefinitionService formService)
    {
        _formService = formService;
    }

    [HttpGet]
    [RequireMenu("workflow-list")]
    public async Task<IActionResult> GetForms([FromQuery] int current = 1, [FromQuery] int pageSize = 10, [FromQuery] string? keyword = null, [FromQuery] bool? isActive = null)
    {
        try
        {
            var result = await _formService.GetFormsAsync(current, pageSize, keyword, isActive);
            return await SuccessPagedAsync(result);
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
            var form = await _formService.GetFormByIdAsync(id);
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
            var result = await _formService.CreateFormAsync(form);
            return Success(result);
        }
        catch (ArgumentException ex)
        {
            return ValidationError(ex.Message);
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
            var result = await _formService.UpdateFormAsync(id, form);
            if (result == null)
            {
                return NotFoundError("表单定义", id);
            }

            return Success(result);
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
            var result = await _formService.DeleteFormAsync(id);
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
