using System.Text.Json;

namespace Platform.ServiceDefaults.Models;

/// <summary>
/// ProTable 请求参数
/// </summary>
public sealed class ProTableRequest
{
    /// <summary>
    /// 当前页码
    /// </summary>
    public int Page { get; set; } = 1;

    /// <summary>
    /// 每页大小
    /// </summary>
    public int PageSize { get; set; } = 20;

    /// <summary>
    /// 搜索关键词
    /// </summary>
    public string? Search { get; set; }

    /// <summary>
    /// 排序参数，JSON 格式如 {"fieldName":"ascend"}
    /// </summary>
    public string? Sort { get; set; }

    /// <summary>
    /// 筛选参数，JSON 对象
    /// </summary>
    public string? Filter { get; set; }
}