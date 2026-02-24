using System.ComponentModel.DataAnnotations;

namespace Platform.ApiService.Models;

/// <summary>
/// MCP 协议版本
/// </summary>
public static class McpProtocolVersion
{
    public const string Version = "2024-11-05";
}

/// <summary>
/// MCP 服务器信息
/// </summary>
public class McpServerInfo
{
    [Required] public string Name { get; set; } = "Platform MCP Server";
    [Required] public string Version { get; set; } = "1.0.0";
    [Required] public string ProtocolVersion { get; set; } = McpProtocolVersion.Version;
}

/// <summary>
/// MCP 工具定义
/// </summary>
public class McpTool
{
    [Required] public string Name { get; set; } = string.Empty;
    [Required] public string Description { get; set; } = string.Empty;
    public Dictionary<string, object>? InputSchema { get; set; }
}

/// <summary>
/// MCP 工具列表响应
/// </summary>
public class McpListToolsResponse
{
    [Required] public List<McpTool> Tools { get; set; } = new();
}

/// <summary>
/// MCP 工具调用请求
/// </summary>
public class McpCallToolRequest
{
    [Required] public string Name { get; set; } = string.Empty;
    public Dictionary<string, object>? Arguments { get; set; }
}

/// <summary>
/// MCP 工具调用响应
/// </summary>
public class McpCallToolResponse
{
    [Required] public List<McpContent> Content { get; set; } = new();
    public bool IsError { get; set; } = false;
}

/// <summary>
/// MCP 内容项
/// </summary>
public class McpContent
{
    [Required] public string Type { get; set; } = "text";
    public string? Text { get; set; }
    public string? Data { get; set; }
    public string? MimeType { get; set; }
    public string? Uri { get; set; }
}

/// <summary>
/// MCP 初始化请求
/// </summary>
public class McpInitializeRequest
{
    [Required] public string ProtocolVersion { get; set; } = McpProtocolVersion.Version;
    public Dictionary<string, object>? Capabilities { get; set; }
    public Dictionary<string, object>? ClientInfo { get; set; }
}

/// <summary>
/// MCP 初始化响应
/// </summary>
public class McpInitializeResponse
{
    [Required] public string ProtocolVersion { get; set; } = McpProtocolVersion.Version;
    [Required] public McpServerInfo ServerInfo { get; set; } = new();
    public Dictionary<string, object>? Capabilities { get; set; }
}

/// <summary>
/// MCP 工具自动检测与执行的结果
/// </summary>
public class McpToolExecutionResult
{
    public string? Context { get; set; }
    public string? ToolSummary { get; set; }
    public List<string> ToolDescriptions { get; set; } = new();
}
