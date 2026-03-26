using Microsoft.EntityFrameworkCore;
using System;
using System.Collections.Generic;
using System.Linq;
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

    public async Task<(List<KnowledgeDocument> items, long total)> FindPagedAsync(string knowledgeBaseId, int page, int pageSize, string? keyword = null)
    {
        Expression<Func<KnowledgeDocument, bool>> filter = d => d.KnowledgeBaseId == knowledgeBaseId;
        if (!string.IsNullOrEmpty(keyword))
        {
            var k = keyword.Trim();
            filter = d => d.KnowledgeBaseId == knowledgeBaseId &&
                (d.Title.Contains(k) || (d.Content != null && d.Content.Contains(k)) || (d.Summary != null && d.Summary.Contains(k)));
        }

        {
            var __fpQ = _context.Set<KnowledgeDocument>().Where(
            filter);
            var __fpT = await __fpQ.LongCountAsync();
            var __fpI = await __fpQ.OrderBy(d => d.SortOrder).ThenByDescending(d => d.CreatedAt).Skip((page - 1) * pageSize).Take(pageSize).ToListAsync();
            return (__fpI, __fpT);
        }
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

        var __sdE = await _context.Set<KnowledgeDocument>().FirstOrDefaultAsync(x => x.Id == id);
        if (__sdE != null) { __sdE.IsDeleted = true; await _context.SaveChangesAsync(); }
        var result = __sdE != null;
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
        var __entity = await _context.Set<KnowledgeBase>().FirstOrDefaultAsync(x => x.Id == knowledgeBaseId);
        if (__entity != null)
        {
    
            __entity.ItemCount = newCount;
            await _context.SaveChangesAsync();
        }

    }
}