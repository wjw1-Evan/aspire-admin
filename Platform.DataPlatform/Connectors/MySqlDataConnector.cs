using MySqlConnector;
using Platform.DataPlatform.Models;

namespace Platform.DataPlatform.Connectors;

/// <summary>
/// MySQL 数据连接器
/// </summary>
public class MySqlDataConnector : BaseDataConnector
{
    public MySqlDataConnector(string connectionString, Dictionary<string, object> config) 
        : base(connectionString, config)
    {
    }

    public override async Task<DataSourceTestResult> TestConnectionAsync(TestDataSourceRequest request)
    {
        var startTime = DateTime.UtcNow;
        
        try
        {
            using var connection = new MySqlConnection(_connectionString);
            await connection.OpenAsync();
            
            // 执行简单查询测试连接
            using var command = new MySqlCommand("SELECT 1", connection);
            await command.ExecuteScalarAsync();
            
            return new DataSourceTestResult
            {
                IsSuccess = true,
                ResponseTime = (long)(DateTime.UtcNow - startTime).TotalMilliseconds,
                Metadata = new Dictionary<string, object>
                {
                    ["serverVersion"] = connection.ServerVersion,
                    ["database"] = connection.Database
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
            using var connection = new MySqlConnection(_connectionString);
            await connection.OpenAsync();
            
            var sql = $@"
                SELECT 
                    COLUMN_NAME,
                    DATA_TYPE,
                    IS_NULLABLE,
                    CHARACTER_MAXIMUM_LENGTH,
                    COLUMN_DEFAULT,
                    COLUMN_KEY,
                    COLUMN_COMMENT
                FROM INFORMATION_SCHEMA.COLUMNS 
                WHERE TABLE_NAME = @tableName 
                AND TABLE_SCHEMA = @database
                ORDER BY ORDINAL_POSITION";
            
            using var command = new MySqlCommand(sql, connection);
            command.Parameters.AddWithValue("@tableName", tableName);
            command.Parameters.AddWithValue("@database", connection.Database);
            
            using var reader = await command.ExecuteReaderAsync();
            while (await reader.ReadAsync())
            {
                fields.Add(new SchemaField
                {
                    FieldName = reader.GetString(reader.GetOrdinal("COLUMN_NAME")),
                    DataType = reader.GetString(reader.GetOrdinal("DATA_TYPE")),
                    IsNullable = reader.GetString(reader.GetOrdinal("IS_NULLABLE")) == "YES",
                    MaxLength = reader.IsDBNull(reader.GetOrdinal("CHARACTER_MAXIMUM_LENGTH")) ? null : reader.GetInt32(reader.GetOrdinal("CHARACTER_MAXIMUM_LENGTH")),
                    DefaultValue = reader.IsDBNull(reader.GetOrdinal("COLUMN_DEFAULT")) ? null : reader.GetValue(reader.GetOrdinal("COLUMN_DEFAULT")),
                    IsPrimaryKey = reader.GetString(reader.GetOrdinal("COLUMN_KEY")) == "PRI",
                    Description = reader.IsDBNull(reader.GetOrdinal("COLUMN_COMMENT")) ? null : reader.GetString(reader.GetOrdinal("COLUMN_COMMENT"))
                });
            }
        }
        catch (Exception ex)
        {
            throw new InvalidOperationException($"获取表 {tableName} 的架构信息失败: {ex.Message}", ex);
        }
        
        return fields;
    }

    public override async Task<List<Dictionary<string, object>>> GetDataAsync(string tableName, int limit = 1000)
    {
        var data = new List<Dictionary<string, object>>();
        
        try
        {
            using var connection = new MySqlConnection(_connectionString);
            await connection.OpenAsync();
            
            var sql = $"SELECT * FROM `{tableName}` LIMIT @limit";
            using var command = new MySqlCommand(sql, connection);
            command.Parameters.AddWithValue("@limit", limit);
            
            using var reader = await command.ExecuteReaderAsync();
            while (await reader.ReadAsync())
            {
                var row = new Dictionary<string, object>();
                for (int i = 0; i < reader.FieldCount; i++)
                {
                    var columnName = reader.GetName(i);
                    var value = reader.IsDBNull(i) ? null : reader.GetValue(i);
                    row[columnName] = value ?? DBNull.Value;
                }
                data.Add(row);
            }
        }
        catch (Exception ex)
        {
            throw new InvalidOperationException($"获取表 {tableName} 的数据失败: {ex.Message}", ex);
        }
        
        return data;
    }

    public override async Task<List<string>> GetTablesAsync()
    {
        var tables = new List<string>();
        
        try
        {
            using var connection = new MySqlConnection(_connectionString);
            await connection.OpenAsync();
            
            var sql = @"
                SELECT TABLE_NAME 
                FROM INFORMATION_SCHEMA.TABLES 
                WHERE TABLE_SCHEMA = @database 
                AND TABLE_TYPE = 'BASE TABLE'
                ORDER BY TABLE_NAME";
            
            using var command = new MySqlCommand(sql, connection);
            command.Parameters.AddWithValue("@database", connection.Database);
            
            using var reader = await command.ExecuteReaderAsync();
            while (await reader.ReadAsync())
            {
                tables.Add(reader.GetString("TABLE_NAME"));
            }
        }
        catch (Exception ex)
        {
            throw new InvalidOperationException($"获取表列表失败: {ex.Message}", ex);
        }
        
        return tables;
    }
}