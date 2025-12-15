using System.Text.Json;
using Microsoft.Extensions.Options;
using Platform.ApiService.Models;
using Platform.ApiService.Options;

namespace Platform.ApiService.Services;

/// <summary>
/// 默认的模拟数据源客户端，便于在无真实网关时验证链路
/// </summary>
public class MockIoTDataFetchClient : IIoTDataFetchClient
{
    private readonly IOptionsMonitor<IoTDataCollectionOptions> _optionsMonitor;
    private readonly ILogger<MockIoTDataFetchClient> _logger;

    /// <summary>
    /// 初始化模拟数据源客户端
    /// </summary>
    public MockIoTDataFetchClient(
        IOptionsMonitor<IoTDataCollectionOptions> optionsMonitor,
        ILogger<MockIoTDataFetchClient> logger)
    {
        _optionsMonitor = optionsMonitor;
        _logger = logger;
    }

    /// <summary>
    /// 生成模拟采集数据
    /// </summary>
    public Task<IReadOnlyList<CollectedDataPointValue>> FetchAsync(
        IoTGateway? gateway,
        IoTDevice device,
        IReadOnlyList<IoTDataPoint> dataPoints,
        CancellationToken cancellationToken)
    {
        var options = _optionsMonitor.CurrentValue;
        if (!options.GenerateMockData)
        {
            return Task.FromResult<IReadOnlyList<CollectedDataPointValue>>(Array.Empty<CollectedDataPointValue>());
        }

        var now = DateTime.UtcNow;
        var results = new List<CollectedDataPointValue>(dataPoints.Count);
        foreach (var dataPoint in dataPoints)
        {
            if (!dataPoint.IsEnabled)
            {
                continue;
            }

            var value = GenerateValue(dataPoint, options);
            results.Add(new CollectedDataPointValue
            {
                DataPointId = dataPoint.DataPointId,
                Value = value,
                ReportedAt = now,
                Remarks = "mock-generated"
            });
        }

        if (results.Count > 0)
        {
            _logger.LogDebug("Generated {Count} mock datapoints for device {DeviceId}", results.Count, device.DeviceId);
        }

        return Task.FromResult<IReadOnlyList<CollectedDataPointValue>>(results);
    }

    private static string GenerateValue(IoTDataPoint dataPoint, IoTDataCollectionOptions options)
    {
        return dataPoint.DataType switch
        {
            DataPointType.Boolean => (Random.Shared.NextDouble() > 0.5).ToString(),
            DataPointType.String => $"mock-{dataPoint.Name}-{DateTime.UtcNow:HHmmss}",
            DataPointType.Enum => dataPoint.AlarmConfig?.Message ?? "normal",
            DataPointType.Json => JsonSerializer.Serialize(new
            {
                source = "mock",
                deviceId = dataPoint.DeviceId,
                point = dataPoint.DataPointId,
                timestamp = DateTime.UtcNow
            }),
            _ => GenerateNumericValue(options)
        };
    }

    private static string GenerateNumericValue(IoTDataCollectionOptions options)
    {
        var min = options.MockMinValue;
        var max = options.MockMaxValue <= min ? min + 100 : options.MockMaxValue;
        var value = min + (Random.Shared.NextDouble() * (max - min));
        return Math.Round(value, 2).ToString();
    }
}
