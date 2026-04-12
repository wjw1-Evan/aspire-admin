using Microsoft.EntityFrameworkCore;
using Platform.ApiService.Models;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace Platform.ApiService.Services.IoT;

/// <summary>
/// 物联网命令服务
/// </summary>
public class IoTCommandService
{
    private readonly DbContext _context;

    public IoTCommandService(DbContext context)
    {
        _context = context;
    }

    public async Task<IoTDeviceCommand> SendCommandAsync(string deviceId, SendCommandRequest request, Func<string, Task<bool>> validateDeviceExistsAsync)
    {
        if (!await validateDeviceExistsAsync(deviceId)) throw new InvalidOperationException($"Device {deviceId} not found");

        var command = new IoTDeviceCommand
        {
            DeviceId = deviceId,
            CommandName = request.CommandName,
            Payload = request.Payload,
            ExpiresAt = DateTime.UtcNow.AddHours(Math.Max(1, request.TtlHours))
        };

        await _context.Set<IoTDeviceCommand>().AddAsync(command);
        await _context.SaveChangesAsync();
        return command;
    }

    public async Task<List<IoTDeviceCommand>> GetPendingCommandsAsync(string deviceId, string apiKey, Func<string, string, Task<bool>> validateApiKeyAsync)
    {
        if (!await validateApiKeyAsync(deviceId, apiKey)) throw new UnauthorizedAccessException($"Invalid ApiKey for device {deviceId}");

        var now = DateTime.UtcNow;
        var commands = await _context.Set<IoTDeviceCommand>().Where(c =>
            c.DeviceId == deviceId &&
            c.Status == CommandStatus.Pending &&
            c.ExpiresAt > now).ToListAsync();

        if (commands.Count > 0)
        {
            foreach (var cmd in commands)
            {
                cmd.Status = CommandStatus.Delivered;
                cmd.DeliveredAt = now;
            }
            await _context.SaveChangesAsync();
        }

        return commands;
    }

    public async Task<bool> AckCommandAsync(string commandId, AckCommandRequest request, Func<string, string, Task<bool>> validateApiKeyAsync)
    {
        var command = await _context.Set<IoTDeviceCommand>().FirstOrDefaultAsync(x => x.Id == commandId);
        if (command == null) return false;

        if (!await validateApiKeyAsync(command.DeviceId, request.ApiKey)) throw new UnauthorizedAccessException($"Invalid ApiKey for device {command.DeviceId}");

        command.Status = request.Success ? CommandStatus.Executed : CommandStatus.Failed;
        command.ExecutedAt = DateTime.UtcNow;
        command.ResponsePayload = request.ResponsePayload;
        command.ErrorMessage = request.ErrorMessage;

        await _context.SaveChangesAsync();
        return true;
    }

    public async Task<int> ExpireCommandsAsync()
    {
        var now = DateTime.UtcNow;
        var expired = await _context.Set<IoTDeviceCommand>().Where(c => c.Status == CommandStatus.Pending && c.ExpiresAt <= now).ToListAsync();

        if (expired.Count == 0) return 0;

        foreach (var cmd in expired) cmd.Status = CommandStatus.Expired;
        await _context.SaveChangesAsync();
        return expired.Count;
    }

    public async Task<GenerateApiKeyResult> GenerateApiKeyAsync(string deviceId, Func<string, Task<IoTDevice?>> getDeviceByIdAsync)
    {
        var device = await getDeviceByIdAsync(deviceId);
        if (device == null) throw new InvalidOperationException($"Device {deviceId} not found");

        var rawKey = Convert.ToBase64String(System.Security.Cryptography.RandomNumberGenerator.GetBytes(32));
        var hash = Convert.ToHexString(System.Security.Cryptography.SHA256.HashData(System.Text.Encoding.UTF8.GetBytes(rawKey)));

        device.ApiKey = hash;
        await _context.SaveChangesAsync();

        return new GenerateApiKeyResult { DeviceId = deviceId, ApiKey = rawKey };
    }

    public async Task<bool> ValidateApiKeyAsync(string deviceId, string apiKey, Func<string, Task<IoTDevice?>> getDeviceByIdAsync)
    {
        if (string.IsNullOrWhiteSpace(apiKey)) return false;
        var device = await getDeviceByIdAsync(deviceId);
        if (device?.ApiKey == null) return false;

        var hash = Convert.ToHexString(System.Security.Cryptography.SHA256.HashData(System.Text.Encoding.UTF8.GetBytes(apiKey)));
        return string.Equals(device.ApiKey, hash, StringComparison.OrdinalIgnoreCase);
    }
}
