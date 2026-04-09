using Microsoft.EntityFrameworkCore;
using Platform.ApiService.Models.Workflow;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace Platform.ApiService.Services;

public class WorkflowFilterPreferenceService : IWorkflowFilterPreferenceService
{
    private readonly DbContext _context;

    public WorkflowFilterPreferenceService(DbContext context)
    {
        _context = context;
    }

    public async Task<List<UserWorkflowFilterPreference>> GetPreferencesAsync(string userId)
    {
        return await _context.Set<UserWorkflowFilterPreference>()
            .Where(p => p.UserId == userId)
            .OrderByDescending(p => p.IsDefault)
            .ThenBy(p => p.Name)
            .ToListAsync();
    }

    public async Task<UserWorkflowFilterPreference?> SavePreferenceAsync(string userId, string name, WorkflowFilterConfig? filterConfig, bool isDefault)
    {
        if (isDefault)
        {
            var existingDefaults = await _context.Set<UserWorkflowFilterPreference>()
                .Where(p => p.UserId == userId && p.IsDefault)
                .ToListAsync();
            foreach (var p in existingDefaults)
            {
                p.IsDefault = false;
            }
        }

        var preference = new UserWorkflowFilterPreference
        {
            UserId = userId,
            Name = name,
            FilterConfig = filterConfig ?? new WorkflowFilterConfig(),
            IsDefault = isDefault
        };

        await _context.Set<UserWorkflowFilterPreference>().AddAsync(preference);
        await _context.SaveChangesAsync();
        return preference;
    }

    public async Task<UserWorkflowFilterPreference?> UpdatePreferenceAsync(string id, string name, WorkflowFilterConfig? filterConfig, bool isDefault)
    {
        var existing = await _context.Set<UserWorkflowFilterPreference>().FirstOrDefaultAsync(p => p.Id == id);
        if (existing == null) return null;

        if (isDefault && !existing.IsDefault)
        {
            var existingDefaults = await _context.Set<UserWorkflowFilterPreference>()
                .Where(p => p.UserId == existing.UserId && p.IsDefault && p.Id != id)
                .ToListAsync();
            foreach (var p in existingDefaults)
            {
                p.IsDefault = false;
            }
        }

        existing.Name = name;
        existing.FilterConfig = filterConfig ?? new WorkflowFilterConfig();
        existing.IsDefault = isDefault;

        await _context.SaveChangesAsync();
        return existing;
    }

    public async Task<bool> DeletePreferenceAsync(string id)
    {
        var preference = await _context.Set<UserWorkflowFilterPreference>().FirstOrDefaultAsync(p => p.Id == id);
        if (preference == null) return false;

        _context.Set<UserWorkflowFilterPreference>().Remove(preference);
        await _context.SaveChangesAsync();
        return true;
    }

    public async Task<UserWorkflowFilterPreference?> GetDefaultPreferenceAsync(string userId)
    {
        return await _context.Set<UserWorkflowFilterPreference>()
            .Where(p => p.UserId == userId && p.IsDefault)
            .FirstOrDefaultAsync();
    }

    public async Task<UserWorkflowFilterPreference?> GetPreferenceByIdAsync(string id)
    {
        return await _context.Set<UserWorkflowFilterPreference>().FirstOrDefaultAsync(p => p.Id == id);
    }

    public async Task<bool> HasPreferenceByNameAsync(string userId, string name)
    {
        return await _context.Set<UserWorkflowFilterPreference>()
            .AnyAsync(p => p.UserId == userId && p.Name == name);
    }
}
