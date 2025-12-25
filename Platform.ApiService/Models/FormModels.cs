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
    /// <summary>文本</summary>
    Text,
    /// <summary>多行文本</summary>
    TextArea,
    /// <summary>数字</summary>
    Number,
    /// <summary>日期</summary>
    Date,
    /// <summary>日期时间</summary>
    DateTime,
    /// <summary>下拉选择</summary>
    Select,
    /// <summary>单选</summary>
    Radio,
    /// <summary>复选框</summary>
    Checkbox,
    /// <summary>开关</summary>
    Switch,
    /// <summary>附件</summary>
    Attachment
}

/// <summary>
/// 表单目标（数据存储位置）
/// </summary>
public enum FormTarget
{
    /// <summary>文档数据</summary>
    Document,
    /// <summary>实例变量</summary>
    Instance
}

/// <summary>
/// 表单定义实体
/// </summary>
[BsonIgnoreExtraElements]
[BsonCollectionName("form_definitions")]
public class FormDefinition : IEntity, ISoftDeletable, ITimestamped, IMultiTenant
{
    /// <summary>实体ID</summary>
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

    /// <summary>是否已删除</summary>
    [BsonElement("isDeleted")]
    public bool IsDeleted { get; set; } = false;

    /// <summary>删除时间</summary>
    [BsonElement("deletedAt")]
    public DateTime? DeletedAt { get; set; }

    /// <summary>删除人ID</summary>
    [BsonElement("deletedBy")]
    public string? DeletedBy { get; set; }

    /// <summary>删除原因</summary>
    [BsonElement("deletedReason")]
    public string? DeletedReason { get; set; }

    /// <summary>创建时间</summary>
    [BsonElement("createdAt")]
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    /// <summary>更新时间</summary>
    [BsonElement("updatedAt")]
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    /// <summary>创建人ID</summary>
    [BsonElement("createdBy")]
    public string? CreatedBy { get; set; }

    /// <summary>创建人用户名</summary>
    [BsonElement("createdByUsername")]
    public string? CreatedByUsername { get; set; }

    /// <summary>更新人ID</summary>
    [BsonElement("updatedBy")]
    public string? UpdatedBy { get; set; }

    /// <summary>更新人用户名</summary>
    [BsonElement("updatedByUsername")]
    public string? UpdatedByUsername { get; set; }
}

/// <summary>
/// 表单字段
/// </summary>
public class FormField
{
    /// <summary>字段ID</summary>
    [BsonElement("id")]
    public string Id { get; set; } = Guid.NewGuid().ToString("N");

    /// <summary>字段标签</summary>
    [BsonElement("label")]
    public string Label { get; set; } = string.Empty;

    /// <summary>字段类型</summary>
    [BsonElement("type")]
    [BsonRepresentation(BsonType.String)]
    public FormFieldType Type { get; set; } = FormFieldType.Text;

    /// <summary>是否必填</summary>
    [BsonElement("required")]
    public bool Required { get; set; } = false;

    /// <summary>占位符</summary>
    [BsonElement("placeholder")]
    public string? Placeholder { get; set; }

    /// <summary>默认值</summary>
    [BsonElement("defaultValue")]
    public object? DefaultValue { get; set; }

    /// <summary>选项列表（用于 Select/Radio/Checkbox）</summary>
    [BsonElement("options")]
    public List<FormOption>? Options { get; set; }

    /// <summary>校验规则列表</summary>
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
    /// <summary>选项标签</summary>
    [BsonElement("label")]
    public string Label { get; set; } = string.Empty;

    /// <summary>选项值</summary>
    [BsonElement("value")]
    public string Value { get; set; } = string.Empty;
}

/// <summary>
/// 表单校验规则
/// </summary>
public class FormValidationRule
{
    /// <summary>校验类型（regex|min|max|length|custom）</summary>
    [BsonElement("type")]
    public string Type { get; set; } = "regex";

    /// <summary>正则表达式模式</summary>
    [BsonElement("pattern")]
    public string? Pattern { get; set; }

    /// <summary>错误消息</summary>
    [BsonElement("message")]
    public string? Message { get; set; }

    /// <summary>最小值</summary>
    [BsonElement("min")]
    public double? Min { get; set; }

    /// <summary>最大值</summary>
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
