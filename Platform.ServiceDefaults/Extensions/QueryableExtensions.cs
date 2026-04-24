using System.Linq.Dynamic.Core;
using System.Reflection;
using System.Text.Json;
using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;

namespace Platform.ServiceDefaults.Extensions;

public static class QueryableExtensions
{
    public static PagedResult<T> ToPagedList<T>(
        this IQueryable<T> query,
        Models.ProTableRequest? request)
    {
        var page = request?.Current ?? 1;
        var pageSize = request?.PageSize ?? 20;
        var search = request?.Search;

        if (!string.IsNullOrWhiteSpace(search))
        {
            var props = typeof(T).GetProperties()
                .Where(x => x.CanRead
                    && x.GetIndexParameters().Length == 0
                    && x.PropertyType == typeof(string)
                    && !IsObjectIdRepresentation(x))
                .Select(x => x.Name)
                .ToList();

            if (props.Count > 0)
            {
                var expr = string.Join(" || ", props.Select(x => $"({x} != null && {x}.Contains(@0))"));
                query = query.Where(expr, search);
            }
        }

        var sortBy = "createdAt";
        var sortOrder = "desc";

        if (!string.IsNullOrWhiteSpace(request?.Sort))
        {
            try
            {
                var dict = JsonSerializer.Deserialize<Dictionary<string, string>>(request.Sort);
                if (dict?.Count > 0)
                {
                    var first = dict.First();
                    sortBy = first.Key;
                    sortOrder = first.Value == "ascend" ? "asc" : "desc";
                }
            }
            catch
            {
            }
        }

        query = query.OrderBy(sortOrder == "desc" ? $"{sortBy} descending" : sortBy);

        if (!string.IsNullOrWhiteSpace(request?.Filter))
        {
            try
            {
                var filterDict = JsonSerializer.Deserialize<Dictionary<string, JsonElement>>(request.Filter);
                if (filterDict != null && filterDict.Count > 0)
                {
                    foreach (var kvp in filterDict)
                    {
                        var field = kvp.Key;
                        var value = kvp.Value;

                        if (value.ValueKind == JsonValueKind.Array && value.GetArrayLength() > 0)
                        {
                            var values = value.EnumerateArray().Select(v => v.ToString().Trim('"')).ToList();
                            query = query.Where($"{field}.Contains(@0)", values);
                        }
                        else if (value.ValueKind == JsonValueKind.String)
                        {
                            var strValue = value.GetString();
                            if (!string.IsNullOrEmpty(strValue))
                            {
                                query = query.Where($"{field} == @0", strValue);
                            }
                        }
                    }
                }
            }
            catch
            {
            }
        }

        return query.PageResult(page, pageSize);
    }

    private static bool IsObjectIdRepresentation(PropertyInfo prop)
    {
        var attr = prop.GetCustomAttribute<BsonRepresentationAttribute>();
        return attr != null && attr.Representation == BsonType.ObjectId;
    }
}
