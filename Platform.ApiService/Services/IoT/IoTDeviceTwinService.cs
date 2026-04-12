using Microsoft.EntityFrameworkCore;
using Platform.ApiService.Models;
using System;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace Platform.ApiService.Services.IoT;

/// <summary>
/// 物联网设备孪生服务
/// </summary>
public class IoTDeviceTwinService
{
    private readonly DbContext _context;

    public IoTDeviceTwinService(DbContext context)
    {
        _context = context;
    }

    public async Task<IoTDeviceTwin> GetOrCreateDeviceTwinAsync(string deviceId)
    {
        var twin = await _context.Set<IoTDeviceTwin>().FirstOrDefaultAsync(t => t.DeviceId == deviceId);
        if (twin != null) return twin;

        twin = new IoTDeviceTwin { DeviceId = deviceId };
        await _context.Set<IoTDeviceTwin>().AddAsync(twin);
        await _context.SaveChangesAsync();
        return twin;
    }

    public async Task<IoTDeviceTwin?> UpdateDesiredPropertiesAsync(string deviceId, UpdateDesiredPropertiesRequest request, Func<string, Task<bool>> validateDeviceExistsAsync, Func<string, Task<IoTDeviceTwin>> getOrCreateTwinAsync)
    {
        if (!await validateDeviceExistsAsync(deviceId)) return null;

        var twin = await getOrCreateTwinAsync(deviceId);
        var updated = new Dictionary<string, object>(twin.DesiredProperties);
        foreach (var (key, value) in request.Properties)
        {
            if (value == null) updated.Remove(key);
            else updated[key] = value;
        }

        twin.DesiredProperties = updated;
        twin.DesiredVersion++;
        twin.ETag = Guid.NewGuid().ToString("N");
        twin.DesiredUpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();
        return twin;
    }

    public async Task<IoTDeviceTwin?> ReportPropertiesAsync(string deviceId, string apiKey, Dictionary<string, object> properties, Func<string, string, Task<bool>> validateApiKeyAsync, Func<string, Task<IoTDeviceTwin>> getOrCreateTwinAsync)
    {
        if (!await validateApiKeyAsync(deviceId, apiKey)) throw new UnauthorizedAccessException($"Invalid ApiKey for device {deviceId}");

        var twin = await getOrCreateTwinAsync(deviceId);
        var updated = new Dictionary<string, object>(twin.ReportedProperties);
        foreach (var (key, value) in properties) updated[key] = value;

        twin.ReportedProperties = updated;
        twin.ReportedVersion++;
        twin.ReportedUpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();
        return twin;
    }
}
