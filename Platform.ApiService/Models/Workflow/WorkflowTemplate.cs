using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;

using Platform.ServiceDefaults.Models;
using System.ComponentModel.DataAnnotations.Schema;

namespace Platform.ApiService.Models.Workflow;

/// <summary>
/// 工作流模板
/// </summary>
[BsonIgnoreExtraElements]
public class WorkflowTemplate : MultiTenantEntity
{
    /// <summary>
    /// 模板名称
    /// </summary>
    public string Name { get; set; } = string.Empty;

    /// <summary>
    /// 模板描述
    /// </summary>
    public string? Description { get; set; }

    /// <summary>
    /// 模板类型
    /// </summary>
    [BsonRepresentation(BsonType.String)]
    public TemplateType TemplateType { get; set; } = TemplateType.User;

    /// <summary>
    /// 模板分类
    /// </summary>
    public string Category { get; set; } = string.Empty;

    /// <summary>
    /// 模板标签
    /// </summary>
    public List<string> Tags { get; set; } = new();

    /// <summary>
    /// 工作流定义模板
    /// </summary>
    public WorkflowDefinition WorkflowDefinitionTemplate { get; set; } = new();

    /// <summary>
    /// 参数定义
    /// </summary>
    public List<TemplateParameter> Parameters { get; set; } = new();

    /// <summary>
    /// 版本号
    /// </summary>
    public string Version { get; set; } = "1.0.0";

    /// <summary>
    /// 是否公开（对其他用户可见）
    /// </summary>
    public bool IsPublic { get; set; } = false;

    /// <summary>
    /// 使用次数
    /// </summary>
    public int UsageCount { get; set; } = 0;

    /// <summary>
    /// 评分（1-5星）
    /// </summary>
    public double Rating { get; set; } = 0.0;

    /// <summary>
    /// 评价数量
    /// </summary>
    public int RatingCount { get; set; } = 0;

    /// <summary>
    /// 依赖项列表
    /// </summary>
    public List<TemplateDependency> Dependencies { get; set; } = new();
}

/// <summary>
/// 模板参数
/// </summary>
public class TemplateParameter
{
    /// <summary>
    /// 参数名称
    /// </summary>
    public string Name { get; set; } = string.Empty;

    /// <summary>
    /// 参数显示名称
    /// </summary>
    public string DisplayName { get; set; } = string.Empty;

    /// <summary>
    /// 参数描述
    /// </summary>
    public string? Description { get; set; }

    /// <summary>
    /// 参数类型（string, number, boolean, select）
    /// </summary>
    public string Type { get; set; } = "string";

    /// <summary>默认值</summary>
    [NotMapped]
    public object? DefaultValue { get; set; }

    /// <summary>
    /// 是否必需
    /// </summary>
    public bool Required { get; set; } = false;

    /// <summary>
    /// 选项列表（当type为select时使用）
    /// </summary>
    public List<ParameterOption> Options { get; set; } = new();

    /// <summary>
    /// 验证规则
    /// </summary>
    public ParameterValidation? Validation { get; set; }
}

/// <summary>
/// 参数选项
/// </summary>
public class ParameterOption
{
    /// <summary>
    /// 选项值
    /// </summary>
    public string Value { get; set; } = string.Empty;

    /// <summary>
    /// 选项标签
    /// </summary>
    public string Label { get; set; } = string.Empty;
}

/// <summary>
/// 参数验证规则
/// </summary>
public class ParameterValidation
{
    /// <summary>
    /// 最小值（数字类型）
    /// </summary>
    public double? Min { get; set; }

    /// <summary>
    /// 最大值（数字类型）
    /// </summary>
    public double? Max { get; set; }

    /// <summary>
    /// 最小长度（字符串类型）
    /// </summary>
    public int? MinLength { get; set; }

    /// <summary>
    /// 最大长度（字符串类型）
    /// </summary>
    public int? MaxLength { get; set; }

    /// <summary>
    /// 正则表达式模式
    /// </summary>
    public string? Pattern { get; set; }
}

/// <summary>
/// 模板依赖项
/// </summary>
public class TemplateDependency
{
    /// <summary>
    /// 依赖项名称
    /// </summary>
    public string Name { get; set; } = string.Empty;

    /// <summary>
    /// 依赖项类型（role, department, form, etc.）
    /// </summary>
    public string Type { get; set; } = string.Empty;

    /// <summary>
    /// 依赖项ID
    /// </summary>
    public string? DependencyId { get; set; }

    /// <summary>
    /// 是否必需
    /// </summary>
    public bool Required { get; set; } = true;

    /// <summary>
    /// 描述
    /// </summary>
    public string? Description { get; set; }
}