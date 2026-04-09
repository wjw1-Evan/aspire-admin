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
                .Where(x => x.CanRead && x.GetIndexParameters().Length == 0)
                .ToList();

            var stringProps = props.Where(x => x.PropertyType == typeof(string)).Select(x => x.Name).ToList();
            var conditions = new List<string>();
            var values = new List<object>();

            foreach (var prop in props)
            {
                var type = prop.PropertyType;

                if (type == typeof(string))
                {
                    continue;
                }

                var (converted, success) = TryConvert(p.Search, type);
                if (success)
                {
                    conditions.Add($"{prop.Name} == @{values.Count}");
                    values.Add(converted!);
                }
            }

            if (stringProps.Count > 0)
            {
                var stringExpr = string.Join(" || ", stringProps.Select(x => $"iif({x} != null, {x}.Contains(@{values.Count}), false)"));
                conditions.Add(stringExpr);
                values.Add(p.Search);
            }

            if (conditions.Count > 0)
            {
                query = query.Where(string.Join(" || ", conditions), values.ToArray());
            }
        }

        var field = string.IsNullOrWhiteSpace(p.SortBy) ? "createdAt" : p.SortBy.Trim();
        var isDesc = string.IsNullOrWhiteSpace(p.SortOrder) || p.SortOrder.Equals("desc", StringComparison.OrdinalIgnoreCase);
        query = query.OrderBy(isDesc ? $"{field} descending" : field);

        return query.PageResult(p.Page, p.PageSize);
    }

    private static (object? value, bool success) TryConvert(string input, Type targetType)
    {
        try
        {
            if (targetType == typeof(int))
            {
                if (int.TryParse(input, out var v)) return (v, true);
            }
            if (targetType == typeof(long))
            {
                if (long.TryParse(input, out var v)) return (v, true);
            }
            if (targetType == typeof(double))
            {
                if (double.TryParse(input, out var v)) return (v, true);
            }
            if (targetType == typeof(decimal))
            {
                if (decimal.TryParse(input, out var v)) return (v, true);
            }
            if (targetType == typeof(Guid))
            {
                if (Guid.TryParse(input, out var v)) return (v, true);
            }
            if (targetType == typeof(bool))
            {
                if (bool.TryParse(input, out var v)) return (v, true);
                if (input.Equals("1", StringComparison.OrdinalIgnoreCase)) return (true, true);
                if (input.Equals("0", StringComparison.OrdinalIgnoreCase)) return (false, true);
            }
            if (targetType.IsEnum)
            {
                if (Enum.TryParse(targetType, input, true, out var v)) return (v!, true);
            }
        }
        catch
        {
        }
        return (null, false);
    }
}