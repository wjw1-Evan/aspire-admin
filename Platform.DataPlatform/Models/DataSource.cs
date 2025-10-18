using MongoDB.Bson.Serialization.Attributes;
using Platform.ServiceDefaults.Models;
using System.ComponentModel.DataAnnotations;

namespace Platform.DataPlatform.Models;

/// <summary>
/// 数据源类型枚举
/// </summary>
public enum DataSourceType
{
    MySql = 1,
    PostgreSQL = 2,
    Oracle = 3,
    MongoDB = 4,
    REST_API = 5,
    IoT = 6,
    LogFile = 7,
    MessageQueue = 8
}

/// <summary>
/// 数据源状态枚举
/// </summary>
public enum DataSourceStatus
{
    Active = 1,
    Offline = 2,
    Error = 3,
    Testing = 4
}

/// <summary>
/// 数据源实体
/// </summary>
public class DataSource : DataPlatformMultiTenantEntity, INamedEntity
{
    [BsonElement("name")]
    public string Name { get; set; } = string.Empty;

    [BsonElement("title")]
    public string Title { get; set; } = string.Empty;

    [BsonElement("description")]
    public string? Description { get; set; }

    [BsonElement("dataSourceType")]
    public DataSourceType DataSourceType { get; set; }

    [BsonElement("connectionString")]
    public string? ConnectionString { get; set; }

    [BsonElement("connectionConfig")]
    public Dictionary<string, object> ConnectionConfig { get; set; } = new();

    [BsonElement("status")]
    public DataSourceStatus Status { get; set; } = DataSourceStatus.Active;

    [BsonElement("lastTestedAt")]
    public DateTime? LastTestedAt { get; set; }

    [BsonElement("lastErrorMessage")]
    public string? LastErrorMessage { get; set; }

    [BsonElement("isEnabled")]
    public bool IsEnabled { get; set; } = true;

    [BsonElement("tags")]
    public List<string> Tags { get; set; } = new();

    [BsonElement("metadata")]
    public Dictionary<string, object> Metadata { get; set; } = new();
}

/// <summary>
/// 创建数据源请求
/// </summary>
public class CreateDataSourceRequest
{
    [Required]
    public string Name { get; set; } = string.Empty;

    [Required]
    public string Title { get; set; } = string.Empty;

    public string? Description { get; set; }

    [Required]
    public DataSourceType DataSourceType { get; set; }

    public string? ConnectionString { get; set; }

    public Dictionary<string, object> ConnectionConfig { get; set; } = new();

    public List<string> Tags { get; set; } = new();

    public Dictionary<string, object> Metadata { get; set; } = new();
}

/// <summary>
/// 测试数据源请求
/// </summary>
public class TestDataSourceRequest
{
    [Required]
    public DataSourceType DataSourceType { get; set; }

    public string? ConnectionString { get; set; }

    public Dictionary<string, object> ConnectionConfig { get; set; } = new();
}

/// <summary>
/// 数据源测试结果
/// </summary>
public class DataSourceTestResult
{
    public bool IsSuccess { get; set; }

    public string? ErrorMessage { get; set; }

    public long? ResponseTime { get; set; }

    public Dictionary<string, object>? Metadata { get; set; }
}