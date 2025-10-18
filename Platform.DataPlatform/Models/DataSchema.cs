using MongoDB.Bson.Serialization.Attributes;

namespace Platform.DataPlatform.Models;

/// <summary>
/// 数据模式字段
/// </summary>
public class SchemaField
{
    [BsonElement("fieldName")]
    public string FieldName { get; set; } = string.Empty;

    [BsonElement("dataType")]
    public string DataType { get; set; } = string.Empty;

    [BsonElement("isNullable")]
    public bool IsNullable { get; set; } = true;

    [BsonElement("maxLength")]
    public int? MaxLength { get; set; }

    [BsonElement("description")]
    public string? Description { get; set; }

    [BsonElement("isPrimaryKey")]
    public bool IsPrimaryKey { get; set; } = false;

    [BsonElement("defaultValue")]
    public object? DefaultValue { get; set; }
}

/// <summary>
/// 数据模式
/// </summary>
public class DataSchema
{
    [BsonElement("schemaName")]
    public string SchemaName { get; set; } = string.Empty;

    [BsonElement("tableName")]
    public string TableName { get; set; } = string.Empty;

    [BsonElement("fields")]
    public List<SchemaField> Fields { get; set; } = new();

    [BsonElement("metadata")]
    public Dictionary<string, object> Metadata { get; set; } = new();

    [BsonElement("createdAt")]
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
