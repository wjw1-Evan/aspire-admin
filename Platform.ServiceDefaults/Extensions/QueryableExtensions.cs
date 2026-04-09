using System.Linq.Dynamic.Core;

namespace Platform.ServiceDefaults.Extensions;

public static class QueryableExtensions
{
    public static PagedResult<T> ToPagedList<T>(
        this IQueryable<T> query,
        Models.PageParams? pageParams)
    {
        var p = pageParams ?? new Models.PageParams();

        if (!string.IsNullOrWhiteSpace(p.Search))
        {
            var props = typeof(T).GetProperties()
                .Where(x => x.CanRead 
                    && x.GetIndexParameters().Length == 0 
                    && x.PropertyType == typeof(string))
                .Select(x => x.Name)
                .ToList();

            if (props.Count > 0)
            {
                var conditions = props.Select(x => $"(@0 != null && {x} != null && {x}.Contains(@0))");
                var expr = string.Join(" || ", conditions);
                query = query.Where(expr, p.Search);
            }
        }

        var field = string.IsNullOrWhiteSpace(p.SortBy) ? "createdAt" : p.SortBy.Trim();
        var isDesc = string.IsNullOrWhiteSpace(p.SortOrder) || p.SortOrder.Equals("desc", StringComparison.OrdinalIgnoreCase);
        query = query.OrderBy(isDesc ? $"{field} descending" : field);

        return query.PageResult(p.Page, p.PageSize);
    }
}