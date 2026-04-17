using Microsoft.EntityFrameworkCore;
using Platform.ApiService.Models;
using Platform.ServiceDefaults.Extensions;
using System.Linq.Dynamic.Core;
using System.Linq.Expressions;

namespace Platform.ApiService.Services;

public class FormDefinitionService : IFormDefinitionService
{
    private readonly DbContext _context;

    public FormDefinitionService(DbContext context)
    {
        _context = context;
    }

    public async Task<System.Linq.Dynamic.Core.PagedResult<FormDefinition>> GetFormsAsync(Platform.ServiceDefaults.Models.PageParams request, bool? isActive)
    {
        var query = _context.Set<FormDefinition>().AsQueryable();

        if (isActive.HasValue)
        {
            query = query.Where(f => f.IsActive == isActive.Value);
        }

        return query.ToPagedList(request);
    }

    public async Task<FormDefinition?> GetFormByIdAsync(string id)
    {
        return await _context.Set<FormDefinition>().FirstOrDefaultAsync(x => x.Id == id);
    }

    public async Task<List<FormDefinition>> GetFormsByIdsAsync(List<string> ids)
    {
        return await _context.Set<FormDefinition>()
            .Include(f => f.Fields)
            .Where(f => ids.Contains(f.Id))
            .ToListAsync();
    }

    public async Task<FormDefinition> CreateFormAsync(FormDefinition form)
    {
        if (string.IsNullOrEmpty(form.Name))
        {
            throw new ArgumentException("表单名称不能为空");
        }

        form.Key = string.IsNullOrWhiteSpace(form.Key) ? $"form_{Guid.NewGuid():N}" : form.Key;

        await _context.Set<FormDefinition>().AddAsync(form);
        await _context.SaveChangesAsync();
        return form;
    }

    public async Task<FormDefinition?> UpdateFormAsync(string id, FormDefinition form)
    {
        var existing = await _context.Set<FormDefinition>().FirstOrDefaultAsync(x => x.Id == id);
        if (existing == null)
        {
            return null;
        }

        existing.Name = form.Name;
        existing.Description = form.Description;
        existing.Fields = form.Fields;
        existing.IsActive = form.IsActive;
        existing.Version = form.Version;
        await _context.SaveChangesAsync();

        return existing;
    }

    public async Task<bool> DeleteFormAsync(string id)
    {
        var entity = await _context.Set<FormDefinition>().FirstOrDefaultAsync(x => x.Id == id);
        if (entity == null)
        {
            return false;
        }

        _context.Set<FormDefinition>().Remove(entity);
        await _context.SaveChangesAsync();
        return true;
    }

    public async Task<object> GetStatisticsAsync()
    {
        var totalForms = await _context.Set<FormDefinition>().CountAsync();
        var activeForms = await _context.Set<FormDefinition>().CountAsync(f => f.IsActive);

        return new
        {
            totalForms,
            activeForms,
            inactiveForms = totalForms - activeForms
        };
    }
}
