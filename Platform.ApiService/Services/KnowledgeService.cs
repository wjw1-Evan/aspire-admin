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

    public KnowledgeService(IDataFactory<KnowledgeBase> knowledgeBaseFactory)
    {
        _knowledgeBaseFactory = knowledgeBaseFactory;
    }

    private readonly List<KnowledgeSnippet> _mockData = new()
    {
        new KnowledgeSnippet { Content = "Aspire Admin 是一个基于 .NET Aspire 的企业级管理后台框架。", Source = "Doc-001", Score = 0.95 },
        new KnowledgeSnippet { Content = "工作流引擎支持 Microsoft Agent Framework 的集成，支持多种 AI 节点。", Source = "Doc-002", Score = 0.88 },
        new KnowledgeSnippet { Content = "Dify 是一个流行的开源 LLM 应用开发平台，提供可视化工作流设计。", Source = "Doc-003", Score = 0.82 }
    };

    /// <summary>
    /// 搜索知识库
    /// </summary>
    public Task<List<KnowledgeSnippet>> SearchAsync(string query, List<string> knowledgeBaseIds, int topK = 3)
    {
        // 简单模拟匹配逻辑：检查内容是否包含查询词中的某些部分
        var keywords = query.Split(' ', System.StringSplitOptions.RemoveEmptyEntries);
        var results = _mockData
            .Where(s => keywords.Any(k => s.Content.Contains(k, System.StringComparison.OrdinalIgnoreCase)))
            .OrderByDescending(s => s.Score)
            .Take(topK)
            .ToList();

        // 如果没有匹配，返回前 topK 条
        if (!results.Any())
        {
            results = _mockData.Take(topK).ToList();
        }

        return Task.FromResult(results);
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
