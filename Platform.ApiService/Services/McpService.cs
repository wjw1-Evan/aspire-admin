using System.Text;
using System.Text.Json;
using System.Text.RegularExpressions;
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

    /// <inheritdoc />
    public async Task<string?> DetectAndCallMcpToolsAsync(ChatSession session, ChatMessage userMessage, string currentUserId, CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(userMessage.Content)) return null;

        var toolsResponse = await ListToolsAsync();
        var allTools = toolsResponse.Tools;
        if (!allTools.Any()) return null;

        var input = userMessage.Content.ToLower();
        // 扩展清洗列表，移除更多干扰词
        var cleanInput = Regex.Replace(input, "查|找|搜索|查询|显示|获取|看一下|一下|我的|我们的|给我|请|帮我|看看|下|个|条|点|想|知道|列出|展示|有没有|在哪|谁|什么|相关的|一些|近期|最近|的|是|在", "");

        _logger.LogInformation("[MCP Detect] 原始输入: {Input}, 清洗后: {CleanInput}", input, cleanInput);

        var matchedTools = new List<McpTool>();

        // 简单的语义匹配逻辑：通过工具描述或名称查找关键词
        foreach (var tool in allTools)
        {
            // 1. 完全包含工具名（通常是英文）
            if (input.Contains(tool.Name.ToLower()))
            {
                matchedTools.Add(tool);
                _logger.LogInformation("[MCP Detect] 匹配到工具名: {ToolName}", tool.Name);
                continue;
            }

            // 2. 检查描述中的关键词
            if (!string.IsNullOrEmpty(tool.Description))
            {
                // 分解描述为多个可能的关键词 (支持自定义关键词格式：关键词：A,B,C)
                var descriptionPart = tool.Description;
                if (descriptionPart.Contains("关键词："))
                {
                    descriptionPart = descriptionPart.Substring(descriptionPart.IndexOf("关键词：") + 4);
                }

                var keywords = descriptionPart.Split('、', '，', ' ', ',', '。', '（', '）', '(', ')', '/', '|', '：', ':');
                foreach (var kw in keywords)
                {
                    var trimmedKw = kw.Trim();
                    if (trimmedKw.Length < 2) continue;

                    // 特殊逻辑：如果关键词以“获取”等前缀开头，移除前缀再匹配
                    var coreKw = Regex.Replace(trimmedKw, "^(获取|查询|执行|列表|所有|的)", "").ToLower();
                    if (coreKw.Length < 1) continue;

                    // 核心匹配逻辑：
                    // cleanInput 包含 coreKw 或者反过来
                    if (cleanInput.Contains(coreKw) || coreKw.Contains(cleanInput))
                    {
                        matchedTools.Add(tool);
                        _logger.LogInformation("[MCP Detect] 匹配到描述关键词: {Keyword} (Core: {CoreKeyword}) -> 工具: {ToolName}", trimmedKw, coreKw, tool.Name);
                        break;
                    }
                }
            }
        }

        if (!matchedTools.Any()) return null;

        // 增强：如果匹配到多个工具，进行去重和精简
        matchedTools = matchedTools.DistinctBy(t => t.Name).Take(3).ToList();

        _logger.LogInformation("检测到潜在匹配的 MCP 工具: {Tools}", string.Join(", ", matchedTools.Select(t => t.Name)));

        var resultBuilder = new StringBuilder();
        foreach (var tool in matchedTools)
        {
            try
            {
                // 尝试提取更精确的搜索关键词
                var args = new Dictionary<string, object>();
                var businessKeywords = new[] { "线索", "招商", "资产", "楼宇", "建筑", "房源", "租户", "合同", "任务", "走访", "报修", "申请", "园区", "物联网", "网关", "设备" };
                var specificSearch = cleanInput;
                foreach (var bk in businessKeywords)
                {
                    specificSearch = specificSearch.Replace(bk, "");
                }
                specificSearch = specificSearch.Trim();

                if (!string.IsNullOrEmpty(specificSearch))
                {
                    args["keyword"] = specificSearch;
                    args["search"] = specificSearch; // 兼容不同工具的参数名
                    args["status"] = specificSearch;
                }

                _logger.LogInformation("[MCP Detect] 准备调用工具 {ToolName}, 提取出的搜索词: {Search}", tool.Name, specificSearch ?? "(None)");

                var response = await CallToolAsync(new McpCallToolRequest { Name = tool.Name, Arguments = args }, currentUserId);

                // 如果搜索结果为空且之前带了搜索词，尝试进行空搜索（列出最近数据）
                if ((response.IsError || !response.Content.Any() || response.Content[0].Text.Contains("\"total\":0")) && !string.IsNullOrEmpty(specificSearch))
                {
                    _logger.LogInformation("[MCP Detect] 带词搜索无结果，尝试列出最近记录...");
                    response = await CallToolAsync(new McpCallToolRequest { Name = tool.Name, Arguments = new() }, currentUserId);
                }

                if (!response.IsError && response.Content.Any())
                {
                    resultBuilder.AppendLine($"### 工具 [{tool.Name}] 执行结果:");
                    foreach (var content in response.Content)
                    {
                        resultBuilder.AppendLine(content.Text);
                    }
                    resultBuilder.AppendLine();
                }
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "自动调用工具 {ToolName} 失败", tool.Name);
            }
        }

        var finalResult = resultBuilder.Length > 0 ? resultBuilder.ToString() : null;
        if (finalResult != null) _logger.LogInformation("[MCP Detect] 成功生成工具回复内容，长度: {Length}", finalResult.Length);
        else _logger.LogWarning("[MCP Detect] 虽然匹配到了工具，但执行结果为空");

        return finalResult;
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
