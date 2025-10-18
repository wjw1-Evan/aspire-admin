using Platform.DataPlatform.Models;

namespace Platform.DataPlatform.Services;

/// <summary>
/// 数据源服务接口
/// </summary>
public interface IDataSourceService
{
    Task<DataSource?> GetByIdAsync(string id);
    Task<List<DataSource>> GetAllAsync();
    Task<DataSource> CreateAsync(CreateDataSourceRequest request);
    Task<bool> UpdateAsync(string id, CreateDataSourceRequest request);
    Task<bool> DeleteAsync(string id);
    Task<DataSourceTestResult> TestConnectionAsync(TestDataSourceRequest request);
    Task<DataSourceTestResult> TestConnectionAsync(string dataSourceId);
    Task<List<string>> GetTablesAsync(string dataSourceId);
    Task<List<SchemaField>> GetSchemaAsync(string dataSourceId, string tableName);
    Task<List<Dictionary<string, object>>> GetDataAsync(string dataSourceId, string tableName, int limit = 1000);
}
