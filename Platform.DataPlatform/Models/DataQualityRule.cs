using MongoDB.Bson.Serialization.Attributes;
using MongoDB.Bson.Serialization.Options;
using Platform.ServiceDefaults.Models;
using System.ComponentModel.DataAnnotations;

namespace Platform.DataPlatform.Models;

/// <summary>
/// 数据质量规则类型枚举
/// </summary>
public enum QualityRuleType
{
    /// <summary>
    /// 完整性检查
    /// </summary>
    Completeness = 1,
    
    /// <summary>
    /// 唯一性检查
    /// </summary>
    Uniqueness = 2,
    
    /// <summary>
    /// 有效性检查
    /// </summary>
    Validity = 3,
    
    /// <summary>
    /// 一致性检查
    /// </summary>
    Consistency = 4,
    
    /// <summary>
    /// 及时性检查
    /// </summary>
    Timeliness = 5,
    
    /// <summary>
    /// 准确性检查
    /// </summary>
    Accuracy = 6
}

/// <summary>
/// 质量检查状态
/// </summary>
public enum QualityCheckStatus
{
    /// <summary>
    /// 通过
    /// </summary>
    Passed = 1,

    /// <summary>
    /// 失败
    /// </summary>
    Failed = 2,

    /// <summary>
    /// 警告
    /// </summary>
    Warning = 3,

    /// <summary>
    /// 不适用
    /// </summary>
    NotApplicable = 4
}

/// <summary>
/// 质量检查结果
/// </summary>
public class QualityCheckResult : DataPlatformMultiTenantEntity
{
    [BsonElement("ruleId")]
    public string RuleId { get; set; } = string.Empty;

    [BsonElement("checkTime")]
    public DateTime CheckTime { get; set; } = DateTime.UtcNow;

    [BsonElement("totalRecords")]
    public long TotalRecords { get; set; }

    [BsonElement("passedRecords")]
    public long PassedRecords { get; set; }

    [BsonElement("failedRecords")]
    public long FailedRecords { get; set; }

    [BsonElement("failedRecordIds")]
    public List<string> FailedRecordIds { get; set; } = new();

    [BsonElement("passRate")]
    public double PassRate { get; set; }

    [BsonElement("endTime")]
    [BsonDateTimeOptions(Kind = DateTimeKind.Utc)]
    public DateTime? EndTime { get; set; }

    [BsonElement("executionTime")]
    public TimeSpan ExecutionTime { get; set; }

    [BsonElement("status")]
    public QualityCheckStatus Status { get; set; }

    [BsonElement("errorMessage")]
    public string? ErrorMessage { get; set; }

    [BsonElement("metadata")]
    public Dictionary<string, object> Metadata { get; set; } = new();
}

/// <summary>
/// 数据质量规则实体
/// </summary>
public class DataQualityRule : DataPlatformMultiTenantEntity
{
    [BsonElement("name")]
    [Required(ErrorMessage = "规则名称不能为空")]
    [StringLength(100, ErrorMessage = "规则名称长度不能超过100个字符")]
    public string Name { get; set; } = string.Empty;

    [BsonElement("description")]
    [StringLength(1000, ErrorMessage = "描述长度不能超过1000个字符")]
    public string? Description { get; set; }

    [BsonElement("dataSourceId")]
    [Required(ErrorMessage = "数据源ID不能为空")]
    public string DataSourceId { get; set; } = string.Empty;

    [BsonElement("fieldName")]
    [Required(ErrorMessage = "字段名不能为空")]
    [StringLength(200, ErrorMessage = "字段名长度不能超过200个字符")]
    public string FieldName { get; set; } = string.Empty;

    [BsonElement("ruleType")]
    public QualityRuleType RuleType { get; set; }

    [BsonElement("ruleExpression")]
    [StringLength(1000, ErrorMessage = "规则表达式长度不能超过1000个字符")]
    public string? RuleExpression { get; set; }

    [BsonElement("threshold")]
    public double? Threshold { get; set; }

    [BsonElement("parameters")]
    [BsonDictionaryOptions(DictionaryRepresentation.ArrayOfDocuments)]
    public Dictionary<string, object> Parameters { get; set; } = new();

    [BsonElement("isEnabled")]
    public bool IsEnabled { get; set; } = true;

    [BsonElement("lastCheckedAt")]
    [BsonDateTimeOptions(Kind = DateTimeKind.Utc)]
    public DateTime? LastCheckedAt { get; set; }

    [BsonElement("lastCheckStatus")]
    public QualityCheckStatus? LastCheckStatus { get; set; }

    [BsonElement("lastCheckResult")]
    public QualityCheckResult? LastCheckResult { get; set; }
}