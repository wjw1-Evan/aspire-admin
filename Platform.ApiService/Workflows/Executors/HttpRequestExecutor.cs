using Microsoft.Agents.AI.Workflows;
using Platform.ApiService.Models.Workflow;
using System.Net.Http;
using System.Text;
using System.Text.Json;
using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;

namespace Platform.ApiService.Workflows.Executors;

/// <summary>
/// HTTP 请求执行器 - 支持调用外部 API
/// </summary>
internal sealed partial class HttpRequestExecutor : Executor
{
    private static readonly HttpClient _httpClient = new();
    private readonly HttpConfig _config;

    public HttpRequestExecutor(HttpConfig config) : base("HttpRequestExecutor")
    {
        _config = config;
    }

    protected override ProtocolBuilder ConfigureProtocol(ProtocolBuilder builder)
    {
        return builder;
    }

    [MessageHandler]
    private async ValueTask<string> HandleAsync(string input, IWorkflowContext context, CancellationToken cancellationToken = default)
    {
        // 反序列化变量
        var variables = JsonSerializer.Deserialize<Dictionary<string, object?>>(input) ?? new();

        var resolvedUrl = Utilities.DifyVariableResolver.Resolve(_config.Url ?? string.Empty, variables);
        if (string.IsNullOrEmpty(resolvedUrl))
        {
            return "Error: Resolved HTTP URL is empty";
        }

        try
        {
            var method = new HttpMethod(_config.Method?.ToUpper() ?? "GET");
            var request = new HttpRequestMessage(method, resolvedUrl);

            // 设置 Headers
            if (_config.Headers != null && _config.Headers.Count > 0)
            {
                foreach (var header in _config.Headers)
                {
                    var resolvedValue = Utilities.DifyVariableResolver.Resolve(header.Value, variables);
                    request.Headers.TryAddWithoutValidation(header.Key, resolvedValue);
                }
            }

            // 设置 Body (解析变量)
            if (method != HttpMethod.Get && !string.IsNullOrEmpty(_config.Body))
            {
                var resolvedBody = Utilities.DifyVariableResolver.Resolve(_config.Body, variables);
                request.Content = new StringContent(resolvedBody, Encoding.UTF8, "application/json");
            }

            var response = await _httpClient.SendAsync(request, cancellationToken);
            var content = await response.Content.ReadAsStringAsync(cancellationToken);

            return content;
        }
        catch (Exception ex)
        {
            return $"Error: HTTP request failed - {ex.Message}";
        }
    }
}
