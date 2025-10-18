using Platform.DataPlatform.Models;

namespace Platform.DataPlatform.Connectors;

/// <summary>
/// 数据连接器工厂
/// </summary>
public interface IDataConnectorFactory
{
    /// <summary>
    /// 创建数据连接器
    /// </summary>
    IDataConnector CreateConnector(DataSourceType dataSourceType, string connectionString, Dictionary<string, object> config);
}

/// <summary>
/// 数据连接器工厂实现
/// </summary>
public class DataConnectorFactory : IDataConnectorFactory
{
    public IDataConnector CreateConnector(DataSourceType dataSourceType, string connectionString, Dictionary<string, object> config)
    {
        return dataSourceType switch
        {
            DataSourceType.MySql => new MySqlDataConnector(connectionString, config),
            DataSourceType.PostgreSQL => new PostgreSQLDataConnector(connectionString, config),
            DataSourceType.MongoDB => new MongoDbDataConnector(connectionString, config),
            DataSourceType.REST_API => throw new NotSupportedException("REST API 连接器尚未实现"),
            DataSourceType.IoT => throw new NotSupportedException("IoT 连接器尚未实现"),
            DataSourceType.LogFile => throw new NotSupportedException("日志文件连接器尚未实现"),
            DataSourceType.MessageQueue => throw new NotSupportedException("消息队列连接器尚未实现"),
            DataSourceType.Oracle => throw new NotSupportedException("Oracle 连接器尚未实现"),
            _ => throw new NotSupportedException($"不支持的数据源类型: {dataSourceType}")
        };
    }
}