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
    private readonly IDataFactory<KnowledgeDocument> _documentFactory;
    private readonly IDataFactory<KnowledgeBase> _knowledgeBaseFactory;

    public KnowledgeDocumentService(
        IDataFactory<KnowledgeDocument> documentFactory,
        IDataFactory<KnowledgeBase> knowledgeBaseFactory)
    {
        _documentFactory = documentFactory;
        _knowledgeBaseFactory = knowledgeBaseFactory;
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

        return await _documentFactory.FindPagedAsync(
            filter,
            q => q.OrderBy(d => d.SortOrder).ThenByDescending(d => d.CreatedAt),
            page,
            pageSize);
    }

    public async Task<KnowledgeDocument?> GetByIdAsync(string id)
    {
        return await _documentFactory.GetByIdAsync(id);
    }

    public async Task<KnowledgeDocument> CreateAsync(KnowledgeDocument document)
    {
        var created = await _documentFactory.CreateAsync(document);
        await UpdateKnowledgeBaseItemCount(document.KnowledgeBaseId, 1);
        return created;
    }

    public async Task<KnowledgeDocument?> UpdateAsync(string id, Action<KnowledgeDocument> updateAction)
    {
        return await _documentFactory.UpdateAsync(id, updateAction);
    }

    public async Task<bool> DeleteAsync(string id)
    {
        var doc = await _documentFactory.GetByIdAsync(id);
        if (doc == null) return false;

        var result = await _documentFactory.SoftDeleteAsync(id);
        if (result)
        {
            await UpdateKnowledgeBaseItemCount(doc.KnowledgeBaseId, -1);
        }
        return result;
    }

    private async Task UpdateKnowledgeBaseItemCount(string knowledgeBaseId, int delta)
    {
        var kb = await _knowledgeBaseFactory.GetByIdAsync(knowledgeBaseId);
        if (kb == null) return;

        var newCount = Math.Max(0, kb.ItemCount + delta);
        await _knowledgeBaseFactory.UpdateAsync(knowledgeBaseId, k =>
        {
            k.ItemCount = newCount;
        });
    }
}
