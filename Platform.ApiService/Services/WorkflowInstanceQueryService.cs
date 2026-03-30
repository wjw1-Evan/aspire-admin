using Microsoft.EntityFrameworkCore;
using Platform.ApiService.Models.Workflow;
using System;
using System.Collections.Generic;
using System.Linq;
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

    public async Task<(List<WorkflowInstance> Items, long Total)> GetInstancesAsync(int page, int pageSize, string? workflowDefinitionId, WorkflowStatus? status)
    {
        Expression<Func<WorkflowInstance, bool>>? filter = null;

        if (!string.IsNullOrEmpty(workflowDefinitionId))
        {
            var defId = workflowDefinitionId;
            filter = i => i.WorkflowDefinitionId == defId;
        }

        if (status.HasValue)
        {
            var s = status.Value;
            filter = filter == null
                ? i => i.Status == s
                : filter.And(i => i.Status == s);
        }

        var queryable = filter == null 
            ? _context.Set<WorkflowInstance>() 
            : _context.Set<WorkflowInstance>().Where(filter);

        var total = await queryable.LongCountAsync();
        var items = await queryable
            .OrderByDescending(i => i.StartedAt)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync();

        return (items, total);
    }

    public async Task<WorkflowInstance?> GetInstanceByIdAsync(string id)
    {
        return await _context.Set<WorkflowInstance>().FirstOrDefaultAsync(i => i.Id == id);
    }
}
