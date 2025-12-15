using System.Linq;
using System.Net.Http.Json;
using System.Text;
using System.Text.Json;
using System.Text.RegularExpressions;
using Microsoft.Extensions.Options;
using Platform.ApiService.Models;
using Platform.ApiService.Options;

namespace Platform.ApiService.Services;

/// <summary>
/// 基于 HTTP 的设备数据拉取客户端（支持 GET/POST/PUT/PATCH/DELETE/PULL）
/// </summary>
public class HttpIoTDataFetchClient : IIoTDataFetchClient
{
    private readonly IHttpClientFactory _httpClientFactory;
    private readonly IOptionsMonitor<IoTDataCollectionOptions> _optionsMonitor;
    private readonly ILogger<HttpIoTDataFetchClient> _logger;
    private static readonly Regex PlaceholderRegex = new(@"\{deviceId\}", RegexOptions.Compiled | RegexOptions.IgnoreCase);

    public HttpIoTDataFetchClient(
        IHttpClientFactory httpClientFactory,
        IOptionsMonitor<IoTDataCollectionOptions> optionsMonitor,
        ILogger<HttpIoTDataFetchClient> logger)
    {
        _httpClientFactory = httpClientFactory;
        _optionsMonitor = optionsMonitor;
        _logger = logger;
    }

    public async Task<IReadOnlyList<CollectedDataPointValue>> FetchAsync(
        IoTGateway? gateway,
        IoTDevice device,
        IReadOnlyList<IoTDataPoint> dataPoints,
        CancellationToken cancellationToken)
    {
        // 优先使用网关配置（如果网关协议是HTTP且有配置）
        HttpFetchOptions? fetchOptions = null;
        if (gateway != null && 
            gateway.ProtocolType?.Equals("HTTP", StringComparison.OrdinalIgnoreCase) == true)
        {
            fetchOptions = BuildFetchOptionsFromGateway(gateway);
            // 如果网关配置的URL为空，返回空结果
            if (string.IsNullOrWhiteSpace(fetchOptions.UrlTemplate))
            {
                _logger.LogWarning("Gateway {GatewayId} has HTTP protocol but no URL configured", gateway.GatewayId);
                return Array.Empty<CollectedDataPointValue>();
            }
        }

        // 如果没有网关配置或网关配置无效，使用全局配置
        if (fetchOptions == null || string.IsNullOrWhiteSpace(fetchOptions.UrlTemplate))
        {
            var globalOptions = _optionsMonitor.CurrentValue.HttpFetch;
            if (!globalOptions.Enabled || string.IsNullOrWhiteSpace(globalOptions.UrlTemplate))
            {
                _logger.LogWarning("Device {DeviceId} has no valid HTTP fetch configuration (gateway config or global config)", device.DeviceId);
                return Array.Empty<CollectedDataPointValue>();
            }
            fetchOptions = globalOptions;
            _logger.LogDebug("Using global HTTP fetch config for device {DeviceId}", device.DeviceId);
        }

        var httpClient = _httpClientFactory.CreateClient(nameof(HttpIoTDataFetchClient));
        httpClient.Timeout = TimeSpan.FromSeconds(Math.Max(1, fetchOptions.RequestTimeoutSeconds));

        var retries = ShouldRetry(fetchOptions.Method) ? fetchOptions.RetryCount : 0;
        var delayMs = Math.Max(0, fetchOptions.RetryDelayMs);

        for (var attempt = 0; attempt <= retries; attempt++)
        {
            try
            {
                var request = BuildRequest(fetchOptions, device);
                using var response = await httpClient.SendAsync(request, cancellationToken).ConfigureAwait(false);
                if (!response.IsSuccessStatusCode)
                {
                    var msg = $"HTTP {response.StatusCode} when fetching device {device.DeviceId}";
                    _logger.LogWarning(msg);
                    return Array.Empty<CollectedDataPointValue>();
                }

                var contentString = await response.Content.ReadAsStringAsync(cancellationToken).ConfigureAwait(false);
                _logger.LogDebug("Raw HTTP response for device {DeviceId}: {Response}", device.DeviceId, 
                    contentString.Length > 500 ? contentString.Substring(0, 500) + "..." : contentString);
                
                Dictionary<string, object> payload;
                try
                {
                    payload = JsonSerializer.Deserialize<Dictionary<string, object>>(contentString)
                              ?? new Dictionary<string, object>();
                }
                catch (JsonException ex)
                {
                    _logger.LogError(ex, "Failed to parse JSON response for device {DeviceId}. Response: {Response}", 
                        device.DeviceId, contentString);
                    return Array.Empty<CollectedDataPointValue>();
                }

                _logger.LogInformation("Fetched data for device {DeviceId}: {KeyCount} keys in response: [{Keys}]", 
                    device.DeviceId, payload.Count, string.Join(", ", payload.Keys));
                
                var mapped = MapToDataPoints(payload, dataPoints);
                _logger.LogInformation("Mapped {MappedCount}/{TotalCount} data points for device {DeviceId}", 
                    mapped.Count, dataPoints.Count, device.DeviceId);
                
                if (mapped.Count == 0 && dataPoints.Count > 0)
                {
                    _logger.LogWarning("No data points mapped for device {DeviceId}. Payload keys: [{Keys}], Expected data points: [{DataPoints}]", 
                        device.DeviceId, 
                        string.Join(", ", payload.Keys),
                        string.Join(", ", dataPoints.Select(dp => $"{dp.DataPointId}({dp.Name})")));
                }
                
                return mapped;
            }
            catch (OperationCanceledException)
            {
                throw;
            }
            catch (Exception ex)
            {
                if (attempt >= retries)
                {
                    _logger.LogError(ex, "HTTP fetch failed for device {DeviceId}", device.DeviceId);
                    return Array.Empty<CollectedDataPointValue>();
                }

                _logger.LogWarning(ex, "HTTP fetch retry {Attempt}/{Total} for device {DeviceId}", attempt + 1, retries, device.DeviceId);
                await Task.Delay(delayMs, cancellationToken).ConfigureAwait(false);
            }
        }

        return Array.Empty<CollectedDataPointValue>();
    }

