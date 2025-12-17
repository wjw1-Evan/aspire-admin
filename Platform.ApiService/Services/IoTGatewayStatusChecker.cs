using System.Net.Http;
using System.Net.Sockets;
using System.Linq;
using Microsoft.Extensions.Http;
using Microsoft.Extensions.Options;
using Platform.ApiService.Models;
using Platform.ApiService.Options;
using Platform.ServiceDefaults.Services;

namespace Platform.ApiService.Services;

/// <summary>
/// 网关在线状态检测服务（基于 Ping 地址）
/// </summary>
public class IoTGatewayStatusChecker
{
    private readonly IDatabaseOperationFactory<IoTGateway> _gatewayFactory;
    private readonly IHttpClientFactory _httpClientFactory;
    private readonly IOptionsMonitor<IoTDataCollectionOptions> _optionsMonitor;
    private readonly ILogger<IoTGatewayStatusChecker> _logger;

    /// <summary>
    /// 初始化网关状态检测服务
    /// </summary>
    /// <param name="gatewayFactory">网关数据操作工厂</param>
    /// <param name="httpClientFactory">HTTP 客户端工厂</param>
    /// <param name="optionsMonitor">数据采集配置选项监视器</param>
    /// <param name="logger">日志记录器</param>
    public IoTGatewayStatusChecker(
        IDatabaseOperationFactory<IoTGateway> gatewayFactory,
        IHttpClientFactory httpClientFactory,
        IOptionsMonitor<IoTDataCollectionOptions> optionsMonitor,
        ILogger<IoTGatewayStatusChecker> logger)
    {
        _gatewayFactory = gatewayFactory;
        _httpClientFactory = httpClientFactory;
        _optionsMonitor = optionsMonitor;
        _logger = logger;
    }

    /// <summary>
    /// 检查并更新所有网关的状态（跨租户处理）
    /// </summary>
    public async Task CheckAndUpdateGatewayStatusesAsync(CancellationToken cancellationToken)
    {
        var options = _optionsMonitor.CurrentValue;
        if (!options.GatewayStatusCheckEnabled)
        {
            return;
        }

        // 后台服务需要跨租户查询所有网关
        var gatewayFilter = _gatewayFactory.CreateFilterBuilder()
            .ExcludeDeleted()
            .Build();
        var gateways = await _gatewayFactory.FindWithoutTenantFilterAsync(gatewayFilter).ConfigureAwait(false);

        // 按租户分组处理，确保数据隔离
        var gatewaysByTenant = gateways
            .Where(g => !string.IsNullOrWhiteSpace(g.CompanyId))
            .GroupBy(g => g.CompanyId)
            .ToList();

        int updatedCount = 0;
        foreach (var tenantGroup in gatewaysByTenant)
        {
            var companyId = tenantGroup.Key;
            _logger.LogDebug("Processing {Count} gateways for company {CompanyId}", tenantGroup.Count(), companyId);

            foreach (var gateway in tenantGroup)
            {
                cancellationToken.ThrowIfCancellationRequested();

                if (string.IsNullOrWhiteSpace(gateway.Address))
                {
                    _logger.LogDebug("Gateway {GatewayId} has no address, skipping ping check", gateway.GatewayId);
                    continue;
                }

                var newStatus = await PingGatewayAsync(gateway, cancellationToken).ConfigureAwait(false);
                if (newStatus != gateway.Status)
                {
                    await UpdateGatewayStatusAsync(gateway, newStatus, cancellationToken).ConfigureAwait(false);
                    updatedCount++;
                    _logger.LogInformation(
                        "Gateway {GatewayId} ({Address}) status updated: {OldStatus} -> {NewStatus} for company {CompanyId}",
                        gateway.GatewayId,
                        gateway.Address,
                        gateway.Status,
                        newStatus,
                        companyId);
                }
            }
        }

        if (updatedCount > 0)
        {
            _logger.LogInformation("Updated {Count} gateway statuses across {TenantCount} tenants", updatedCount, gatewaysByTenant.Count);
        }
    }

    private async Task<IoTDeviceStatus> PingGatewayAsync(
        IoTGateway gateway,
        CancellationToken cancellationToken)
    {
        var options = _optionsMonitor.CurrentValue;
        var timeout = TimeSpan.FromSeconds(options.GatewayPingTimeoutSeconds);

        try
        {
            // HTTP 协议使用 HTTP 请求检测
            if (gateway.ProtocolType?.Equals("HTTP", StringComparison.OrdinalIgnoreCase) == true)
            {
                return await PingHttpGatewayAsync(gateway, timeout, cancellationToken).ConfigureAwait(false);
            }

            // 其他协议使用 TCP ping
            return await PingTcpGatewayAsync(gateway, timeout, cancellationToken).ConfigureAwait(false);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Ping gateway {GatewayId} ({Address}) failed", gateway.GatewayId, gateway.Address);
            return IoTDeviceStatus.Offline;
        }
    }

