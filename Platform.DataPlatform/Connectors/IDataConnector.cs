using Platform.DataPlatform.Models;

namespace Platform.DataPlatform.Connectors;

/// <summary>
/// 数据连接器接口
/// </summary>
public interface IDataConnector
{
    /// <summary>
    /// 测试连接
    /// </summary>
    Task<DataSourceTestResult> TestConnectionAsync(TestDataSourceRequest request);

    /// <summary>
    /// 获取数据模式
    /// </summary>
    Task<List<SchemaField>> GetSchemaAsync(string tableName);

    /// <summary>
    /// 获取数据
    /// </summary>
    Task<List<Dictionary<string, object>>> GetDataAsync(string tableName, int limit = 1000);

    /// <summary>
    /// 获取表列表
    /// </summary>
    Task<List<string>> GetTablesAsync();
}

/// <summary>
/// 基础数据连接器
/// </summary>
public abstract class BaseDataConnector : IDataConnector
{
    protected readonly string _connectionString;
    protected readonly Dictionary<string, object> _config;

    protected BaseDataConnector(string connectionString, Dictionary<string, object> config)
    {
        _connectionString = connectionString;
        _config = config;
    }

    public abstract Task<DataSourceTestResult> TestConnectionAsync(TestDataSourceRequest request);
    public abstract Task<List<SchemaField>> GetSchemaAsync(string tableName);
    public abstract Task<List<Dictionary<string, object>>> GetDataAsync(string tableName, int limit = 1000);
    public abstract Task<List<string>> GetTablesAsync();

    protected virtual void Dispose(bool disposing)
    {
        // 子类可以重写此方法进行资源清理
    }

    public void Dispose()
    {
        Dispose(true);
        GC.SuppressFinalize(this);
    }
}