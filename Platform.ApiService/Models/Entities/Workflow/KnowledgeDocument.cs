using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;

using Platform.ServiceDefaults.Models;

namespace Platform.ApiService.Models.Workflow;

/// <summary>
/// 知识库文档 - 用户录入的具体内容
/// </summary>
public class KnowledgeDocument : MultiTenantEntity
{
    [BsonRepresentation(BsonType.ObjectId)]
    public string KnowledgeBaseId { get; set; } = string.Empty;

    public string Title { get; set; } = string.Empty;

    public string Content { get; set; } = string.Empty;

    public string? Summary { get; set; }

    public int SortOrder { get; set; } = 0;
}