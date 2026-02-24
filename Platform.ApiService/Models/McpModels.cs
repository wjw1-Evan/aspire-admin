using System.ComponentModel.DataAnnotations;

namespace Platform.ApiService.Models;

/// <summary>
/// MCP 协议版本
/// </summary>
public static class McpProtocolVersion
{
    /// <summary>
    /// 协议版本号
    /// </summary>
    public const string Version = "2024-11-05";
}

/// <summary>
/// MCP 服务器信息
/// </summary>
public class McpServerInfo
{
    /// <summary>
    /// 服务器名称
    /// </summary>
    [Required] public string Name { get; set; } = "Platform MCP Server";

    /// <summary>
    /// 软件版本号
    /// </summary>
    [Required] public string Version { get; set; } = "1.0.0";

    /// <summary>
    /// 支持的协议版本号
    /// </summary>
    [Required] public string ProtocolVersion { get; set; } = McpProtocolVersion.Version;
}

/// <summary>
/// MCP 工具定义
/// </summary>
public class McpTool
{
    /// <summary>
    /// 工具名称（全局唯一）
    /// </summary>
    [Required] public string Name { get; set; } = string.Empty;

    /// <summary>
    /// 工具描述（提示词工程关键）
    /// </summary>
    [Required] public string Description { get; set; } = string.Empty;

    /// <summary>
    /// 输入参数定义的 JSON Schema
    /// </summary>
    public Dictionary<string, object>? InputSchema { get; set; }
}

/// <summary>
/// MCP 工具列表响应
/// </summary>
public class McpListToolsResponse
{
    /// <summary>
    /// 可用工具列表
    /// </summary>
    [Required] public List<McpTool> Tools { get; set; } = new();
}

/// <summary>
/// MCP 工具调用请求
/// </summary>
public class McpCallToolRequest
{
    /// <summary>
    /// 工具名称
    /// </summary>
    [Required] public string Name { get; set; } = string.Empty;

    /// <summary>
    /// 调用参数
    /// </summary>
    public Dictionary<string, object>? Arguments { get; set; }
}

/// <summary>
/// MCP 工具调用响应
/// </summary>
public class McpCallToolResponse
{
    /// <summary>
    /// 结果内容列表
    /// </summary>
    [Required] public List<McpContent> Content { get; set; } = new();

    /// <summary>
    /// 是否执行出错
    /// </summary>
    public bool IsError { get; set; } = false;
}

/// <summary>
/// MCP 内容项
/// </summary>
public class McpContent
{
    /// <summary>
    /// 内容类型（如 text）
    /// </summary>
    [Required] public string Type { get; set; } = "text";

    /// <summary>
    /// 文本消息
    /// </summary>
    public string? Text { get; set; }

    /// <summary>
    /// 二进制或 Base64 数据
    /// </summary>
    public string? Data { get; set; }

    /// <summary>
    /// MIME 类型
    /// </summary>
    public string? MimeType { get; set; }

    /// <summary>
    /// 资源定位符
    /// </summary>
    public string? Uri { get; set; }
}

/// <summary>
/// MCP 初始化请求
/// </summary>
public class McpInitializeRequest
{
    /// <summary>
    /// 客户端协议版本
    /// </summary>
    [Required] public string ProtocolVersion { get; set; } = McpProtocolVersion.Version;

    /// <summary>
    /// 客户端能力定义
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
    /// 服务器端协议版本
    /// </summary>
    [Required] public string ProtocolVersion { get; set; } = McpProtocolVersion.Version;

    /// <summary>
    /// 服务器信息
    /// </summary>
    [Required] public McpServerInfo ServerInfo { get; set; } = new();

    /// <summary>
    /// 服务器能力定义
    /// </summary>
    public Dictionary<string, object>? Capabilities { get; set; }
}

/// <summary>
/// MCP 工具自动检测与执行的结果
/// </summary>
public class McpToolExecutionResult
{
    /// <summary>
    /// 执行结果的上下文（供 LLM 注入）
    /// </summary>
    public string? Context { get; set; }

    /// <summary>
    /// 工具执行简报
    /// </summary>
    public string? ToolSummary { get; set; }

    /// <summary>
    /// 调用的工具描述列表
    /// </summary>
    public List<string> ToolDescriptions { get; set; } = new();
}
