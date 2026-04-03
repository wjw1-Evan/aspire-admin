using Platform.ApiService.Models;
using Platform.ApiService.Models.Workflow;
using System.Linq.Dynamic.Core;
using System.Threading.Tasks;

namespace Platform.ApiService.Services;

public interface IWorkflowInstanceQueryService
{
    Task<System.Linq.Dynamic.Core.PagedResult<WorkflowInstance>> GetInstancesAsync(Platform.ServiceDefaults.Models.PageParams request, string? workflowDefinitionId, WorkflowStatus? status);
    Task<WorkflowInstance?> GetInstanceByIdAsync(string id);
}
