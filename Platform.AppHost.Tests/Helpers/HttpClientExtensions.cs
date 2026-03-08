using System.Text;
using System.Text.Json;

namespace Platform.AppHost.Tests.Helpers;

/// <summary>
/// Extension methods for HttpClient to simplify JSON serialization and deserialization.
/// </summary>
public static class HttpClientExtensions
{
    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase
    };

    /// <summary>
    /// Sends a POST request with JSON content to the specified URI.
    /// </summary>
    /// <typeparam name="T">The type of the content to serialize.</typeparam>
    /// <param name="client">The HttpClient instance.</param>
    /// <param name="requestUri">The URI to send the request to.</param>
    /// <param name="content">The content to serialize as JSON.</param>
    /// <returns>The HTTP response message.</returns>
    public static async Task<HttpResponseMessage> PostAsJsonAsync<T>(
        this HttpClient client,
        string requestUri,
        T content)
    {
        var json = JsonSerializer.Serialize(content, JsonOptions);
        var httpContent = new StringContent(json, Encoding.UTF8, "application/json");
        return await client.PostAsync(requestUri, httpContent);
    }

    /// <summary>
    /// Reads the HTTP content as JSON and deserializes it to the specified type.
    /// </summary>
    /// <typeparam name="T">The type to deserialize to.</typeparam>
    /// <param name="content">The HTTP content to read.</param>
    /// <returns>The deserialized object, or null if deserialization fails.</returns>
    public static async Task<T?> ReadAsJsonAsync<T>(this HttpContent content)
    {
        var json = await content.ReadAsStringAsync();
        return JsonSerializer.Deserialize<T>(json, JsonOptions);
    }
}
