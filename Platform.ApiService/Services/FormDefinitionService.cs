using Microsoft.EntityFrameworkCore;
using Platform.ApiService.Models;
using System.Linq.Expressions;

namespace Platform.ApiService.Services;

public class FormDefinitionService : IFormDefinitionService
{
    private readonly DbContext _context;

    public FormDefinitionService(DbContext context)
    {
        _context = context;
    }

    public async Task<(List<FormDefinition> Items, long Total)> GetFormsAsync(int current, int pageSize, string? keyword, bool? isActive)
    {
        Expression<Func<FormDefinition, bool>>? filter = null;

        if (!string.IsNullOrEmpty(keyword))
        {
            filter = f => f.Name != null && f.Name.Contains(keyword);
        }

        if (isActive.HasValue)
        {
            var isActiveValue = isActive.Value;
            filter = filter == null 
                ? f => f.IsActive == isActiveValue 
                : f => (filter.Compile()(f) && f.IsActive == isActiveValue);
        }

        var query = filter == null ? _context.Set<FormDefinition>() : _context.Set<FormDefinition>().Where(filter);
        var total = await query.LongCountAsync();
        var items = await query.OrderByDescending(f => f.CreatedAt)
            .Skip((current - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync();

        return (items, total);
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
}
