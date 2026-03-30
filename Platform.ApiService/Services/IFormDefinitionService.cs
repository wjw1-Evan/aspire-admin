using Platform.ApiService.Models;

namespace Platform.ApiService.Services;

public interface IFormDefinitionService
{
    Task<(List<FormDefinition> Items, long Total)> GetFormsAsync(int current, int pageSize, string? keyword, bool? isActive);
    Task<FormDefinition?> GetFormByIdAsync(string id);
    Task<FormDefinition> CreateFormAsync(FormDefinition form);
    Task<FormDefinition?> UpdateFormAsync(string id, FormDefinition form);
    Task<bool> DeleteFormAsync(string id);
}
