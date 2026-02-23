using System.Text;
using System.Text.Json;
using System.Text.RegularExpressions;
using Microsoft.Extensions.Logging;
using Platform.ApiService.Models;
using Platform.ServiceDefaults.Services;
using Platform.ApiService.Services.Mcp;
using Platform.ApiService.Services.Mcp.Handlers;

namespace Platform.ApiService.Services;

/// <summary>
/// MCP 服务实现 - 协调者模式
/// 负责路由 MCP 请求到对应的领域 Handler
/// </summary>
public class McpService : IMcpService
{
    private readonly IEnumerable<IMcpToolHandler> _handlers;
    private readonly RuleMcpToolHandler? _ruleHandler;
    private readonly IDataFactory<ChatMessage> _messageFactory;
    private readonly ILogger<McpService> _logger;

    /// <summary>
    /// 初始化 MCP 控制器服务
    /// </summary>
    /// <param name="handlers">已注册的 MCP 工具处理器集合</param>
    /// <param name="messageFactory">消息数据工厂</param>
    /// <param name="logger">日志处理器</param>
    public McpService(
        IEnumerable<IMcpToolHandler> handlers,
        IDataFactory<ChatMessage> messageFactory,
        ILogger<McpService> logger)
    {
        _handlers = handlers;
        _messageFactory = messageFactory;
        _logger = logger;
        // 尝试从集合中找到 RuleHandler，用于资源和提示词
        _ruleHandler = _handlers.OfType<RuleMcpToolHandler>().FirstOrDefault();
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
    public async Task<McpToolExecutionResult?> DetectAndCallMcpToolsAsync(ChatSession session, ChatMessage userMessage, string currentUserId, CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(userMessage.Content)) return null;

        var toolsResponse = await ListToolsAsync();
        var allTools = toolsResponse.Tools;
        if (!allTools.Any()) return null;

        var input = userMessage.Content.ToLower();
        // 扩展清洗列表，移除更多干扰词
        var cleanInput = Regex.Replace(input, "查|找|搜索|查询|显示|获取|看一下|一下|我的|我们的|给我|请|帮我|看看|下|个|条|点|想|知道|列出|展示|有没有|在哪|谁|什么|相关的|一些|近期|最近|的|是|在|全部|园区|列表|平台|数据|系统|线索|资产", "");

        _logger.LogInformation("[MCP Detect] 原始输入: {Input}, 清洗后: {CleanInput}", input, cleanInput);

        // 高级匹配逻辑：基于权重的评分系统
        var scoredTools = allTools.Select(tool =>
        {
            double score = 0;
            var toolName = tool.Name.ToLower();
            var desc = tool.Description?.ToLower() ?? "";

            // 1. 工具名完全匹配（最高权重）
            if (input.Contains(toolName)) score += 10;

            // 2. 关键词匹配进度描述
            if (desc.Contains("关键词："))
            {
                var kwPart = desc.Substring(desc.IndexOf("关键词：") + 4);
                var keywords = kwPart.Split('、', '，', ' ', ',', '。', '（', '）', '(', ')', '/', '|', '：', ':', ';', '；');

                int matchCount = 0;
                foreach (var kw in keywords)
                {
                    var trimmedKw = kw.Trim();
                    if (trimmedKw.Length < 1) continue;

                    // 移除动词前缀获取核心词
                    var coreKw = Regex.Replace(trimmedKw, "^(获取|查询|执行|列表|所有|的|查看|显示|园区|管理|系统)", "");
                    if (coreKw.Length < 1) continue;

                    // 匹配度打分
                    if (cleanInput == coreKw) score += 8; // 完全相等
                    else if (cleanInput.Contains(coreKw))
                    {
                        score += coreKw.Length >= 2 ? 5 : 2; // 包含核心词
                        matchCount++;
                    }
                    else if (coreKw.Contains(cleanInput) && cleanInput.Length >= 2)
                    {
                        score += 3; // 核心词包含输入
                        matchCount++;
                    }
                }

                // 多词匹配加成
                if (matchCount > 1) score += (matchCount - 1) * 2;
            }

            // 3. 领域上下文加成（如果输入包含特定领域词汇，该领域的工具获得加成）
            var domainBonuses = new Dictionary<string, string[]>
            {
                ["park"] = new[] { "园区", "招商", "租户", "资产", "楼铺" },
                ["iot"] = new[] { "物联网", "设备", "传感器", "网关" },
                ["file"] = new[] { "文件", "网盘", "共享", "分享", "版本" },
                ["task"] = new[] { "任务", "待办", "项目", "审批" }
            };

            foreach (var domain in domainBonuses)
            {
                if (domain.Value.Any(v => input.Contains(v)) &&
                    (toolName.Contains(domain.Key) || desc.Contains(domain.Key)))
                {
                    score += 2;
                }
            }

            return new { Tool = tool, Score = score };
        })
        .Where(x => x.Score >= 3) // 设定最小阈值，过滤掉低相关匹配
        .OrderByDescending(x => x.Score)
        .ToList();

        // --- 增强：连续对话上下文扫描 ---
        string? contextId = null;
        string lastDomain = "";

        try
        {
            // 获取最近 5 条历史消息（按时间倒序）
            var history = await _messageFactory.FindAsync(
                filter: m => m.SessionId == session.Id && m.Id != userMessage.Id,
                orderBy: q => q.OrderByDescending(m => m.CreatedAt),
                limit: 5);

            foreach (var hMsg in history)
            {
                if (string.IsNullOrEmpty(hMsg.Content)) continue;

                // 1. 从历史中嗅探最新的 ID
                if (contextId == null)
                {
                    var hIdMatch = Regex.Match(hMsg.Content, @"\b([a-f0-9]{24}|[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})\b", RegexOptions.IgnoreCase);
                    if (hIdMatch.Success) contextId = hIdMatch.Value;
                }

                // 2. 从历史（特别是助手回复）中分析讨论领域
                if (string.IsNullOrEmpty(lastDomain))
                {
                    if (hMsg.Content.Contains("线索") || hMsg.Content.Contains("招商")) lastDomain = "park_investment";
                    else if (hMsg.Content.Contains("设备") || hMsg.Content.Contains("传感器")) lastDomain = "iot";
                    else if (hMsg.Content.Contains("文件") || hMsg.Content.Contains("目录")) lastDomain = "file";
                    else if (hMsg.Content.Contains("任务") || hMsg.Content.Contains("待办")) lastDomain = "task";
                }
            }
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "[MCP Detect] 获取对话历史失败，跳过上下文分析。");
        }