    private async Task<IoTDeviceStatus> PingHttpGatewayAsync(
        IoTGateway gateway,
        TimeSpan timeout,
        CancellationToken cancellationToken)
    {
        try
        {
            var url = gateway.Address;
            if (string.IsNullOrWhiteSpace(url))
            {
                return IoTDeviceStatus.Offline;
            }

            // 如果地址没有协议前缀，添加 http://
            if (!url.StartsWith("http://", StringComparison.OrdinalIgnoreCase) &&
                !url.StartsWith("https://", StringComparison.OrdinalIgnoreCase))
            {
                url = "http://" + url;
            }

            var httpClient = _httpClientFactory.CreateClient(nameof(IoTGatewayStatusChecker));
            httpClient.Timeout = timeout;

            using var cts = CancellationTokenSource.CreateLinkedTokenSource(cancellationToken);
            cts.CancelAfter(timeout);

            using var response = await httpClient.GetAsync(url, HttpCompletionOption.ResponseHeadersRead, cts.Token).ConfigureAwait(false);
            return response.IsSuccessStatusCode ? IoTDeviceStatus.Online : IoTDeviceStatus.Offline;
        }
        catch (TaskCanceledException)
        {
            return IoTDeviceStatus.Offline;
        }
        catch (Exception ex)
        {
            _logger.LogDebug(ex, "HTTP ping failed for gateway {GatewayId}", gateway.GatewayId);
            return IoTDeviceStatus.Offline;
        }
    }

    private async Task<IoTDeviceStatus> PingTcpGatewayAsync(
        IoTGateway gateway,
        TimeSpan timeout,
        CancellationToken cancellationToken)
    {
        try
        {
            var address = gateway.Address;
            if (string.IsNullOrWhiteSpace(address))
            {
                return IoTDeviceStatus.Offline;
            }

            // 解析地址和端口
            var (host, port) = ParseAddress(address);
            if (string.IsNullOrWhiteSpace(host))
            {
                return IoTDeviceStatus.Offline;
            }

            using var cts = CancellationTokenSource.CreateLinkedTokenSource(cancellationToken);
            cts.CancelAfter(timeout);

            using var tcpClient = new TcpClient();
            var connectTask = tcpClient.ConnectAsync(host, port);
            await Task.WhenAny(connectTask, Task.Delay(timeout, cts.Token)).ConfigureAwait(false);

            if (tcpClient.Connected)
            {
                return IoTDeviceStatus.Online;
            }

            return IoTDeviceStatus.Offline;
        }
        catch (TaskCanceledException)
        {
            return IoTDeviceStatus.Offline;
        }
        catch (Exception ex)
        {
            _logger.LogDebug(ex, "TCP ping failed for gateway {GatewayId}", gateway.GatewayId);
            return IoTDeviceStatus.Offline;
        }
    }

    private static (string host, int port) ParseAddress(string address)
    {
        // 移除协议前缀
        var isHttps = address.StartsWith("https://", StringComparison.OrdinalIgnoreCase);
        address = address.Replace("http://", "", StringComparison.OrdinalIgnoreCase)
                         .Replace("https://", "", StringComparison.OrdinalIgnoreCase)
                         .Replace("tcp://", "", StringComparison.OrdinalIgnoreCase)
                         .Replace("mqtt://", "", StringComparison.OrdinalIgnoreCase)
                         .TrimEnd('/');

        // 移除路径部分（只保留主机和端口）
        var pathIndex = address.IndexOf('/');
        if (pathIndex > 0)
        {
            address = address.Substring(0, pathIndex);
        }

        // 解析主机和端口
        if (address.Contains(':'))
        {
            var parts = address.Split(':');
            if (parts.Length >= 2 && int.TryParse(parts[^1], out var port))
            {
                var host = string.Join(":", parts.Take(parts.Length - 1));
                return (host, port);
            }
        }

        // 默认端口：HTTPS=443, HTTP=80, MQTT=1883
        return (address, isHttps ? 443 : 80);
    }

    private async Task UpdateGatewayStatusAsync(
        IoTGateway gateway,
        IoTDeviceStatus newStatus,
        CancellationToken cancellationToken)
    {
        var filter = _gatewayFactory.CreateFilterBuilder()
            .Equal(g => g.GatewayId, gateway.GatewayId)
            .WithTenant(gateway.CompanyId)
            .ExcludeDeleted()
            .Build();

        var updateBuilder = _gatewayFactory.CreateUpdateBuilder()
            .Set(g => g.Status, newStatus);

        if (newStatus == IoTDeviceStatus.Online)
        {
            updateBuilder.Set(g => g.LastConnectedAt, DateTime.UtcNow);
        }

        var update = updateBuilder.Build();
        await _gatewayFactory.FindOneAndUpdateAsync(filter, update).ConfigureAwait(false);
    }
}
