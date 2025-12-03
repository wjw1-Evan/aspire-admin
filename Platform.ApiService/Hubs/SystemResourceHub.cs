using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;
using Platform.ApiService.Services;

namespace Platform.ApiService.Hubs;

/// <summary>
/// 系统资源监控 Hub
/// 实时推送系统资源使用情况（CPU、内存、磁盘等）
/// </summary>
[Authorize]
public class SystemResourceHub : Hub
{
    /// <summary>
    /// 系统资源更新事件名称
    /// </summary>
    public const string ResourceUpdatedEvent = "ResourceUpdated";

    /// <summary>
    /// 系统资源监控服务
    /// </summary>
    private readonly ISystemResourceService _resourceService;
    private readonly ILogger<SystemResourceHub> _logger;

    /// <summary>
    /// 初始化系统资源 Hub
    /// </summary>
    /// <param name="resourceService">系统资源服务</param>
    /// <param name="logger">日志记录器</param>
    public SystemResourceHub(
        ISystemResourceService resourceService,
        ILogger<SystemResourceHub> logger)
    {
        _resourceService = resourceService ?? throw new ArgumentNullException(nameof(resourceService));
        _logger = logger ?? throw new ArgumentNullException(nameof(logger));
    }

    /// <summary>
    /// 连接成功时自动加入用户组
    /// </summary>
    public override async Task OnConnectedAsync()
    {
        var userId = Context.User?.FindFirst("sub")?.Value ?? "anonymous";
        await Groups.AddToGroupAsync(Context.ConnectionId, GetUserGroupName(userId));
        _logger.LogInformation("用户 {UserId} 连接到系统资源 Hub: {ConnectionId}", userId, Context.ConnectionId);
        await base.OnConnectedAsync();
    }

    /// <summary>
    /// 订阅系统资源更新（客户端调用）
    /// </summary>
    /// <param name="interval">更新间隔（毫秒），最小 1000ms，最大 60000ms</param>
    public async Task SubscribeResourceUpdatesAsync(int interval = 5000)
    {
        // 验证间隔范围
        if (interval < 1000 || interval > 60000)
        {
            throw new ArgumentException("间隔必须在 1000-60000 毫秒之间", nameof(interval));
        }

        var userId = Context.User?.FindFirst("sub")?.Value ?? "anonymous";
        _logger.LogInformation("用户 {UserId} 订阅系统资源更新，间隔: {Interval}ms", userId, interval);

        try
        {
            // 立即发送一次当前资源信息
            var resources = await _resourceService.GetSystemResourcesAsync();
            await Clients.Caller.SendAsync(ResourceUpdatedEvent, resources);

            // 定期发送资源更新
            var connectionId = Context.ConnectionId;
            var clients = Clients;
            
            // 使用 CancellationToken 来优雅地停止后台任务
            var cts = new CancellationTokenSource();
            _ = Task.Run(async () =>
            {
                try
                {
                    while (!cts.Token.IsCancellationRequested)
                {
                    try
                    {
                            await Task.Delay(interval, cts.Token);
                            
                            if (cts.Token.IsCancellationRequested)
                            {
                                break;
                            }

                            var updatedResources = await _resourceService.GetSystemResourcesAsync();
                            await clients.Client(connectionId).SendAsync(ResourceUpdatedEvent, updatedResources, cancellationToken: cts.Token);
                        }
                        catch (OperationCanceledException)
                        {
                            // 连接已断开，正常退出
                            break;
                    }
                    catch (Exception ex)
                    {
                            _logger.LogError(ex, "发送系统资源更新失败: {ConnectionId}, 用户: {UserId}", connectionId, userId);
                        break;
                        }
                    }
                }
                finally
                {
                    cts.Dispose();
                }
            });
            
            // 在连接断开时取消后台任务
            Context.Items["ResourceUpdateCts"] = cts;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "订阅系统资源更新失败: {UserId}", userId);
            throw;
        }
    }

    /// <summary>
    /// 连接断开时清理资源
    /// </summary>
    public override async Task OnDisconnectedAsync(Exception? exception)
    {
        var userId = Context.User?.FindFirst("sub")?.Value ?? "anonymous";
        
        // 取消后台任务
        if (Context.Items.TryGetValue("ResourceUpdateCts", out var ctsObj) && ctsObj is CancellationTokenSource cts)
        {
            cts.Cancel();
            cts.Dispose();
        }
        
        _logger.LogInformation("用户 {UserId} 断开系统资源 Hub 连接: {ConnectionId}", userId, Context.ConnectionId);
        await base.OnDisconnectedAsync(exception);
    }

    /// <summary>
    /// 获取用户组名称
    /// </summary>
    /// <param name="userId">用户标识</param>
    /// <returns>组名称</returns>
    public static string GetUserGroupName(string userId) => $"user:{userId}";
}

