using System.Linq.Dynamic.Core;
using System.Linq.Expressions;

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
            var parameter = Expression.Parameter(typeof(T), "x");
            var searchValue = Expression.Constant(p.Search);
            var conditions = new List<Expression>();

            var props = typeof(T).GetProperties()
                .Where(x => x.CanRead 
                    && x.GetIndexParameters().Length == 0 
                    && x.PropertyType == typeof(string));

            foreach (var prop in props)
            {
                var property = Expression.Property(parameter, prop);
                var nullCheck = Expression.AndAlso(
                    Expression.NotEqual(property, Expression.Constant(null, typeof(string))),
                    Expression.Call(property, "Contains", null, searchValue));
                conditions.Add(nullCheck);
            }

            if (conditions.Count > 0)
            {
                var combined = conditions.Aggregate(Expression.OrElse);
                var lambda = Expression.Lambda<Func<T, bool>>(combined, parameter);
                query = query.Where(lambda);
            }
        }

        var field = string.IsNullOrWhiteSpace(p.SortBy) ? "createdAt" : p.SortBy.Trim();
        var isDesc = string.IsNullOrWhiteSpace(p.SortOrder) || p.SortOrder.Equals("desc", StringComparison.OrdinalIgnoreCase);
        query = query.OrderBy(isDesc ? $"{field} descending" : field);

        return query.PageResult(p.Page, p.PageSize);
    }
}