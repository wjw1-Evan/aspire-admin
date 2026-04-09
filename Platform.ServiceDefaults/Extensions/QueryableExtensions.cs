using System.Linq.Dynamic.Core;
using System.Reflection;
using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;

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
                    && x.PropertyType == typeof(string)
                    // && !x.IsDefined(typeof(BsonIdAttribute), true)
                    && !IsObjectIdRepresentation(x))
                .Select(x => x.Name)
                .ToList();



            if (props.Count > 0)
            {
                var expr = string.Join(" || ", props.Select(x => $"({x} != null && {x}.Contains(@0))"));
                query = query.Where(expr, p.Search);
            }
        }

        var field = string.IsNullOrWhiteSpace(p.SortBy) ? "createdAt" : p.SortBy.Trim();
        var isDesc = string.IsNullOrWhiteSpace(p.SortOrder) || p.SortOrder.Equals("desc", StringComparison.OrdinalIgnoreCase);
        query = query.OrderBy(isDesc ? $"{field} descending" : field);

        return query.PageResult(p.Page, p.PageSize);
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
