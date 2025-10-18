using Npgsql;
using Platform.DataPlatform.Models;

namespace Platform.DataPlatform.Connectors;

/// <summary>
/// PostgreSQL 数据连接器
/// </summary>
public class PostgreSQLDataConnector : BaseDataConnector
{
    public PostgreSQLDataConnector(string connectionString, Dictionary<string, object> config) 
        : base(connectionString, config)
    {
    }

    public override async Task<DataSourceTestResult> TestConnectionAsync(TestDataSourceRequest request)
    {
        var startTime = DateTime.UtcNow;
        
        try
        {
            using var connection = new NpgsqlConnection(_connectionString);
            await connection.OpenAsync();
            
            // 执行简单查询测试连接
            using var command = new NpgsqlCommand("SELECT 1", connection);
            await command.ExecuteScalarAsync();
            
            return new DataSourceTestResult
            {
                IsSuccess = true,
                ResponseTime = (long)(DateTime.UtcNow - startTime).TotalMilliseconds,
                Metadata = new Dictionary<string, object>
                {
                    ["serverVersion"] = connection.PostgreSqlVersion.ToString(),
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
            using var connection = new NpgsqlConnection(_connectionString);
            await connection.OpenAsync();
            
            var sql = $@"
                SELECT 
                    column_name,
                    data_type,
                    is_nullable,
                    character_maximum_length,
                    column_default,
                    CASE WHEN pk.column_name IS NOT NULL THEN true ELSE false END as is_primary_key
                FROM information_schema.columns c
                LEFT JOIN (
                    SELECT ku.column_name
                    FROM information_schema.table_constraints tc
                    JOIN information_schema.key_column_usage ku 
                        ON tc.constraint_name = ku.constraint_name
                    WHERE tc.table_name = @tableName 
                        AND tc.constraint_type = 'PRIMARY KEY'
                ) pk ON c.column_name = pk.column_name
                WHERE c.table_name = @tableName
                ORDER BY c.ordinal_position";
            
            using var command = new NpgsqlCommand(sql, connection);
            command.Parameters.AddWithValue("@tableName", tableName);
            
            using var reader = await command.ExecuteReaderAsync();
            while (await reader.ReadAsync())
            {
                fields.Add(new SchemaField
                {
                    FieldName = reader.GetString(reader.GetOrdinal("column_name")),
                    DataType = reader.GetString(reader.GetOrdinal("data_type")),
                    IsNullable = reader.GetString(reader.GetOrdinal("is_nullable")) == "YES",
                    MaxLength = reader.IsDBNull(reader.GetOrdinal("character_maximum_length")) ? null : reader.GetInt32(reader.GetOrdinal("character_maximum_length")),
                    DefaultValue = reader.IsDBNull(reader.GetOrdinal("column_default")) ? null : reader.GetValue(reader.GetOrdinal("column_default")),
                    IsPrimaryKey = reader.GetBoolean(reader.GetOrdinal("is_primary_key"))
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
            using var connection = new NpgsqlConnection(_connectionString);
            await connection.OpenAsync();
            
            var sql = $"SELECT * FROM \"{tableName}\" LIMIT @limit";
            using var command = new NpgsqlCommand(sql, connection);
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
            using var connection = new NpgsqlConnection(_connectionString);
            await connection.OpenAsync();
            
            var sql = @"
                SELECT table_name 
                FROM information_schema.tables 
                WHERE table_schema = 'public' 
                AND table_type = 'BASE TABLE'
                ORDER BY table_name";
            
            using var command = new NpgsqlCommand(sql, connection);
            
            using var reader = await command.ExecuteReaderAsync();
            while (await reader.ReadAsync())
            {
                tables.Add(reader.GetString(reader.GetOrdinal("table_name")));
            }
        }
        catch (Exception ex)
        {
            throw new InvalidOperationException($"获取表列表失败: {ex.Message}", ex);
        }
        
        return tables;
    }
}