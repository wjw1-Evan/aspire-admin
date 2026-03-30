using Platform.ApiService.Models.Workflow;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace Platform.ApiService.Services;

public interface IWorkflowDefinitionQueryService
{
    Task<(List<WorkflowDefinition> Items, long Total)> GetWorkflowsAsync(Platform.ApiService.Models.Workflow.WorkflowSearchRequest request);
    Task<WorkflowDefinition?> GetWorkflowByIdAsync(string id);
}
