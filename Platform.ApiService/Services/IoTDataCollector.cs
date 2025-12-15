using System.Collections.Concurrent;
using Microsoft.Extensions.Options;
using Platform.ApiService.Models;
using Platform.ApiService.Options;
using Platform.ServiceDefaults.Services;

namespace Platform.ApiService.Services;

/// <summary>
/// 物联网数据采集执行器（单次运行逻辑）
/// </summary>
public class IoTDataCollector
{
    private readonly IDatabaseOperationFactory<IoTGateway> _gatewayFactory;
    private readonly IDatabaseOperationFactory<IoTDevice> _deviceFactory;
    private readonly IDatabaseOperationFactory<IoTDataPoint> _dataPointFactory;
    private readonly IDatabaseOperationFactory<IoTDataRecord> _dataRecordFactory;
    private readonly IIoTDataFetchClient _fetchClient;
    private readonly IOptionsMonitor<IoTDataCollectionOptions> _optionsMonitor;
    private readonly ILogger<IoTDataCollector> _logger;

    /// <summary>
    /// 构造物联网数据采集执行器
    /// </summary>
    public IoTDataCollector(
        IDatabaseOperationFactory<IoTGateway> gatewayFactory,
        IDatabaseOperationFactory<IoTDevice> deviceFactory,
        IDatabaseOperationFactory<IoTDataPoint> dataPointFactory,
        IDatabaseOperationFactory<IoTDataRecord> dataRecordFactory,
        IIoTDataFetchClient fetchClient,
        IOptionsMonitor<IoTDataCollectionOptions> optionsMonitor,
        ILogger<IoTDataCollector> logger)
    {
        _gatewayFactory = gatewayFactory;
        _deviceFactory = deviceFactory;
        _dataPointFactory = dataPointFactory;
        _dataRecordFactory = dataRecordFactory;
        _fetchClient = fetchClient;
        _optionsMonitor = optionsMonitor;
        _logger = logger;
    }

    /// <summary>
    /// 执行一次采集
    /// </summary>
    public async Task<IoTDataCollectionResult> RunOnceAsync(CancellationToken cancellationToken)
    {
        var options = _optionsMonitor.CurrentValue;
        var result = new IoTDataCollectionResult();

        if (!options.Enabled)
        {
            _logger.LogInformation("IoT data collection is disabled via configuration.");
            return result;
        }

        using var timeoutCts = CancellationTokenSource.CreateLinkedTokenSource(cancellationToken);
        timeoutCts.CancelAfter(TimeSpan.FromSeconds(options.TimeoutSeconds));
        var token = timeoutCts.Token;

        var warnings = new ConcurrentBag<string>();
        var devicesProcessed = 0;
        var dataPointsProcessed = 0;
        var recordsInserted = 0;
        var recordsSkipped = 0;

        var pageIndex = 1;
        while (!token.IsCancellationRequested)
        {
            var deviceFilter = _deviceFactory.CreateFilterBuilder()
                .Equal(d => d.IsEnabled, true)
                .ExcludeDeleted()
                .Build();
            var deviceSort = _deviceFactory.CreateSortBuilder()
                .Descending(d => d.CreatedAt)
                .Build();

            var (devices, total) = await _deviceFactory.FindPagedAsync(
                deviceFilter,
                deviceSort,
                pageIndex,
                options.PageSize).ConfigureAwait(false);

            if (devices.Count == 0)
            {
                break;
            }

            var throttler = new SemaphoreSlim(Math.Max(1, options.MaxDegreeOfParallelism));
            var deviceTasks = devices.Select(async device =>
            {
                await throttler.WaitAsync(token).ConfigureAwait(false);
                try
                {
                    var deviceResult = await ProcessDeviceAsync(device, token).ConfigureAwait(false);
                    Interlocked.Add(ref dataPointsProcessed, deviceResult.DataPointsProcessed);
                    Interlocked.Add(ref recordsInserted, deviceResult.RecordsInserted);
                    Interlocked.Add(ref recordsSkipped, deviceResult.RecordsSkipped);
                    if (deviceResult.Warning != null)
                    {
                        warnings.Add(deviceResult.Warning);
                    }
                    Interlocked.Increment(ref devicesProcessed);
                }
                catch (OperationCanceledException)
                {
                    // respect cancellation
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Collect data for device {DeviceId} failed", device.DeviceId);
                    warnings.Add($"设备 {device.DeviceId} 采集失败: {ex.Message}");
                }
                finally
                {
                    throttler.Release();
                }
            }).ToList();

            await Task.WhenAll(deviceTasks).ConfigureAwait(false);

            if (pageIndex * options.PageSize >= total)
            {
                break;
            }

            pageIndex++;
        }

        result.DevicesProcessed = devicesProcessed;
        result.DataPointsProcessed = dataPointsProcessed;
        result.RecordsInserted = recordsInserted;
        result.RecordsSkipped = recordsSkipped;
        result.Warnings = warnings.ToList();

        return result;
    }

