using System;

namespace Platform.ServiceDefaults.Models;

/// <summary>
/// 统一的 API 响应格式载体
/// </summary>
public class ApiResponse(
    bool success,
    string code,
    string? message = null,
    object? data = default,
    string? traceId = null,
    object? errors = null,
    object? details = null)
{
    public bool Success { get; set; } = success;
    public string Code { get; set; } = code;
    public string? Message { get; set; } = message;
    public object? Data { get; set; } = data;
    public object? Errors { get; set; } = errors;
    public object? Details { get; set; } = details;
    public string Timestamp { get; set; } = DateTime.UtcNow.ToString("yyyy-MM-ddTHH:mm:ss.fffZ");
    public string? TraceId { get; set; } = traceId;
}
