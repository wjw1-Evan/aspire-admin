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

    public async Task<System.Linq.Dynamic.Core.PagedResult<FormDefinition>> GetFormsAsync(Platform.ServiceDefaults.Models.ProTableRequest request, bool? isActive)
    {
        var query = _context.Set<FormDefinition>().AsQueryable();

        if (isActive.HasValue)
        {
            query = query.Where(f => f.IsActive == isActive.Value);
        }

        if (!string.IsNullOrWhiteSpace(request.Search))
        {
            var search = request.Search.ToLower();
            query = query.Where(f => f.Name.ToLower().Contains(search) || (f.Description != null && f.Description.ToLower().Contains(search)));
        }

        return query.ToPagedList(request);
    }

    public async Task<FormDefinition?> GetFormByIdAsync(string id)
    {
        var form = await _context.Set<FormDefinition>().FirstOrDefaultAsync(x => x.Id == id);
        if (form == null) return null;

        if (!string.IsNullOrEmpty(form.LatestVersionId))
        {
            var latestVersion = await _context.Set<FormVersion>().FirstOrDefaultAsync(x => x.Id == form.LatestVersionId);
            if (latestVersion != null)
            {
                form.Fields = latestVersion.Fields;
                form.IsActive = latestVersion.IsActive;
            }
        }
        return form;
    }

    public async Task<FormVersion?> GetFormVersionByIdAsync(string versionId)
    {
        return await _context.Set<FormVersion>().FirstOrDefaultAsync(x => x.Id == versionId);
    }

    public async Task<List<FormVersion>> GetFormVersionsAsync(string formId)
    {
        return await _context.Set<FormVersion>()
            .Where(x => x.FormDefinitionId == formId)
            .OrderByDescending(x => x.Version)
            .ToListAsync();
    }

    public async Task<List<FormDefinition>> GetFormsByIdsAsync(List<string> ids)
    {
        var forms = await _context.Set<FormDefinition>()
            .Where(f => ids.Contains(f.Id))
            .ToListAsync();

        foreach (var form in forms)
        {
            var latestVersion = await _context.Set<FormVersion>().FirstOrDefaultAsync(x => x.Id == form.LatestVersionId);
            if (latestVersion != null)
            {
                form.Fields = latestVersion.Fields;
            }
        }
        return forms;
    }

    public async Task<FormDefinition> CreateFormAsync(FormDefinition form)
    {
        if (string.IsNullOrEmpty(form.Name))
        {
            throw new ArgumentException("表单名称不能为空");
        }

        form.Key = string.IsNullOrWhiteSpace(form.Key) ? $"form_{Guid.NewGuid():N}" : form.Key;
        form.Version = 1;
        await _context.Set<FormDefinition>().AddAsync(form);
        await _context.SaveChangesAsync();

        var formVersion = new FormVersion
        {
            FormDefinitionId = form.Id,
            Version = 1,
            Name = form.Name,
            Fields = form.Fields,
            IsActive = form.IsActive
        };
        await _context.Set<FormVersion>().AddAsync(formVersion);
        await _context.SaveChangesAsync();

        form.LatestVersionId = formVersion.Id;
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

        var newVersion = existing.Version + 1;
        var formVersion = new FormVersion
        {
            FormDefinitionId = id,
            Version = newVersion,
            Name = form.Name,
            Fields = form.Fields,
            IsActive = form.IsActive
        };
        await _context.Set<FormVersion>().AddAsync(formVersion);
        await _context.SaveChangesAsync();

        existing.Name = form.Name;
        existing.Version = newVersion;
        existing.LatestVersionId = formVersion.Id;
        existing.IsActive = form.IsActive;
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

        var versions = await _context.Set<FormVersion>().Where(x => x.FormDefinitionId == id).ToListAsync();
        _context.Set<FormVersion>().RemoveRange(versions);
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