using Platform.ApiService.Models.Workflow;
using System.Collections.Generic;
using System.Linq.Dynamic.Core;
using System.Threading.Tasks;

namespace Platform.ApiService.Services;

public interface IWorkflowDefinitionQueryService
{
    Task<System.Linq.Dynamic.Core.PagedResult<WorkflowDefinition>> GetWorkflowsAsync(Platform.ServiceDefaults.Models.PageParams request);
    Task<WorkflowDefinition?> GetWorkflowByIdAsync(string id);
}
