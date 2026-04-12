using Microsoft.EntityFrameworkCore;
using Platform.ApiService.Models;
using System;
using System.Threading.Tasks;

namespace Platform.ApiService.Services.IoT;

/// <summary>
/// 物联网统计服务
/// </summary>
public class IoTStatisticsService
{
    private readonly DbContext _context;

    public IoTStatisticsService(DbContext context)
    {
        _context = context;
    }

    public async Task<PlatformStatistics> GetPlatformStatisticsAsync()
    {
        var totalGateways = await _context.Set<IoTGateway>().LongCountAsync();
        var onlineGateways = await _context.Set<IoTGateway>().LongCountAsync(g => g.Status == IoTDeviceStatus.Online);
        var totalDevices = await _context.Set<IoTDevice>().LongCountAsync();
        var onlineDevices = await _context.Set<IoTDevice>().LongCountAsync(d => d.Status == IoTDeviceStatus.Online);
        var totalDataPoints = await _context.Set<IoTDataPoint>().LongCountAsync();
        var recordCount = await _context.Set<IoTDataRecord>().LongCountAsync();
        var unhandledAlarms = await _context.Set<IoTDeviceEvent>().LongCountAsync(e => e.IsHandled == false);

        return new PlatformStatistics
        {
            TotalGateways = (int)totalGateways,
            OnlineGateways = (int)onlineGateways,
            TotalDevices = (int)totalDevices,
            OnlineDevices = (int)onlineDevices,
            TotalDataPoints = (int)totalDataPoints,
            TotalDataRecords = recordCount,
            UnhandledAlarms = (int)unhandledAlarms,
            LastUpdatedAt = DateTime.UtcNow
        };
    }

    public async Task<DeviceStatusStatistics> GetDeviceStatusStatisticsAsync()
    {
        var online = await _context.Set<IoTDevice>().LongCountAsync(d => d.Status == IoTDeviceStatus.Online);
        var fault = await _context.Set<IoTDevice>().LongCountAsync(d => d.Status == IoTDeviceStatus.Fault);
        var maintenance = await _context.Set<IoTDevice>().LongCountAsync(d => d.Status == IoTDeviceStatus.Maintenance);
        var total = await _context.Set<IoTDevice>().LongCountAsync();

        return new DeviceStatusStatistics
        {
            Online = (int)online,
            Offline = (int)(total - online - fault - maintenance),
            Fault = (int)fault,
            Maintenance = (int)maintenance
        };
    }
}
