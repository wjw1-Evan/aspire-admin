#pragma warning disable CS1591
using Microsoft.Extensions.Logging;
using Platform.ApiService.Models;
using Platform.ServiceDefaults.Services;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text.RegularExpressions;
using System.Threading;
using System.Threading.Tasks;

namespace Platform.ApiService.Services;

public class ChatMcpService : IChatMcpService
{
    private readonly IMcpService? _mcpService;
    private readonly IDataFactory<ChatMessage> _messageFactory;
    private readonly ILogger<ChatMcpService> _logger;

    public ChatMcpService(
        IMcpService? mcpService,
        IDataFactory<ChatMessage> messageFactory,
        ILogger<ChatMcpService> logger)
    {
        _mcpService = mcpService;
        _messageFactory = messageFactory ?? throw new ArgumentNullException(nameof(messageFactory));
        _logger = logger ?? throw new ArgumentNullException(nameof(logger));
    }

    public async Task<string?> DetectAndCallMcpToolsAsync(ChatSession session, ChatMessage triggerMessage, string currentUserId, CancellationToken cancellationToken)
    {
        if (_mcpService == null) return null;

        var content = NormalizeAssistantMessageContent(triggerMessage);
        if (string.IsNullOrWhiteSpace(content)) return null;

        var contentLower = content.ToLowerInvariant();
        var toolResults = new List<string>();

        try
        {
            // --- 本地长效记忆 (User Memory) ---
            if (contentLower.Contains("记住") || contentLower.Contains("备忘") || contentLower.Contains("记一下"))
            {
                var fact = ExtractValue(content, "记住") ?? ExtractValue(content, "备忘") ?? content.Replace("记住", "").Replace("记一下", "").Trim();
                if (!string.IsNullOrWhiteSpace(fact) && fact.Length > 2)
                {
                    var args = new Dictionary<string, object> { ["content"] = fact, ["category"] = "Note", ["importance"] = 5 };
                    var response = await _mcpService.CallToolAsync(new McpCallToolRequest { Name = "memorize_user_fact", Arguments = args }, currentUserId);
                    if (!response.IsError && response.Content.Count > 0 && response.Content[0].Text != null) toolResults.Add(response.Content[0].Text!);
                }
            }
            else if (contentLower.Contains("忘记") || contentLower.Contains("别记") || contentLower.Contains("忘掉"))
            {
                var keyword = ExtractValue(content, "忘记") ?? ExtractValue(content, "忘掉") ?? content.Replace("忘记", "").Replace("忘掉", "").Trim();
                if (!string.IsNullOrWhiteSpace(keyword) && keyword.Length > 1)
                {
                    var args = new Dictionary<string, object> { ["keyword"] = keyword };
                    var response = await _mcpService.CallToolAsync(new McpCallToolRequest { Name = "forget_user_fact", Arguments = args }, currentUserId);
                    if (!response.IsError && response.Content.Count > 0 && response.Content[0].Text != null) toolResults.Add(response.Content[0].Text!);
                }
            }

            // --- 个人云盘与备忘录查询 (Cloud Storage & PasswordBook) ---
            if (contentLower.Contains("云盘") || contentLower.Contains("网盘") || contentLower.Contains("文件"))
            {
                var keyword = ExtractValue(content, "云盘") ?? ExtractValue(content, "文件") ?? content.Replace("云盘", "").Replace("找一下", "").Replace("文件", "").Trim();
                // 排除一些显然不是找文件的通用词汇
                if (!string.IsNullOrWhiteSpace(keyword) && keyword.Length > 1 && !keyword.Contains("上传") && !keyword.Contains("下载"))
                {
                    var args = new Dictionary<string, object> { ["keyword"] = keyword };
                    var response = await _mcpService.CallToolAsync(new McpCallToolRequest { Name = "search_cloud_files", Arguments = args }, currentUserId);
                    if (!response.IsError && response.Content.Count > 0 && response.Content[0].Text != null) toolResults.Add($"云盘搜索结果：\n{response.Content[0].Text}");
                }
            }
            if (contentLower.Contains("密码本") || contentLower.Contains("账号") || (contentLower.Contains("我的") && contentLower.Contains("备忘")))
            {
                var keyword = ExtractValue(content, "密码本") ?? ExtractValue(content, "账号") ?? content.Replace("密码本", "").Replace("找一下", "").Replace("账号", "").Trim();
                if (!string.IsNullOrWhiteSpace(keyword) && keyword.Length > 1)
                {
                    var args = new Dictionary<string, object> { ["keyword"] = keyword };
                    var response = await _mcpService.CallToolAsync(new McpCallToolRequest { Name = "search_password_book", Arguments = args }, currentUserId);
                    if (!response.IsError && response.Content.Count > 0 && response.Content[0].Text != null) toolResults.Add($"密码本/备忘搜索结果：\n{response.Content[0].Text}");
                }
            }

            // --- 用户与角色查询 ---
            if (contentLower.Contains("用户") && (contentLower.Contains("admin") || contentLower.Contains("信息") || contentLower.Contains("查询")))
            {
                string? username = contentLower.Contains("admin") ? "admin" : ExtractUsername(content);
                var args = new Dictionary<string, object>();
                if (!string.IsNullOrWhiteSpace(username)) args["username"] = username;

                var response = await _mcpService.CallToolAsync(new McpCallToolRequest { Name = "get_user_info", Arguments = args }, currentUserId);
                if (!response.IsError && response.Content.Count > 0) toolResults.Add($"用户信息查询结果：{response.Content[0].Text}");
            }
            else if (contentLower.Contains("用户") && (contentLower.Contains("列表") || contentLower.Contains("搜索")))
            {
                var args = new Dictionary<string, object>();
                if (contentLower.Contains("活跃")) args["status"] = "active";
                var response = await _mcpService.CallToolAsync(new McpCallToolRequest { Name = "search_users", Arguments = args }, currentUserId);
                if (!response.IsError && response.Content.Count > 0) toolResults.Add($"用户列表查询结果：{response.Content[0].Text}");
            }

            // --- 项目与任务创建 ---
            else if ((contentLower.Contains("项目") || contentLower.Contains("任务")) &&
                     (contentLower.Contains("创建") || contentLower.Contains("新建") || contentLower.Contains("确认")))
            {
                string? name = ExtractValue(content, "名称");
                string? desc = ExtractValue(content, "描述") ?? ExtractValue(content, "说明");

                if (string.IsNullOrEmpty(name))
                {
                    var history = await _messageFactory.FindAsync(m => m.SessionId == session.Id, q => q.OrderByDescending(m => m.CreatedAt), 5);
                    foreach (var histMsg in history)
                    {
                        var hContent = histMsg.Content ?? "";
                        if (string.IsNullOrEmpty(name)) name = ExtractValue(hContent, "名称") ?? ExtractQuote(hContent);
                        if (string.IsNullOrEmpty(desc)) desc = ExtractValue(hContent, "描述") ?? ExtractValue(hContent, "说明");
                        if (!string.IsNullOrEmpty(name)) break;
                    }
                }

                if (!string.IsNullOrEmpty(name))
                {
                    bool isProject = contentLower.Contains("项目");
                    var toolName = isProject ? "create_project" : "create_task";
                    var args = isProject
                        ? new Dictionary<string, object> { ["name"] = name, ["description"] = desc ?? "" }
                        : new Dictionary<string, object> { ["taskName"] = name, ["description"] = desc ?? "", ["taskType"] = "task" };

                    var response = await _mcpService.CallToolAsync(new McpCallToolRequest { Name = toolName, Arguments = args }, currentUserId);
                    if (!response.IsError) toolResults.Add($"[系统通知] {(isProject ? "项目" : "任务")}“{name}”已成功创建。");
                }
            }

            // --- 园区管理 (Park) ---
            else if (contentLower.Contains("园区") || contentLower.Contains("楼宇") || contentLower.Contains("租户"))
            {
                if (contentLower.Contains("楼宇") || contentLower.Contains("建筑"))
                {
                    var args = new Dictionary<string, object> { ["keyword"] = ExtractValue(content, "楼宇") ?? ExtractQuote(content) ?? "" };
                    var response = await _mcpService.CallToolAsync(new McpCallToolRequest { Name = "get_park_buildings", Arguments = args }, currentUserId);
                    if (!response.IsError && response.Content.Count > 0) toolResults.Add($"园区楼宇信息：{response.Content[0].Text}");
                }
                else if (contentLower.Contains("租户") || contentLower.Contains("企业"))
                {
                    var args = new Dictionary<string, object> { ["keyword"] = ExtractValue(content, "租户") ?? ExtractQuote(content) ?? "" };
                    var response = await _mcpService.CallToolAsync(new McpCallToolRequest { Name = "get_park_tenants", Arguments = args }, currentUserId);
                    if (!response.IsError && response.Content.Count > 0) toolResults.Add($"园区租户信息：{response.Content[0].Text}");
                }
            }

            // --- 物联网 (IoT) ---
            else if (contentLower.Contains("物联网") || contentLower.Contains("设备") || contentLower.Contains("实时数据"))
            {
                var toolName = (contentLower.Contains("数据") || contentLower.Contains("状态")) ? "get_iot_platform_statistics" : "get_iot_devices";
                var response = await _mcpService.CallToolAsync(new McpCallToolRequest { Name = toolName, Arguments = new Dictionary<string, object>() }, currentUserId);
                if (!response.IsError && response.Content.Count > 0) toolResults.Add($"物联网{(toolName.Contains("stats") ? "平台状态" : "设备列表")}：{response.Content[0].Text}");
            }

            // --- 工作流与审批 (Workflow) ---
            else if (contentLower.Contains("流程") || contentLower.Contains("审批") || contentLower.Contains("待办"))
            {
                var isTodo = contentLower.Contains("待办") || contentLower.Contains("我的");
                var toolName = isTodo ? "get_workflow_instances" : "get_workflow_definitions";
                var args = isTodo ? new Dictionary<string, object> { ["status"] = 0 } : new Dictionary<string, object>();
                var response = await _mcpService.CallToolAsync(new McpCallToolRequest { Name = toolName, Arguments = args }, currentUserId);
                if (!response.IsError && response.Content.Count > 0) toolResults.Add($"{(isTodo ? "待办流程列表" : "可用流程模版")}：{response.Content[0].Text}");
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "MCP工具调用异常");
        }

        return toolResults.Count > 0 ? string.Join("\n\n", toolResults) : null;
    }

