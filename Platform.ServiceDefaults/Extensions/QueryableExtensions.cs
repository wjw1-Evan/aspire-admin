using System.Linq.Dynamic.Core;

namespace Platform.ServiceDefaults.Extensions;

public static class QueryableExtensions
{
    private static readonly HashSet<string> NonSearchableTypes = new()
    {
        typeof(object).FullName!,
        typeof(Dictionary<,>).FullName!,
        typeof(IDictionary<,>).FullName!,
        "System.Collections.Generic.Dictionary`2",
        "System.Collections.IDictionary"
    };

    private static bool IsSearchableType(Type type)
    {
        if (type.IsArray || type.IsGenericType)
        {
            var genType = type.GetGenericTypeDefinition().FullName ?? "";
            if (NonSearchableTypes.Contains(genType) || type.FullName?.StartsWith("System.Collections.Generic.List") == false)
            {
                return type == typeof(string);
            }
        }
        return type == typeof(string);
    }

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
                    && IsSearchableType(x.PropertyType))
                .Select(x => x.Name)
                .ToList();

            if (props.Count > 0)
            {
                var expr = string.Join(" || ", props.Select(x => $"iif({x} != null, {x}.Contains(@0), false)"));
                query = query.Where(expr, p.Search);
            }
        }

        var field = string.IsNullOrWhiteSpace(p.SortBy) ? "createdAt" : p.SortBy.Trim();
        var isDesc = string.IsNullOrWhiteSpace(p.SortOrder) || p.SortOrder.Equals("desc", StringComparison.OrdinalIgnoreCase);
        query = query.OrderBy(isDesc ? $"{field} descending" : field);

        return query.PageResult(p.Page, p.PageSize);
    }
}