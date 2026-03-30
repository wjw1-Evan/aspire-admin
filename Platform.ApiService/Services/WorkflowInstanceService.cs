using Microsoft.EntityFrameworkCore;
using Platform.ApiService.Models.Workflow;
using System.Threading.Tasks;

namespace Platform.ApiService.Services;

public class WorkflowInstanceService : IWorkflowInstanceService
{
    private readonly DbContext _context;

    public WorkflowInstanceService(DbContext context)
    {
        _context = context;
    }

    public async Task SaveChangesAsync()
    {
        await _context.SaveChangesAsync();
    }
}
