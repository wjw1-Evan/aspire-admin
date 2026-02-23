using System.Text.Json;
using Microsoft.Extensions.Logging;
using Platform.ApiService.Models;

namespace Platform.ApiService.Services.Mcp;

/// <summary>
/// MCP 服务实现 - 协调者模式
/// 负责路由 MCP 请求到对应的领域 Handler
/// </summary>
public class McpService : IMcpService
{
    private readonly IEnumerable<IMcpToolHandler> _handlers;
    private readonly Handlers.RuleMcpToolHandler? _ruleHandler;
    private readonly ILogger<McpService> _logger;

    /// <summary>
    /// 初始化 MCP 控制器服务
    /// </summary>
    /// <param name="handlers">已注册的 MCP 工具处理器集合</param>
    /// <param name="logger">日志处理器</param>
    public McpService(
        IEnumerable<IMcpToolHandler> handlers,
        ILogger<McpService> logger)
    {
        _handlers = handlers;
        _logger = logger;
        // 尝试从集合中找到 RuleHandler，用于资源和提示词
        _ruleHandler = _handlers.OfType<Handlers.RuleMcpToolHandler>().FirstOrDefault();
    }

    /// <inheritdoc />
    public Task<McpInitializeResponse> InitializeAsync(McpInitializeRequest request)
    {
        _logger.LogInformation("MCP Service initialized with {Count} handlers. Client: {ClientName}",
            _handlers.Count(), request.ClientInfo?["name"] ?? "unknown");

        return Task.FromResult(new McpInitializeResponse
        {
            ProtocolVersion = McpProtocolVersion.Version,
            ServerInfo = new McpServerInfo(),
            Capabilities = new Dictionary<string, object>
            {
                ["tools"] = new Dictionary<string, object> { ["listChanged"] = true },
                ["resources"] = new Dictionary<string, object> { ["subscribe"] = true },
                ["prompts"] = new Dictionary<string, object> { ["listChanged"] = true }
            }
        });
    }

    /// <inheritdoc />
    public async Task<McpListToolsResponse> ListToolsAsync()
    {
        var allTools = new List<McpTool>();
        foreach (var handler in _handlers)
        {
            allTools.AddRange(await handler.GetToolDefinitionsAsync());
        }

        return new McpListToolsResponse { Tools = allTools };
    }

    /// <inheritdoc />
    public async Task<McpCallToolResponse> CallToolAsync(McpCallToolRequest request, string currentUserId)
    {
        var toolName = request.Name;
        _logger.LogInformation("Calling MCP tool: {ToolName} by User: {UserId}", toolName, currentUserId);

        // 1. 优先尝试静态注册的处理器
        var handler = _handlers.FirstOrDefault(h => h.CanHandle(toolName));
        if (handler != null)
        {
            var result = await handler.HandleAsync(toolName, request.Arguments ?? new(), currentUserId);
            return new McpCallToolResponse { Content = WrapResult(result) };
        }

        // 2. 尝试动态规则处理器
        if (_ruleHandler != null)
        {
            var (handled, result) = await _ruleHandler.TryHandleRuleToolAsync(toolName, request.Arguments ?? new(), currentUserId);
            if (handled)
            {
                return new McpCallToolResponse { Content = WrapResult(result) };
            }
        }

        throw new ArgumentException($"未找到工具处理器: {toolName}");
    }

    /// <inheritdoc />
    public async Task<McpListResourcesResponse> ListResourcesAsync(string currentUserId)
    {
        if (_ruleHandler == null) return new McpListResourcesResponse { Resources = new() };
        return new McpListResourcesResponse { Resources = await _ruleHandler.GetResourcesAsync() };
    }

    /// <inheritdoc />
    public async Task<McpReadResourceResponse> ReadResourceAsync(McpReadResourceRequest request, string currentUserId)
    {
        if (_ruleHandler == null) throw new InvalidOperationException("Rule handler not available");
        var content = await _ruleHandler.ReadResourceAsync(request.Uri);
        return new McpReadResourceResponse
        {
            Contents = new List<McpContent>
            {
                new McpContent
                {
                    Uri = request.Uri,
                    Text = content ?? "",
                    Type = "text",
                    MimeType = "text/plain"
                }
            }
        };
    }

    /// <inheritdoc />
    public async Task<McpListPromptsResponse> ListPromptsAsync()
    {
        if (_ruleHandler == null) return new McpListPromptsResponse { Prompts = new() };
        return new McpListPromptsResponse { Prompts = await _ruleHandler.GetPromptsAsync() };
    }

    /// <inheritdoc />
    public async Task<McpGetPromptResponse> GetPromptAsync(McpGetPromptRequest request, string currentUserId)
    {
        if (_ruleHandler == null) throw new InvalidOperationException("Rule handler not available");

        // 注意：RuleMcpToolHandler 内部需要处理 Dictionary<string, object> 到 string 的转换
        var stringArgs = request.Arguments?.ToDictionary(k => k.Key, v => v.Value?.ToString() ?? "");
        var result = await _ruleHandler.GetPromptAsync(request.Name, stringArgs);

        return result ?? throw new ArgumentException($"未找到提示词: {request.Name}");
    }

    private List<McpContent> WrapResult(object? result)
    {
        string json;
        if (result is string s) json = s;
        else json = JsonSerializer.Serialize(result, new JsonSerializerOptions { WriteIndented = true });

        return new List<McpContent>
        {
            new McpContent { Type = "text", Text = json }
        };
    }
}
