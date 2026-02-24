using System.Diagnostics;
using System.Text;
using System.Text.Json;
using System.Text.RegularExpressions;
using Microsoft.Extensions.Logging;
using Platform.ApiService.Models;
using Platform.ApiService.Services.Mcp;

namespace Platform.ApiService.Services;

/// <summary>
/// MCP 服务实现 - 精简版
/// 职责：工具路由、自动检测匹配、参数解析
/// </summary>
public class McpService : IMcpService
{
    private const int MaxMatchedTools = 3;
    private const double MinimumMatchScore = 3.0;

    private readonly IEnumerable<IMcpToolHandler> _handlers;
    private readonly ILogger<McpService> _logger;

    /// <summary>
    /// 初始化 MCP 服务
    /// </summary>
    /// <param name="handlers">工具处理器集合</param>
    /// <param name="logger">日志对象</param>
    public McpService(
        IEnumerable<IMcpToolHandler> handlers,
        ILogger<McpService> logger)
    {
        _handlers = handlers;
        _logger = logger;
    }

    public Task<McpInitializeResponse> InitializeAsync(McpInitializeRequest request)
    {
        _logger.LogInformation("MCP 服务初始化，共 {Count} 个 Handler", _handlers.Count());
        return Task.FromResult(new McpInitializeResponse
        {
            ProtocolVersion = McpProtocolVersion.Version,
            ServerInfo = new McpServerInfo(),
            Capabilities = new Dictionary<string, object>
            {
                ["tools"] = new Dictionary<string, object> { ["listChanged"] = true }
            }
        });
    }

    public async Task<McpListToolsResponse> ListToolsAsync()
    {
        var tools = await GetAllToolsAsync();
        return new McpListToolsResponse { Tools = tools };
    }

    public async Task<McpCallToolResponse> CallToolAsync(McpCallToolRequest request, string currentUserId)
    {
        var toolName = request.Name;
        var arguments = TruncateArguments(request.Arguments ?? new());
        var stopwatch = Stopwatch.StartNew();

        try
        {
            var handler = _handlers.FirstOrDefault(h => h.CanHandle(toolName));
            if (handler == null)
            {
                _logger.LogWarning("未找到工具: {ToolName}", toolName);
                return ErrorResponse($"未找到工具: {toolName}");
            }

            var result = await handler.HandleAsync(toolName, arguments, currentUserId);
            stopwatch.Stop();

            _logger.LogInformation("工具执行成功: {ToolName}, 耗时: {Ms}ms", toolName, stopwatch.ElapsedMilliseconds);
            return new McpCallToolResponse { Content = WrapResult(result) };
        }
        catch (Exception ex)
        {
            stopwatch.Stop();
            _logger.LogError(ex, "工具执行失败: {ToolName}", toolName);
            return ErrorResponse($"执行失败: {ex.Message}");
        }
    }

    public async Task<McpToolExecutionResult?> DetectAndCallMcpToolsAsync(
        ChatSession session,
        ChatMessage userMessage,
        string currentUserId,
        CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(userMessage.Content))
            return null;

