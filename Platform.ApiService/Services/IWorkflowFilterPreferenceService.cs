using Platform.ApiService.Models.Workflow;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace Platform.ApiService.Services;

public interface IWorkflowFilterPreferenceService
{
    Task<List<UserWorkflowFilterPreference>> GetPreferencesAsync(string userId);
    Task<UserWorkflowFilterPreference?> SavePreferenceAsync(string userId, string name, WorkflowFilterConfig? filterConfig, bool isDefault);
    Task<UserWorkflowFilterPreference?> UpdatePreferenceAsync(string id, string name, WorkflowFilterConfig? filterConfig, bool isDefault);
    Task<bool> DeletePreferenceAsync(string id);
    Task<UserWorkflowFilterPreference?> GetDefaultPreferenceAsync(string userId);
    Task<UserWorkflowFilterPreference?> GetPreferenceByIdAsync(string id);
    Task<bool> HasPreferenceByNameAsync(string userId, string name);
}
