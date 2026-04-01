using Platform.ApiService.Models;
using Platform.ApiService.Models.Workflow;
using System.Linq.Dynamic.Core;
using System.Threading.Tasks;

namespace Platform.ApiService.Services;

public interface IWorkflowInstanceQueryService
{
    Task<PagedResult<WorkflowInstance>> GetInstancesAsync(int page, int pageSize, string? workflowDefinitionId, WorkflowStatus? status);
    Task<WorkflowInstance?> GetInstanceByIdAsync(string id);
}
