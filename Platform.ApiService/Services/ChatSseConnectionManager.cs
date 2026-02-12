using System.Collections.Concurrent;
using System.Text;
using System.Text.Json;

namespace Platform.ApiService.Services;

/// <summary>
/// SSE 连接管理器实现（单机版）
/// 管理所有活跃的 SSE 连接，支持按用户ID发送消息
/// </summary>
public class ChatSseConnectionManager : IChatSseConnectionManager, IDisposable
{
    // 连接ID -> 连接信息
    private readonly ConcurrentDictionary<string, SseConnection> _connections = new();
    // 用户ID -> 连接ID集合
    private readonly ConcurrentDictionary<string, HashSet<string>> _userConnections = new();
    // 连接ID -> 用户ID (反向索引，用于 O(1) 注销)
    private readonly ConcurrentDictionary<string, string> _connectionToUserMap = new();

    private readonly ILogger<ChatSseConnectionManager> _logger;

    /// <summary>
    /// 初始化 SSE 连接管理器
    /// </summary>
    public ChatSseConnectionManager(ILogger<ChatSseConnectionManager> logger)
    {
        _logger = logger ?? throw new ArgumentNullException(nameof(logger));
    }

    /// <summary>
    /// 注册 SSE 连接
    /// </summary>
    public Task RegisterConnectionAsync(string connectionId, HttpResponse response, CancellationToken cancellationToken)
    {
        var connection = new SseConnection
        {
            Response = response,
            CancellationToken = cancellationToken
        };

        _connections.TryAdd(connectionId, connection);

        cancellationToken.Register(() =>
        {
            _ = UnregisterConnectionAsync(connectionId);
        });

        _logger.LogDebug("注册 SSE 连接: {ConnectionId}", connectionId);
        return Task.CompletedTask;
    }

    /// <summary>
    /// 注册用户连接
    /// </summary>
    public Task RegisterUserConnectionAsync(string userId, string connectionId, HttpResponse response, CancellationToken cancellationToken)
    {
        _ = RegisterConnectionAsync(connectionId, response, cancellationToken);

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

        _logger.LogDebug("注册用户连接: 用户 {UserId} 连接 {ConnectionId}", userId, connectionId);
        return Task.CompletedTask;
    }

    /// <summary>
    /// 向用户发送消息（单机直接发送）
    /// </summary>
    public async Task SendToUserAsync(string userId, string message)
    {
        // 检查本地是否有该用户的连接
        if (_userConnections.TryGetValue(userId, out var connections))
        {
            List<string>? connectionIds;
            lock (connections)
            {
                connectionIds = [.. connections];
            }

            if (connectionIds.Count != 0)
            {
                var tasks = connectionIds.Select(async connectionId =>
                {
                    try
                    {
                        await SendMessageToLocalConnectionAsync(connectionId, message);
                    }
                    catch (Exception ex)
                    {
                        _logger.LogWarning(ex, "向用户 {UserId} 的连接 {ConnectionId} 发送消息失败", userId, connectionId);
                    }
                });

                await Task.WhenAll(tasks);
            }
        }
    }

    /// <summary>
    /// 注销 SSE 连接
    /// </summary>
    public Task UnregisterConnectionAsync(string connectionId)
    {
        if (_connections.TryRemove(connectionId, out var connection))
        {
            _logger.LogDebug("注销 SSE 连接: {ConnectionId}", connectionId);

            if (_connectionToUserMap.TryRemove(connectionId, out var userId))
            {
                if (_userConnections.TryGetValue(userId, out var connections))
                {
                    bool isEmpty = false;
                    lock (connections)
                    {
                        connections.Remove(connectionId);
                        isEmpty = connections.Count == 0;
                    }

                    if (isEmpty)
                    {
                        _userConnections.TryRemove(userId, out _);
                    }
                }
            }
        }
        return Task.CompletedTask;
    }

    /// <summary>
    /// 向指定连接发送消息
    /// </summary>
    public async Task SendMessageAsync(string connectionId, string message)
    {
        await SendMessageToLocalConnectionAsync(connectionId, message);
    }

    private async Task SendMessageToLocalConnectionAsync(string connectionId, string message)
    {
        if (!_connections.TryGetValue(connectionId, out var connection))
        {
            return;
        }

        try
        {
            if (connection.CancellationToken.IsCancellationRequested)
            {
                _connections.TryRemove(connectionId, out _);
                return;
            }

            var bytes = Encoding.UTF8.GetBytes(message);
            await connection.Response.Body.WriteAsync(bytes, connection.CancellationToken);
            await connection.Response.Body.FlushAsync(connection.CancellationToken);
        }
        catch (OperationCanceledException)
        {
            _connections.TryRemove(connectionId, out _);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "发送 SSE 消息失败: 连接 {ConnectionId}", connectionId);
            _connections.TryRemove(connectionId, out _);
        }
    }

    /// <summary>
    /// 检查连接是否活跃
    /// </summary>
    public bool IsConnectionActive(string connectionId)
    {
        if (!_connections.TryGetValue(connectionId, out var connection))
        {
            return false;
        }

        return !connection.CancellationToken.IsCancellationRequested;
    }

    /// <summary>
    /// 释放资源
    /// </summary>
    public void Dispose()
    {
        GC.SuppressFinalize(this);
    }

    private class SseConnection
    {
        public HttpResponse Response { get; set; } = null!;
        public CancellationToken CancellationToken { get; set; }
    }
}
