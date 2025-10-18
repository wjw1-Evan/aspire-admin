using MongoDB.Driver;
using Platform.DataPlatform.Models;
using Platform.DataPlatform.Connectors;

namespace Platform.DataPlatform.Services;

/// <summary>
/// 数据源服务实现
/// </summary>
public class DataSourceService : IDataSourceService
{
    private readonly IMongoCollection<DataSource> _dataSources;
    private readonly string _companyId;
    private readonly IDataConnectorFactory _connectorFactory;

    public DataSourceService(IMongoDatabase database, IHttpContextAccessor httpContextAccessor, IDataConnectorFactory connectorFactory)
    {
        _dataSources = database.GetCollection<DataSource>("dataSources");
        _companyId = httpContextAccessor.HttpContext?.User?.FindFirst("companyId")?.Value ?? "default";
        _connectorFactory = connectorFactory;
    }

    public async Task<DataSource?> GetByIdAsync(string id)
    {
        return await _dataSources
            .Find(x => x.Id == id && x.CompanyId == _companyId && !x.IsDeleted)
            .FirstOrDefaultAsync();
    }

    public async Task<List<DataSource>> GetAllAsync()
    {
        return await _dataSources
            .Find(x => x.CompanyId == _companyId && !x.IsDeleted)
            .ToListAsync();
    }

    public async Task<DataSource> CreateAsync(CreateDataSourceRequest request)
    {
        var dataSource = new DataSource
        {
            Name = request.Name,
            Title = request.Title,
            Description = request.Description,
            DataSourceType = request.DataSourceType,
            ConnectionString = request.ConnectionString,
            ConnectionConfig = request.ConnectionConfig,
            Tags = request.Tags,
            Metadata = request.Metadata,
            CompanyId = _companyId,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        await _dataSources.InsertOneAsync(dataSource);
        return dataSource;
    }

    public async Task<bool> UpdateAsync(string id, CreateDataSourceRequest request)
    {
        var update = Builders<DataSource>.Update
            .Set(x => x.Name, request.Name)
            .Set(x => x.Title, request.Title)
            .Set(x => x.Description, request.Description)
            .Set(x => x.DataSourceType, request.DataSourceType)
            .Set(x => x.ConnectionString, request.ConnectionString)
            .Set(x => x.ConnectionConfig, request.ConnectionConfig)
            .Set(x => x.Tags, request.Tags)
            .Set(x => x.Metadata, request.Metadata)
            .Set(x => x.UpdatedAt, DateTime.UtcNow);

        var result = await _dataSources.UpdateOneAsync(
            x => x.Id == id && x.CompanyId == _companyId && !x.IsDeleted,
            update);

        return result.ModifiedCount > 0;
    }

    public async Task<bool> DeleteAsync(string id)
    {
        var update = Builders<DataSource>.Update
            .Set(x => x.IsDeleted, true)
            .Set(x => x.UpdatedAt, DateTime.UtcNow);

        var result = await _dataSources.UpdateOneAsync(
            x => x.Id == id && x.CompanyId == _companyId && !x.IsDeleted,
            update);

        return result.ModifiedCount > 0;
    }

    public async Task<DataSourceTestResult> TestConnectionAsync(TestDataSourceRequest request)
    {
        try
        {
            var connector = _connectorFactory.CreateConnector(
                request.DataSourceType, 
                request.ConnectionString ?? "", 
                request.ConnectionConfig);
            
            return await connector.TestConnectionAsync(request);
        }
        catch (Exception ex)
        {
            return new DataSourceTestResult
            {
                IsSuccess = false,
                ErrorMessage = ex.Message
            };
        }
    }

    public async Task<DataSourceTestResult> TestConnectionAsync(string dataSourceId)
    {
        var dataSource = await GetByIdAsync(dataSourceId);
        if (dataSource == null)
        {
            return new DataSourceTestResult
            {
                IsSuccess = false,
                ErrorMessage = "数据源不存在"
            };
        }

        var request = new TestDataSourceRequest
        {
            DataSourceType = dataSource.DataSourceType,
            ConnectionString = dataSource.ConnectionString,
            ConnectionConfig = dataSource.ConnectionConfig
        };

        return await TestConnectionAsync(request);
    }

    public async Task<List<string>> GetTablesAsync(string dataSourceId)
    {
        var dataSource = await GetByIdAsync(dataSourceId);
        if (dataSource == null)
        {
            throw new KeyNotFoundException("数据源不存在");
        }

        var connector = _connectorFactory.CreateConnector(
            dataSource.DataSourceType,
            dataSource.ConnectionString ?? "",
            dataSource.ConnectionConfig);

        return await connector.GetTablesAsync();
    }

    public async Task<List<SchemaField>> GetSchemaAsync(string dataSourceId, string tableName)
    {
        var dataSource = await GetByIdAsync(dataSourceId);
        if (dataSource == null)
        {
            throw new KeyNotFoundException("数据源不存在");
        }

        var connector = _connectorFactory.CreateConnector(
            dataSource.DataSourceType,
            dataSource.ConnectionString ?? "",
            dataSource.ConnectionConfig);

        return await connector.GetSchemaAsync(tableName);
    }

    public async Task<List<Dictionary<string, object>>> GetDataAsync(string dataSourceId, string tableName, int limit = 1000)
    {
        var dataSource = await GetByIdAsync(dataSourceId);
        if (dataSource == null)
        {
            throw new KeyNotFoundException("数据源不存在");
        }

        var connector = _connectorFactory.CreateConnector(
            dataSource.DataSourceType,
            dataSource.ConnectionString ?? "",
            dataSource.ConnectionConfig);

        return await connector.GetDataAsync(tableName, limit);
    }
}