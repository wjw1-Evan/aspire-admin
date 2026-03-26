using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using Platform.ApiService.Models;
using Platform.ApiService.Models.Workflow;

namespace Platform.ApiService.Services;

/// <summary>
/// 知识库服务接口
/// </summary>
public interface IKnowledgeService
{
    /// <summary>
    /// 检索相关文档片段
    /// </summary>
    /// <param name="query">查询关键词</param>
    /// <param name="knowledgeBaseIds">知识库ID列表</param>
    /// <param name="topK">返回结果数量</param>
    /// <returns>相关文档片段列表</returns>
    Task<List<KnowledgeSnippet>> SearchAsync(string query, List<string> knowledgeBaseIds, int topK = 3);

    /// <summary>
    /// 分页获取知识库列表
    /// </summary>
    Task<(List<KnowledgeBase> items, long total)> FindPagedAsync(int page, int pageSize, string? keyword = null);

    /// <summary>
    /// 获取知识库详情
    /// </summary>
    Task<KnowledgeBase?> GetByIdAsync(string id);

    /// <summary>
    /// 创建知识库
    /// </summary>
    Task<KnowledgeBase> CreateAsync(KnowledgeBase knowledgeBase);

    /// <summary>
    /// 更新知识库
    /// </summary>
    Task<KnowledgeBase?> UpdateAsync(string id, Action<KnowledgeBase> updateAction);

    /// <summary>
    /// 删除知识库
    /// </summary>
    Task<bool> DeleteAsync(string id);
}

/// <summary>
/// 知识片段
/// </summary>
public class KnowledgeSnippet
{
    /// <summary>
    /// 内容
    /// </summary>
    public string Content { get; set; } = string.Empty;

    /// <summary>
    /// 来源
    /// </summary>
    public string Source { get; set; } = string.Empty;

    /// <summary>
    /// 分数
    /// </summary>
    public double Score { get; set; }
}