using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;

using Platform.ServiceDefaults.Models;
using System.Text.Json.Serialization;

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
    /// 表单数据（JSON 字符串格式，避免 MongoDB EF Core 提供程序的序列化问题）
    /// </summary>
    [BsonElement("formData")]
    public string? FormDataJson { get; set; }

    /// <summary>
    /// 表单数据缓存（运行时属性，不映射到数据库）
    /// </summary>
    [System.ComponentModel.DataAnnotations.Schema.NotMapped]
    [System.Text.Json.Serialization.JsonIgnore]
    [BsonIgnore]
    private Dictionary<string, object>? _formDataCache;

    /// <summary>
    /// 表单数据（运行时属性，不映射到数据库）
    /// </summary>
    [System.ComponentModel.DataAnnotations.Schema.NotMapped]
    [System.Text.Json.Serialization.JsonIgnore]
    [BsonIgnore]
    public Dictionary<string, object>? FormData
    {
        get
        {
            // 如果 FormDataJson 为空，返回 null
            if (string.IsNullOrEmpty(FormDataJson))
            {
                _formDataCache = null;
                return null;
            }

            // 如果缓存已初始化，直接返回
            if (_formDataCache != null)
                return _formDataCache;

            // 反序列化 FormDataJson
            try
            {
                var options = new System.Text.Json.JsonSerializerOptions
                {
                    PropertyNameCaseInsensitive = true,
                    WriteIndented = false
                };
                _formDataCache = System.Text.Json.JsonSerializer.Deserialize<Dictionary<string, object>>(FormDataJson, options);
                return _formDataCache;
            }
            catch (Exception ex)
            {
                System.Console.WriteLine($"ERROR: FormData 反序列化失败: {ex.Message}");
                _formDataCache = null;
                return null;
            }
        }
        set
        {
            _formDataCache = value;
            if (value == null)
            {
                FormDataJson = null;
            }
            else
            {
                try
                {
                    var options = new System.Text.Json.JsonSerializerOptions
                    {
                        WriteIndented = false
                    };
                    FormDataJson = System.Text.Json.JsonSerializer.Serialize(value, options);
                }
                catch (Exception ex)
                {
                    System.Console.WriteLine($"ERROR: FormData 序列化失败: {ex.Message}");
                    FormDataJson = null;
                }
            }
        }
    }
}