using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;

using Platform.ServiceDefaults.Models;
using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations.Schema;

namespace Platform.ApiService.Models;

/// <summary>
/// 表单定义实体
/// </summary>
public class FormDefinition : MultiTenantEntity
{
    /// <summary>表单名称</summary>
    public string Name { get; set; } = string.Empty;

    /// <summary>唯一键（用于引用）</summary>
    public string Key { get; set; } = string.Empty;

    /// <summary>当前版本号</summary>
    public int Version { get; set; } = 1;

    /// <summary>最新版本ID</summary>
    public string? LatestVersionId { get; set; }

    /// <summary>描述</summary>
    public string? Description { get; set; }

    /// <summary>是否启用</summary>
    public bool IsActive { get; set; } = true;

    /// <summary>字段集合（运行时从版本获取，不持久化）</summary>
    [NotMapped]
    public List<FormField> Fields { get; set; } = new();
}

/// <summary>
/// 表单版本历史
/// </summary>
public class FormVersion : MultiTenantEntity
{
    /// <summary>表单定义ID</summary>
    public string FormDefinitionId { get; set; } = string.Empty;

    /// <summary>版本号</summary>
    public int Version { get; set; } = 1;

    /// <summary>表单名称</summary>
    public string Name { get; set; } = string.Empty;

    /// <summary>字段集合</summary>
    public List<FormField> Fields { get; set; } = new();

    /// <summary>是否启用</summary>
    public bool IsActive { get; set; } = true;
}

/// <summary>
/// 表单字段
/// </summary>
public class FormField
{
    /// <summary>字段ID</summary>
    public string Id { get; set; } = Guid.NewGuid().ToString("N");

    /// <summary>字段标签</summary>
    public string Label { get; set; } = string.Empty;

    /// <summary>字段类型</summary>
    [BsonRepresentation(BsonType.String)]
    public FormFieldType Type { get; set; } = FormFieldType.Text;

    /// <summary>是否必填</summary>
    public bool Required { get; set; } = false;

    /// <summary>占位符</summary>
    public string? Placeholder { get; set; }

    /// <summary>默认值</summary>
    [NotMapped]
    public object? DefaultValue { get; set; }

    /// <summary>选项列表（用于 Select/Radio/Checkbox）</summary>
    public List<FormOption>? Options { get; set; }

    /// <summary>校验规则列表</summary>
    public List<FormValidationRule>? Rules { get; set; }

    /// <summary>数据绑定键（在文档或实例变量中使用的键）</summary>
    public string DataKey { get; set; } = string.Empty;
}

/// <summary>
/// 表单选项（用于 Select/Radio/Checkbox 等）
/// </summary>
public class FormOption
{
    /// <summary>选项标签</summary>
    public string Label { get; set; } = string.Empty;

    /// <summary>选项值</summary>
    public string Value { get; set; } = string.Empty;
}

/// <summary>
/// 表单校验规则
/// </summary>
public class FormValidationRule
{
    /// <summary>校验类型（regex|min|max|length|custom）</summary>
    public string Type { get; set; } = "regex";

    /// <summary>正则表达式模式</summary>
    public string? Pattern { get; set; }

    /// <summary>错误消息</summary>
    public string? Message { get; set; }

    /// <summary>最小值</summary>
    public double? Min { get; set; }

    /// <summary>最大值</summary>
    public double? Max { get; set; }
}

/// <summary>
/// 工作流节点的表单绑定配置
/// </summary>
public class FormBinding
{
    /// <summary>表单定义ID</summary>
    [BsonRepresentation(BsonType.ObjectId)]
    public string? FormDefinitionId { get; set; }

    /// <summary>目标（文档或实例变量）</summary>
    [BsonRepresentation(BsonType.String)]
    public FormTarget Target { get; set; } = FormTarget.Document;

    /// <summary>在目标中存储的键（若为空则使用字段自身的 dataKey）</summary>
    public string? DataScopeKey { get; set; }

    /// <summary>是否必填（提交前必须完成）</summary>
    public bool Required { get; set; } = false;
}