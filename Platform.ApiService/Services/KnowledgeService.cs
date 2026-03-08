using System.Collections.Generic;
using System.Threading.Tasks;
using System.Linq;
using System.Linq.Expressions;
using Platform.ServiceDefaults.Services;
using Platform.ApiService.Models.Workflow;
using System;

namespace Platform.ApiService.Services;

/// <summary>
/// 知识库服务实现
/// </summary>
public class KnowledgeService : IKnowledgeService, IScopedDependency
{
    private readonly IDataFactory<KnowledgeBase> _knowledgeBaseFactory;
    private readonly IDataFactory<KnowledgeDocument> _documentFactory;

    public KnowledgeService(
        IDataFactory<KnowledgeBase> knowledgeBaseFactory,
        IDataFactory<KnowledgeDocument> documentFactory)
    {
        _knowledgeBaseFactory = knowledgeBaseFactory;
        _documentFactory = documentFactory;
    }

    /// <summary>
    /// 搜索知识库 - 基于真实文档的文本匹配
    /// </summary>
    public async Task<List<KnowledgeSnippet>> SearchAsync(string query, List<string> knowledgeBaseIds, int topK = 3)
    {
        if (knowledgeBaseIds == null || knowledgeBaseIds.Count == 0)
            return new List<KnowledgeSnippet>();

        var q = (query ?? "").Trim();
        if (string.IsNullOrEmpty(q))
        {
            // 无查询词时返回最近更新的文档
            Expression<Func<KnowledgeDocument, bool>> filterAll = d => knowledgeBaseIds.Contains(d.KnowledgeBaseId);
            var docs = await _documentFactory.FindAsync(
                filterAll,
                q => q.OrderByDescending(d => d.UpdatedAt),
                limit: topK);
            return docs.Select(d => new KnowledgeSnippet
            {
                Content = d.Content.Length > 500 ? d.Content[..500] + "..." : d.Content,
                Source = d.Title,
                Score = 0.8
            }).ToList();
        }

        // 简单文本包含匹配
        Expression<Func<KnowledgeDocument, bool>> filter = d =>
            knowledgeBaseIds.Contains(d.KnowledgeBaseId) &&
            (d.Title.Contains(q) || d.Content.Contains(q) || (d.Summary != null && d.Summary.Contains(q)));

        var documents = await _documentFactory.FindAsync(
            filter,
            q => q.OrderByDescending(d => d.UpdatedAt),
            limit: topK * 2);

        var results = documents
            .Select(d =>
            {
                var content = d.Content.Length > 500 ? d.Content[..500] + "..." : d.Content;
                var score = d.Title.Contains(q, StringComparison.OrdinalIgnoreCase) ? 0.95 : 0.85;
                return new KnowledgeSnippet { Content = content, Source = d.Title, Score = score };
            })
            .OrderByDescending(s => s.Score)
            .Take(topK)
            .ToList();

        return results;
    }

    public async Task<(List<KnowledgeBase> items, long total)> FindPagedAsync(int page, int pageSize, string? keyword = null)
    {
        Expression<Func<KnowledgeBase, bool>>? filter = null;
        if (!string.IsNullOrEmpty(keyword))
        {
            filter = kb => kb.Name.Contains(keyword) || (kb.Description != null && kb.Description.Contains(keyword));
        }

        return await _knowledgeBaseFactory.FindPagedAsync(filter, q => q.OrderByDescending(kb => kb.CreatedAt), page, pageSize);
    }

    public async Task<KnowledgeBase?> GetByIdAsync(string id)
    {
        return await _knowledgeBaseFactory.GetByIdAsync(id);
    }

    public async Task<KnowledgeBase> CreateAsync(KnowledgeBase knowledgeBase)
    {
        return await _knowledgeBaseFactory.CreateAsync(knowledgeBase);
    }

    public async Task<KnowledgeBase?> UpdateAsync(string id, Action<KnowledgeBase> updateAction)
    {
        return await _knowledgeBaseFactory.UpdateAsync(id, updateAction);
    }

    public async Task<bool> DeleteAsync(string id)
    {
        return await _knowledgeBaseFactory.SoftDeleteAsync(id);
    }
}
