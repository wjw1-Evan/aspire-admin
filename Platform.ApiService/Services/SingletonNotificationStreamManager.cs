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
    private readonly CancellationTokenSource _cts = new();

    public SingletonNotificationStreamManager(ILogger<SingletonNotificationStreamManager> logger)
    {
        _logger = logger;
        // 启动后台心跳任务，每 15 秒发送一次 ping
        _ = StartHeartbeatAsync(_cts.Token);
    }

    private async Task StartHeartbeatAsync(CancellationToken token)
    {
        _logger.LogInformation("已启动通知 SSE 心跳后台任务 (15s 间隔)");
        using var timer = new PeriodicTimer(TimeSpan.FromSeconds(15));
        try
        {
            while (await timer.WaitForNextTickAsync(token))
            {
                if (_connections.IsEmpty) continue;

                var pingData = ": ping\n\n";
                var tasks = _connections.Keys.Select(id => SendRawAsync(id, pingData));
                await Task.WhenAll(tasks);
            }
        }
        catch (OperationCanceledException) { }
        catch (Exception ex)
        {
            _logger.LogError(ex, "通知 SSE 心跳后台任务发生异常");
        }
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
            _logger.LogDebug("连接 {ConnectionId} 的 RequestAborted 已触发", connectionId);
            _ = UnregisterConnectionAsync(connectionId);
        });

        _logger.LogInformation("用户 {UserId} 已成功建立通知 SSE 连接 {ConnectionId} (当前活跃连接总数: {TotalCount})", 
            userId, connectionId, _connections.Count);
        return Task.CompletedTask;
    }

    private static readonly JsonSerializerOptions _jsonOptions = CreateJsonOptions();

    private static JsonSerializerOptions CreateJsonOptions()
    {
        var options = new JsonSerializerOptions { PropertyNamingPolicy = JsonNamingPolicy.CamelCase };
        options.Converters.Add(new System.Text.Json.Serialization.JsonStringEnumConverter(JsonNamingPolicy.CamelCase));
        return options;
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

            var json = JsonSerializer.Serialize(message, _jsonOptions);
            var sseData = $"data: {json}\n\n";

            _logger.LogDebug("准备向用户 {UserId} 的 {Count} 个连接推送消息", userId, ids.Count);

            foreach (var id in ids)
            {
                await SendRawAsync(id, sseData);
            }
        }
        else
        {
            _logger.LogWarning("尝试向用户 {UserId} 推送消息，但未找到活跃连接", userId);
        }
    }

    public async Task BroadcastAsync(object message)
    {
        var json = JsonSerializer.Serialize(message, _jsonOptions);
        var sseData = $"data: {json}\n\n";

        _logger.LogDebug("准备向所有用户广播消息");

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
                    _logger.LogDebug("成功向连接 {ConnectionId} 写入并刷新 SSE 消息", connectionId);
                }
                else
                {
                    _logger.LogWarning("连接 {ConnectionId} 已取消，跳过消息写入", connectionId);
                }
            }
            catch (Exception ex)
            {
                _logger.LogWarning("向连接 {ConnectionId} 发送通知失败: {Message}", connectionId, ex.Message);
                await UnregisterConnectionAsync(connectionId);
            }
        }
        else
        {
            _logger.LogWarning("尝试向连接 {ConnectionId} 发送原始消息，但连接已失效", connectionId);
        }
    }

    private class SseConnection
    {
        public HttpResponse Response { get; set; } = null!;
        public CancellationToken CancellationToken { get; set; }
    }
}
