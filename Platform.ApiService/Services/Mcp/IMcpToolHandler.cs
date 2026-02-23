using Platform.ApiService.Models;

namespace Platform.ApiService.Services.Mcp;

/// <summary>
/// MCP 工具处理器接口
/// 每个实现负责一组内聚的工具定义和执行逻辑
/// </summary>
public interface IMcpToolHandler
{
    /// <summary>
    /// 提供该 Handler 负责的所有工具定义
    /// </summary>
    Task<IReadOnlyList<McpTool>> GetToolDefinitionsAsync();

    /// <summary>
    /// 该 Handler 能否处理指定工具
    /// </summary>
    bool CanHandle(string toolName);

    /// <summary>
    /// 执行工具调用
    /// </summary>
    Task<object?> HandleAsync(string toolName, Dictionary<string, object> arguments, string currentUserId);
}
