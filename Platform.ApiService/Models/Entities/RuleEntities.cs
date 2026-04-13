using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;
using Platform.ServiceDefaults.Models;

namespace Platform.ApiService.Models;

/// <summary>
/// 规则列表项实体
/// </summary>
public class RuleListItem : MultiTenantEntity
{
    /// <summary>
    /// 规则键（唯一标识）
    /// </summary>
    public int Key { get; set; }

    /// <summary>
    /// 是否禁用
    /// </summary>
    public bool Disabled { get; set; }

    /// <summary>
    /// 链接地址
    /// </summary>
    public string? Href { get; set; }

    /// <summary>
    /// 头像URL
    /// </summary>
    public string? Avatar { get; set; }

    /// <summary>
    /// 规则名称
    /// </summary>
    public string? Name { get; set; }

    /// <summary>
    /// 所有者
    /// </summary>
    public string? Owner { get; set; }

    /// <summary>
    /// 描述
    /// </summary>
    public string? Desc { get; set; }

    /// <summary>
    /// 调用次数
    /// </summary>
    public int CallNo { get; set; }

    /// <summary>
    /// 状态
    /// </summary>
    public int Status { get; set; }

    /// <summary>
    /// 进度
    /// </summary>
    public int Progress { get; set; }

    /// <summary>
    /// MCP 相关配置
    /// </summary>
    public McpRuleConfig? McpConfig { get; set; }
}

/// <summary>
/// MCP 规则配置
/// </summary>
public class McpRuleConfig
{
    /// <summary>
    /// 是否启用 MCP 集成
    /// </summary>
    public bool Enabled { get; set; } = false;

    /// <summary>
    /// MCP 工具名称
    /// </summary>
    public string? ToolName { get; set; }

    /// <summary>
    /// MCP 工具描述
    /// </summary>
    public string? ToolDescription { get; set; }

    /// <summary>
    /// MCP 工具参数模式（JSON Schema）
    /// </summary>
    public Dictionary<string, object>? InputSchema { get; set; }

    /// <summary>
    /// 是否为 MCP 资源
    /// </summary>
    public bool IsResource { get; set; } = false;

    /// <summary>
    /// MCP 资源 URI
    /// </summary>
    public string? ResourceUri { get; set; }

    /// <summary>
    /// MCP 资源 MIME 类型
    /// </summary>
    public string? ResourceMimeType { get; set; }

    /// <summary>
    /// 是否为 MCP 提示词
    /// </summary>
    public bool IsPrompt { get; set; } = false;

    /// <summary>
    /// MCP 提示词参数定义
    /// </summary>
    public Dictionary<string, object>? PromptArguments { get; set; }

    /// <summary>
    /// MCP 提示词内容模板
    /// </summary>
    public string? PromptTemplate { get; set; }

    /// <summary>
    /// 创建时间
    /// </summary>
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    /// <summary>
    /// 更新时间
    /// </summary>
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}


