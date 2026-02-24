using Microsoft.AspNetCore.Mvc;
using Platform.ApiService.Extensions;
using Platform.ApiService.Models;
using Platform.ApiService.Services;
using Platform.ServiceDefaults.Controllers;

namespace Platform.ApiService.Controllers;

/// <summary>
/// MCP 服务器控制器
/// 提供 Model Context Protocol (MCP) 协议的 HTTP 端点
/// </summary>
[ApiController]
[Route("api/mcp")]
public class McpController : BaseApiController
{
    private readonly IMcpService _mcpService;

    /// <summary>
    /// 初始化 MCP 控制器
    /// </summary>
    /// <param name="mcpService">MCP 服务</param>
    public McpController(IMcpService mcpService)
    {
        _mcpService = mcpService ?? throw new ArgumentNullException(nameof(mcpService));
    }

    /// <summary>
    /// 初始化 MCP 服务器
    /// </summary>
    [HttpPost("initialize")]
    [ProducesResponseType(typeof(object), StatusCodes.Status200OK)]
    public async Task<IActionResult> Initialize([FromBody] McpInitializeRequest request)
    {
        var response = await _mcpService.InitializeAsync(request);
        return Success(response);
    }

    /// <summary>
    /// 列出所有可用工具
    /// </summary>
    [HttpPost("tools/list")]
    [ProducesResponseType(typeof(object), StatusCodes.Status200OK)]
    public async Task<IActionResult> ListTools()
    {
        var response = await _mcpService.ListToolsAsync();
        return Success(response);
    }

    /// <summary>
    /// 调用工具
    /// </summary>
    [HttpPost("tools/call")]
    [ProducesResponseType(typeof(object), StatusCodes.Status200OK)]
    public async Task<IActionResult> CallTool([FromBody] McpCallToolRequest request)
    {
        var currentUserId = GetRequiredUserId();
        var response = await _mcpService.CallToolAsync(request, currentUserId);
        return Success(response);
    }
}
