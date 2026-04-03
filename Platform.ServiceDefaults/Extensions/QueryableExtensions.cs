using System.Linq.Dynamic.Core;
using System.Reflection;
using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;

namespace Platform.ServiceDefaults.Extensions;

/// <summary>
/// 通用查询扩展方法 - 基于 System.Linq.Dynamic.Core 整合搜索、排序、分页
/// </summary>
public static class QueryableExtensions
{
    /// <summary>
    /// 可搜索属性缓存（按类型），避免重复反射
    /// </summary>
    private static readonly Dictionary<Type, List<string>> _searchablePropertiesCache = new();

    /// <summary>
    /// 有效排序属性缓存（按类型），避免重复反射
    /// </summary>
    private static readonly Dictionary<Type, HashSet<string>> _sortablePropertiesCache = new();

    /// <summary>
    /// 分页查询（全文搜索 + 动态排序 + 分页）
    ///
    /// 自动处理：
    /// 1. 全文搜索：搜索所有纯 string 类型字段（排除 ObjectId），null 安全
    /// 2. 动态排序：根据 SortBy/SortOrder 参数，如未指定则默认按 createdAt 降序
    /// 3. 分页：根据 Page/PageSize 参数
    /// </summary>
    public static PagedResult<T> ToPagedList<T>(
        this IQueryable<T> query,
        Models.PageParams? pageParams)
    {
        var p = pageParams ?? new Models.PageParams();

        // 1. 全文搜索 - 动态 LINQ 表达式
        if (!string.IsNullOrWhiteSpace(p.Search))
        {
            var searchExpr = BuildDynamicSearchExpression<T>();
            if (searchExpr != null)
                query = query.Where(searchExpr, p.Search);
        }

        // 2. 动态排序
        query = query.ApplySort(p);

        // 3. 分页
        return query.PageResult(p.Page, p.PageSize);
    }

    /// <summary>
    /// 应用动态排序（通过 PageParams），使用 Dynamic LINQ OrderBy(string)
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
        var isDesc = string.IsNullOrWhiteSpace(sortOrder)
            ? defaultIsDescending
            : sortOrder.Equals("desc", StringComparison.OrdinalIgnoreCase);

        // 校验字段合法性，防止 MongoDB 聚合管道报错
        if (!GetSortableProperties<T>().Contains(field))
        {
            field = defaultSortBy;
            isDesc = defaultIsDescending;
        }

        return query.OrderBy(isDesc ? $"{field} descending" : field);
    }

    /// <summary>
    /// 构建动态 LINQ 搜索表达式字符串，用于 .Where(string, params)
    /// 返回 null 表示无可搜索字段
    /// </summary>
    private static string? BuildDynamicSearchExpression<T>()
    {
        var props = GetSearchableProperties<T>();
        if (props.Count == 0) return null;

        // iif(Prop != null, Prop.Contains(@0), false) 保证 null 安全
        var conditions = props.Select(p => $"iif({p} != null, {p}.Contains(@0), false)");
        return string.Join(" || ", conditions);
    }

    /// <summary>
    /// 获取可搜索的纯 string 属性名称列表（排除 BsonId / ObjectId 字段）
    /// </summary>
    private static List<string> GetSearchableProperties<T>()
    {
        var type = typeof(T);
        if (_searchablePropertiesCache.TryGetValue(type, out var cached))
            return cached;

        var props = type.GetProperties()
            .Where(p => p.PropertyType == typeof(string)
                && p.CanRead
                && !p.IsDefined(typeof(BsonIdAttribute), true)
                && !IsObjectIdRepresentation(p))
            .Select(p => p.Name)
            .ToList();

        _searchablePropertiesCache[type] = props;
        return props;
    }

    /// <summary>
    /// 获取可排序的属性名称集合（不区分大小写）
    /// </summary>
    private static HashSet<string> GetSortableProperties<T>()
    {
        var type = typeof(T);
        if (_sortablePropertiesCache.TryGetValue(type, out var cached))
            return cached;

        var props = type.GetProperties()
            .Where(p => p.CanRead)
            .Select(p => p.Name)
            .ToHashSet(StringComparer.OrdinalIgnoreCase);

        _sortablePropertiesCache[type] = props;
        return props;
    }

    /// <summary>
    /// 判断属性是否标注了 BsonRepresentation(ObjectId)
    /// </summary>
    private static bool IsObjectIdRepresentation(PropertyInfo prop)
    {
        var attr = prop.GetCustomAttribute<BsonRepresentationAttribute>();
        return attr != null && attr.Representation == BsonType.ObjectId;
    }
}
