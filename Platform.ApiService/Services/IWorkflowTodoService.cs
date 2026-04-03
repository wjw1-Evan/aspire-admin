using System.Linq.Dynamic.Core;
using Platform.ApiService.Models;
using Platform.ApiService.Models.Workflow;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace Platform.ApiService.Services;

public interface IWorkflowTodoService
{
    Task<System.Linq.Dynamic.Core.PagedResult<object>> GetTodoInstancesAsync(string userId, Platform.ServiceDefaults.Models.PageParams request);
    Task<object?> GetNodeFormAsync(string instanceId, string nodeId);
}
