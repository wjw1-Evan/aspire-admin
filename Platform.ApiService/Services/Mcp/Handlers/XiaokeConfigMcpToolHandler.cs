using Microsoft.EntityFrameworkCore;
using Platform.ApiService.Models;
using Platform.ServiceDefaults.Services;
using Microsoft.Extensions.Logging;

namespace Platform.ApiService.Services.Mcp.Handlers;

/// <summary>
/// 小科 AI 配置 MCP 工具处理器 - 提供小科配置管理和聊天历史查询能力
/// </summary>
public class XiaokeConfigMcpToolHandler : McpToolHandlerBase
{
    private readonly IXiaokeConfigService _xiaokeConfigService;
    private readonly IChatHistoryService _chatHistoryService;
    private readonly ILogger<XiaokeConfigMcpToolHandler> _logger;

    public XiaokeConfigMcpToolHandler(
        IXiaokeConfigService xiaokeConfigService,
        IChatHistoryService chatHistoryService,
        ILogger<XiaokeConfigMcpToolHandler> logger)
    {
        _xiaokeConfigService = xiaokeConfigService;
        _chatHistoryService = chatHistoryService;
        _logger = logger;

        #region 小科配置管理

        RegisterTool("get_xiaoke_configs", "获取小科 AI 配置列表，支持分页和启用状态筛选。关键词：配置列表,小科配置,AI配置,模型配置",
            ObjectSchema(MergeProperties(
                new Dictionary<string, object>
                {
                    ["isEnabled"] = new Dictionary<string, object> { ["type"] = "boolean", ["description"] = "是否启用（可选）" },
                    ["keyword"] = new Dictionary<string, object> { ["type"] = "string", ["description"] = "搜索关键词" }
                },
                PaginationSchema()
            )),
            async (args, uid) =>
            {
                var (Current, PageSize) = ParsePaginationArgs(args);
                bool? isEnabled = args.TryGetValue("isEnabled", out var e) && bool.TryParse(e?.ToString(), out var ie) ? ie : null;
                var request = new Platform.ServiceDefaults.Models.ProTableRequest { Current = Current, PageSize = PageSize, Search = args.GetValueOrDefault("keyword")?.ToString() };
                var result = await _xiaokeConfigService.GetConfigsAsync(request, isEnabled);
                var items = await result.Queryable.ToListAsync();
                return new { items, rowCount = result.RowCount, currentPage = result.CurrentPage, pageSize = result.PageSize, pageCount = result.PageCount };
            });

        RegisterTool("get_xiaoke_config", "根据 ID 获取小科 AI 配置详情。关键词：配置详情,查看配置,模型配置",
            ObjectSchema(new Dictionary<string, object>
            {
                ["id"] = new Dictionary<string, object> { ["type"] = "string", ["description"] = "配置ID" }
            }, ["id"]),
            async (args, uid) =>
            {
                var id = args.GetValueOrDefault("id")?.ToString();
                if (string.IsNullOrEmpty(id)) return new { error = "id 必填" };
                var config = await _xiaokeConfigService.GetConfigByIdAsync(id);
                if (config == null) return new { error = "配置不存在" };
                return config;
            });

        RegisterTool("get_default_xiaoke_config", "获取当前企业的默认小科 AI 配置。关键词：默认配置,系统配置,默认模型",
            async (args, uid) =>
            {
                var config = await _xiaokeConfigService.GetDefaultConfigAsync();
                if (config == null) return new { message = "未设置默认配置" };
                return config;
            });

        RegisterTool("create_xiaoke_config", "创建新的小科 AI 配置。关键词：创建配置,新增配置,添加模型配置",
            ObjectSchema(new Dictionary<string, object>
            {
                ["name"] = new Dictionary<string, object> { ["type"] = "string", ["description"] = "配置名称" },
                ["model"] = new Dictionary<string, object> { ["type"] = "string", ["description"] = "AI 模型名称" },
                ["endpoint"] = new Dictionary<string, object> { ["type"] = "string", ["description"] = "API 端点" },
                ["apiKey"] = new Dictionary<string, object> { ["type"] = "string", ["description"] = "API 密钥" },
                ["systemPrompt"] = new Dictionary<string, object> { ["type"] = "string", ["description"] = "系统提示词" },
                ["temperature"] = new Dictionary<string, object> { ["type"] = "number", ["description"] = "温度参数（0-2）" },
                ["maxTokens"] = new Dictionary<string, object> { ["type"] = "integer", ["description"] = "最大 Token 数" },
                ["isEnabled"] = new Dictionary<string, object> { ["type"] = "boolean", ["description"] = "是否启用" }
            }, ["name", "model"]),
            async (args, uid) =>
            {
                var name = args.GetValueOrDefault("name")?.ToString();
                var model = args.GetValueOrDefault("model")?.ToString();
                if (string.IsNullOrEmpty(name) || string.IsNullOrEmpty(model)) return new { error = "name 和 model 必填" };
                var config = await _xiaokeConfigService.CreateConfigAsync(new CreateXiaokeConfigRequest
                {
                    Name = name,
                    Model = model,
                    SystemPrompt = args.GetValueOrDefault("systemPrompt")?.ToString() ?? "",
                    Temperature = double.TryParse(args.GetValueOrDefault("temperature")?.ToString(), out var temp) ? temp : 0.7,
                    MaxTokens = int.TryParse(args.GetValueOrDefault("maxTokens")?.ToString(), out var tokens) ? tokens : 2000,
                    IsEnabled = args.TryGetValue("isEnabled", out var e) && bool.TryParse(e?.ToString(), out var ie) && ie
                });
                return new { config.Id, config.Name, config.Model, message = "配置创建成功" };
            });

        RegisterTool("update_xiaoke_config", "更新小科 AI 配置。关键词：更新配置,修改配置,编辑配置",
            ObjectSchema(new Dictionary<string, object>
            {
                ["id"] = new Dictionary<string, object> { ["type"] = "string", ["description"] = "配置ID" },
                ["name"] = new Dictionary<string, object> { ["type"] = "string", ["description"] = "配置名称" },
                ["model"] = new Dictionary<string, object> { ["type"] = "string", ["description"] = "AI 模型名称" },
                ["endpoint"] = new Dictionary<string, object> { ["type"] = "string", ["description"] = "API 端点" },
                ["systemPrompt"] = new Dictionary<string, object> { ["type"] = "string", ["description"] = "系统提示词" },
                ["temperature"] = new Dictionary<string, object> { ["type"] = "number", ["description"] = "温度参数" },
                ["maxTokens"] = new Dictionary<string, object> { ["type"] = "integer", ["description"] = "最大 Token 数" },
                ["isEnabled"] = new Dictionary<string, object> { ["type"] = "boolean", ["description"] = "是否启用" }
            }, ["id"]),
            async (args, uid) =>
            {
                var id = args.GetValueOrDefault("id")?.ToString();
                if (string.IsNullOrEmpty(id)) return new { error = "id 必填" };
                var config = await _xiaokeConfigService.UpdateConfigAsync(id, new UpdateXiaokeConfigRequest
                {
                    Name = args.GetValueOrDefault("name")?.ToString(),
                    Model = args.GetValueOrDefault("model")?.ToString(),
                    SystemPrompt = args.GetValueOrDefault("systemPrompt")?.ToString(),
                    Temperature = double.TryParse(args.GetValueOrDefault("temperature")?.ToString(), out var temp) ? temp : null,
                    MaxTokens = int.TryParse(args.GetValueOrDefault("maxTokens")?.ToString(), out var tokens) ? tokens : null,
                    IsEnabled = args.TryGetValue("isEnabled", out var e) && bool.TryParse(e?.ToString(), out var ie) ? ie : null
                });
                if (config == null) return new { error = "配置不存在" };
                return config;
            });

        RegisterTool("delete_xiaoke_config", "删除小科 AI 配置（软删除）。关键词：删除配置,移除配置",
            ObjectSchema(new Dictionary<string, object>
            {
                ["id"] = new Dictionary<string, object> { ["type"] = "string", ["description"] = "配置ID" }
            }, ["id"]),
            async (args, uid) =>
            {
                var id = args.GetValueOrDefault("id")?.ToString();
                if (string.IsNullOrEmpty(id)) return new { error = "id 必填" };
                var result = await _xiaokeConfigService.DeleteConfigAsync(id);
                return result ? new { message = "配置删除成功" } : new { error = "配置删除失败" };
            });

        RegisterTool("set_default_xiaoke_config", "将指定配置设置为默认配置（自动取消其他默认配置）。关键词：设置默认,默认配置,设为默认",
            ObjectSchema(new Dictionary<string, object>
            {
                ["id"] = new Dictionary<string, object> { ["type"] = "string", ["description"] = "配置ID" }
            }, ["id"]),
            async (args, uid) =>
            {
                var id = args.GetValueOrDefault("id")?.ToString();
                if (string.IsNullOrEmpty(id)) return new { error = "id 必填" };
                var result = await _xiaokeConfigService.SetDefaultConfigAsync(id);
                return result ? new { message = "默认配置设置成功" } : new { error = "默认配置设置失败" };
            });

        #endregion

        #region 聊天历史管理

        RegisterTool("get_chat_history", "获取聊天历史列表，支持分页。关键词：聊天历史,历史记录,对话历史",
            ObjectSchema(MergeProperties(
                new Dictionary<string, object>
                {
                    ["keyword"] = new Dictionary<string, object> { ["type"] = "string", ["description"] = "搜索关键词" }
                },
                PaginationSchema()
            )),
            async (args, uid) =>
            {
                var (Current, PageSize) = ParsePaginationArgs(args);
                var request = new Platform.ServiceDefaults.Models.ProTableRequest { Current = Current, PageSize = PageSize, Search = args.GetValueOrDefault("keyword")?.ToString() };
                var result = await _chatHistoryService.GetChatHistoryAsync(request);
                var items = await result.Queryable.ToListAsync();
                return new { items, rowCount = result.RowCount, currentPage = result.CurrentPage, pageSize = result.PageSize, pageCount = result.PageCount };
            });

        RegisterTool("get_chat_history_detail", "获取指定会话的聊天历史详情。关键词：历史详情,会话详情,历史消息",
            ObjectSchema(new Dictionary<string, object>
            {
                ["sessionId"] = new Dictionary<string, object> { ["type"] = "string", ["description"] = "会话ID" }
            }, ["sessionId"]),
            async (args, uid) =>
            {
                var sessionId = args.GetValueOrDefault("sessionId")?.ToString();
                if (string.IsNullOrEmpty(sessionId)) return new { error = "sessionId 必填" };
                var detail = await _chatHistoryService.GetChatHistoryDetailAsync(sessionId);
                if (detail == null) return new { error = "会话不存在" };
                return detail;
            });

        RegisterTool("delete_chat_history", "删除指定聊天历史。关键词：删除历史,清除记录,删除对话",
            ObjectSchema(new Dictionary<string, object>
            {
                ["sessionId"] = new Dictionary<string, object> { ["type"] = "string", ["description"] = "会话ID" }
            }, ["sessionId"]),
            async (args, uid) =>
            {
                var sessionId = args.GetValueOrDefault("sessionId")?.ToString();
                if (string.IsNullOrEmpty(sessionId)) return new { error = "sessionId 必填" };
                var result = await _chatHistoryService.DeleteChatHistoryAsync(sessionId);
                return result ? new { message = "聊天历史已删除" } : new { error = "会话不存在" };
            });

        #endregion
    }
}