        // --- 结束历史扫描 ---

        if (!scoredTools.Any()) return null;

        // 根据上下文领域对匹配结果进行微调加成
        if (!string.IsNullOrEmpty(lastDomain))
        {
            scoredTools = scoredTools.Select(x =>
            {
                var toolName = x.Tool.Name.ToLower();
                if (toolName.Contains(lastDomain.Replace("park_", "")))
                    return new { Tool = x.Tool, Score = x.Score + 3.0 };
                return x;
            }).OrderByDescending(x => x.Score).ToList();
        }

        var matchedTools = scoredTools.Select(x => x.Tool).DistinctBy(t => t.Name).Take(3).ToList();

        // 增强安全性：区分“查询”与“操作”（增删改）
        // 只有当用户输入包含明显的动作意图时，才在检测阶段自动执行具有副作用的工具
        var actionKeywords = new[] { "删", "建", "新", "改", "设", "转", "审", "批", "标记", "处", "退", "增", "加", "去", "撤" };
        bool hasActionIntent = actionKeywords.Any(k => input.Contains(k));

        _logger.LogInformation("检测到潜在匹配的 MCP 工具 (Top {Count}, 最高分 {Score}, 动作意图: {HasIntent}): {Tools}",
            matchedTools.Count, scoredTools.First().Score, hasActionIntent, string.Join(", ", matchedTools.Select(t => t.Name)));

