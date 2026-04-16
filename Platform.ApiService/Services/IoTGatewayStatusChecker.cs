using Microsoft.EntityFrameworkCore;
using System.Net.Sockets;
using Microsoft.Extensions.Options;
using Platform.ApiService.Models;
using Platform.ApiService.Options;
using Platform.ServiceDefaults.Services;
using Microsoft.Extensions.Logging;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Net.Http;
using System.Threading;
using System.Threading.Tasks;

namespace Platform.ApiService.Services;

/// <summary>
/// 网关在线状态检测服务（基于 Ping 地址）
/// </summary>
public class IoTGatewayStatusChecker
{
    private readonly DbContext _context;
    private readonly IHttpClientFactory _httpClientFactory;
    private readonly IOptionsMonitor<IoTDataCollectionOptions> _optionsMonitor;
    private readonly ILogger<IoTGatewayStatusChecker> _logger;

    public IoTGatewayStatusChecker(DbContext context,
        IHttpClientFactory httpClientFactory,
        IOptionsMonitor<IoTDataCollectionOptions> optionsMonitor,
        ILogger<IoTGatewayStatusChecker> logger)
    {
        _context = context;
        _httpClientFactory = httpClientFactory;
        _optionsMonitor = optionsMonitor;
        _logger = logger;
    }

    public async Task CheckAndUpdateGatewayStatusesAsync(CancellationToken cancellationToken)
    {
        var options = _optionsMonitor.CurrentValue;
        if (!options.GatewayStatusCheckEnabled) return;

        var gateways = await _context.Set<IoTGateway>().IgnoreQueryFilters().Where(x => x.IsDeleted != true).ToListAsync(cancellationToken);
        var gatewaysByTenant = gateways.Where(g => !string.IsNullOrWhiteSpace(g.CompanyId)).GroupBy(g => g.CompanyId).ToList();

        int updatedCount = 0;
        foreach (var tenantGroup in gatewaysByTenant)
        {
            var companyId = tenantGroup.Key;
            foreach (var gateway in tenantGroup)
            {
                cancellationToken.ThrowIfCancellationRequested();
                if (string.IsNullOrWhiteSpace(gateway.Address)) continue;

                var newStatus = await PingGatewayAsync(gateway, cancellationToken);
                if (newStatus != gateway.Status)
                {
                    await UpdateGatewayStatusAsync(gateway, newStatus, cancellationToken);
                    updatedCount++;
                }
            }
        }
    }

    private async Task<IoTDeviceStatus> PingGatewayAsync(IoTGateway gateway, CancellationToken cancellationToken)
    {
        var options = _optionsMonitor.CurrentValue;
        var timeout = TimeSpan.FromSeconds(options.GatewayPingTimeoutSeconds);
        try
        {
            if (gateway.ProtocolType?.Equals("HTTP", StringComparison.OrdinalIgnoreCase) == true)
                return await PingHttpGatewayAsync(gateway, timeout, cancellationToken);
            return await PingTcpGatewayAsync(gateway, timeout, cancellationToken);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Ping gateway {GatewayId} ({Address}) failed", gateway.GatewayId, gateway.Address);
            return IoTDeviceStatus.Offline;
        }
    }

    private async Task<IoTDeviceStatus> PingHttpGatewayAsync(IoTGateway gateway, TimeSpan timeout, CancellationToken cancellationToken)
    {
        try
        {
            var url = gateway.Address;
            if (string.IsNullOrWhiteSpace(url)) return IoTDeviceStatus.Offline;
            if (!url.StartsWith("http://", StringComparison.OrdinalIgnoreCase) && !url.StartsWith("https://", StringComparison.OrdinalIgnoreCase)) url = "http://" + url;

            var httpClient = _httpClientFactory.CreateClient(nameof(IoTGatewayStatusChecker));
            httpClient.Timeout = timeout;
            using var cts = CancellationTokenSource.CreateLinkedTokenSource(cancellationToken);
            cts.CancelAfter(timeout);

            using var response = await httpClient.GetAsync(url, HttpCompletionOption.ResponseHeadersRead, cts.Token);
            return response.IsSuccessStatusCode ? IoTDeviceStatus.Online : IoTDeviceStatus.Offline;
        }
        catch { return IoTDeviceStatus.Offline; }
    }

    private async Task<IoTDeviceStatus> PingTcpGatewayAsync(IoTGateway gateway, TimeSpan timeout, CancellationToken cancellationToken)
    {
        try
        {
            var address = gateway.Address;
            if (string.IsNullOrWhiteSpace(address)) return IoTDeviceStatus.Offline;
            var (host, port) = ParseAddress(address);
            if (string.IsNullOrWhiteSpace(host)) return IoTDeviceStatus.Offline;

            using var cts = CancellationTokenSource.CreateLinkedTokenSource(cancellationToken);
            cts.CancelAfter(timeout);
            using var tcpClient = new TcpClient();
            var connectTask = tcpClient.ConnectAsync(host, port);
            await Task.WhenAny(connectTask, Task.Delay(timeout, cts.Token));
            return tcpClient.Connected ? IoTDeviceStatus.Online : IoTDeviceStatus.Offline;
        }
        catch { return IoTDeviceStatus.Offline; }
    }

    private static (string host, int port) ParseAddress(string address)
    {
        var isHttps = address.StartsWith("https://", StringComparison.OrdinalIgnoreCase);
        address = address.Replace("http://", "", StringComparison.OrdinalIgnoreCase).Replace("https://", "", StringComparison.OrdinalIgnoreCase).Replace("tcp://", "", StringComparison.OrdinalIgnoreCase).Replace("mqtt://", "", StringComparison.OrdinalIgnoreCase).TrimEnd('/');
        var pathIndex = address.IndexOf('/');
        if (pathIndex > 0) address = address.Substring(0, pathIndex);
        if (address.Contains(':'))
        {
            var parts = address.Split(':');
            if (parts.Length >= 2 && int.TryParse(parts[^1], out var port)) return (string.Join(":", parts.Take(parts.Length - 1)), port);
        }
        return (address, isHttps ? 443 : 80);
    }

    private async Task UpdateGatewayStatusAsync(IoTGateway gateway, IoTDeviceStatus newStatus, CancellationToken cancellationToken)
    {
        var entity = await _context.Set<IoTGateway>().FirstOrDefaultAsync(x => x.Id == gateway.Id, cancellationToken);
        if (entity != null)
        {
            entity.Status = newStatus;
            if (newStatus == IoTDeviceStatus.Online) entity.LastConnectedAt = DateTime.UtcNow;
            await _context.SaveChangesAsync(cancellationToken);
        }
    }
}