using Platform.ApiService.Models;

namespace Platform.ApiService.Services;

/// <summary>
/// 采集到的数据点值
/// </summary>
public class CollectedDataPointValue
{
    /// <summary>数据点唯一标识符</summary>
    public string DataPointId { get; set; } = string.Empty;

    /// <summary>采集到的值（保持字符串，避免精度丢失）</summary>
    public string Value { get; set; } = string.Empty;

    /// <summary>采集/上报时间</summary>
    public DateTime? ReportedAt { get; set; }

    /// <summary>是否为告警数据（可由采集端标注）</summary>
    public bool? IsAlarm { get; set; }

    /// <summary>告警级别</summary>
    public string? AlarmLevel { get; set; }

    /// <summary>备注或采集来源</summary>
    public string? Remarks { get; set; }
}

/// <summary>
/// 单次采集运行的统计结果
/// </summary>
public class IoTDataCollectionResult
{
    /// <summary>已处理设备数量</summary>
    public int DevicesProcessed { get; set; }
    /// <summary>已处理数据点数量</summary>
    public int DataPointsProcessed { get; set; }
    /// <summary>成功写入的数据记录数量</summary>
    public int RecordsInserted { get; set; }
    /// <summary>因重复或其他原因跳过的记录数量</summary>
    public int RecordsSkipped { get; set; }
    /// <summary>运行过程中的警告信息</summary>
    public List<string> Warnings { get; set; } = new();
}
