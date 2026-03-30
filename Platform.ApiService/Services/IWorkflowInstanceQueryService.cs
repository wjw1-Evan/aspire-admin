using Platform.ApiService.Models;
using Platform.ApiService.Models.Workflow;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace Platform.ApiService.Services;

public interface IWorkflowInstanceQueryService
{
    Task<(List<WorkflowInstance> Items, long Total)> GetInstancesAsync(int page, int pageSize, string? workflowDefinitionId, WorkflowStatus? status);
    Task<WorkflowInstance?> GetInstanceByIdAsync(string id);
}
