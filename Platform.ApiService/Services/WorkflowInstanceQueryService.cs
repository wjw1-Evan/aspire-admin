using System.Linq.Dynamic.Core;
using Microsoft.EntityFrameworkCore;
using Platform.ApiService.Models.Workflow;
using Platform.ServiceDefaults.Extensions;
using System.Linq.Expressions;
using System.Threading.Tasks;

namespace Platform.ApiService.Services;

public class WorkflowInstanceQueryService : IWorkflowInstanceQueryService
{
    private readonly DbContext _context;

    public WorkflowInstanceQueryService(DbContext context)
    {
        _context = context;
    }

    public async Task<System.Linq.Dynamic.Core.PagedResult<WorkflowInstance>> GetInstancesAsync(Platform.ServiceDefaults.Models.ProTableRequest request, string? workflowDefinitionId, WorkflowStatus? status)
    {
        var queryable = _context.Set<WorkflowInstance>().AsQueryable();

        if (!string.IsNullOrEmpty(workflowDefinitionId))
        {
            queryable = queryable.Where(i => i.WorkflowDefinitionId == workflowDefinitionId);
        }

        if (status.HasValue)
        {
            queryable = queryable.Where(i => i.Status == status.Value);
        }

        if (!string.IsNullOrWhiteSpace(request.Search))
        {
            var search = request.Search.ToLower();
            queryable = queryable.Where(i => i.Id.ToLower().Contains(search) || i.StartedBy.ToLower().Contains(search));
        }

        return queryable.OrderByDescending(i => i.StartedAt).ToPagedList(request);
    }

    public async Task<WorkflowInstance?> GetInstanceByIdAsync(string id)
    {
        return await _context.Set<WorkflowInstance>().FirstOrDefaultAsync(i => i.Id == id);
    }
}
