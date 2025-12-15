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
    /// <param name="gateway">所属网关</param>
    /// <param name="device">设备</param>
    /// <param name="dataPoints">需采集的数据点列表</param>
    /// <param name="cancellationToken">取消令牌</param>
    /// <returns>采集结果列表</returns>
    Task<IReadOnlyList<CollectedDataPointValue>> FetchAsync(
        IoTGateway? gateway,
        IoTDevice device,
        IReadOnlyList<IoTDataPoint> dataPoints,
        CancellationToken cancellationToken);
}
