using System.Collections.Generic;

namespace Platform.ServiceDefaults.Models;

/// <summary>
/// 通用分页结果包装
/// </summary>
public class ToPagedList<T>
{
    /// <summary>
    /// 当前页内容
    /// </summary>
    public List<T> Items { get; set; } = new List<T>();

    /// <summary>
    /// 总记录数
    /// </summary>
    public int TotalCount { get; set; }

    /// <summary>
    /// 当前页码（从 1 开始）
    /// </summary>
    public int PageNumber { get; set; }

    /// <summary>
    /// 每页大小
    /// </summary>
    public int PageSize { get; set; }

    /// <summary>
    /// 总页数
    /// </summary>
    public int TotalPages => PageSize == 0 ? 0 : (int)System.Math.Ceiling((double)TotalCount / PageSize);

    /// <summary>
    /// 是否有上一页
    /// </summary>
    public bool HasPrevious => PageNumber > 1;

    /// <summary>
    /// 是否有下一页
    /// </summary>
    public bool HasNext => PageNumber < TotalPages;
}
