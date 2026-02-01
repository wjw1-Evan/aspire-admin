using System.Collections.Concurrent;
using System.Text;
using System.Text.Json;
using StackExchange.Redis;

namespace Platform.ApiService.Services;

/// <summary>
/// SSE 连接管理器实现（支持 Redis Backplane）
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
    private readonly IConnectionMultiplexer _redis;
    private readonly ISubscriber _subscriber;
    private const string RedisChannelName = "chat:sse:broadcast";

    /// <summary>
    /// 初始化 SSE 连接管理器
    /// </summary>
    public ChatSseConnectionManager(ILogger<ChatSseConnectionManager> logger, IConnectionMultiplexer redis)
    {
        _logger = logger ?? throw new ArgumentNullException(nameof(logger));
        _redis = redis ?? throw new ArgumentNullException(nameof(redis));
        _subscriber = _redis.GetSubscriber();

        // 订阅 Redis 频道
        _subscriber.Subscribe(RedisChannel.Literal(RedisChannelName), (channel, message) =>
        {
            _ = HandleRedisMessageAsync(message);
        });
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
            UnregisterConnectionAsync(connectionId);
        });

        _logger.LogDebug("注册 SSE 连接: {ConnectionId}", connectionId);
        return Task.CompletedTask;
    }

    /// <summary>
    /// 注册用户连接
    /// </summary>
    public Task RegisterUserConnectionAsync(string userId, string connectionId, HttpResponse response, CancellationToken cancellationToken)
    {
        RegisterConnectionAsync(connectionId, response, cancellationToken);

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
    /// 向用户发送消息（通过 Redis 广播）
    /// </summary>
    public async Task SendToUserAsync(string userId, string message)
    {
        var payload = new SseMessagePayload
        {
            UserId = userId,
            Message = message
        };

        var json = JsonSerializer.Serialize(payload);
        await _subscriber.PublishAsync(RedisChannel.Literal(RedisChannelName), json);
    }

    private async Task HandleRedisMessageAsync(RedisValue redisMessage)
    {
        if (!redisMessage.HasValue) return;

        try
        {
            var payload = JsonSerializer.Deserialize<SseMessagePayload>(redisMessage.ToString());
            if (payload == null || string.IsNullOrEmpty(payload.UserId)) return;

            // 检查本地是否有该用户的连接
            if (_userConnections.TryGetValue(payload.UserId, out var connections))
            {
                List<string>? connectionIds;
                lock (connections)
                {
                    connectionIds = connections.ToList();
                }

                if (connectionIds.Any())
                {
                    var tasks = connectionIds.Select(async connectionId =>
                    {
                        try
                        {
                            await SendMessageToLocalConnectionAsync(connectionId, payload.Message);
                        }
                        catch (Exception ex)
                        {
                            _logger.LogWarning(ex, "向用户 {UserId} 的连接 {ConnectionId} 发送消息失败", payload.UserId, connectionId);
                        }
                    });

                    await Task.WhenAll(tasks);
                }
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "处理 Redis SSE 消息失败");
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
    /// 向指定连接发送消息（内部使用，已修改为 SendMessageToLocalConnectionAsync）
    /// </summary>
    public async Task SendMessageAsync(string connectionId, string message)
    {
        // 兼容旧接口，直接发送（仅限本地）
        // 如果调用此方法，意味着调用者知道 connectionId，通常是在单机模式下。
        // 为了安全，这里只处理本地连接。
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
        _subscriber?.UnsubscribeAll();
    }

    private class SseConnection
    {
        public HttpResponse Response { get; set; } = null!;
        public CancellationToken CancellationToken { get; set; }
    }

    private class SseMessagePayload
    {
        public string UserId { get; set; } = string.Empty;
        public string Message { get; set; } = string.Empty;
    }
}
