using MongoDB.Bson;
using MongoDB.Driver;
using Platform.DataPlatform.Models;

namespace Platform.DataPlatform.Connectors;

/// <summary>
/// MongoDB 数据连接器
/// </summary>
public class MongoDbDataConnector : BaseDataConnector
{
    private readonly IMongoClient _client;

    public MongoDbDataConnector(string connectionString, Dictionary<string, object> config) 
        : base(connectionString, config)
    {
        _client = new MongoClient(_connectionString);
    }

    public override async Task<DataSourceTestResult> TestConnectionAsync(TestDataSourceRequest request)
    {
        var startTime = DateTime.UtcNow;
        
        try
        {
            // 获取数据库列表来测试连接
            var databases = await _client.ListDatabaseNamesAsync();
            await databases.ToListAsync();
            
            return new DataSourceTestResult
            {
                IsSuccess = true,
                ResponseTime = (long)(DateTime.UtcNow - startTime).TotalMilliseconds,
                Metadata = new Dictionary<string, object>
                {
                    ["message"] = "MongoDB 连接成功"
                }
            };
        }
        catch (Exception ex)
        {
            return new DataSourceTestResult
            {
                IsSuccess = false,
                ErrorMessage = ex.Message,
                ResponseTime = (long)(DateTime.UtcNow - startTime).TotalMilliseconds
            };
        }
    }

    public override async Task<List<SchemaField>> GetSchemaAsync(string tableName)
    {
        var fields = new List<SchemaField>();
        
        try
        {
            var databaseName = _config.GetValueOrDefault("database", "test")?.ToString() ?? "test";
            var database = _client.GetDatabase(databaseName);
            var collection = database.GetCollection<BsonDocument>(tableName);
            
            // 从集合中采样一些文档来分析字段结构
            var sampleDocuments = await collection.Find(new BsonDocument()).Limit(100).ToListAsync();
            
            var fieldTypes = new Dictionary<string, HashSet<string>>();
            
            foreach (var doc in sampleDocuments)
            {
                foreach (var element in doc.Elements)
                {
                    if (!fieldTypes.ContainsKey(element.Name))
                    {
                        fieldTypes[element.Name] = new HashSet<string>();
                    }
                    fieldTypes[element.Name].Add(element.Value.BsonType.ToString());
                }
            }
            
            foreach (var fieldType in fieldTypes)
            {
                fields.Add(new SchemaField
                {
                    FieldName = fieldType.Key,
                    DataType = string.Join("|", fieldType.Value),
                    IsNullable = true, // MongoDB 字段默认可为空
                    Description = $"字段类型: {string.Join(", ", fieldType.Value)}"
                });
            }
        }
        catch (Exception ex)
        {
            throw new InvalidOperationException($"获取集合 {tableName} 的架构信息失败: {ex.Message}", ex);
        }
        
        return fields;
    }

    public override async Task<List<Dictionary<string, object>>> GetDataAsync(string tableName, int limit = 1000)
    {
        var data = new List<Dictionary<string, object>>();
        
        try
        {
            var databaseName = _config.GetValueOrDefault("database", "test")?.ToString() ?? "test";
            var database = _client.GetDatabase(databaseName);
            var collection = database.GetCollection<BsonDocument>(tableName);
            
            var documents = await collection.Find(new BsonDocument()).Limit(limit).ToListAsync();
            
            foreach (var doc in documents)
            {
                var row = new Dictionary<string, object>();
                foreach (var element in doc.Elements)
                {
                    row[element.Name] = BsonTypeMapper.MapToDotNetValue(element.Value);
                }
                data.Add(row);
            }
        }
        catch (Exception ex)
        {
            throw new InvalidOperationException($"获取集合 {tableName} 的数据失败: {ex.Message}", ex);
        }
        
        return data;
    }

    public override async Task<List<string>> GetTablesAsync()
    {
        var collections = new List<string>();
        
        try
        {
            var databaseName = _config.GetValueOrDefault("database", "test")?.ToString() ?? "test";
            var database = _client.GetDatabase(databaseName);
            
            var collectionNames = await database.ListCollectionNamesAsync();
            collections = await collectionNames.ToListAsync();
        }
        catch (Exception ex)
        {
            throw new InvalidOperationException($"获取集合列表失败: {ex.Message}", ex);
        }
        
        return collections;
    }

    protected override void Dispose(bool disposing)
    {
        // MongoDB 客户端不需要手动释放
        base.Dispose(disposing);
    }
}