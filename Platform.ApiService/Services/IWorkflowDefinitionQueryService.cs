using Platform.ApiService.Models.Workflow;
using System.Collections.Generic;
using System.Linq.Dynamic.Core;
using System.Threading.Tasks;

namespace Platform.ApiService.Services;

public interface IWorkflowDefinitionQueryService
{
    Task<PagedResult<WorkflowDefinition>> GetWorkflowsAsync(Platform.ApiService.Models.Workflow.WorkflowSearchRequest request);
    Task<WorkflowDefinition?> GetWorkflowByIdAsync(string id);
}
