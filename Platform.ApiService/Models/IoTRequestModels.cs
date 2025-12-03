namespace Platform.ApiService.Models;

#region Gateway Requests

/// <summary>
/// 创建物联网网关请求
/// </summary>
public class CreateIoTGatewayRequest
{
    public string Name { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public string? Description { get; set; }
    public string ProtocolType { get; set; } = "MQTT";
    public string Address { get; set; } = string.Empty;
    public int Port { get; set; } = 1883;
    public string? Username { get; set; }
    public string? Password { get; set; }
    public Dictionary<string, object>? Config { get; set; }
    public List<string>? Tags { get; set; }
    public string? Remarks { get; set; }
}

/// <summary>
/// 更新物联网网关请求
/// </summary>
public class UpdateIoTGatewayRequest
{
    public string? Name { get; set; }
    public string? Title { get; set; }
    public string? Description { get; set; }
    public string? ProtocolType { get; set; }
    public string? Address { get; set; }
    public int? Port { get; set; }
    public string? Username { get; set; }
    public string? Password { get; set; }
    public bool? IsEnabled { get; set; }
    public Dictionary<string, object>? Config { get; set; }
    public List<string>? Tags { get; set; }
    public string? Remarks { get; set; }
}

#endregion

#region Device Requests

/// <summary>
/// 创建物联网设备请求
/// </summary>
public class CreateIoTDeviceRequest
{
    public string Name { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public string? Description { get; set; }
    public string GatewayId { get; set; } = string.Empty;
    public IoTDeviceType DeviceType { get; set; } = IoTDeviceType.Sensor;
    public string? Model { get; set; }
    public string? Manufacturer { get; set; }
    public string? SerialNumber { get; set; }
    public string? Location { get; set; }
    public double? Latitude { get; set; }
    public double? Longitude { get; set; }
    public Dictionary<string, object>? Properties { get; set; }
    public List<string>? Tags { get; set; }
    public string? Remarks { get; set; }
}

/// <summary>
/// 更新物联网设备请求
/// </summary>
public class UpdateIoTDeviceRequest
{
    public string? Name { get; set; }
    public string? Title { get; set; }
    public string? Description { get; set; }
    public string? GatewayId { get; set; }
    public IoTDeviceType? DeviceType { get; set; }
    public string? Model { get; set; }
    public string? Manufacturer { get; set; }
    public string? SerialNumber { get; set; }
    public bool? IsEnabled { get; set; }
    public string? Location { get; set; }
    public double? Latitude { get; set; }
    public double? Longitude { get; set; }
    public Dictionary<string, object>? Properties { get; set; }
    public List<string>? Tags { get; set; }
    public string? Remarks { get; set; }
}

#endregion

#region DataPoint Requests

/// <summary>
/// 创建数据点请求
/// </summary>
public class CreateIoTDataPointRequest
{
    public string Name { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public string? Description { get; set; }
    public string DeviceId { get; set; } = string.Empty;
    public DataPointType DataType { get; set; } = DataPointType.Numeric;
    public string? Unit { get; set; }
    public double? MinValue { get; set; }
    public double? MaxValue { get; set; }
    public int Precision { get; set; } = 2;
    public bool IsReadOnly { get; set; } = true;
    public int SamplingInterval { get; set; } = 60;
    public AlarmConfig? AlarmConfig { get; set; }
    public List<string>? Tags { get; set; }
    public string? Remarks { get; set; }
}

/// <summary>
/// 更新数据点请求
/// </summary>
public class UpdateIoTDataPointRequest
{
    public string? Name { get; set; }
    public string? Title { get; set; }
    public string? Description { get; set; }
    public DataPointType? DataType { get; set; }
    public string? Unit { get; set; }
    public double? MinValue { get; set; }
    public double? MaxValue { get; set; }
    public int? Precision { get; set; }
    public bool? IsReadOnly { get; set; }
    public int? SamplingInterval { get; set; }
    public bool? IsEnabled { get; set; }
    public AlarmConfig? AlarmConfig { get; set; }
    public List<string>? Tags { get; set; }
    public string? Remarks { get; set; }
}

#endregion

#region Data Record Requests

/// <summary>
/// 上报数据请求
/// </summary>
public class ReportIoTDataRequest
{
    public string DeviceId { get; set; } = string.Empty;
    public string DataPointId { get; set; } = string.Empty;
    public string Value { get; set; } = string.Empty;
    public DateTime? ReportedAt { get; set; }
}

/// <summary>
/// 批量上报数据请求
/// </summary>
public class BatchReportIoTDataRequest
{
    public string DeviceId { get; set; } = string.Empty;
    public List<DataPointValue> DataPoints { get; set; } = new();
    public DateTime? ReportedAt { get; set; }
}

/// <summary>
/// 数据点值
/// </summary>
public class DataPointValue
{
    public string DataPointId { get; set; } = string.Empty;
    public string Value { get; set; } = string.Empty;
}

#endregion

#region Query Requests

/// <summary>
/// 查询物联网数据请求
/// </summary>
public class QueryIoTDataRequest
{
    public string? DeviceId { get; set; }
    public string? DataPointId { get; set; }
    public DateTime? StartTime { get; set; }
    public DateTime? EndTime { get; set; }
    public int PageIndex { get; set; } = 1;
    public int PageSize { get; set; } = 20;
}

/// <summary>
/// 查询设备事件请求
/// </summary>
public class QueryIoTEventRequest
{
    public string? DeviceId { get; set; }
    public string? EventType { get; set; }
    public string? Level { get; set; }
    public bool? IsHandled { get; set; }
    public DateTime? StartTime { get; set; }
    public DateTime? EndTime { get; set; }
    public int PageIndex { get; set; } = 1;
    public int PageSize { get; set; } = 20;
}

#endregion

#region Device Status Requests

/// <summary>
/// 设备连接请求
/// </summary>
public class DeviceConnectRequest
{
    public string DeviceId { get; set; } = string.Empty;
    public string? IpAddress { get; set; }
    public Dictionary<string, object>? Metadata { get; set; }
}

/// <summary>
/// 设备断开连接请求
/// </summary>
public class DeviceDisconnectRequest
{
    public string DeviceId { get; set; } = string.Empty;
    public string? Reason { get; set; }
}

#endregion

