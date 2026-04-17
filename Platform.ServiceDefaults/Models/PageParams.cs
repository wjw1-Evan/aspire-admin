namespace Platform.ServiceDefaults.Models;

/// <summary>
/// 分页参数
/// </summary>
public sealed class PageParams
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
    /// 排序字段
    /// </summary>
    public string? SortBy { get; set; }

    /// <summary>
    /// 排序方向（asc/desc）
    /// </summary>
    public string SortOrder { get; set; } = "desc";

    /// <summary>
    /// 搜索关键词（全文搜索）
    /// </summary>
    public string? Search { get; set; }

    /// <summary>
    /// 排序配置（JSON序列化）
    /// </summary>
    public string? Sort { get; set; }

    /// <summary>
    /// 过滤条件（JSON序列化）
    /// </summary>
    public string? Filter { get; set; }
}
