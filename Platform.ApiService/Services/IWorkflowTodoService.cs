using System.Linq.Dynamic.Core;
using Platform.ApiService.Models;
using Platform.ApiService.Models.Workflow;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace Platform.ApiService.Services;

public interface IWorkflowTodoService
{
    Task<PagedResult<object>> GetTodoInstancesAsync(string userId, int current, int pageSize);
    Task<object?> GetNodeFormAsync(string instanceId, string nodeId);
}
