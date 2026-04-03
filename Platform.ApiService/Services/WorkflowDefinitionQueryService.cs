using System.Linq.Dynamic.Core;
using Microsoft.EntityFrameworkCore;
using Platform.ApiService.Models.Workflow;
using Platform.ApiService.Services;
using Platform.ServiceDefaults.Extensions;
using Platform.ServiceDefaults.Models;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Linq.Expressions;
using System.Threading.Tasks;

namespace Platform.ApiService.Services;

public class WorkflowDefinitionQueryService : IWorkflowDefinitionQueryService
{
    private readonly DbContext _context;

    public WorkflowDefinitionQueryService(DbContext context)
    {
        _context = context;
    }

    public async Task<System.Linq.Dynamic.Core.PagedResult<WorkflowDefinition>> GetWorkflowsAsync(PageParams request)
    {
        return _context.Set<WorkflowDefinition>().ToPagedList(request);
    }

    public async Task<WorkflowDefinition?> GetWorkflowByIdAsync(string id)
    {
        return await _context.Set<WorkflowDefinition>().FirstOrDefaultAsync(w => w.Id == id);
    }
}
