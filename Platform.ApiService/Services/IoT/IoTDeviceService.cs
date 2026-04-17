using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Platform.ApiService.Models;
using Platform.ServiceDefaults.Extensions;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace Platform.ApiService.Services.IoT;

/// <summary>
/// 物联网设备服务
/// </summary>
public class IoTDeviceService
{
    private readonly DbContext _context;
    private readonly ILogger<IoTDeviceService> _logger;

    public IoTDeviceService(DbContext context, ILogger<IoTDeviceService> logger)
    {
        _context = context;
        _logger = logger ?? throw new ArgumentNullException(nameof(logger));
    }

    public async Task<IoTDevice> CreateDeviceAsync(CreateIoTDeviceRequest request, Func<string, Task<IoTGateway?>> getGatewayByIdAsync)
    {
        string deviceId;
        if (!string.IsNullOrWhiteSpace(request.DeviceId))
        {
            var deviceIdPattern = @"^[a-zA-Z0-9_-]+$";
            if (!System.Text.RegularExpressions.Regex.IsMatch(request.DeviceId, deviceIdPattern))
            {
                throw new ArgumentException("设备标识符只能包含字母、数字、连字符和下划线");
            }

            var exists = await _context.Set<IoTDevice>().AnyAsync(d => d.DeviceId == request.DeviceId);
            if (exists) throw new InvalidOperationException($"设备标识符 {request.DeviceId} 已存在");

            deviceId = request.DeviceId.Trim();
        }
        else
        {
            deviceId = Guid.NewGuid().ToString("N");
        }

        var device = new IoTDevice
        {
            Name = request.Name,
            Title = request.Title,
            DeviceId = deviceId,
            GatewayId = request.GatewayId ?? string.Empty,
            DeviceType = request.DeviceType,
            Description = request.Description,
            Location = request.Location,
            Tags = request.Tags,
            RetentionDays = request.RetentionDays
        };

        await _context.Set<IoTDevice>().AddAsync(device);

        if (!string.IsNullOrEmpty(request.GatewayId))
        {
            var gateway = await getGatewayByIdAsync(request.GatewayId);
            if (gateway != null) gateway.DeviceCount += 1;
        }

        await _context.SaveChangesAsync();
        return device;
    }

    public async Task<System.Linq.Dynamic.Core.PagedResult<IoTDevice>> GetDevicesAsync(Platform.ServiceDefaults.Models.ProTableRequest request, string? gatewayId = null)
    {
        var query = _context.Set<IoTDevice>().AsQueryable();

        if (!string.IsNullOrEmpty(gatewayId))
        {
            query = query.Where(d => d.GatewayId == gatewayId);
        }

        return query.OrderByDescending(d => d.CreatedAt).ToPagedList(request);
    }

    public async Task<IoTDevice?> GetDeviceByIdAsync(string id)
    {
        return await _context.Set<IoTDevice>().FirstOrDefaultAsync(x => x.Id == id);
    }

    public async Task<IoTDevice?> GetDeviceByDeviceIdAsync(string deviceId)
    {
        return await _context.Set<IoTDevice>().FirstOrDefaultAsync(d => d.DeviceId == deviceId);
    }

    public async Task<IoTDevice?> UpdateDeviceAsync(string id, UpdateIoTDeviceRequest request)
    {
        var device = await _context.Set<IoTDevice>().FirstOrDefaultAsync(x => x.Id == id);
        if (device == null) return null;

        if (!string.IsNullOrEmpty(request.Name)) device.Name = request.Name;
        if (!string.IsNullOrEmpty(request.Title)) device.Title = request.Title;
        if (!string.IsNullOrEmpty(request.GatewayId)) device.GatewayId = request.GatewayId;
        if (request.IsEnabled.HasValue) device.IsEnabled = request.IsEnabled.Value;
        if (request.DeviceType.HasValue) device.DeviceType = request.DeviceType.Value;
        if (request.Description != null) device.Description = request.Description;
        if (request.Location != null) device.Location = request.Location;
        if (request.Tags != null) device.Tags = request.Tags;
        if (request.RetentionDays.HasValue) device.RetentionDays = request.RetentionDays.Value;

        await _context.SaveChangesAsync();
        return device;
    }

