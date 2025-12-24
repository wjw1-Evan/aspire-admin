using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;
using Platform.ServiceDefaults.Attributes;
using Platform.ServiceDefaults.Models;
using System;
using System.Collections.Generic;

namespace Platform.ApiService.Models;

/// <summary>
/// 表单字段类型
/// </summary>
public enum FormFieldType
{
    Text,
    TextArea,
    Number,
    Date,
    DateTime,
    Select,
    Radio,
    Checkbox,
    Switch,
    Attachment
}

/// <summary>
/// 表单目标（数据存储位置）
/// </summary>
public enum FormTarget
{
    Document,
    Instance
}

/// <summary>
/// 表单定义实体
/// </summary>
[BsonIgnoreExtraElements]
[BsonCollectionName("form_definitions")]
public class FormDefinition : IEntity, ISoftDeletable, ITimestamped, IMultiTenant
{
    [BsonId]
    [BsonRepresentation(BsonType.ObjectId)]
    public string Id { get; set; } = string.Empty;

    /// <summary>表单名称</summary>
    [BsonElement("name")]
    public string Name { get; set; } = string.Empty;

    /// <summary>唯一键（用于引用）</summary>
    [BsonElement("key")]
    public string Key { get; set; } = string.Empty;

    /// <summary>版本</summary>
    [BsonElement("version")]
    public int Version { get; set; } = 1;

    /// <summary>描述</summary>
    [BsonElement("description")]
    public string? Description { get; set; }

    /// <summary>字段集合</summary>
    [BsonElement("fields")]
    public List<FormField> Fields { get; set; } = new();

    /// <summary>是否启用</summary>
    [BsonElement("isActive")]
    public bool IsActive { get; set; } = true;

    /// <summary>企业ID（多租户）</summary>
    [BsonElement("companyId")]
    public string CompanyId { get; set; } = string.Empty;

    // Soft delete
    [BsonElement("isDeleted")]
    public bool IsDeleted { get; set; } = false;

    [BsonElement("deletedAt")]
    public DateTime? DeletedAt { get; set; }

    [BsonElement("deletedBy")]
    public string? DeletedBy { get; set; }

    [BsonElement("deletedReason")]
    public string? DeletedReason { get; set; }

    // Timestamps
    [BsonElement("createdAt")]
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    [BsonElement("updatedAt")]
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    [BsonElement("createdBy")]
    public string? CreatedBy { get; set; }

    [BsonElement("createdByUsername")]
    public string? CreatedByUsername { get; set; }

    [BsonElement("updatedBy")]
    public string? UpdatedBy { get; set; }

    [BsonElement("updatedByUsername")]
    public string? UpdatedByUsername { get; set; }
}

/// <summary>
/// 表单字段
/// </summary>
public class FormField
{
    [BsonElement("id")]
    public string Id { get; set; } = Guid.NewGuid().ToString("N");

    [BsonElement("label")]
    public string Label { get; set; } = string.Empty;

    [BsonElement("type")]
    [BsonRepresentation(BsonType.String)]
    public FormFieldType Type { get; set; } = FormFieldType.Text;

    [BsonElement("required")]
    public bool Required { get; set; } = false;

    [BsonElement("placeholder")]
    public string? Placeholder { get; set; }

    [BsonElement("defaultValue")]
    public object? DefaultValue { get; set; }

    [BsonElement("options")]
    public List<FormOption>? Options { get; set; }

    [BsonElement("rules")]
    public List<FormValidationRule>? Rules { get; set; }

    /// <summary>数据绑定键（在文档或实例变量中使用的键）</summary>
    [BsonElement("dataKey")]
    public string DataKey { get; set; } = string.Empty;
}

/// <summary>
/// 表单选项（用于 Select/Radio/Checkbox 等）
/// </summary>
public class FormOption
{
    [BsonElement("label")]
    public string Label { get; set; } = string.Empty;

    [BsonElement("value")]
    public string Value { get; set; } = string.Empty;
}

/// <summary>
/// 表单校验规则
/// </summary>
public class FormValidationRule
{
    [BsonElement("type")]
    public string Type { get; set; } = "regex"; // regex|min|max|length|custom

    [BsonElement("pattern")]
    public string? Pattern { get; set; }

    [BsonElement("message")]
    public string? Message { get; set; }

    [BsonElement("min")]
    public double? Min { get; set; }

    [BsonElement("max")]
    public double? Max { get; set; }
}

/// <summary>
/// 工作流节点的表单绑定配置
/// </summary>
public class FormBinding
{
    /// <summary>表单定义ID</summary>
    [BsonElement("formDefinitionId")]
    [BsonRepresentation(BsonType.ObjectId)]
    public string FormDefinitionId { get; set; } = string.Empty;

    /// <summary>目标（文档或实例变量）</summary>
    [BsonElement("target")]
    [BsonRepresentation(BsonType.String)]
    public FormTarget Target { get; set; } = FormTarget.Document;

    /// <summary>在目标中存储的键（若为空则使用字段自身的 dataKey）</summary>
    [BsonElement("dataScopeKey")]
    public string? DataScopeKey { get; set; }

    /// <summary>是否必填（提交前必须完成）</summary>
    [BsonElement("required")]
    public bool Required { get; set; } = false;
}
