using Microsoft.EntityFrameworkCore;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Linq.Dynamic.Core;
using System.Threading.Tasks;
using Platform.ServiceDefaults.Extensions;
using Platform.ServiceDefaults.Services;
using Platform.ApiService.Models.Workflow;

namespace Platform.ApiService.Services;

/// <summary>
/// 知识库服务实现
/// </summary>
public class KnowledgeService : IKnowledgeService, IScopedDependency
{
    private readonly DbContext _context;

    public KnowledgeService(DbContext context)
    {
        _context = context;
    }

    /// <inheritdoc/>
    public async Task<List<KnowledgeSnippet>> SearchAsync(string query, List<string> knowledgeBaseIds, int topK = 3)
    {
        if (knowledgeBaseIds == null || !knowledgeBaseIds.Any()) return new List<KnowledgeSnippet>();

        var q = (query ?? "").Trim();
        var docs = _context.Set<KnowledgeDocument>().Where(d => knowledgeBaseIds.Contains(d.KnowledgeBaseId));

        if (string.IsNullOrEmpty(q))
        {
            var results = await docs.OrderByDescending(d => d.UpdatedAt).Take(topK).ToListAsync();
            return results.Select(d => new KnowledgeSnippet
            {
                Content = d.Content.Length > 500 ? d.Content[..500] + "..." : d.Content,
                Source = d.Title,
                Score = 0.8
            }).ToList();
        }

        var matched = await docs.Where(d => d.Title.Contains(q) || d.Content.Contains(q) || (d.Summary != null && d.Summary.Contains(q)))
            .OrderByDescending(d => d.UpdatedAt).Take(topK * 2).ToListAsync();

        return matched.Select(d => new KnowledgeSnippet
        {
            Content = d.Content.Length > 500 ? d.Content[..500] + "..." : d.Content,
            Source = d.Title,
            Score = d.Title.Contains(q, StringComparison.OrdinalIgnoreCase) ? 0.95 : 0.85
        }).OrderByDescending(s => s.Score).Take(topK).ToList();
    }

    /// <inheritdoc/>
    public async Task<System.Linq.Dynamic.Core.PagedResult<KnowledgeBase>> GetKnowledgeBasesAsync(Platform.ServiceDefaults.Models.PageParams request)
    {
        var q = _context.Set<KnowledgeBase>().AsQueryable();
        return q.OrderByDescending(kb => kb.CreatedAt).ToPagedList(request);
    }

    /// <inheritdoc/>
    public async Task<KnowledgeBase?> GetByIdAsync(string id) => await _context.Set<KnowledgeBase>().FirstOrDefaultAsync(x => x.Id == id);

    /// <inheritdoc/>
    public async Task<KnowledgeBase> CreateAsync(KnowledgeBase knowledgeBase)
    {
        await _context.Set<KnowledgeBase>().AddAsync(knowledgeBase);
        await _context.SaveChangesAsync();
        return knowledgeBase;
    }

    /// <inheritdoc/>
    public async Task<KnowledgeBase?> UpdateAsync(string id, Action<KnowledgeBase> updateAction)
    {
        var entity = await _context.Set<KnowledgeBase>().FirstOrDefaultAsync(x => x.Id == id);
        if (entity == null) return null;
        updateAction(entity);
        await _context.SaveChangesAsync();
        return entity;
    }

    /// <inheritdoc/>
    public async Task<bool> DeleteAsync(string id)
    {
        var entity = await _context.Set<KnowledgeBase>().FirstOrDefaultAsync(x => x.Id == id);
        if (entity == null) return false;
        _context.Set<KnowledgeBase>().Remove(entity);
        await _context.SaveChangesAsync();
        return true;
    }
}
