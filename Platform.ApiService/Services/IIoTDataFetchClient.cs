using Platform.ApiService.Models;

namespace Platform.ApiService.Services;

/// <summary>
/// IoT 数据源客户端，用于从网关/第三方读取最新数据
/// </summary>
public interface IIoTDataFetchClient
{
    /// <summary>
    /// 拉取指定设备的数据点最新值
    /// </summary>
    Task<IReadOnlyList<CollectedDataPointValue>> FetchAsync(
        IoTGateway? gateway,
        IoTDevice device,
        IReadOnlyList<IoTDataPoint> dataPoints,
        CancellationToken cancellationToken);
}
