using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;

namespace Platform.ApiService.Models.Workflow;

/// <summary>
/// 工作流验证结果
/// </summary>
public class WorkflowValidationResult
{
    /// <summary>
    /// 是否有效
    /// </summary>
    public bool IsValid { get; set; } = true;

    /// <summary>
    /// 验证问题列表
    /// </summary>
    public List<ValidationIssue> Issues { get; set; } = new();

    /// <summary>
    /// 验证时间
    /// </summary>
    public DateTime ValidatedAt { get; set; } = DateTime.UtcNow;

    /// <summary>
    /// 验证器版本
    /// </summary>
    public string ValidatorVersion { get; set; } = "1.0.0";
}

/// <summary>
/// 验证问题
/// </summary>
public class ValidationIssue
{
    /// <summary>
    /// 问题ID
    /// </summary>
    public string Id { get; set; } = Guid.NewGuid().ToString();

    /// <summary>
    /// 问题类型
    /// </summary>
    public string Type { get; set; } = string.Empty;

    /// <summary>
    /// 严重程度
    /// </summary>
    [BsonRepresentation(BsonType.String)]
    public ValidationSeverity Severity { get; set; }

    /// <summary>
    /// 问题描述
    /// </summary>
    public string Message { get; set; } = string.Empty;

    /// <summary>
    /// 问题详情
    /// </summary>
    public string? Details { get; set; }

    /// <summary>
    /// 相关节点ID
    /// </summary>
    public string? NodeId { get; set; }

    /// <summary>
    /// 相关边ID
    /// </summary>
    public string? EdgeId { get; set; }

    /// <summary>
    /// 建议解决方案
    /// </summary>
    public string? SuggestedFix { get; set; }

    /// <summary>
    /// 问题位置信息
    /// </summary>
    public ValidationLocation? Location { get; set; }
}

/// <summary>
/// 验证问题位置信息
/// </summary>
public class ValidationLocation
{
    /// <summary>
    /// X坐标
    /// </summary>
    public double? X { get; set; }

    /// <summary>
    /// Y坐标
    /// </summary>
    public double? Y { get; set; }

    /// <summary>
    /// 区域宽度
    /// </summary>
    public double? Width { get; set; }

    /// <summary>
    /// 区域高度
    /// </summary>
    public double? Height { get; set; }
}