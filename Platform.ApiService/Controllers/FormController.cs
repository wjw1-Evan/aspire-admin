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
    public async Task<IActionResult> GetForms([FromQuery] Platform.ServiceDefaults.Models.PageParams request, [FromQuery] bool? isActive = null)
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
}