    private HttpFetchOptions BuildFetchOptionsFromGateway(IoTGateway gateway)
    {
        var options = new HttpFetchOptions
        {
            Enabled = true,
            RequestTimeoutSeconds = 30,
            RetryCount = 1,
            RetryDelayMs = 500
        };

        // 优先从 Config 读取 urlTemplate
        if (gateway.Config != null && gateway.Config.TryGetValue("urlTemplate", out var urlTemplate) && !string.IsNullOrWhiteSpace(urlTemplate))
        {
            options.UrlTemplate = urlTemplate;
        }
        // 如果 Config 中没有，使用 Address
        else if (!string.IsNullOrWhiteSpace(gateway.Address))
        {
            options.UrlTemplate = gateway.Address;
        }
        else
        {
            _logger.LogWarning("Gateway {GatewayId} has no URL configured (neither Config.urlTemplate nor Address)", gateway.GatewayId);
            return options; // 返回空 URL 的 options
        }

        // 从网关配置读取HTTP方法
        if (gateway.Config != null && gateway.Config.TryGetValue("httpMethod", out var httpMethod) && !string.IsNullOrWhiteSpace(httpMethod))
        {
            if (Enum.TryParse<HttpFetchMethod>(httpMethod, true, out var method))
            {
                options.Method = method;
            }
            else
            {
                _logger.LogWarning("Gateway {GatewayId} has invalid httpMethod: {HttpMethod}", gateway.GatewayId, httpMethod);
            }
        }

        // 读取其他可选配置
        if (gateway.Config != null)
        {
            if (gateway.Config.TryGetValue("requestTimeoutSeconds", out var timeout) && 
                int.TryParse(timeout, out var timeoutSeconds))
            {
                options.RequestTimeoutSeconds = timeoutSeconds;
            }

            if (gateway.Config.TryGetValue("retryCount", out var retry) && 
                int.TryParse(retry, out var retryCount))
            {
                options.RetryCount = retryCount;
            }
        }

        _logger.LogDebug("Built fetch options for gateway {GatewayId}: Method={Method}, Url={Url}", 
            gateway.GatewayId, options.Method, options.UrlTemplate);
        return options;
    }

