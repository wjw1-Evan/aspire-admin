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

/// <summary>
/// 创建规则请求
/// </summary>
public class CreateRuleRequest
{
    /// <summary>
    /// 规则名称
    /// </summary>
    public string? Name { get; set; }

    /// <summary>
    /// 描述
    /// </summary>
    public string? Desc { get; set; }

    /// <summary>
    /// 所有者
    /// </summary>
    public string? Owner { get; set; }

    /// <summary>
    /// 链接地址
    /// </summary>
    public string? Href { get; set; }

    /// <summary>
    /// 头像URL
    /// </summary>
    public string? Avatar { get; set; }

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
    /// 是否禁用
    /// </summary>
    public bool Disabled { get; set; }

    /// <summary>
    /// MCP 配置
    /// </summary>
    public CreateMcpRuleConfigRequest? McpConfig { get; set; }
}

/// <summary>
/// 更新规则请求
/// </summary>
public class UpdateRuleRequest
{
    /// <summary>
    /// 规则键
    /// </summary>
    public int? Key { get; set; }

    /// <summary>
    /// 规则名称
    /// </summary>
    public string? Name { get; set; }

    /// <summary>
    /// 描述
    /// </summary>
    public string? Desc { get; set; }

    /// <summary>
    /// 所有者
    /// </summary>
    public string? Owner { get; set; }

    /// <summary>
    /// 链接地址
    /// </summary>
    public string? Href { get; set; }

    /// <summary>
    /// 头像URL
    /// </summary>
    public string? Avatar { get; set; }

    /// <summary>
    /// 调用次数
    /// </summary>
    public int? CallNo { get; set; }

    /// <summary>
    /// 状态
    /// </summary>
    public int? Status { get; set; }

    /// <summary>
    /// 进度
    /// </summary>
    public int? Progress { get; set; }

    /// <summary>
    /// 是否禁用
    /// </summary>
    public bool? Disabled { get; set; }

    /// <summary>
    /// MCP 配置
    /// </summary>
    public UpdateMcpRuleConfigRequest? McpConfig { get; set; }
}



/// <summary>
/// 规则操作请求
/// </summary>
public class RuleOperationRequest
{
    /// <summary>
    /// 操作方法
    /// </summary>
    public string Method { get; set; } = string.Empty;

    /// <summary>
    /// 规则名称
    /// </summary>
    public string? Name { get; set; }

    /// <summary>
    /// 描述
    /// </summary>
    public string? Desc { get; set; }

    /// <summary>
    /// 规则键
    /// </summary>
    public int? Key { get; set; }
}

/// <summary>
/// 删除规则请求
/// </summary>
public class DeleteRuleRequest
{
    /// <summary>
    /// 规则键
    /// </summary>
    public int? Key { get; set; }
}

/// <summary>
/// 创建 MCP 规则配置请求
/// </summary>
public class CreateMcpRuleConfigRequest
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
}

/// <summary>
/// 更新 MCP 规则配置请求
/// </summary>
public class UpdateMcpRuleConfigRequest
{
    /// <summary>
    /// 是否启用 MCP 集成
    /// </summary>
    public bool? Enabled { get; set; }

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
    public bool? IsResource { get; set; }

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
    public bool? IsPrompt { get; set; }

    /// <summary>
    /// MCP 提示词参数定义
    /// </summary>
    public Dictionary<string, object>? PromptArguments { get; set; }

    /// <summary>
    /// MCP 提示词内容模板
    /// </summary>
    public string? PromptTemplate { get; set; }
}

/// <summary>
/// 规则 MCP 工具响应
/// </summary>
public class RuleMcpToolResponse
{
    /// <summary>
    /// 工具名称
    /// </summary>
    public string Name { get; set; } = string.Empty;

    /// <summary>
    /// 工具描述
    /// </summary>
    public string Description { get; set; } = string.Empty;

    /// <summary>
    /// 工具参数模式
    /// </summary>
    public Dictionary<string, object>? InputSchema { get; set; }

    /// <summary>
    /// 关联的规则 ID
    /// </summary>
    public string RuleId { get; set; } = string.Empty;

    /// <summary>
    /// 关联的规则名称
    /// </summary>
    public string RuleName { get; set; } = string.Empty;
}

/// <summary>
/// 规则 MCP 资源响应
/// </summary>
public class RuleMcpResourceResponse
{
    /// <summary>
    /// 资源 URI
    /// </summary>
    public string Uri { get; set; } = string.Empty;

    /// <summary>
    /// 资源名称
    /// </summary>
    public string Name { get; set; } = string.Empty;

    /// <summary>
    /// 资源描述
    /// </summary>
    public string? Description { get; set; }

    /// <summary>
    /// MIME 类型
    /// </summary>
    public string? MimeType { get; set; }

    /// <summary>
    /// 关联的规则 ID
    /// </summary>
    public string RuleId { get; set; } = string.Empty;
}

/// <summary>
/// 规则 MCP 提示词响应
/// </summary>
public class RuleMcpPromptResponse
{
    /// <summary>
    /// 提示词名称
    /// </summary>
    public string Name { get; set; } = string.Empty;

    /// <summary>
    /// 提示词描述
    /// </summary>
    public string? Description { get; set; }

    /// <summary>
    /// 提示词参数定义
    /// </summary>
    public Dictionary<string, object>? Arguments { get; set; }

    /// <summary>
    /// 提示词内容模板
    /// </summary>
    public string? Template { get; set; }

    /// <summary>
    /// 关联的规则 ID
    /// </summary>
    public string RuleId { get; set; } = string.Empty;
}
