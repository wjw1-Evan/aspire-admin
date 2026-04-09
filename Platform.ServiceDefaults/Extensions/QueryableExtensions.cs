using System.Linq.Dynamic.Core;

namespace Platform.ServiceDefaults.Extensions;

public static class QueryableExtensions
{
    public static PagedResult<T> ToPagedList<T>(
        this IQueryable<T> query,
        Models.PageParams? pageParams)
    {
        var p = pageParams ?? new Models.PageParams();

        var field = string.IsNullOrWhiteSpace(p.SortBy) ? "createdAt" : p.SortBy.Trim();
        var isDesc = string.IsNullOrWhiteSpace(p.SortOrder) || p.SortOrder.Equals("desc", StringComparison.OrdinalIgnoreCase);
        query = query.OrderBy(isDesc ? $"{field} descending" : field);

        return query.PageResult(p.Page, p.PageSize);
    }
}