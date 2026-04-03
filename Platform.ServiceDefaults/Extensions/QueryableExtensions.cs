using System.Linq.Expressions;
using System.Linq.Dynamic.Core;

namespace Platform.ServiceDefaults.Extensions;

/// <summary>
/// 通用查询扩展方法 - 整合搜索、排序、分页
/// </summary>
public static class QueryableExtensions
{
    /// <summary>
    /// 分页查询（全文搜索 + 自动排序 + 分页）
    /// 
    /// 自动处理：
    /// 1. 全文搜索：搜索所有 string 类型字段（不区分大小写）
    /// 2. 自动排序：根据 PageParams.SortBy/SortOrder 参数，如未指定则默认按 createdAt 降序
    /// 3. 分页：根据 PageParams.Page/PageSize 参数
    /// </summary>
    public static PagedResult<T> ToPagedList<T>(
        this IQueryable<T> query,
        Models.PageParams? pageParams)
    {
        // 1. 全文搜索
        if (!string.IsNullOrWhiteSpace(pageParams?.Search))
        {
            query = query.Where(BuildSearchFilter<T>(pageParams.Search));
        }

        // 2. 排序
        query = query.ApplySort(pageParams);

        // 3. 分页
        return query.PageResult(pageParams?.Page ?? 1, pageParams?.PageSize ?? 10);
    }

    /// <summary>
    /// 构建全文搜索过滤器
    /// 搜索所有 string 类型字段（不区分大小写）
    /// </summary>
    private static Expression<Func<T, bool>> BuildSearchFilter<T>(string keyword)
    {
        var parameter = Expression.Parameter(typeof(T), "x");
        Expression? combined = null;

        var stringProperties = typeof(T).GetProperties()
            .Where(p => p.PropertyType == typeof(string) && p.CanRead);

        foreach (var prop in stringProperties)
        {
            var propertyAccess = Expression.Property(parameter, prop);
            var toLowerMethod = typeof(string).GetMethod("ToLower", Type.EmptyTypes);
            var containsMethod = typeof(string).GetMethod("Contains", new[] { typeof(string) });

            var toLowerCall = Expression.Call(propertyAccess, toLowerMethod!);
            var keywordConstant = Expression.Constant(keyword.ToLower());
            var containsExpression = Expression.Call(toLowerCall, containsMethod!, keywordConstant);

            combined = combined == null
                ? (Expression)containsExpression
                : Expression.OrElse(combined, containsExpression);
        }

        if (combined == null)
            return _ => true;

        return Expression.Lambda<Func<T, bool>>(combined, parameter);
    }

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
