using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;

using Platform.ServiceDefaults.Models;

namespace Platform.ApiService.Models.Workflow;

/// <summary>
/// 知识库文档 - 用户录入的具体内容
/// </summary>
public class KnowledgeDocument : MultiTenantEntity
{
    [BsonElement("knowledgeBaseId")]
    [BsonRepresentation(BsonType.ObjectId)]
    public string KnowledgeBaseId { get; set; } = string.Empty;

    [BsonElement("title")]
    public string Title { get; set; } = string.Empty;

    [BsonElement("content")]
    public string Content { get; set; } = string.Empty;

    [BsonElement("summary")]
    public string? Summary { get; set; }

    [BsonElement("sortOrder")]
    public int SortOrder { get; set; } = 0;
}