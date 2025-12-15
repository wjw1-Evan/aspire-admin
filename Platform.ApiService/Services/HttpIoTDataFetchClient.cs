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
        var options = _optionsMonitor.CurrentValue.HttpFetch;
        if (!options.Enabled || string.IsNullOrWhiteSpace(options.UrlTemplate))
        {
            return Array.Empty<CollectedDataPointValue>();
        }

        var httpClient = _httpClientFactory.CreateClient(nameof(HttpIoTDataFetchClient));
        httpClient.Timeout = TimeSpan.FromSeconds(Math.Max(1, options.RequestTimeoutSeconds));

        var retries = ShouldRetry(options.Method) ? options.RetryCount : 0;
        var delayMs = Math.Max(0, options.RetryDelayMs);

        for (var attempt = 0; attempt <= retries; attempt++)
        {
            try
            {
                var request = BuildRequest(options, device);
                using var response = await httpClient.SendAsync(request, cancellationToken).ConfigureAwait(false);
                if (!response.IsSuccessStatusCode)
                {
                    var msg = $"HTTP {response.StatusCode} when fetching device {device.DeviceId}";
                    _logger.LogWarning(msg);
                    return Array.Empty<CollectedDataPointValue>();
                }

                var stream = await response.Content.ReadAsStreamAsync(cancellationToken).ConfigureAwait(false);
                var payload = await JsonSerializer.DeserializeAsync<Dictionary<string, object>>(stream, cancellationToken: cancellationToken)
                              ?? new Dictionary<string, object>();

                return MapToDataPoints(payload, dataPoints);
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

    private static IReadOnlyList<CollectedDataPointValue> MapToDataPoints(
        Dictionary<string, object> payload,
        IReadOnlyList<IoTDataPoint> dataPoints)
    {
        var results = new List<CollectedDataPointValue>();
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
            }
        }

        return results;
    }
}
