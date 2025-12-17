using System.Collections.Concurrent;
using System.Linq;
using Microsoft.Extensions.Http;
using Microsoft.Extensions.Logging;
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
    private readonly IHttpClientFactory _httpClientFactory;
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
        IHttpClientFactory httpClientFactory,
        IOptionsMonitor<IoTDataCollectionOptions> optionsMonitor,
        ILogger<IoTDataCollector> logger)
    {
        _gatewayFactory = gatewayFactory;
        _deviceFactory = deviceFactory;
        _dataPointFactory = dataPointFactory;
        _dataRecordFactory = dataRecordFactory;
        _fetchClient = fetchClient;
        _httpClientFactory = httpClientFactory;
        _optionsMonitor = optionsMonitor;
        _logger = logger;
    }

    /// <summary>
    /// 执行一次采集（统一模式：自动处理所有网关和设备）
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

        // 统一模式：按网关处理
        // 1. HTTP网关：自动创建设备和数据点（如果不存在），然后采集
        // 2. 非HTTP网关：使用手动创建的设备和数据点采集
        // 后台服务需要跨租户查询所有启用的网关
        var gatewayFilter = _gatewayFactory.CreateFilterBuilder()
            .Equal(g => g.IsEnabled, true)
            .ExcludeDeleted()
            .Build();

        var gateways = await _gatewayFactory.FindWithoutTenantFilterAsync(gatewayFilter).ConfigureAwait(false);
        
        if (gateways.Count == 0)
        {
            _logger.LogDebug("No enabled gateways found");
            return result;
        }

        // 按租户分组处理，确保数据隔离
        var gatewaysByTenant = gateways
            .Where(g => !string.IsNullOrWhiteSpace(g.CompanyId))
            .GroupBy(g => g.CompanyId)
            .ToList();

        _logger.LogInformation("Starting unified data collection for {GatewayCount} gateways across {TenantCount} tenants", 
            gateways.Count, gatewaysByTenant.Count);

        var throttler = new SemaphoreSlim(Math.Max(1, options.MaxDegreeOfParallelism));
        // 按租户分组处理网关，确保数据隔离
        var gatewayTasks = gatewaysByTenant.SelectMany(tenantGroup =>
        {
            var companyId = tenantGroup.Key;
            _logger.LogDebug("Processing {Count} gateways for company {CompanyId}", tenantGroup.Count(), companyId);
            
            return tenantGroup.Select(async gateway =>
            {
                await throttler.WaitAsync(token).ConfigureAwait(false);
                try
                {
                    _logger.LogDebug("Processing gateway {GatewayId} for company {CompanyId}", gateway.GatewayId, companyId);
                    var gatewayResult = await ProcessGatewayAsync(gateway, token).ConfigureAwait(false);
                    Interlocked.Add(ref devicesProcessed, gatewayResult.DevicesProcessed);
                    Interlocked.Add(ref dataPointsProcessed, gatewayResult.DataPointsProcessed);
                    Interlocked.Add(ref recordsInserted, gatewayResult.RecordsInserted);
                    Interlocked.Add(ref recordsSkipped, gatewayResult.RecordsSkipped);
                    foreach (var warning in gatewayResult.Warnings)
                    {
                        warnings.Add(warning);
                    }
                }
                catch (OperationCanceledException)
                {
                    // respect cancellation
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Collect data for gateway {GatewayId} (company {CompanyId}) failed", 
                        gateway.GatewayId, companyId);
                    warnings.Add($"网关 {gateway.GatewayId} (企业 {companyId}) 采集失败: {ex.Message}");
                }
                finally
                {
                    throttler.Release();
                }
            });
        }).ToList();

        await Task.WhenAll(gatewayTasks).ConfigureAwait(false);

        result.DevicesProcessed = devicesProcessed;
        result.DataPointsProcessed = dataPointsProcessed;
        result.RecordsInserted = recordsInserted;
        result.RecordsSkipped = recordsSkipped;
        result.Warnings = warnings.ToList();

        return result;
    }

    /// <summary>
    /// 统一处理网关：根据网关类型自动选择处理方式
    /// </summary>
    private async Task<IoTDataCollectionResult> ProcessGatewayAsync(
        IoTGateway gateway,
        CancellationToken cancellationToken)
    {
        var result = new IoTDataCollectionResult();
        var warnings = new List<string>();

        // HTTP网关：使用简化模式（自动创建设备和数据点）
        if (gateway.ProtocolType?.Equals("HTTP", StringComparison.OrdinalIgnoreCase) == true)
        {
            var simpleCollectorLogger = Microsoft.Extensions.Logging.Abstractions.NullLogger<SimpleHttpDataCollector>.Instance;
            var simpleCollector = new SimpleHttpDataCollector(
                _gatewayFactory,
                _deviceFactory,
                _dataPointFactory,
                _dataRecordFactory,
                _httpClientFactory,
                _optionsMonitor,
                simpleCollectorLogger);

            var gatewayResult = await simpleCollector.CollectGatewayDataAsync(gateway, cancellationToken).ConfigureAwait(false);
            
            if (gatewayResult.Success)
            {
                result.DevicesProcessed = 1;
                result.DataPointsProcessed = gatewayResult.DataPointsFound;
                result.RecordsInserted = gatewayResult.RecordsInserted;
                result.RecordsSkipped = gatewayResult.RecordsSkipped;
            }
            else if (!string.IsNullOrWhiteSpace(gatewayResult.Warning))
            {
                warnings.Add(gatewayResult.Warning);
            }
        }
        else
        {
            // 非HTTP网关：使用传统模式（处理网关下的所有设备）
            var deviceFilter = _deviceFactory.CreateFilterBuilder()
                .Equal(d => d.GatewayId, gateway.GatewayId)
                .Equal(d => d.IsEnabled, true)
                .WithTenant(gateway.CompanyId)
                .ExcludeDeleted()
                .Build();

            var devices = await _deviceFactory.FindAsync(deviceFilter).ConfigureAwait(false);
            
            if (devices.Count == 0)
            {
                warnings.Add($"网关 {gateway.GatewayId} 下没有启用的设备");
            }
            else
            {
                foreach (var device in devices)
                {
                    cancellationToken.ThrowIfCancellationRequested();
                    
                    var deviceResult = await ProcessDeviceAsync(device, cancellationToken).ConfigureAwait(false);
                    result.DataPointsProcessed += deviceResult.DataPointsProcessed;
                    result.RecordsInserted += deviceResult.RecordsInserted;
                    result.RecordsSkipped += deviceResult.RecordsSkipped;
                    if (deviceResult.Warning != null)
                    {
                        warnings.Add(deviceResult.Warning);
                    }
                    result.DevicesProcessed++;
                }
            }
        }

        result.Warnings = warnings;
        return result;
    }


    private async Task<DeviceProcessResult> ProcessDeviceAsync(
        IoTDevice device,
        CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(device.CompanyId))
        {
            _logger.LogWarning("Device {DeviceId} missing CompanyId, skipping", device.DeviceId);
            return DeviceProcessResult.WithWarning($"设备 {device.DeviceId} 缺少企业信息，已跳过。");
        }

        if (string.IsNullOrWhiteSpace(device.GatewayId))
        {
            _logger.LogWarning("Device {DeviceId} missing GatewayId, skipping", device.DeviceId);
            return DeviceProcessResult.WithWarning($"设备 {device.DeviceId} 缺少网关信息，已跳过。");
        }

        var gateway = await FindGatewayAsync(device.CompanyId, device.GatewayId, cancellationToken).ConfigureAwait(false);
        if (gateway == null)
        {
            _logger.LogWarning("Gateway {GatewayId} not found for device {DeviceId}", device.GatewayId, device.DeviceId);
            return DeviceProcessResult.WithWarning($"设备 {device.DeviceId} 的网关 {device.GatewayId} 不存在，已跳过。");
        }

        _logger.LogDebug("Processing device {DeviceId} with gateway {GatewayId} (Protocol: {Protocol})", 
            device.DeviceId, gateway.GatewayId, gateway.ProtocolType);

        var dataPointFilter = _dataPointFactory.CreateFilterBuilder()
            .Equal(dp => dp.DeviceId, device.DeviceId)
            .Equal(dp => dp.IsEnabled, true)
            .WithTenant(device.CompanyId)
            .ExcludeDeleted()
            .Build();

        var dataPoints = await _dataPointFactory.FindAsync(dataPointFilter).ConfigureAwait(false);
        if (dataPoints.Count == 0)
        {
            _logger.LogWarning("Device {DeviceId} has no enabled data points configured", device.DeviceId);
            return DeviceProcessResult.WithWarning($"设备 {device.DeviceId} 未配置可用数据点，已跳过。");
        }

        _logger.LogDebug("Fetching data for device {DeviceId} with {DataPointCount} data points", 
            device.DeviceId, dataPoints.Count);

        var collected = await _fetchClient.FetchAsync(gateway, device, dataPoints, cancellationToken).ConfigureAwait(false);
        if (collected.Count == 0)
        {
            _logger.LogWarning("Device {DeviceId} returned no collected data", device.DeviceId);
            return DeviceProcessResult.WithWarning($"设备 {device.DeviceId} 未返回任何采集数据。");
        }

        _logger.LogInformation("Device {DeviceId} collected {CollectedCount}/{TotalDataPoints} data points", 
            device.DeviceId, collected.Count, dataPoints.Count);

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
