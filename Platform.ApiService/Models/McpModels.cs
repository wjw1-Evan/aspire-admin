using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;

namespace Platform.ApiService.Models;

/// <summary>
/// MCP 协议版本
/// </summary>
public static class McpProtocolVersion
{
    /// <summary>
    /// 当前支持的协议版本
    /// </summary>
    public const string Version = "2024-11-05";
}

/// <summary>
/// MCP 请求基类
/// </summary>
public class McpRequest
{
    /// <summary>
    /// JSON-RPC 版本
    /// </summary>
    [Required]
    public string JsonRpc { get; set; } = "2.0";

    /// <summary>
    /// 请求 ID（可选）
    /// </summary>
    public string? Id { get; set; }

    /// <summary>
    /// 方法名称
    /// </summary>
    [Required]
    public string Method { get; set; } = string.Empty;

    /// <summary>
    /// 请求参数
    /// </summary>
    public Dictionary<string, object>? Params { get; set; }
}

/// <summary>
/// MCP 响应基类
/// </summary>
public class McpResponse
{
    /// <summary>
    /// JSON-RPC 版本
    /// </summary>
    [Required]
    public string JsonRpc { get; set; } = "2.0";

    /// <summary>
    /// 请求 ID（与请求对应）
    /// </summary>
    public string? Id { get; set; }

    /// <summary>
    /// 结果（成功时）
    /// </summary>
    public object? Result { get; set; }

    /// <summary>
    /// 错误（失败时）
    /// </summary>
    public McpError? Error { get; set; }
}

/// <summary>
/// MCP 错误信息
/// </summary>
public class McpError
{
    /// <summary>
    /// 错误代码
    /// </summary>
    [Required]
    public int Code { get; set; }

    /// <summary>
    /// 错误消息
    /// </summary>
    [Required]
    public string Message { get; set; } = string.Empty;

    /// <summary>
    /// 错误数据（可选）
    /// </summary>
    public object? Data { get; set; }
}

/// <summary>
/// MCP 服务器信息
/// </summary>
public class McpServerInfo
{
    /// <summary>
    /// 服务器名称
    /// </summary>
    [Required]
    public string Name { get; set; } = "Platform MCP Server";

    /// <summary>
    /// 服务器版本
    /// </summary>
    [Required]
    public string Version { get; set; } = "1.0.0";

    /// <summary>
    /// 协议版本
    /// </summary>
    [Required]
    public string ProtocolVersion { get; set; } = McpProtocolVersion.Version;
}

/// <summary>
/// MCP 工具定义
/// </summary>
public class McpTool
{
    /// <summary>
    /// 工具名称
    /// </summary>
    [Required]
    public string Name { get; set; } = string.Empty;

    /// <summary>
    /// 工具描述
    /// </summary>
    [Required]
    public string Description { get; set; } = string.Empty;

    /// <summary>
    /// 输入参数模式（JSON Schema）
    /// </summary>
    public Dictionary<string, object>? InputSchema { get; set; }
}

/// <summary>
/// MCP 工具列表响应
/// </summary>
public class McpListToolsResponse
{
    /// <summary>
    /// 工具列表
    /// </summary>
    [Required]
    public List<McpTool> Tools { get; set; } = new();
}

/// <summary>
/// MCP 工具调用请求
/// </summary>
public class McpCallToolRequest
{
    /// <summary>
    /// 工具名称
    /// </summary>
    [Required]
    public string Name { get; set; } = string.Empty;

    /// <summary>
    /// 工具参数
    /// </summary>
    public Dictionary<string, object>? Arguments { get; set; }
}

/// <summary>
/// MCP 工具调用响应
/// </summary>
public class McpCallToolResponse
{
    /// <summary>
    /// 工具调用结果内容
    /// </summary>
    [Required]
    public List<McpContent> Content { get; set; } = new();

    /// <summary>
    /// 是否发生错误
    /// </summary>
    public bool IsError { get; set; } = false;
}

/// <summary>
/// MCP 内容项
/// </summary>
public class McpContent
{
    /// <summary>
    /// 内容类型（text/image/resource）
    /// </summary>
    [Required]
    public string Type { get; set; } = "text";

    /// <summary>
    /// 文本内容（type 为 text 时）
    /// </summary>
    public string? Text { get; set; }

    /// <summary>
    /// 数据 URI（type 为 image 时）
    /// </summary>
    public string? Data { get; set; }

