using System.ComponentModel.DataAnnotations;

namespace Platform.ApiService.Options;

/// <summary>
/// 物联网数据定时采集配置
/// </summary>
public class IoTDataCollectionOptions
{
    /// <summary>配置节名称</summary>
    public const string SectionName = "IoTDataCollection";

    /// <summary>是否启用定时采集</summary>
    public bool Enabled { get; set; } = false;

    /// <summary>Cron 表达式，默认每5分钟执行一次（含秒）</summary>
    [Required]
    public string Cron { get; set; } = "0 */5 * * * *";

    /// <summary>分页读取设备的每页数量</summary>
    [Range(1, 1000)]
    public int PageSize { get; set; } = 100;

    /// <summary>单次运行的最大并行度（设备级）</summary>
    [Range(1, 32)]
    public int MaxDegreeOfParallelism { get; set; } = 4;

    /// <summary>单次运行的超时时间（秒）</summary>
    [Range(5, 600)]
    public int TimeoutSeconds { get; set; } = 120;

    /// <summary>无真实数据源时是否生成模拟数据（仅开发环境建议开启）</summary>
    public bool GenerateMockData { get; set; } = false;

    /// <summary>模拟数据的最小值</summary>
    public double MockMinValue { get; set; } = 0;

    /// <summary>模拟数据的最大值</summary>
    public double MockMaxValue { get; set; } = 100;
}