    private string? NormalizeAssistantMessageContent(ChatMessage message)
    {
        if (message == null) return null;
        var content = message.Content;
        if (string.IsNullOrWhiteSpace(content)) return null;

        content = Regex.Replace(content, @"<[^>]*>", string.Empty);
        return content.Trim();
    }

    private string? ExtractUsername(string content)
    {
        var parts = content.Split(new[] { ' ', '，', ',', '：', ':' }, StringSplitOptions.RemoveEmptyEntries);
        return parts.FirstOrDefault(p => p.Length > 2 && p.Length < 50 && !p.Contains("@"));
    }

    private string? ExtractValue(string content, string key)
    {
        var pattern = $@"{key}[:：\s]*(.*)";
        var match = Regex.Match(content, pattern, RegexOptions.IgnoreCase);
        if (match.Success)
        {
            var val = match.Groups[1].Value.Trim();
            var parts = val.Split(new[] { ' ', '\n', '\r', '，', '。', '！' }, StringSplitOptions.RemoveEmptyEntries);
            return parts.FirstOrDefault();
        }
        return null;
    }

    private string? ExtractQuote(string content)
    {
        var match = Regex.Match(content, @"[“""'「]([^“""'」]+)[”""'」]");
        return match.Success ? match.Groups[1].Value.Trim() : null;
    }
}
