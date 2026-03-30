using Platform.ApiService.Models;
using Platform.ApiService.Models.Workflow;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace Platform.ApiService.Services;

public interface IWorkflowTodoService
{
    Task<(List<object> Items, long Total)> GetTodoInstancesAsync(string userId, int current, int pageSize);
    Task<object?> GetNodeFormAsync(string instanceId, string nodeId);
}
