using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Platform.ApiService.Models;
using Platform.ServiceDefaults.Extensions;
using System;
using System.Threading.Tasks;

namespace Platform.ApiService.Services.IoT;

/// <summary>
/// 物联网网关服务
/// </summary>
public class IoTGatewayService
{
    private readonly DbContext _context;
    private readonly ILogger<IoTGatewayService> _logger;

    public IoTGatewayService(DbContext context, ILogger<IoTGatewayService> logger)
    {
        _context = context;
        _logger = logger ?? throw new ArgumentNullException(nameof(logger));
    }

    public async Task<IoTGateway> CreateGatewayAsync(CreateIoTGatewayRequest request)
    {
        var gateway = new IoTGateway
        {
            Title = request.Title,
            Name = request.Title,
            ProtocolType = request.ProtocolType,
            Address = request.Address,
            Username = request.Username,
            Password = request.Password,
            Config = NormalizeConfig(request.Config)
        };

        await _context.Set<IoTGateway>().AddAsync(gateway);
        await _context.SaveChangesAsync();
        return gateway;
    }

    public async Task<System.Linq.Dynamic.Core.PagedResult<IoTGateway>> GetGatewaysAsync(Platform.ServiceDefaults.Models.PageParams request, IoTDeviceStatus? status = null)
    {
        var query = _context.Set<IoTGateway>().AsQueryable();

        if (status.HasValue)
        {
            query = query.Where(g => g.Status == status.Value);
        }

        return query.OrderByDescending(g => g.CreatedAt).ToPagedList(request);
    }

    public async Task<IoTGateway?> GetGatewayByIdAsync(string id)
    {
        return await _context.Set<IoTGateway>().FirstOrDefaultAsync(x => x.Id == id);
    }

    public async Task<IoTGateway?> GetGatewayByGatewayIdAsync(string gatewayId)
    {
        return await _context.Set<IoTGateway>().FirstOrDefaultAsync(g => g.GatewayId == gatewayId);
    }

    public async Task<IoTGateway?> UpdateGatewayAsync(string id, UpdateIoTGatewayRequest request)
    {
        var gateway = await _context.Set<IoTGateway>().FirstOrDefaultAsync(x => x.Id == id);
        if (gateway == null) return null;

        if (!string.IsNullOrEmpty(request.Title))
        {
            gateway.Title = request.Title;
            gateway.Name = request.Title;
        }
        if (!string.IsNullOrEmpty(request.ProtocolType)) gateway.ProtocolType = request.ProtocolType;
        if (!string.IsNullOrEmpty(request.Address)) gateway.Address = request.Address;
        if (request.Username != null) gateway.Username = request.Username;
        if (request.Password != null) gateway.Password = request.Password;
        if (request.IsEnabled.HasValue) gateway.IsEnabled = request.IsEnabled.Value;
        if (request.Config != null) gateway.Config = NormalizeConfig(request.Config);

        await _context.SaveChangesAsync();
        return gateway;
    }

    public async Task<bool> DeleteGatewayAsync(string id)
    {
        var gateway = await _context.Set<IoTGateway>().FirstOrDefaultAsync(x => x.Id == id);
        if (gateway == null) return false;

        _context.Set<IoTGateway>().Remove(gateway);
        await _context.SaveChangesAsync();
        return true;
    }

    public async Task<bool> UpdateGatewayStatusAsync(string gatewayId, IoTDeviceStatus status)
    {
        var gateway = await GetGatewayByGatewayIdAsync(gatewayId);
        if (gateway == null) return false;

        gateway.Status = status;
        if (status == IoTDeviceStatus.Online) gateway.LastConnectedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();
        return true;
    }

    public async Task<GatewayStatistics?> GetGatewayStatisticsAsync(string gatewayId)
    {
        var gateway = await GetGatewayByGatewayIdAsync(gatewayId);
        if (gateway == null) return null;

        var onlineThreshold = DateTime.UtcNow.AddMinutes(-5);
        var totalDevices = await _context.Set<IoTDevice>().LongCountAsync(d => d.GatewayId == gatewayId);
        var onlineDevices = await _context.Set<IoTDevice>().LongCountAsync(d => d.GatewayId == gatewayId && d.LastReportedAt.HasValue && d.LastReportedAt.Value >= onlineThreshold);

        return new GatewayStatistics
        {
            GatewayId = gatewayId,
            TotalDevices = (int)totalDevices,
            OnlineDevices = (int)onlineDevices,
            OfflineDevices = (int)(totalDevices - onlineDevices),
            FaultDevices = 0,
            LastConnectedAt = gateway.LastConnectedAt
        };
    }

    private static Dictionary<string, string>? NormalizeConfig(Dictionary<string, string>? config)
    {
        if (config == null || config.Count == 0) return null;
        return config.ToDictionary(kv => kv.Key, kv => kv.Value ?? string.Empty);
    }
}
