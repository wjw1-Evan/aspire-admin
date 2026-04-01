using System.Linq.Dynamic.Core;
using Platform.ApiService.Models;

namespace Platform.ApiService.Services;

public interface IFormDefinitionService
{
    Task<PagedResult<FormDefinition>> GetFormsAsync(int current, int pageSize, string? keyword, bool? isActive);
    Task<FormDefinition?> GetFormByIdAsync(string id);
    Task<List<FormDefinition>> GetFormsByIdsAsync(List<string> ids);
    Task<FormDefinition> CreateFormAsync(FormDefinition form);
    Task<FormDefinition?> UpdateFormAsync(string id, FormDefinition form);
    Task<bool> DeleteFormAsync(string id);
}