        var executionResult = new McpToolExecutionResult();
        var resultBuilder = new StringBuilder();

        foreach (var tool in matchedTools)
        {
            var toolName = tool.Name.ToLower();
            bool isCommand = toolName.StartsWith("create_") || toolName.StartsWith("delete_") || toolName.StartsWith("update_") ||
                             toolName.StartsWith("mark_") || toolName.StartsWith("add_") || toolName.StartsWith("remove_") ||
                             toolName.StartsWith("set_") || toolName.StartsWith("toggle_") || toolName.StartsWith("convert_") ||
                             toolName.StartsWith("approve_") || toolName.StartsWith("reject_") || toolName.StartsWith("process_");

            if (isCommand && !hasActionIntent)
            {
                _logger.LogInformation("[MCP Detect] 工具 {ToolName} 属于命令/操作类，但未检测到用户确切的操作意图，跳过自动执行以确保安全。", tool.Name);
                executionResult.ToolDescriptions.Add($"[待确认指令] {Regex.Replace(tool.Description, "关键词：.*", "").Trim()}");
                continue;
            }
            try
            {
                var displayDesc = Regex.Replace(tool.Description, "关键词：.*", "").Trim('。', ' ', '、');
                executionResult.ToolDescriptions.Add(displayDesc);

                var args = new Dictionary<string, object>();
                var specificSearch = cleanInput;
                // 不再盲目剔除业务关键词，因为它们可能是名称的一部分（例如“智慧园区物业”）。
                specificSearch = specificSearch.Trim();

                // 1. 尝试从输入中提取 ID (Guid 或 MongoDB ObjectId)
                var idMatch = Regex.Match(input, @"\b([a-f0-9]{24}|[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})\b", RegexOptions.IgnoreCase);
                string? detectedId = idMatch.Success ? idMatch.Value : null;

                // 2. 尝试从输入中提取 标题/内容 模式
                var titleMatch = Regex.Match(input, @"(标题|名称|叫|搜)[为：: ]\s*([^，。？！\s]+)");
                var contentMatch = Regex.Match(input, @"(内容|描述|结果|详情)[为：: ]\s*([^，。？！\s]+)");

                // 连续对话增强：如果当前没有提取到 ID，但用户使用了指代词 (Pronouns)，则使用上下文中的 ID
                var referentialKeywords = new[] { "它", "那个", "此", "该", "刚才的", "上一个", "it", "that", "this" };
                if (detectedId == null && (referentialKeywords.Any(k => input.Contains(k)) || input.Length <= 4) && contextId != null)
                {
                    _logger.LogInformation("[MCP Detect] 检测到指代性语境，自动从历史语境提取 ID: {ContextId}", contextId);
                    detectedId = contextId;
                }
                else
                {
                    // 增加：支持“显示”、“打开”等更多动词，并优化对“详细信息”等结尾的过滤
                    var prefixMatch = Regex.Match(input, @"(关于|查看|搜索|查询|关于|叫|名为|名为|显示|打开|详细|获取)\s*(.+)");
                    if (prefixMatch.Success)
                    {
                        specificSearch = prefixMatch.Groups[2].Value;
                        // 剔除常见的干扰后缀
                        specificSearch = Regex.Replace(specificSearch, @"(的?(详细信息|详情|资料|内容|信息)|记录|。|？|！|\.|\!|\?)$", "").Trim();
                    }
                }
                // 3. 基于 Schema 智能填充参数
                if (tool.InputSchema != null && tool.InputSchema.TryGetValue("properties", out var props) && props is Dictionary<string, object> propMap)
                {
                    foreach (var prop in propMap)
                    {
                        var key = prop.Key.ToLower();
                        // ID 匹配
                        if ((key == "id" || key.EndsWith("id")) && detectedId != null) args[prop.Key] = detectedId;
                        // 搜索/关键字 匹配
                        else if (key == "keyword" || key == "search") args[prop.Key] = specificSearch;
                        // 标题/名称 匹配
                        else if ((key == "title" || key == "name" || key == "companyname" || key == "taskname" || key == "username" || key == "filename") && titleMatch.Success) args[prop.Key] = titleMatch.Groups[2].Value;
                        else if (key == "title" || key == "name" || key == "companyname" || key == "taskname" || key == "username" || key == "filename") args[prop.Key] = specificSearch; // 兜底使用搜索词
                        // 内容/描述 匹配
                        else if ((key == "description" || key == "content" || key == "resolution" || key == "requirements") && contentMatch.Success) args[prop.Key] = contentMatch.Groups[2].Value;
                        // 状态匹配 (短词)
                        else if (key == "status" && !string.IsNullOrEmpty(specificSearch) && specificSearch.Length <= 4) args[prop.Key] = specificSearch;
                    }
                }

                // 兜底：如果没有填充核心参数但有搜索词，使用通用键
                if (args.Count == 0 && !string.IsNullOrEmpty(specificSearch))
                {
                    args["keyword"] = specificSearch;
                    args["search"] = specificSearch;
                }

                _logger.LogInformation("[MCP Detect] 自动化调用 {ToolName}, 参数: {Args}", tool.Name, JsonSerializer.Serialize(args));

                var response = await CallToolAsync(new McpCallToolRequest { Name = tool.Name, Arguments = args }, currentUserId);

                // 结果空值检查与兜底逻辑
                var firstText = response?.Content?.FirstOrDefault()?.Text;
                bool isResultEmpty = response == null || response.IsError || response.Content == null || !response.Content.Any() ||
                                   (firstText != null && (firstText.Contains("\"total\":0") || firstText == "[]" || firstText == "null"));

                if (isResultEmpty && args.Any())
                {
                    _logger.LogInformation("[MCP Detect] 精确搜索无结果，尝试列出最近记录...");
                    response = await CallToolAsync(new McpCallToolRequest { Name = tool.Name, Arguments = new() }, currentUserId);
                }

                if (response != null && !response.IsError && response.Content != null)
                {
                    resultBuilder.AppendLine($"### [{displayDesc}] 相关信息:");
                    foreach (var content in response.Content)
                    {
                        if (string.IsNullOrEmpty(content.Text)) continue;
                        var text = content.Text;

                        // 尝试精简输出：如果是长列表，输出摘要
                        if (text.Length > 200 && (text.TrimStart().StartsWith("[") || text.TrimStart().StartsWith("{")))
                        {
                            try
                            {
                                using var doc = JsonDocument.Parse(text);
                                if (doc.RootElement.ValueKind == JsonValueKind.Array)
                                {
                                    resultBuilder.AppendLine($"> 系统找到 {doc.RootElement.GetArrayLength()} 条相关结果。");
                                }
                                else if (doc.RootElement.TryGetProperty("total", out var total))
                                {
                                    resultBuilder.AppendLine($"> 系统共统计到 {total} 条匹配数据。");
                                }
                            }
                            catch { /* ignore parse error */ }
                        }
                        resultBuilder.AppendLine(text);
                    }
                    resultBuilder.AppendLine();
                }
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "自动执行工具 {ToolName} 时发生异常", tool.Name);
            }
        }

        if (resultBuilder.Length > 0)
        {
            executionResult.Context = resultBuilder.ToString();
            executionResult.ToolSummary = string.Join("、", executionResult.ToolDescriptions.Distinct());
            _logger.LogInformation("[MCP Detect] 成功生成工具回复内容，摘要: {Summary}", executionResult.ToolSummary);
            return executionResult;
        }

        _logger.LogWarning("[MCP Detect] 虽然匹配到了工具，但执行结果为空");
        return null;
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
