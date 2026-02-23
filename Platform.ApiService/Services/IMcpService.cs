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
    /// <param name="request">初始化请求</param>
    /// <returns>初始化响应</returns>
    Task<McpInitializeResponse> InitializeAsync(McpInitializeRequest request);

    /// <summary>
    /// 列出所有可用工具
    /// </summary>
    /// <returns>工具列表</returns>
    Task<McpListToolsResponse> ListToolsAsync();

    /// <summary>
    /// 调用工具
    /// </summary>
    /// <param name="request">工具调用请求</param>
    /// <param name="currentUserId">当前用户 ID</param>
    /// <returns>工具调用结果</returns>
    Task<McpCallToolResponse> CallToolAsync(McpCallToolRequest request, string currentUserId);

    /// <summary>
    /// 列出所有可用资源
    /// </summary>
    /// <param name="currentUserId">当前用户 ID</param>
    /// <returns>资源列表</returns>
    Task<McpListResourcesResponse> ListResourcesAsync(string currentUserId);

    /// <summary>
    /// 读取资源内容
    /// </summary>
    /// <param name="request">读取资源请求</param>
    /// <param name="currentUserId">当前用户 ID</param>
    /// <returns>资源内容</returns>
    Task<McpReadResourceResponse> ReadResourceAsync(McpReadResourceRequest request, string currentUserId);

    /// <summary>
    /// 列出所有可用提示词
    /// </summary>
    /// <returns>提示词列表</returns>
    Task<McpListPromptsResponse> ListPromptsAsync();

    /// <summary>
    /// 获取提示词内容
    /// </summary>
    /// <param name="request">获取提示词请求</param>
    /// <param name="currentUserId">当前用户 ID</param>
    /// <returns>提示词内容</returns>
    Task<McpGetPromptResponse> GetPromptAsync(McpGetPromptRequest request, string currentUserId);

    /// <summary>
    /// 自动检测并调用相关的 MCP 工具（AI 助手前置处理）
    /// </summary>
    /// <param name="session">当前聊天会话</param>
    /// <param name="userMessage">用户消息</param>
    /// <param name="currentUserId">当前用户 ID</param>
    /// <param name="cancellationToken">取消令牌</param>
    /// <returns>工具执行结果对象，若未检测到工具则返回 null</returns>
    Task<McpToolExecutionResult?> DetectAndCallMcpToolsAsync(ChatSession session, ChatMessage userMessage, string currentUserId, CancellationToken cancellationToken);
}