    private async Task<DeviceProcessResult> ProcessDeviceAsync(
        IoTDevice device,
        CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(device.CompanyId))
        {
            return DeviceProcessResult.WithWarning($"设备 {device.DeviceId} 缺少企业信息，已跳过。");
        }

        var gateway = await FindGatewayAsync(device.CompanyId, device.GatewayId, cancellationToken).ConfigureAwait(false);

        var dataPointFilter = _dataPointFactory.CreateFilterBuilder()
            .Equal(dp => dp.DeviceId, device.DeviceId)
            .Equal(dp => dp.IsEnabled, true)
            .WithTenant(device.CompanyId)
            .ExcludeDeleted()
            .Build();

        var dataPoints = await _dataPointFactory.FindAsync(dataPointFilter).ConfigureAwait(false);
        if (dataPoints.Count == 0)
        {
            return DeviceProcessResult.WithWarning($"设备 {device.DeviceId} 未配置可用数据点，已跳过。");
        }

        var collected = await _fetchClient.FetchAsync(gateway, device, dataPoints, cancellationToken).ConfigureAwait(false);
        if (collected.Count == 0)
        {
            return DeviceProcessResult.WithWarning($"设备 {device.DeviceId} 未返回任何采集数据。");
        }

        var dpLookup = dataPoints.ToDictionary(dp => dp.DataPointId, dp => dp);
        var recordsInserted = 0;
        var recordsSkipped = 0;

        foreach (var item in collected)
        {
            cancellationToken.ThrowIfCancellationRequested();

            if (!dpLookup.TryGetValue(item.DataPointId, out var dataPoint))
            {
                recordsSkipped++;
                continue;
            }

            var record = BuildRecord(device, dataPoint, item);
            var exists = await CheckDuplicateAsync(device.CompanyId, record, cancellationToken).ConfigureAwait(false);
            if (exists)
            {
                recordsSkipped++;
                continue;
            }

            await _dataRecordFactory.CreateAsync(record).ConfigureAwait(false);
            await UpdateDataPointAsync(device.CompanyId, dataPoint, record, cancellationToken).ConfigureAwait(false);
            await UpdateDeviceAsync(device.CompanyId, device, record, cancellationToken).ConfigureAwait(false);
            recordsInserted++;
        }

