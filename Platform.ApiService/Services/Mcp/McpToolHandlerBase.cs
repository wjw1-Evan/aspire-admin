using System.Text.Json;
using Platform.ApiService.Models;

namespace Platform.ApiService.Services.Mcp;

/// <summary>
/// MCP 工具处理器基类
/// 提供工具注册、路由分发和常用工具方法
/// </summary>
public abstract class McpToolHandlerBase : IMcpToolHandler
{
    private readonly List<McpTool> _toolDefinitions = new();
    private readonly Dictionary<string, Func<Dictionary<string, object>, string, Task<object?>>> _handlers = new();

    /// <summary>
    /// 注册一个工具定义及其处理器
    /// </summary>
    protected void RegisterTool(string name, string description,
        Dictionary<string, object>? inputSchema,
        Func<Dictionary<string, object>, string, Task<object?>> handler)
    {
        _toolDefinitions.Add(new McpTool
        {
            Name = name,
            Description = description,
            InputSchema = inputSchema ?? new Dictionary<string, object>
            {
                ["type"] = "object",
                ["properties"] = new Dictionary<string, object>()
            }
        });
        _handlers[name] = handler;
    }

    /// <summary>
    /// 注册一个无参数的工具
    /// </summary>
    protected void RegisterTool(string name, string description,
        Func<Dictionary<string, object>, string, Task<object?>> handler)
    {
        RegisterTool(name, description, null, handler);
    }

    /// <inheritdoc />
    public virtual Task<IReadOnlyList<McpTool>> GetToolDefinitionsAsync()
    {
        return Task.FromResult<IReadOnlyList<McpTool>>(_toolDefinitions.AsReadOnly());
    }

    /// <inheritdoc />
    public bool CanHandle(string toolName) => _handlers.ContainsKey(toolName);

    /// <inheritdoc />
    public Task<object?> HandleAsync(string toolName, Dictionary<string, object> arguments, string currentUserId)
    {
        if (!_handlers.TryGetValue(toolName, out var handler))
        {
            throw new ArgumentException($"工具 '{toolName}' 未在此 Handler 中注册");
        }
        return handler(arguments, currentUserId);
    }

    #region 公共工具方法

    /// <summary>
    /// 解析分页参数
    /// </summary>
    protected static (int page, int pageSize) ParsePaginationArgs(
        Dictionary<string, object> arguments,
        int defaultPageSize = 20,
        int maxPageSize = 100)
    {
        var page = 1;
        var pageSize = defaultPageSize;

        if (arguments.ContainsKey("page") && int.TryParse(arguments["page"]?.ToString(), out var p) && p > 0)
            page = p;

        if (arguments.ContainsKey("pageSize") && int.TryParse(arguments["pageSize"]?.ToString(), out var ps) && ps > 0)
            pageSize = Math.Min(ps, maxPageSize);

        return (page, pageSize);
    }

    /// <summary>
    /// 构建标准分页参数的 InputSchema
    /// </summary>
    protected static Dictionary<string, object> PaginationSchema(int defaultPageSize = 20, int maxPageSize = 100)
    {
        return new Dictionary<string, object>
        {
            ["page"] = new Dictionary<string, object> { ["type"] = "integer", ["default"] = 1, ["minimum"] = 1 },
            ["pageSize"] = new Dictionary<string, object> { ["type"] = "integer", ["default"] = defaultPageSize, ["minimum"] = 1, ["maximum"] = maxPageSize }
        };
    }

    /// <summary>
    /// 合并多个 properties 字典
    /// </summary>
    protected static Dictionary<string, object> MergeProperties(params Dictionary<string, object>[] sources)
    {
        var result = new Dictionary<string, object>();
        foreach (var source in sources)
        {
            foreach (var kvp in source)
            {
                result[kvp.Key] = kvp.Value;
            }
        }
        return result;
    }

    /// <summary>
    /// 构建带自定义属性的 object InputSchema
    /// </summary>
    protected static Dictionary<string, object> ObjectSchema(Dictionary<string, object> properties, string[]? required = null)
    {
        var schema = new Dictionary<string, object>
        {
            ["type"] = "object",
            ["properties"] = properties
        };
        if (required != null && required.Length > 0)
        {
            schema["required"] = required;
        }
        return schema;
    }

    #endregion
}
