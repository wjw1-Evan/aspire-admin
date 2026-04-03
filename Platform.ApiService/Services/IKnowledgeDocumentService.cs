using Platform.ApiService.Models.Workflow;
using System.Linq.Dynamic.Core;
using System.Threading.Tasks;

namespace Platform.ApiService.Services;

/// <summary>
/// 知识库文档服务接口
/// </summary>
public interface IKnowledgeDocumentService
{
    /// <summary>
    /// 分页获取知识库下的文档列表
    /// </summary>
    Task<System.Linq.Dynamic.Core.PagedResult<KnowledgeDocument>> GetDocumentsAsync(string knowledgeBaseId, Platform.ServiceDefaults.Models.PageParams request);

    /// <summary>
    /// 获取文档详情
    /// </summary>
    Task<KnowledgeDocument?> GetByIdAsync(string id);

    /// <summary>
    /// 创建文档
    /// </summary>
    Task<KnowledgeDocument> CreateAsync(KnowledgeDocument document);

    /// <summary>
    /// 更新文档
    /// </summary>
    Task<KnowledgeDocument?> UpdateAsync(string id, Action<KnowledgeDocument> updateAction);

    /// <summary>
    /// 删除文档（软删除）
    /// </summary>
    Task<bool> DeleteAsync(string id);
}