        return new DeviceProcessResult
        {
            DataPointsProcessed = dataPoints.Count,
            RecordsInserted = recordsInserted,
            RecordsSkipped = recordsSkipped
        };
    }

    private async Task<IoTGateway?> FindGatewayAsync(string companyId, string gatewayId, CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(gatewayId))
        {
            return null;
        }

        var filter = _gatewayFactory.CreateFilterBuilder()
            .Equal(g => g.GatewayId, gatewayId)
            .WithTenant(companyId)
            .ExcludeDeleted()
            .Build();

        var gateways = await _gatewayFactory.FindAsync(filter, limit: 1).ConfigureAwait(false);
        return gateways.FirstOrDefault();
    }

    private IoTDataRecord BuildRecord(IoTDevice device, IoTDataPoint dataPoint, CollectedDataPointValue item)
    {
        var reportedAt = item.ReportedAt ?? DateTime.UtcNow;
        var (isAlarm, alarmLevel) = EvaluateAlarm(dataPoint, item.Value, item.IsAlarm, item.AlarmLevel);

        return new IoTDataRecord
        {
            DeviceId = device.DeviceId,
            DataPointId = dataPoint.DataPointId,
            Value = item.Value,
            DataType = dataPoint.DataType,
            SamplingInterval = dataPoint.SamplingInterval,
            ReportedAt = reportedAt,
            IsAlarm = isAlarm,
            AlarmLevel = alarmLevel,
            Remarks = item.Remarks,
            CompanyId = device.CompanyId
        };
    }

    private async Task<bool> CheckDuplicateAsync(string companyId, IoTDataRecord record, CancellationToken cancellationToken)
    {
        var filter = _dataRecordFactory.CreateFilterBuilder()
            .Equal(r => r.DeviceId, record.DeviceId)
            .Equal(r => r.DataPointId, record.DataPointId)
            .Equal(r => r.ReportedAt, record.ReportedAt)
            .WithTenant(companyId)
            .ExcludeDeleted()
            .Build();

        var count = await _dataRecordFactory.CountAsync(filter).ConfigureAwait(false);
        cancellationToken.ThrowIfCancellationRequested();
        return count > 0;
    }

    private async Task UpdateDataPointAsync(string companyId, IoTDataPoint dataPoint, IoTDataRecord record, CancellationToken cancellationToken)
    {
        var filter = _dataPointFactory.CreateFilterBuilder()
            .Equal(dp => dp.DataPointId, dataPoint.DataPointId)
            .WithTenant(companyId)
            .ExcludeDeleted()
            .Build();

        var update = _dataPointFactory.CreateUpdateBuilder()
            .Set(dp => dp.LastValue, record.Value)
            .Set(dp => dp.LastUpdatedAt, record.ReportedAt)
            .Build();

        await _dataPointFactory.FindOneAndUpdateAsync(filter, update).ConfigureAwait(false);
        cancellationToken.ThrowIfCancellationRequested();
    }

    private async Task UpdateDeviceAsync(string companyId, IoTDevice device, IoTDataRecord record, CancellationToken cancellationToken)
    {
        var filter = _deviceFactory.CreateFilterBuilder()
            .Equal(d => d.DeviceId, device.DeviceId)
            .WithTenant(companyId)
            .ExcludeDeleted()
            .Build();

        var update = _deviceFactory.CreateUpdateBuilder()
            .Set(d => d.LastReportedAt, record.ReportedAt)
            .Build();

        await _deviceFactory.FindOneAndUpdateAsync(filter, update).ConfigureAwait(false);
        cancellationToken.ThrowIfCancellationRequested();
    }

    private static (bool IsAlarm, string? AlarmLevel) EvaluateAlarm(
        IoTDataPoint dataPoint,
        string value,
        bool? sourceIsAlarm,
        string? sourceLevel)
    {
        if (sourceIsAlarm.HasValue)
        {
            return (sourceIsAlarm.Value, sourceLevel);
        }

        if (dataPoint.AlarmConfig?.IsEnabled != true)
        {
            return (false, null);
        }

        if (!double.TryParse(value, out var numeric))
        {
            return (false, null);
        }

        var config = dataPoint.AlarmConfig;
        return config.AlarmType switch
        {
            "HighThreshold" => (numeric > config.Threshold, config.Level),
            "LowThreshold" => (numeric < config.Threshold, config.Level),
            "RangeThreshold" => (numeric < config.Threshold || numeric > (config.Threshold * 2), config.Level),
            _ => (false, null)
        };
    }

    private class DeviceProcessResult
    {
        public int DataPointsProcessed { get; set; }
        public int RecordsInserted { get; set; }
        public int RecordsSkipped { get; set; }
        public string? Warning { get; set; }

        public static DeviceProcessResult WithWarning(string warning) => new()
        {
            Warning = warning
        };
    }
}
