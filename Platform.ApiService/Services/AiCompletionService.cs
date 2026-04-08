using Microsoft.Extensions.Configuration;

namespace Platform.ApiService.Services;

/// <summary>
/// AI 服务配置项。
/// </summary>
public class AiCompletionOptions
{
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
        = "gpt-4o-mini";

    /// <summary>
    /// 系统提示词。
    /// </summary>
    public string? SystemPrompt { get; set; }
        = "你是小科，请使用简体中文提供简洁、专业且友好的回复。";
}
