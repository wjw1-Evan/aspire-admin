using Platform.ApiService.Models.Workflow;
using System.Threading.Tasks;

namespace Platform.ApiService.Services;

public interface IWorkflowDefinitionService
{
    Task<WorkflowDefinition> CreateWorkflowAsync(WorkflowDefinition workflow);
    Task<WorkflowDefinition?> UpdateWorkflowAsync(string id, WorkflowDefinition workflow);
    Task<bool> DeleteWorkflowAsync(string id);
}
