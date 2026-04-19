using System.Collections.Concurrent;
using System.Linq;
using System.Text;
using System.Text.Json;

namespace Platform.ApiService.Services;

/// <summary>
/// SSE 连接管理器实现（单机版，单例）
/// 管理所有活跃的 SSE 连接，支持按用户ID发送消息
/// </summary>
public class SingletonChatSseConnectionManager : IChatSseConnectionManager, IDisposable
{
    // 连接ID -> 连接信息
    private readonly ConcurrentDictionary<string, SseConnection> _connections = new();
    // 用户ID -> 连接ID集合
    private readonly ConcurrentDictionary<string, HashSet<string>> _userConnections = new();
    // 连接ID -> 用户ID (反向索引，用于 O(1) 注销)
    private readonly ConcurrentDictionary<string, string> _connectionToUserMap = new();
    // 用户级别的写入锁，防止并发写入导致数据交错
    private readonly ConcurrentDictionary<string, object> _userWriteLocks = new();

    private readonly ILogger<SingletonChatSseConnectionManager> _logger;

    /// <summary>
    /// 初始化 SSE 连接管理器
    /// </summary>
    public SingletonChatSseConnectionManager(ILogger<SingletonChatSseConnectionManager> logger)
    {
        _logger = logger ?? throw new ArgumentNullException(nameof(logger));
    }

    /// <summary>
    /// 注册 SSE 连接
    /// </summary>
    public Task RegisterConnectionAsync(string connectionId, HttpResponse response, CancellationToken cancellationToken)
    {
        var connection = new SseConnection(response, cancellationToken);

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
        if (!_userConnections.TryGetValue(userId, out var connections))
        {
            _logger.LogWarning("SendToUserAsync: userId={UserId} 未找到连接", userId);
            return;
        }

        List<string>? connectionIds;
        lock (connections)
        {
            connectionIds = [.. connections];
        }

        if (connectionIds.Count == 0) return;

        // 获取或创建用户级别的写入锁，防止并发写入导致数据交错
        var writeLock = _userWriteLocks.GetOrAdd(userId, _ => new object());

        lock (writeLock)
        {
            foreach (var connectionId in connectionIds)
            {
                try
                {
                    SendMessageToLocalConnectionAsync(connectionId, message).ConfigureAwait(false).GetAwaiter().GetResult();
                }
                catch (Exception ex)
                {
                    _logger.LogWarning(ex, "向用户 {UserId} 的连接 {ConnectionId} 发送消息失败", userId, connectionId);
                }
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
            _logger.LogInformation("注销 SSE 连接: {ConnectionId}", connectionId);

            if (_connectionToUserMap.TryRemove(connectionId, out var userId))
            {
                _logger.LogInformation("从用户映射中移除: connectionId={ConnectionId}, userId={UserId}", connectionId, userId);
                if (_userConnections.TryGetValue(userId, out var connections))
                {
                    bool isEmpty = false;
                    lock (connections)
                    {
                        connections.Remove(connectionId);
                        isEmpty = connections.Count == 0;
                        _logger.LogInformation("用户 {UserId} 剩余连接数: {Count}", userId, connections.Count);
                    }

                    if (isEmpty)
                    {
                        _logger.LogInformation("用户 {UserId} 已无连接，从映射中移除", userId);
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
            _logger.LogWarning("SendMessageToLocalConnectionAsync: connectionId={ConnectionId} 未找到连接", connectionId);
            return;
        }

        try
        {
            if (connection.CancellationToken.IsCancellationRequested)
            {
                _logger.LogWarning("SendMessageToLocalConnectionAsync: connectionId={ConnectionId} 已取消", connectionId);
                _connections.TryRemove(connectionId, out _);
                return;
            }

            _logger.LogInformation("SendMessageToLocalConnectionAsync: 正在写入消息, connectionId={ConnectionId}, messageLength={Length}", 
                connectionId, message.Length);
            var bytes = Encoding.UTF8.GetBytes(message);
            await connection.Response.Body.WriteAsync(bytes, connection.CancellationToken);
            await connection.Response.Body.FlushAsync(connection.CancellationToken);
            _logger.LogInformation("SendMessageToLocalConnectionAsync: 消息已发送, connectionId={ConnectionId}", connectionId);
        }
        catch (OperationCanceledException)
        {
            _logger.LogWarning("SendMessageToLocalConnectionAsync: 连接 {ConnectionId} 已取消", connectionId);
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
    /// 检查用户是否有活跃连接
    /// </summary>
    public bool HasUserConnection(string userId)
    {
        if (_userConnections.TryGetValue(userId, out var connections))
        {
            lock (connections)
            {
                return connections.Count > 0;
            }
        }
        return false;
    }

    /// <summary>
    /// 释放资源
    /// </summary>
    public void Dispose()
    {
        foreach (var connectionId in _connections.Keys.ToList())
        {
            _ = UnregisterConnectionAsync(connectionId);
        }

        _connections.Clear();
        _userConnections.Clear();
        _connectionToUserMap.Clear();
        _userWriteLocks.Clear();

        GC.SuppressFinalize(this);
    }

    private sealed class SseConnection
    {
        public HttpResponse Response { get; }
        public CancellationToken CancellationToken { get; }

        public SseConnection(HttpResponse response, CancellationToken cancellationToken)
        {
            Response = response;
            CancellationToken = cancellationToken;
        }
    }
}