    /// <summary>
    /// MIME 类型
    /// </summary>
    public string? MimeType { get; set; }

    /// <summary>
    /// 资源 URI（type 为 resource 时）
    /// </summary>
    public string? Uri { get; set; }
}

/// <summary>
/// MCP 资源定义
/// </summary>
public class McpResource
{
    /// <summary>
    /// 资源 URI
    /// </summary>
    [Required]
    public string Uri { get; set; } = string.Empty;

    /// <summary>
    /// 资源名称
    /// </summary>
    [Required]
    public string Name { get; set; } = string.Empty;

    /// <summary>
    /// 资源描述
    /// </summary>
    public string? Description { get; set; }

    /// <summary>
    /// MIME 类型
    /// </summary>
    public string? MimeType { get; set; }
}

/// <summary>
/// MCP 资源列表响应
/// </summary>
public class McpListResourcesResponse
{
    /// <summary>
    /// 资源列表
    /// </summary>
    [Required]
    public List<McpResource> Resources { get; set; } = new();
}

/// <summary>
/// MCP 读取资源请求
/// </summary>
public class McpReadResourceRequest
{
    /// <summary>
    /// 资源 URI
    /// </summary>
    [Required]
    public string Uri { get; set; } = string.Empty;
}

/// <summary>
/// MCP 读取资源响应
/// </summary>
public class McpReadResourceResponse
{
    /// <summary>
    /// 资源内容
    /// </summary>
    [Required]
    public List<McpContent> Contents { get; set; } = new();
}

/// <summary>
/// MCP 提示词定义
/// </summary>
public class McpPrompt
{
    /// <summary>
    /// 提示词名称
    /// </summary>
    [Required]
    public string Name { get; set; } = string.Empty;

    /// <summary>
    /// 提示词描述
    /// </summary>
    public string? Description { get; set; }

    /// <summary>
    /// 提示词参数（JSON Schema）
    /// </summary>
    public Dictionary<string, object>? Arguments { get; set; }
}

/// <summary>
/// MCP 提示词列表响应
/// </summary>
public class McpListPromptsResponse
{
    /// <summary>
    /// 提示词列表
    /// </summary>
    [Required]
    public List<McpPrompt> Prompts { get; set; } = new();
}

/// <summary>
/// MCP 获取提示词请求
/// </summary>
public class McpGetPromptRequest
{
    /// <summary>
    /// 提示词名称
    /// </summary>
    [Required]
    public string Name { get; set; } = string.Empty;

    /// <summary>
    /// 提示词参数
    /// </summary>
    public Dictionary<string, object>? Arguments { get; set; }
}

/// <summary>
/// MCP 获取提示词响应
/// </summary>
public class McpGetPromptResponse
{
    /// <summary>
    /// 提示词内容
    /// </summary>
    [Required]
    public List<McpContent> Messages { get; set; } = new();
}

/// <summary>
/// MCP 初始化请求
/// </summary>
public class McpInitializeRequest
{
    /// <summary>
    /// 协议版本
    /// </summary>
    [Required]
    public string ProtocolVersion { get; set; } = McpProtocolVersion.Version;

    /// <summary>
    /// 客户端信息
    /// </summary>
    public Dictionary<string, object>? Capabilities { get; set; }

    /// <summary>
    /// 客户端信息
    /// </summary>
    public Dictionary<string, object>? ClientInfo { get; set; }
}

/// <summary>
/// MCP 初始化响应
/// </summary>
public class McpInitializeResponse
{
    /// <summary>
    /// 协议版本
    /// </summary>
    [Required]
    public string ProtocolVersion { get; set; } = McpProtocolVersion.Version;

    /// <summary>
    /// 服务器信息
    /// </summary>
    [Required]
    public McpServerInfo ServerInfo { get; set; } = new();

    /// <summary>
    /// 服务器能力
    /// </summary>
    public Dictionary<string, object>? Capabilities { get; set; }
}


/// <summary>
/// MCP 工具自动检测与执行的结果
/// </summary>
public class McpToolExecutionResult
{
    /// <summary>
    /// 合并后的工具执行结果上下文
    /// </summary>
    public string? Context { get; set; }

    /// <summary>
    /// 被调用的工具名称/描述摘要
    /// </summary>
    public string? ToolSummary { get; set; }

    /// <summary>
    /// 被调用的工具完整描述列表
    /// </summary>
    public List<string> ToolDescriptions { get; set; } = new();
}
