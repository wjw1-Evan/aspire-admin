using System.Collections.Concurrent;
using System.Text;

namespace Platform.ApiService.Services;

/// <summary>
/// SSE 连接管理器实现（简化版）
/// 管理所有活跃的 SSE 连接，支持按用户ID发送消息
/// </summary>
public class ChatSseConnectionManager : IChatSseConnectionManager
{
    // 连接ID -> 连接信息
    private readonly ConcurrentDictionary<string, SseConnection> _connections = new();
    // 用户ID -> 连接ID集合
    private readonly ConcurrentDictionary<string, HashSet<string>> _userConnections = new();
    private readonly ILogger<ChatSseConnectionManager> _logger;

    /// <summary>
    /// 初始化 SSE 连接管理器
    /// </summary>
    /// <param name="logger">日志记录器</param>
    public ChatSseConnectionManager(ILogger<ChatSseConnectionManager> logger)
    {
        _logger = logger ?? throw new ArgumentNullException(nameof(logger));
    }

    /// <summary>
    /// 注册 SSE 连接
    /// </summary>
    /// <param name="connectionId">连接ID</param>
    /// <param name="response">HTTP 响应对象</param>
    /// <param name="cancellationToken">取消令牌</param>
    /// <returns>注册任务</returns>
    public Task RegisterConnectionAsync(string connectionId, HttpResponse response, CancellationToken cancellationToken)
    {
        var connection = new SseConnection
        {
            Response = response,
            CancellationToken = cancellationToken
        };

        _connections.TryAdd(connectionId, connection);

        // 监听取消令牌，自动清理连接
        cancellationToken.Register(() =>
        {
            UnregisterConnectionAsync(connectionId);
        });

        _logger.LogDebug("注册 SSE 连接: {ConnectionId}", connectionId);
        return Task.CompletedTask;
    }

    /// <summary>
    /// 注册用户连接（简化版：直接关联用户ID）
    /// </summary>
    public Task RegisterUserConnectionAsync(string userId, string connectionId, HttpResponse response, CancellationToken cancellationToken)
    {
        // 先注册连接
        RegisterConnectionAsync(connectionId, response, cancellationToken);

        // 建立用户 -> 连接映射
        _userConnections.AddOrUpdate(userId,
            new HashSet<string> { connectionId },
            (key, existing) =>
            {
                existing.Add(connectionId);
                return existing;
            });

        _logger.LogDebug("注册用户连接: 用户 {UserId} 连接 {ConnectionId}", userId, connectionId);
        return Task.CompletedTask;
    }

    /// <summary>
    /// 向用户的所有连接发送消息
    /// </summary>
    public async Task SendToUserAsync(string userId, string message)
    {
        if (!_userConnections.TryGetValue(userId, out var connectionIds))
        {
            return;
        }

        var tasks = connectionIds.Select(async connectionId =>
        {
            try
            {
                await SendMessageAsync(connectionId, message);
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "向用户 {UserId} 的连接 {ConnectionId} 发送消息失败", userId, connectionId);
            }
        });

        await Task.WhenAll(tasks);
    }

    /// <summary>
    /// 注销 SSE 连接
    /// </summary>
    /// <param name="connectionId">连接ID</param>
    /// <returns>注销任务</returns>
    public Task UnregisterConnectionAsync(string connectionId)
    {
        if (_connections.TryRemove(connectionId, out var connection))
        {
            _logger.LogDebug("注销 SSE 连接: {ConnectionId}", connectionId);

            // 从所有用户的连接集合中移除此连接
            foreach (var (userId, connections) in _userConnections.ToList())
            {
                if (connections.Remove(connectionId))
                {
                    if (connections.Count == 0)
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
    /// <param name="connectionId">连接ID</param>
    /// <param name="message">消息内容（SSE 格式）</param>
    /// <returns>发送任务</returns>
    public async Task SendMessageAsync(string connectionId, string message)
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
            // 连接已取消，清理
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
    /// <param name="connectionId">连接ID</param>
    /// <returns>如果连接存在且未取消则返回 true，否则返回 false</returns>
    public bool IsConnectionActive(string connectionId)
    {
        if (!_connections.TryGetValue(connectionId, out var connection))
        {
            return false;
        }

        return !connection.CancellationToken.IsCancellationRequested;
    }

    private class SseConnection
    {
        public HttpResponse Response { get; set; } = null!;
        public CancellationToken CancellationToken { get; set; }
    }
}
