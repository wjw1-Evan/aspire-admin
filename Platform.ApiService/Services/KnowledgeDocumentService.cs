using Microsoft.EntityFrameworkCore;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Linq.Dynamic.Core;
using System.Linq.Expressions;
using System.Threading.Tasks;
using Platform.ApiService.Models.Workflow;
using Platform.ServiceDefaults.Services;

namespace Platform.ApiService.Services;

/// <summary>
/// 知识库文档服务实现
/// </summary>
public class KnowledgeDocumentService : IKnowledgeDocumentService, IScopedDependency
{
    private readonly DbContext _context;

    public KnowledgeDocumentService(DbContext context)
    {
        _context = context;
        
    }

    public async Task<PagedResult<KnowledgeDocument>> GetDocumentsAsync(string knowledgeBaseId, int page, int pageSize, string? keyword = null)
    {
        Expression<Func<KnowledgeDocument, bool>> filter = d => d.KnowledgeBaseId == knowledgeBaseId;
        if (!string.IsNullOrEmpty(keyword))
        {
            var k = keyword.Trim();
            filter = d => d.KnowledgeBaseId == knowledgeBaseId &&
                (d.Title.Contains(k) || (d.Content != null && d.Content.Contains(k)) || (d.Summary != null && d.Summary.Contains(k)));
        }

        var query = _context.Set<KnowledgeDocument>().Where(filter);
        return query.OrderBy(d => d.SortOrder).ThenByDescending(d => d.CreatedAt).PageResult(page, pageSize);
    }

    public async Task<KnowledgeDocument?> GetByIdAsync(string id)
    {
        return await _context.Set<KnowledgeDocument>().FirstOrDefaultAsync(x => x.Id == id);
    }

    public async Task<KnowledgeDocument> CreateAsync(KnowledgeDocument document)
    {
        await _context.Set<KnowledgeDocument>().AddAsync(document);
        await _context.SaveChangesAsync();
        await UpdateKnowledgeBaseItemCount(document.KnowledgeBaseId, 1);
        return document;
    }

    public async Task<KnowledgeDocument?> UpdateAsync(string id, Action<KnowledgeDocument> updateAction)
    {
        var doc = await _context.Set<KnowledgeDocument>().FirstOrDefaultAsync(x => x.Id == id);
        if (doc == null) return null;
        updateAction(doc);
        await _context.SaveChangesAsync();
        return doc;
    }

    public async Task<bool> DeleteAsync(string id)
    {
        var doc = await _context.Set<KnowledgeDocument>().FirstOrDefaultAsync(x => x.Id == id);
        if (doc == null) return false;

        var entity = await _context.Set<KnowledgeDocument>().FirstOrDefaultAsync(x => x.Id == id);
        if (entity != null) { _context.Set<KnowledgeDocument>().Remove(entity); await _context.SaveChangesAsync(); }
        var result = entity != null;
        if (result)
        {
            await UpdateKnowledgeBaseItemCount(doc.KnowledgeBaseId, -1);
        }
        return result;
    }

    private async Task UpdateKnowledgeBaseItemCount(string knowledgeBaseId, int delta)
    {
        var kb = await _context.Set<KnowledgeBase>().FirstOrDefaultAsync(x => x.Id == knowledgeBaseId);
        if (kb == null) return;

        var newCount = Math.Max(0, kb.ItemCount + delta);
        kb.ItemCount = newCount;
        await _context.SaveChangesAsync();

    }
}