using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;
using Platform.ServiceDefaults.Attributes;
using Platform.ServiceDefaults.Models;
using System.ComponentModel.DataAnnotations.Schema;

namespace Platform.ApiService.Models.Workflow;

/// <summary>
/// 公文状态枚举
/// </summary>
public enum DocumentStatus
{
    /// <summary>草稿</summary>
    Draft = 0,

    /// <summary>审批中</summary>
    Approving = 1,

    /// <summary>已通过</summary>
    Approved = 2,

    /// <summary>已拒绝</summary>
    Rejected = 3
}

/// <summary>
/// 公文实体
/// </summary>
[BsonIgnoreExtraElements]
[BsonCollectionName("documents")]
public class Document : MultiTenantEntity
{
    /// <summary>
    /// 公文标题
    /// </summary>
    [BsonElement("title")]
    public string Title { get; set; } = string.Empty;

    /// <summary>
    /// 公文内容
    /// </summary>
    [BsonElement("content")]
    public string? Content { get; set; }

    /// <summary>
    /// 公文类型
    /// </summary>
    [BsonElement("documentType")]
    public string DocumentType { get; set; } = string.Empty;

    /// <summary>
    /// 分类
    /// </summary>
    [BsonElement("category")]
    public string? Category { get; set; }

    /// <summary>
    /// 关联流程实例ID
    /// </summary>
    [BsonElement("workflowInstanceId")]
    public string? WorkflowInstanceId { get; set; }

    /// <summary>
    /// 公文状态
    /// </summary>
    [BsonElement("status")]
    [BsonRepresentation(BsonType.String)]
    public DocumentStatus Status { get; set; } = DocumentStatus.Draft;

    /// <summary>
    /// 附件ID列表（GridFS）
    /// </summary>
    [BsonElement("attachmentIds")]
    public List<string> AttachmentIds { get; set; } = new();

    /// <summary>
    /// 表单数据
    /// </summary>
    [BsonElement("formData")]
    public Dictionary<string, object> FormData { get; set; } = new();
}
