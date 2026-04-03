using System.Linq.Expressions;
using System.Linq.Dynamic.Core;
using System.Reflection;
using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;

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
    public static System.Linq.Dynamic.Core.PagedResult<T> ToPagedList<T>(
        this IQueryable<T> query,
        Platform.ServiceDefaults.Models.PageParams? pageParams)
    {
        // 1. 全文搜索
        if (!string.IsNullOrWhiteSpace(pageParams?.Search))
        {
            query = query.Where(BuildSearchFilter<T>(pageParams.Search));
        }

        // 2. 排序 - 使用 self 引用避免与其他扩展方法的歧义
        query = ApplySort(query, pageParams);

        // 3. 分页
        return query.PageResult(pageParams?.Page ?? 1, pageParams?.PageSize ?? 10);
    }

    /// <summary>
    /// 构建全文搜索过滤器
    /// 搜索所有 string 类型字段（不区分大小写）
    /// </summary>
    private static Expression<Func<T, bool>> BuildSearchFilter<T>(string keyword)
    {
        // 排除 BsonId 和 BsonRepresentation(ObjectId) 标注的字段，
        // 这些字段在 MongoDB 中存储为 ObjectId 类型，$indexOfCP 无法处理
        var searchableProperties = typeof(T).GetProperties()
            .Where(p => p.PropertyType == typeof(string) && p.CanRead)
            .Where(p => !p.IsDefined(typeof(BsonIdAttribute), true))
            .Where(p =>
            {
                var bsonRep = p.GetCustomAttribute<BsonRepresentationAttribute>();
                return bsonRep == null || bsonRep.Representation != BsonType.ObjectId;
            })
            .Select(p => p.Name)
            .ToList();

        if (searchableProperties.Count == 0)
            return _ => true;

        var conditions = searchableProperties
            .Select(prop => $"iif({prop} != null, {prop}.Contains(@0), false)")
            .ToList();

        var dynamicExpression = string.Join(" || ", conditions);
        return DynamicExpressionParser.ParseLambda<T, bool>(
            ParsingConfig.Default,
            false,
            dynamicExpression,
            keyword);
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

        // 验证字段是否存在，避免 MongoDB 聚合管道错误
        var validFields = typeof(T).GetProperties()
            .Where(p => p.CanRead)
            .Select(p => p.Name)
            .ToHashSet();

        if (!validFields.Contains(field))
        {
            field = defaultSortBy;
            isDescending = defaultIsDescending;
        }

        var expression = isDescending ? $"{field} descending" : field;
        return query.OrderBy(expression);
    }

    
}
