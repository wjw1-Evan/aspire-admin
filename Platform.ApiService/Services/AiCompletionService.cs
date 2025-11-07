using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Options;

namespace Platform.ApiService.Services;

/// <summary>
/// 定义与大模型交互的统一接口。
/// </summary>
public interface IAiCompletionService
{
    /// <summary>
    /// 基于用户输入生成回复内容。
    /// </summary>
    /// <param name="userId">用户标识</param>
    /// <param name="sessionId">会话标识</param>
    /// <param name="message">用户消息内容</param>
    /// <param name="cancellationToken">取消标记</param>
    Task<string> GenerateReplyAsync(string userId, string sessionId, string message, CancellationToken cancellationToken = default);
}

/// <summary>
/// AI 完成服务配置项。
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

/// <summary>
/// 基于 HTTP 的 AI 完成服务实现。
/// </summary>
public class AiCompletionService : IAiCompletionService
{
    private readonly HttpClient _httpClient;
    private readonly IOptions<AiCompletionOptions> _options;
    private readonly ILogger<AiCompletionService> _logger;

    /// <summary>
    /// 创建 AI 完成服务实例。
    /// </summary>
    public AiCompletionService(
        HttpClient httpClient,
        IOptions<AiCompletionOptions> options,
        ILogger<AiCompletionService> logger)
    {
        _httpClient = httpClient;
        _options = options;
        _logger = logger;
    }

    /// <inheritdoc />
    public async Task<string> GenerateReplyAsync(string userId, string sessionId, string message, CancellationToken cancellationToken = default)
    {
        var options = _options.Value;
        var provider = options.Provider ?? string.Empty;
        var endpoint = options.Endpoint;

        if (string.IsNullOrWhiteSpace(message))
        {
            return "我没有收到任何内容，可以告诉我您的问题吗？";
        }

        if (string.IsNullOrWhiteSpace(endpoint) && string.Equals(provider, "OpenAI", StringComparison.OrdinalIgnoreCase))
        {
            endpoint = "https://api.openai.com/v1/chat/completions";
        }

        if (string.IsNullOrWhiteSpace(endpoint))
        {
            _logger.LogWarning("AI Completion Endpoint 未配置，返回占位回复。");
            return "AI 服务暂未配置，我会将您的消息记录下来。";
        }

        using var request = new HttpRequestMessage(HttpMethod.Post, endpoint);

        var payload = new
        {
            model = string.IsNullOrWhiteSpace(options.Model) ? "gpt-4o-mini" : options.Model,
            messages = new[]
            {
                new { role = "system", content = options.SystemPrompt ?? "你是小科，请使用简体中文提供简洁、专业且友好的回复。" },
                new { role = "user", content = message }
            },
            max_tokens = options.MaxTokens,
            user = userId,
            session_id = sessionId
        };

        request.Content = new StringContent(JsonSerializer.Serialize(payload), Encoding.UTF8, "application/json");

        if (!string.IsNullOrWhiteSpace(options.ApiKey))
        {
            request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", options.ApiKey);
        }

        if (!string.IsNullOrWhiteSpace(options.Organization)
            && string.Equals(provider, "OpenAI", StringComparison.OrdinalIgnoreCase))
        {
            request.Headers.TryAddWithoutValidation("OpenAI-Organization", options.Organization);
        }

        _httpClient.Timeout = TimeSpan.FromSeconds(Math.Max(options.TimeoutSeconds, 5));

        try
        {
            using var response = await _httpClient.SendAsync(request, cancellationToken);
            var responseText = await response.Content.ReadAsStringAsync(cancellationToken);

            if (!response.IsSuccessStatusCode)
            {
                _logger.LogWarning(
                    "AI Completion 请求失败，状态码 {StatusCode}，响应内容：{Body}",
                    response.StatusCode,
                    responseText);
                return "AI 服务暂时不可用，请稍后再试。";
            }

            return TryParseReply(responseText)
                ?? "AI 服务未返回有效的回复内容。";
        }
        catch (OperationCanceledException ex) when (!cancellationToken.IsCancellationRequested)
        {
            _logger.LogWarning(ex, "AI Completion 请求超时。");
            return "AI 服务响应超时，请稍后再试。";
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "调用 AI Completion 服务失败。");
            return "AI 服务出现异常，请稍后再试。";
        }
    }

    private static string? TryParseReply(string responseText)
    {
        if (string.IsNullOrWhiteSpace(responseText))
        {
            return null;
        }

        using var document = JsonDocument.Parse(responseText);
        var root = document.RootElement;

        if (root.TryGetProperty("choices", out var choices) && choices.ValueKind == JsonValueKind.Array && choices.GetArrayLength() > 0)
        {
            var firstChoice = choices[0];
            if (firstChoice.TryGetProperty("message", out var messageNode) && messageNode.TryGetProperty("content", out var contentNode))
            {
                return contentNode.GetString();
            }

            if (firstChoice.TryGetProperty("text", out var textNode))
            {
                return textNode.GetString();
            }
        }

        if (root.TryGetProperty("reply", out var replyNode))
        {
            return replyNode.GetString();
        }

        return null;
    }
}
