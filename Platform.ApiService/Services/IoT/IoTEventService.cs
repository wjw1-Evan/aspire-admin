using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Platform.ApiService.Models;
using Platform.ServiceDefaults.Extensions;
using System;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace Platform.ApiService.Services.IoT;

/// <summary>
/// 物联网事件服务
/// </summary>
public class IoTEventService
{
    private readonly DbContext _context;
    private readonly ILogger<IoTEventService> _logger;

    public IoTEventService(DbContext context, ILogger<IoTEventService> logger)
    {
        _context = context;
        _logger = logger ?? throw new ArgumentNullException(nameof(logger));
    }

    public async Task<IoTDeviceEvent> CreateEventAsync(string deviceId, string eventType, string level, string? description = null, Dictionary<string, object>? eventData = null)
    {
        var @event = new IoTDeviceEvent
        {
            DeviceId = deviceId,
            EventType = eventType,
            Level = level,
            Description = description,
            EventData = eventData,
            OccurredAt = DateTime.UtcNow
        };

        await _context.Set<IoTDeviceEvent>().AddAsync(@event);
        await _context.SaveChangesAsync();
        return @event;
    }

    public Task<System.Linq.Dynamic.Core.PagedResult<IoTDeviceEvent>> QueryEventsAsync(Platform.ServiceDefaults.Models.PageParams request, string? deviceId = null, string? eventType = null, string? level = null, bool? isHandled = null, DateTime? startTime = null, DateTime? endTime = null)
    {
        var query = _context.Set<IoTDeviceEvent>().AsQueryable();

        if (!string.IsNullOrEmpty(deviceId))
        {
            query = query.Where(e => e.DeviceId == deviceId);
        }

        if (!string.IsNullOrEmpty(eventType))
        {
            query = query.Where(e => e.EventType == eventType);
        }

        if (!string.IsNullOrEmpty(level))
        {
            query = query.Where(e => e.Level == level);
        }

        if (isHandled.HasValue)
        {
            query = query.Where(e => e.IsHandled == isHandled.Value);
        }

        if (startTime.HasValue)
        {
            query = query.Where(e => e.OccurredAt >= startTime.Value);
        }

        if (endTime.HasValue)
        {
            query = query.Where(e => e.OccurredAt <= endTime.Value);
        }

        return Task.FromResult(query.OrderByDescending(e => e.OccurredAt).ToPagedList(request));
    }

    public async Task<bool> HandleEventAsync(string eventId, string remarks)
    {
        var @event = await _context.Set<IoTDeviceEvent>().FirstOrDefaultAsync(x => x.Id == eventId);
        if (@event == null) return false;

        @event.IsHandled = true;
        @event.HandledRemarks = remarks;
        await _context.SaveChangesAsync();
        return true;
    }

    public async Task<long> GetUnhandledEventCountAsync(string? deviceId = null)
    {
        return await _context.Set<IoTDeviceEvent>().LongCountAsync(e => e.IsHandled == false && (deviceId == null || e.DeviceId == deviceId));
    }
}