        try
        {
            var tools = await GetAllToolsAsync();
            if (!tools.Any()) return null;

            // 1. 匹配工具
            var matchedTools = ScoreAndMatchTools(userMessage.Content, tools);
            if (!matchedTools.Any()) return null;

            // 2. 过滤命令类工具（无动作意图时不执行 create/delete/update）
            var actionKeywords = new[] { "删", "建", "新", "改", "设", "转", "审", "批", "标记", "处", "退", "增", "加", "去", "撤" };
            var hasActionIntent = actionKeywords.Any(k => userMessage.Content.Contains(k));

            var toolsToExecute = matchedTools.Where(t =>
            {
                var lower = t.Name.ToLower();
                var isCommand = lower.StartsWith("create_") || lower.StartsWith("delete_") || lower.StartsWith("update_");
                return !isCommand || hasActionIntent;
            }).Take(MaxMatchedTools).ToList();

            if (!toolsToExecute.Any()) return null;

            _logger.LogInformation("准备执行 {Count} 个工具: {Tools}",
                toolsToExecute.Count, string.Join(", ", toolsToExecute.Select(t => t.Name)));

            // 3. 并行执行工具
            var tasks = toolsToExecute.Select(async tool =>
            {
                try
                {
                    var args = ResolveParameters(tool, userMessage.Content);
                    var response = await CallToolAsync(
                        new McpCallToolRequest { Name = tool.Name, Arguments = args },
                        currentUserId);

                    // 结果为空时尝试无参数调用
                    if (response.IsError || !response.Content.Any())
                    {
                        response = await CallToolAsync(
                            new McpCallToolRequest { Name = tool.Name, Arguments = new() },
                            currentUserId);
                    }

                    return (Tool: tool, Response: response);
                }
                catch (Exception ex)
                {
                    _logger.LogWarning(ex, "执行工具 {ToolName} 失败", tool.Name);
                    return (Tool: tool, Response: (McpCallToolResponse?)null);
                }
            });

            var results = await Task.WhenAll(tasks);

            // 4. 格式化结果
            var resultBuilder = new StringBuilder();
            var descriptions = new List<string>();

            foreach (var (tool, response) in results)
            {
                if (response == null || response.IsError || !response.Content.Any())
                    continue;

                var desc = CleanDescription(tool.Description ?? "");
                descriptions.Add(desc);
                resultBuilder.AppendLine($"### [{desc}] 相关信息:");

                foreach (var content in response.Content)
                {
                    if (!string.IsNullOrEmpty(content.Text))
                        resultBuilder.AppendLine(content.Text);
                }
                resultBuilder.AppendLine();
            }

            if (descriptions.Any())
            {
                return new McpToolExecutionResult
                {
                    Context = resultBuilder.ToString(),
                    ToolSummary = string.Join("、", descriptions),
                    ToolDescriptions = descriptions
                };
            }

            return null;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "MCP 工具自动检测失败");
            return null;
        }
    }

    #region 私有方法

    private async Task<List<McpTool>> GetAllToolsAsync()
    {
        var allTools = new List<McpTool>();
        foreach (var handler in _handlers)
        {
            allTools.AddRange(await handler.GetToolDefinitionsAsync());
        }
        return allTools;
    }

    /// <summary>
    /// 对工具进行关键词匹配评分，返回匹配的工具列表
    /// </summary>
    private List<McpTool> ScoreAndMatchTools(string input, List<McpTool> allTools)
    {
        var cleanInput = Regex.Replace(input.ToLower(),
            "查|找|搜索|查询|显示|获取|看一下|一下|我的|给我|请|帮我|看看|下|个|条|点|想|知道|列出|展示",
            "").Trim();

        return allTools.Select(tool =>
        {
            double score = 0;

            // 工具名匹配
            if (cleanInput.Contains(tool.Name.ToLower()))
                score += 10;

            // 关键词匹配
            var keywords = ExtractKeywords(tool.Description);
            foreach (var kw in keywords)
            {
                if (kw.Length >= 2 && cleanInput.Contains(kw))
                    score += 5;
            }

            return new { Tool = tool, Score = score };
        })
        .Where(x => x.Score >= MinimumMatchScore)
        .OrderByDescending(x => x.Score)
        .Select(x => x.Tool)
        .ToList();
    }

    /// <summary>
    /// 从工具描述中提取关键词（格式：描述。关键词：A,B,C）
    /// </summary>
    private static List<string> ExtractKeywords(string? description)
    {
        if (string.IsNullOrEmpty(description)) return new();

        var lower = description.ToLower();
        var idx = lower.IndexOf("关键词：");
        if (idx < 0) return new();

        var kwPart = lower.Substring(idx + 4);
        return kwPart.Split('、', '，', ' ', ',', '。')
            .Select(k => k.Trim())
            .Where(k => k.Length >= 2)
            .Distinct()
            .ToList();
    }

    /// <summary>
    /// 根据工具 Schema 从用户输入中解析参数
    /// </summary>
    private static Dictionary<string, object> ResolveParameters(McpTool tool, string input)
    {
        var args = new Dictionary<string, object>();
        var cleanInput = Regex.Replace(input.ToLower(),
            "查|找|搜索|查询|显示|获取|关于|查看|叫|名为|显示|打开|详细",
            "").Trim();

        // 提取 ID（MongoDB ObjectId 或 GUID）
        var idMatch = Regex.Match(input, @"\b([a-f0-9]{24}|[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})\b", RegexOptions.IgnoreCase);
        var detectedId = idMatch.Success ? idMatch.Value : null;

        // 基于 Schema 填充参数
        if (tool.InputSchema != null &&
            tool.InputSchema.TryGetValue("properties", out var props) &&
            props is Dictionary<string, object> propMap)
        {
            foreach (var prop in propMap)
            {
                var key = prop.Key.ToLower();
                if ((key == "id" || key.EndsWith("id")) && detectedId != null)
                    args[prop.Key] = detectedId;
                else if (key == "keyword" || key == "search")
                    args[prop.Key] = cleanInput;
            }
        }

        // 兜底
        if (args.Count == 0 && !string.IsNullOrEmpty(cleanInput))
        {
            args["keyword"] = cleanInput;
            args["search"] = cleanInput;
        }

        return args;
    }

    /// <summary>
    /// 截断过长的参数值
    /// </summary>
    private static Dictionary<string, object> TruncateArguments(Dictionary<string, object> arguments)
    {
        var result = new Dictionary<string, object>();
        foreach (var arg in arguments)
        {
            if (arg.Value is string s && s.Length > 10000)
                result[arg.Key] = s.Substring(0, 10000);
            else
                result[arg.Key] = arg.Value;
        }
        return result;
    }

    private static string CleanDescription(string description)
    {
        return Regex.Replace(description, "关键词：.*", "").Trim('。', ' ', '、');
    }

    private static List<McpContent> WrapResult(object? result)
    {
        string json = result is string s ? s : JsonSerializer.Serialize(result, new JsonSerializerOptions { WriteIndented = true });
        return new List<McpContent> { new() { Type = "text", Text = json } };
    }

    private static McpCallToolResponse ErrorResponse(string message)
    {
        return new McpCallToolResponse
        {
            IsError = true,
            Content = new List<McpContent> { new() { Type = "text", Text = message } }
        };
    }

    #endregion
}
