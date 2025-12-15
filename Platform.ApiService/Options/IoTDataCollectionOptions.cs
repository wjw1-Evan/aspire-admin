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

    /// <summary>HTTP 拉取设置（可选）</summary>
    public HttpFetchOptions HttpFetch { get; set; } = new();
}

/// <summary>
/// HTTP 拉取配置
/// </summary>
public class HttpFetchOptions
{
    /// <summary>是否启用 HTTP 拉取</summary>
    public bool Enabled { get; set; } = false;

    /// <summary>请求方法：GET/POST/PUT/PATCH/DELETE/PULL</summary>
    [Required]
    public HttpFetchMethod Method { get; set; } = HttpFetchMethod.Get;

    /// <summary>设备级 URL 模板，支持 {deviceId}</summary>
    [Required]
    public string UrlTemplate { get; set; } = string.Empty;

    /// <summary>可选：查询字符串模板（k-v 字典，值可包含 {deviceId})</summary>
    public Dictionary<string, string> Query { get; set; } = new();

    /// <summary>可选：请求头模板</summary>
    public Dictionary<string, string> Headers { get; set; } = new();

    /// <summary>可选：Body 模板（对 GET 会忽略），可包含 {deviceId}</summary>
    public string? BodyTemplate { get; set; }

    /// <summary>请求超时（秒）</summary>
    [Range(1, 300)]
    public int RequestTimeoutSeconds { get; set; } = 30;

    /// <summary>重试次数（仅对幂等方法，GET/PUT/DELETE/PULL）</summary>
    [Range(0, 5)]
    public int RetryCount { get; set; } = 1;

    /// <summary>重试延迟（毫秒）</summary>
    [Range(0, 10000)]
    public int RetryDelayMs { get; set; } = 500;
}

/// <summary>
/// HTTP 拉取方法枚举
/// </summary>
public enum HttpFetchMethod
{
    Get,
    Post,
    Put,
    Patch,
    Delete,
    Pull
}
