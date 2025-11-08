using Microsoft.Extensions.Configuration;

namespace Platform.ApiService.Services;

/// <summary>
/// AI 服务配置项。
/// </summary>
public class AiCompletionOptions
{
    /// <summary>
    /// 配置节名称。
    /// </summary>
    public const string SectionName = "Ai";

    /// <summary>
    /// 大模型服务提供商（如 OpenAI）。
    /// </summary>
    public string? Provider { get; set; }
        = default;

    /// <summary>
    /// 大模型服务端点（必填）。
    /// </summary>
    [ConfigurationKeyName("ChatEndpoint")]
    public string? Endpoint { get; set; }
        = default;

    /// <summary>
    /// 访问令牌或 API Key。
    /// </summary>
    public string? ApiKey { get; set; }
        = default;

    /// <summary>
    /// 指定模型名称。
    /// </summary>
    public string? Model { get; set; }
        = default;

    /// <summary>
    /// 组织标识（部分提供商可选）。
    /// </summary>
    public string? Organization { get; set; }
        = default;

    /// <summary>
    /// 系统提示词。
    /// </summary>
    public string? SystemPrompt { get; set; }
        = "你是小科，请使用简体中文提供简洁、专业且友好的回复。";

    /// <summary>
    /// 请求超时时间（秒）。
    /// </summary>
    public int TimeoutSeconds { get; set; } = 30;

    /// <summary>
    /// 最大生成 Token 数。
    /// </summary>
    public int MaxTokens { get; set; } = 512;
}
