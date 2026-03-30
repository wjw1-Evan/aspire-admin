using Microsoft.EntityFrameworkCore;
using Platform.ApiService.Models.Workflow;
using System.Threading.Tasks;

namespace Platform.ApiService.Services;

public class WorkflowDefinitionService : IWorkflowDefinitionService
{
    private readonly DbContext _context;

    public WorkflowDefinitionService(DbContext context)
    {
        _context = context;
    }

    public async Task<WorkflowDefinition> CreateWorkflowAsync(WorkflowDefinition workflow)
    {
        await _context.Set<WorkflowDefinition>().AddAsync(workflow);
        await _context.SaveChangesAsync();
        return workflow;
    }

    public async Task<WorkflowDefinition?> UpdateWorkflowAsync(string id, WorkflowDefinition workflow)
    {
        var existing = await _context.Set<WorkflowDefinition>().FirstOrDefaultAsync(w => w.Id == id);
        if (existing == null) return null;

        existing.Name = workflow.Name;
        existing.Description = workflow.Description;
        existing.Category = workflow.Category;
        existing.Graph = workflow.Graph;
        existing.IsActive = workflow.IsActive;
        existing.Version = workflow.Version;

        await _context.SaveChangesAsync();
        return existing;
    }

    public async Task<bool> DeleteWorkflowAsync(string id)
    {
        var entity = await _context.Set<WorkflowDefinition>().FirstOrDefaultAsync(w => w.Id == id);
        if (entity == null) return false;

        _context.Set<WorkflowDefinition>().Remove(entity);
        await _context.SaveChangesAsync();
        return true;
    }
}
