using System.Linq.Dynamic.Core;

namespace Platform.ServiceDefaults.Extensions;

/// <summary>
/// 通用动态排序扩展方法 - 支持任意字段排序
/// </summary>
public static class QueryableSortExtensions
{
    /// <summary>
    /// 应用动态排序（通过 PageParams）
    /// </summary>
    public static IQueryable<T> ApplySort<T>(
        this IQueryable<T> query,
        Models.PageParams? pageParams,
        string defaultSortBy = "createdAt",
        bool defaultIsDescending = true)
    {
        var sortBy = pageParams?.SortBy;
        var sortOrder = pageParams?.SortOrder;
        
        var field = string.IsNullOrWhiteSpace(sortBy) ? defaultSortBy : sortBy.Trim();
        var isDescending = string.IsNullOrWhiteSpace(sortOrder) 
            ? defaultIsDescending 
            : sortOrder.Equals("desc", StringComparison.OrdinalIgnoreCase);

        var expression = isDescending ? $"{field} descending" : field;
        return query.OrderBy(expression);
    }
}
