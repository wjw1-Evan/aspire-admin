using System.Collections.Concurrent;
using System.Text;
using System.Text.Json;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Logging;

namespace Platform.ApiService.Services;

/// <summary>
/// 通知 SSE 流连接管理器
/// </summary>
public interface INotificationStreamManager
{
    /// <summary>
    /// 为特定用户注册 SSE 连接
    /// </summary>
    Task RegisterUserConnectionAsync(string userId, string connectionId, HttpResponse response, CancellationToken cancellationToken);

    /// <summary>
    /// 向特定用户推送实时消息
    /// </summary>
    Task SendToUserAsync(string userId, object message);

    /// <summary>
    /// 全局推送
    /// </summary>
    Task BroadcastAsync(object message);

    /// <summary>
    /// 注销连接
    /// </summary>
    Task UnregisterConnectionAsync(string connectionId);
}

public class SingletonNotificationStreamManager : INotificationStreamManager
{
    private readonly ConcurrentDictionary<string, SseConnection> _connections = new();
    private readonly ConcurrentDictionary<string, HashSet<string>> _userConnections = new();
    private readonly ConcurrentDictionary<string, string> _connectionToUserMap = new();
    private readonly ILogger<SingletonNotificationStreamManager> _logger;

    public SingletonNotificationStreamManager(ILogger<SingletonNotificationStreamManager> logger)
    {
        _logger = logger;
    }

    public Task RegisterUserConnectionAsync(string userId, string connectionId, HttpResponse response, CancellationToken cancellationToken)
    {
        var connection = new SseConnection
        {
            Response = response,
            CancellationToken = cancellationToken
        };

        _connections.TryAdd(connectionId, connection);
        _connectionToUserMap.TryAdd(connectionId, userId);

        _userConnections.AddOrUpdate(userId,
            new HashSet<string> { connectionId },
            (key, existing) =>
            {
                lock (existing)
                {
                    existing.Add(connectionId);
                }
                return existing;
            });

        cancellationToken.Register(() =>
        {
            _ = UnregisterConnectionAsync(connectionId);
        });

        _logger.LogInformation("用户 {UserId} 已建立通知 SSE 连接 {ConnectionId}", userId, connectionId);
        return Task.CompletedTask;
    }

    public async Task SendToUserAsync(string userId, object message)
    {
        if (_userConnections.TryGetValue(userId, out var connections))
        {
            List<string> ids;
            lock (connections)
            {
                ids = connections.ToList();
            }

            var json = JsonSerializer.Serialize(message, new JsonSerializerOptions { PropertyNamingPolicy = JsonNamingPolicy.CamelCase });
            var sseData = $"data: {json}\n\n";

            foreach (var id in ids)
            {
                await SendRawAsync(id, sseData);
            }
        }
    }

    public async Task BroadcastAsync(object message)
    {
        var json = JsonSerializer.Serialize(message, new JsonSerializerOptions { PropertyNamingPolicy = JsonNamingPolicy.CamelCase });
        var sseData = $"data: {json}\n\n";

        foreach (var connectionId in _connections.Keys)
        {
            await SendRawAsync(connectionId, sseData);
        }
    }

    public Task UnregisterConnectionAsync(string connectionId)
    {
        if (_connections.TryRemove(connectionId, out var connection))
        {
            if (_connectionToUserMap.TryRemove(connectionId, out var userId))
            {
                if (_userConnections.TryGetValue(userId, out var userConns))
                {
                    lock (userConns)
                    {
                        userConns.Remove(connectionId);
                        if (userConns.Count == 0)
                        {
                            _userConnections.TryRemove(userId, out _);
                        }
                    }
                }
            }
            _logger.LogInformation("通知 SSE 连接 {ConnectionId} 已关闭", connectionId);
        }
        return Task.CompletedTask;
    }

    private async Task SendRawAsync(string connectionId, string rawData)
    {
        if (_connections.TryGetValue(connectionId, out var connection))
        {
            try
            {
                if (!connection.CancellationToken.IsCancellationRequested)
                {
                    var bytes = Encoding.UTF8.GetBytes(rawData);
                    await connection.Response.Body.WriteAsync(bytes, connection.CancellationToken);
                    await connection.Response.Body.FlushAsync(connection.CancellationToken);
                }
            }
            catch (Exception ex)
            {
                _logger.LogWarning("向连接 {ConnectionId} 发送通知失败: {Message}", connectionId, ex.Message);
                await UnregisterConnectionAsync(connectionId);
            }
        }
    }

    private class SseConnection
    {
        public HttpResponse Response { get; set; } = null!;
        public CancellationToken CancellationToken { get; set; }
    }
}
