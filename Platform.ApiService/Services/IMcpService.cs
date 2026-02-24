using Platform.ApiService.Models;

namespace Platform.ApiService.Services;

/// <summary>
/// MCP 服务接口
/// </summary>
public interface IMcpService
{
    /// <summary>
    /// 初始化 MCP 服务器
    /// </summary>
    Task<McpInitializeResponse> InitializeAsync(McpInitializeRequest request);

    /// <summary>
    /// 列出所有可用工具
    /// </summary>
    Task<McpListToolsResponse> ListToolsAsync();

    /// <summary>
    /// 调用工具
    /// </summary>
    Task<McpCallToolResponse> CallToolAsync(McpCallToolRequest request, string currentUserId);

    /// <summary>
    /// 自动检测并调用相关的 MCP 工具（AI 助手前置处理）
    /// </summary>
    Task<McpToolExecutionResult?> DetectAndCallMcpToolsAsync(ChatSession session, ChatMessage userMessage, string currentUserId, CancellationToken cancellationToken);
}