    public async Task<bool> DeleteDeviceAsync(string id, Func<string, Task<IoTGateway?>> getGatewayByIdAsync)
    {
        var device = await _context.Set<IoTDevice>().FirstOrDefaultAsync(x => x.Id == id);
        if (device == null) return false;

        var gateway = await getGatewayByIdAsync(device.GatewayId);
        if (gateway != null) gateway.DeviceCount = Math.Max(0, gateway.DeviceCount - 1);

        _context.Set<IoTDevice>().Remove(device);
        await _context.SaveChangesAsync();
        return true;
    }

    public async Task<int> BatchDeleteDevicesAsync(List<string> ids, Func<string, Task<IoTGateway?>> getGatewayByIdAsync)
    {
        if (ids == null || ids.Count == 0) return 0;

        var devices = await _context.Set<IoTDevice>().Where(d => ids.Contains(d.Id!)).ToListAsync();
        if (devices.Count == 0) return 0;

        foreach (var device in devices)
        {
            var gateway = await getGatewayByIdAsync(device.GatewayId);
            if (gateway != null) gateway.DeviceCount = Math.Max(0, gateway.DeviceCount - 1);
        }

        _context.Set<IoTDevice>().RemoveRange(devices);
        await _context.SaveChangesAsync();
        return devices.Count;
    }

    public async Task<bool> UpdateDeviceStatusAsync(string deviceId, IoTDeviceStatus status)
    {
        var device = await GetDeviceByDeviceIdAsync(deviceId);
        if (device == null) return false;

        if (status == IoTDeviceStatus.Online) device.LastReportedAt = DateTime.UtcNow;
        device.Status = status;

        await _context.SaveChangesAsync();
        return true;
    }

    public async Task<bool> HandleDeviceConnectAsync(DeviceConnectRequest request, Func<string, string, string, string?, Dictionary<string, object>?, Task<IoTDeviceEvent>> createEventAsync)
    {
        var device = await GetDeviceByDeviceIdAsync(request.DeviceId);
        if (device == null) return false;

        device.LastReportedAt = DateTime.UtcNow;
        device.Status = IoTDeviceStatus.Online;

        await _context.SaveChangesAsync();
        await createEventAsync(request.DeviceId, "Connected", "Info", "Device connected", null);
        return true;
    }

    public async Task<bool> HandleDeviceDisconnectAsync(DeviceDisconnectRequest request, Func<string, string, string, string?, Dictionary<string, object>?, Task<IoTDeviceEvent>> createEventAsync)
    {
        var device = await GetDeviceByDeviceIdAsync(request.DeviceId);
        if (device == null) return false;

        device.Status = IoTDeviceStatus.Offline;
        await _context.SaveChangesAsync();
        await createEventAsync(request.DeviceId, "Disconnected", "Warning", request.Reason ?? "Device disconnected", null);
        return true;
    }

    public async Task<DeviceStatistics?> GetDeviceStatisticsAsync(string deviceId)
    {
        var device = await GetDeviceByDeviceIdAsync(deviceId);
        if (device == null) return null;

        var dataPointCount = await _context.Set<IoTDataPoint>().LongCountAsync(dp => dp.DeviceId == deviceId);
        var enabledDataPointCount = await _context.Set<IoTDataPoint>().LongCountAsync(dp => dp.DeviceId == deviceId && dp.IsEnabled);
        var recordCount = await _context.Set<IoTDataRecord>().LongCountAsync(r => r.DeviceId == deviceId);
        var unhandledAlarms = await _context.Set<IoTDeviceEvent>().LongCountAsync(e => e.DeviceId == deviceId && e.IsHandled == false);

        return new DeviceStatistics
        {
            DeviceId = deviceId,
            TotalDataPoints = (int)dataPointCount,
            EnabledDataPoints = (int)enabledDataPointCount,
            TotalDataRecords = recordCount,
            UnhandledAlarms = unhandledAlarms,
            LastReportedAt = device.LastReportedAt
        };
    }

    public async Task<bool> ValidateDeviceExistsAsync(string deviceId)
    {
        return await _context.Set<IoTDevice>().AnyAsync(d => d.DeviceId == deviceId);
    }
}