    private static HttpRequestMessage BuildRequest(HttpFetchOptions options, IoTDevice device)
    {
        var url = PlaceholderRegex.Replace(options.UrlTemplate, device.DeviceId);
        var uriBuilder = new UriBuilder(url);

        // Query
        if (options.Query?.Count > 0)
        {
            var query = System.Web.HttpUtility.ParseQueryString(uriBuilder.Query);
            foreach (var kv in options.Query)
            {
                query[kv.Key] = PlaceholderRegex.Replace(kv.Value, device.DeviceId);
            }
            uriBuilder.Query = query.ToString();
        }

        var method = ToHttpMethod(options.Method);
        var request = new HttpRequestMessage(method, uriBuilder.Uri);

        // Headers
        if (options.Headers?.Count > 0)
        {
            foreach (var kv in options.Headers)
            {
                request.Headers.TryAddWithoutValidation(kv.Key, PlaceholderRegex.Replace(kv.Value, device.DeviceId));
            }
        }

        // Body (skip for GET)
        if (method != HttpMethod.Get && !string.IsNullOrWhiteSpace(options.BodyTemplate))
        {
            var bodyText = PlaceholderRegex.Replace(options.BodyTemplate, device.DeviceId);
            request.Content = new StringContent(bodyText, Encoding.UTF8, "application/json");
        }

        return request;
    }

    private static HttpMethod ToHttpMethod(HttpFetchMethod method) => method switch
    {
        HttpFetchMethod.Post => HttpMethod.Post,
        HttpFetchMethod.Put => HttpMethod.Put,
        HttpFetchMethod.Patch => HttpMethod.Patch,
        HttpFetchMethod.Delete => HttpMethod.Delete,
        HttpFetchMethod.Pull => new HttpMethod("PULL"),
        _ => HttpMethod.Get
    };

    private static bool ShouldRetry(HttpFetchMethod method) =>
        method is HttpFetchMethod.Get or HttpFetchMethod.Put or HttpFetchMethod.Delete or HttpFetchMethod.Pull;

    private IReadOnlyList<CollectedDataPointValue> MapToDataPoints(
        Dictionary<string, object> payload,
        IReadOnlyList<IoTDataPoint> dataPoints)
    {
        var results = new List<CollectedDataPointValue>();
        var payloadKeys = string.Join(", ", payload.Keys);
        _logger.LogDebug("Mapping data points. Payload keys: [{Keys}], DataPoints: [{DataPointIds}]", 
            payloadKeys, string.Join(", ", dataPoints.Select(dp => $"{dp.DataPointId}({dp.Name})")));
        
        foreach (var dp in dataPoints)
        {
            if (payload.TryGetValue(dp.DataPointId, out var valueObj))
            {
                results.Add(new CollectedDataPointValue
                {
                    DataPointId = dp.DataPointId,
                    Value = valueObj?.ToString() ?? string.Empty,
                    ReportedAt = DateTime.UtcNow
                });
                _logger.LogDebug("Mapped data point {DataPointId} by DataPointId, value: {Value}", 
                    dp.DataPointId, valueObj?.ToString());
                continue;
            }

            if (payload.TryGetValue(dp.Name, out var valueObj2))
            {
                results.Add(new CollectedDataPointValue
                {
                    DataPointId = dp.DataPointId,
                    Value = valueObj2?.ToString() ?? string.Empty,
                    ReportedAt = DateTime.UtcNow
                });
                _logger.LogDebug("Mapped data point {DataPointId} by Name ({Name}), value: {Value}", 
                    dp.DataPointId, dp.Name, valueObj2?.ToString());
            }
            else
            {
                _logger.LogDebug("Data point {DataPointId} ({Name}) not found in payload", 
                    dp.DataPointId, dp.Name);
            }
        }

        return results;
    }
}
