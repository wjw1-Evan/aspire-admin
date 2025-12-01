using System.Text.Json;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Platform.ApiService.Extensions;
using Platform.ApiService.Models;
using Platform.ApiService.Services;
using Platform.ServiceDefaults.Controllers;
using Platform.ServiceDefaults.Models;

namespace Platform.ApiService.Controllers;

/// <summary>
/// MCP 服务器控制器
/// 提供 Model Context Protocol (MCP) 协议的 HTTP 端点
/// </summary>
[ApiController]
[Route("api/mcp")]
[Authorize]
public class McpController : BaseApiController
{
    private readonly IMcpService _mcpService;
    private static readonly JsonSerializerOptions _jsonOptions = new(JsonSerializerDefaults.Web)
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
        WriteIndented = false
    };

    /// <summary>
    /// 初始化 MCP 控制器
    /// </summary>
    /// <param name="mcpService">MCP 服务</param>
    public McpController(IMcpService mcpService)
    {
        _mcpService = mcpService;
    }

    /// <summary>
    /// 初始化 MCP 服务器
    /// </summary>
    /// <param name="request">初始化请求</param>
    /// <returns>初始化响应</returns>
    /// <remarks>
    /// 这是 MCP 协议的第一个调用，用于协商协议版本和服务器能力。
    ///
    /// 请求示例：
    /// ```json
    /// {
    ///   "jsonRpc": "2.0",
    ///   "method": "initialize",
    ///   "params": {
    ///     "protocolVersion": "2024-11-05",
    ///     "capabilities": {},
    ///     "clientInfo": {
    ///       "name": "client-name",
    ///       "version": "1.0.0"
    ///     }
    ///   },
    ///   "id": "1"
    /// }
    /// ```
    /// </remarks>
    [HttpPost("initialize")]
    [ProducesResponseType(typeof(ApiResponse<McpInitializeResponse>), StatusCodes.Status200OK)]
    public async Task<IActionResult> Initialize([FromBody] McpInitializeRequest request)
    {
        var response = await _mcpService.InitializeAsync(request);
        return Success(response);
    }

    /// <summary>
    /// 列出所有可用工具
    /// </summary>
    /// <returns>工具列表响应</returns>
    /// <remarks>
    /// 返回 MCP 服务器支持的所有工具列表，包括：
    /// - get_user_info: 获取用户信息
    /// - search_users: 搜索用户
    /// - get_chat_sessions: 获取聊天会话列表
    /// - get_chat_messages: 获取聊天消息列表
    /// - get_nearby_users: 获取附近的用户
    /// - get_company_info: 获取企业信息
    /// </remarks>
    [HttpPost("tools/list")]
    [ProducesResponseType(typeof(ApiResponse<McpListToolsResponse>), StatusCodes.Status200OK)]
    public async Task<IActionResult> ListTools()
    {
        var response = await _mcpService.ListToolsAsync();
        return Success(response);
    }

    /// <summary>
    /// 调用工具
    /// </summary>
    /// <param name="request">工具调用请求</param>
    /// <returns>工具调用结果</returns>
    /// <remarks>
    /// 执行指定的工具并返回结果。
    ///
    /// 请求示例：
    /// ```json
    /// {
    ///   "jsonRpc": "2.0",
    ///   "method": "tools/call",
    ///   "params": {
    ///     "name": "get_user_info",
    ///     "arguments": {
    ///       "userId": "1234567890abcdef12345678"
    ///     }
    ///   },
    ///   "id": "2"
    /// }
    /// ```
    /// </remarks>
    [HttpPost("tools/call")]
    [ProducesResponseType(typeof(ApiResponse<McpCallToolResponse>), StatusCodes.Status200OK)]
    public async Task<IActionResult> CallTool([FromBody] McpCallToolRequest request)
    {
        var currentUserId = GetRequiredUserId();
        var response = await _mcpService.CallToolAsync(request, currentUserId);
        return Success(response);
    }

    /// <summary>
    /// 列出所有可用资源
    /// </summary>
    /// <returns>资源列表响应</returns>
    /// <remarks>
    /// 返回当前用户可以访问的所有资源列表，包括：
    /// - 用户信息资源
    /// - 用户列表资源
    /// - 聊天会话资源
    /// </remarks>
    [HttpPost("resources/list")]
    [ProducesResponseType(typeof(ApiResponse<McpListResourcesResponse>), StatusCodes.Status200OK)]
    public async Task<IActionResult> ListResources()
    {
        var currentUserId = GetRequiredUserId();
        var response = await _mcpService.ListResourcesAsync(currentUserId);
        return Success(response);
    }

    /// <summary>
    /// 读取资源内容
    /// </summary>
    /// <param name="request">读取资源请求</param>
    /// <returns>资源内容响应</returns>
    /// <remarks>
    /// 读取指定资源的内容。
    ///
    /// 请求示例：
    /// ```json
    /// {
    ///   "jsonRpc": "2.0",
    ///   "method": "resources/read",
    ///   "params": {
    ///     "uri": "user://1234567890abcdef12345678"
    ///   },
    ///   "id": "3"
    /// }
    /// ```
    /// </remarks>
    [HttpPost("resources/read")]
    [ProducesResponseType(typeof(ApiResponse<McpReadResourceResponse>), StatusCodes.Status200OK)]
    public async Task<IActionResult> ReadResource([FromBody] McpReadResourceRequest request)
    {
        var currentUserId = GetRequiredUserId();
        var response = await _mcpService.ReadResourceAsync(request, currentUserId);
        return Success(response);
    }

    /// <summary>
    /// 列出所有可用提示词
    /// </summary>
    /// <returns>提示词列表响应</returns>
    /// <remarks>
    /// 返回 MCP 服务器支持的所有提示词模板列表。
    /// </remarks>
    [HttpPost("prompts/list")]
    [ProducesResponseType(typeof(ApiResponse<McpListPromptsResponse>), StatusCodes.Status200OK)]
    public async Task<IActionResult> ListPrompts()
    {
        var response = await _mcpService.ListPromptsAsync();
        return Success(response);
    }

    /// <summary>
    /// 获取提示词内容
    /// </summary>
    /// <param name="request">获取提示词请求</param>
    /// <returns>提示词内容响应</returns>
    /// <remarks>
    /// 获取指定提示词模板的内容。
    ///
    /// 请求示例：
    /// ```json
    /// {
    ///   "jsonRpc": "2.0",
    ///   "method": "prompts/get",
    ///   "params": {
    ///     "name": "search_user",
    ///     "arguments": {
    ///       "keyword": "admin"
    ///     }
    ///   },
    ///   "id": "4"
    /// }
    /// ```
    /// </remarks>
    [HttpPost("prompts/get")]
    [ProducesResponseType(typeof(ApiResponse<McpGetPromptResponse>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetPrompt([FromBody] McpGetPromptRequest request)
    {
        var currentUserId = GetRequiredUserId();
        var response = await _mcpService.GetPromptAsync(request, currentUserId);
        return Success(response);
    }
}

