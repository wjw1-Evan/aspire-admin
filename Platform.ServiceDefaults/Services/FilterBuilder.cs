using System.Reflection;
using MongoDB.Driver;
using Platform.ServiceDefaults.Models;

namespace Platform.ServiceDefaults.Services;

/// <summary>
/// 过滤器构建器 - 提供链式API构建MongoDB过滤器
/// </summary>
/// <typeparam name="T">实体类型</typeparam>
public class FilterBuilder<T> where T : class, IEntity, ISoftDeletable, ITimestamped
{
    private readonly List<FilterDefinition<T>> _filters = new();
    private readonly FilterDefinitionBuilder<T> _builder = Builders<T>.Filter;

    /// <summary>
    /// 添加相等条件
    /// </summary>
    public FilterBuilder<T> Equal<TField>(System.Linq.Expressions.Expression<Func<T, TField>> field, TField value)
    {
        if (value != null)
        {
            _filters.Add(_builder.Eq(field, value));
        }
        return this;
    }

    /// <summary>
    /// 添加不相等条件
    /// </summary>
    public FilterBuilder<T> NotEqual<TField>(System.Linq.Expressions.Expression<Func<T, TField>> field, TField value)
    {
        if (value != null)
        {
            _filters.Add(_builder.Ne(field, value));
        }
        return this;
    }

    /// <summary>
    /// 添加包含条件（用于数组字段）
    /// </summary>
    public FilterBuilder<T> Contains<TField>(System.Linq.Expressions.Expression<Func<T, TField>> field, TField value)
    {
        if (value != null)
        {
            var fieldName = GetFieldName(field);
            _filters.Add(_builder.ElemMatch(fieldName, _builder.Eq("$", value)));
        }
        return this;
    }

    /// <summary>
    /// 添加在范围内条件
    /// </summary>
    public FilterBuilder<T> In<TField>(System.Linq.Expressions.Expression<Func<T, TField>> field, IEnumerable<TField> values)
    {
        var valueList = values?.Where(v => v != null).ToList();
        if (valueList?.Count > 0)
        {
            _filters.Add(_builder.In(field, valueList));
        }
        return this;
    }

    /// <summary>
    /// 添加不在范围内条件
    /// </summary>
    public FilterBuilder<T> NotIn<TField>(System.Linq.Expressions.Expression<Func<T, TField>> field, IEnumerable<TField> values)
    {
        var valueList = values?.Where(v => v != null).ToList();
        if (valueList?.Count > 0)
        {
            _filters.Add(_builder.Nin(field, valueList));
        }
        return this;
    }

    /// <summary>
    /// 添加大于条件
    /// </summary>
    public FilterBuilder<T> GreaterThan<TField>(System.Linq.Expressions.Expression<Func<T, TField>> field, TField value)
    {
        if (value != null)
        {
            _filters.Add(_builder.Gt(field, value));
        }
        return this;
    }

    /// <summary>
    /// 添加大于等于条件
    /// </summary>
    public FilterBuilder<T> GreaterThanOrEqual<TField>(System.Linq.Expressions.Expression<Func<T, TField>> field, TField value)
    {
        if (value != null)
        {
            _filters.Add(_builder.Gte(field, value));
        }
        return this;
    }

    /// <summary>
    /// 添加小于条件
    /// </summary>
    public FilterBuilder<T> LessThan<TField>(System.Linq.Expressions.Expression<Func<T, TField>> field, TField value)
    {
        if (value != null)
        {
            _filters.Add(_builder.Lt(field, value));
        }
        return this;
    }

    /// <summary>
    /// 添加小于等于条件
    /// </summary>
    public FilterBuilder<T> LessThanOrEqual<TField>(System.Linq.Expressions.Expression<Func<T, TField>> field, TField value)
    {
        if (value != null)
        {
            _filters.Add(_builder.Lte(field, value));
        }
        return this;
    }

    /// <summary>
    /// 添加正则表达式条件（用于模糊搜索）
    /// </summary>
    public FilterBuilder<T> Regex(System.Linq.Expressions.Expression<Func<T, string>> field, string pattern, string options = "i")
    {
        if (!string.IsNullOrEmpty(pattern))
        {
            var fieldName = GetFieldName(field);
            _filters.Add(_builder.Regex(fieldName, new MongoDB.Bson.BsonRegularExpression(pattern, options)));
        }
        return this!;
    }

    /// <summary>
    /// 添加文本搜索条件
    /// </summary>
    public FilterBuilder<T> Text(string searchText)
    {
        if (!string.IsNullOrEmpty(searchText))
        {
            _filters.Add(_builder.Text(searchText));
        }
        return this;
    }

    /// <summary>
    /// 添加日期范围条件
    /// </summary>
    public FilterBuilder<T> DateRange(System.Linq.Expressions.Expression<Func<T, DateTime>> field, DateTime? startDate, DateTime? endDate)
    {
        if (startDate.HasValue && endDate.HasValue)
        {
            _filters.Add(_builder.And(
                _builder.Gte(field, startDate.Value),
                _builder.Lte(field, endDate.Value)
            ));
        }
        else if (startDate.HasValue)
        {
            _filters.Add(_builder.Gte(field, startDate.Value));
        }
        else if (endDate.HasValue)
        {
            _filters.Add(_builder.Lte(field, endDate.Value));
        }
        return this;
    }

    /// <summary>
    /// 添加存在条件
    /// </summary>
    public FilterBuilder<T> Exists<TField>(System.Linq.Expressions.Expression<Func<T, TField>> field, bool exists = true)
    {
        var fieldName = GetFieldName(field);
        _filters.Add(_builder.Exists(fieldName, exists));
        return this;
    }

    /// <summary>
    /// 添加空值条件
    /// </summary>
    public FilterBuilder<T> IsNull<TField>(System.Linq.Expressions.Expression<Func<T, TField>> field)
    {
        _filters.Add(_builder.Eq(field, (TField)(object)null!));
        return this;
    }

    /// <summary>
    /// 添加非空值条件
    /// </summary>
    public FilterBuilder<T> IsNotNull<TField>(System.Linq.Expressions.Expression<Func<T, TField>> field)
    {
        _filters.Add(_builder.Ne(field, (TField)(object)null!));
        return this;
    }

    /// <summary>
    /// 添加自定义过滤器
    /// </summary>
    public FilterBuilder<T> Custom(FilterDefinition<T> filter)
    {
        if (filter != null)
        {
            _filters.Add(filter);
        }
        return this;
    }

    /// <summary>
    /// 添加软删除过滤（排除已删除记录）
    /// </summary>
    public FilterBuilder<T> ExcludeDeleted()
    {
        if (typeof(ISoftDeletable).IsAssignableFrom(typeof(T)))
        {
            _filters.Add(_builder.Eq("isDeleted", false));
        }
        return this;
    }

    /// <summary>
    /// 添加多租户过滤（自动添加CompanyId过滤）
    /// </summary>
    public FilterBuilder<T> WithTenant(string? companyId)
    {
        if (typeof(IMultiTenant).IsAssignableFrom(typeof(T)) && !string.IsNullOrEmpty(companyId))
        {
            _filters.Add(_builder.Eq("companyId", companyId));
        }
        return this;
    }

    /// <summary>
    /// 添加操作人过滤
    /// </summary>
    public FilterBuilder<T> ByUser(string? userId)
    {
        if (typeof(IOperationTrackable).IsAssignableFrom(typeof(T)) && !string.IsNullOrEmpty(userId))
        {
            _filters.Add(_builder.Or(
                _builder.Eq("createdBy", userId),
                _builder.Eq("updatedBy", userId)
            ));
        }
        return this;
    }

    /// <summary>
    /// 添加创建时间范围过滤
    /// </summary>
    public FilterBuilder<T> CreatedBetween(DateTime? startDate, DateTime? endDate)
    {
        if (typeof(ITimestamped).IsAssignableFrom(typeof(T)))
        {
            return DateRange(e => e.CreatedAt, startDate, endDate);
        }
        return this;
    }

    /// <summary>
    /// 添加更新时间范围过滤
    /// </summary>
    public FilterBuilder<T> UpdatedBetween(DateTime? startDate, DateTime? endDate)
    {
        if (typeof(ITimestamped).IsAssignableFrom(typeof(T)))
        {
            return DateRange(e => e.UpdatedAt, startDate, endDate);
        }
        return this;
    }

    /// <summary>
    /// 构建最终的过滤器
    /// </summary>
    public FilterDefinition<T> Build()
    {
        return _filters.Count > 0 ? _builder.And(_filters) : _builder.Empty;
    }

    /// <summary>
    /// 构建OR过滤器
    /// </summary>
    public FilterDefinition<T> BuildOr()
    {
        return _filters.Count > 0 ? _builder.Or(_filters) : _builder.Empty;
    }

    /// <summary>
    /// 清空所有过滤器
    /// </summary>
    public FilterBuilder<T> Clear()
    {
        _filters.Clear();
        return this;
    }

    /// <summary>
    /// 获取当前过滤器数量
    /// </summary>
    public int Count => _filters.Count;

    /// <summary>
    /// 获取字段名称
    /// </summary>
    private static string GetFieldName<TField>(System.Linq.Expressions.Expression<Func<T, TField>> field)
    {
        if (field.Body is System.Linq.Expressions.MemberExpression memberExpression)
        {
            return memberExpression.Member.Name.ToLowerInvariant();
        }
        throw new ArgumentException("Invalid field expression");
    }
}

/// <summary>
/// 排序构建器
/// </summary>
/// <typeparam name="T">实体类型</typeparam>
public class SortBuilder<T> where T : class, IEntity, ISoftDeletable, ITimestamped
{
    private readonly List<SortDefinition<T>> _sorts = new();
    private readonly SortDefinitionBuilder<T> _builder = Builders<T>.Sort;

    /// <summary>
    /// 添加升序排序
    /// </summary>
    public SortBuilder<T> Ascending<TField>(System.Linq.Expressions.Expression<Func<T, TField>> field)
    {
        // ✅ 获取正确的 BSON 字段名（优先使用 BsonElement 特性）
        var fieldName = GetBsonFieldName(field);
        _sorts.Add(_builder.Ascending(fieldName));
        return this;
    }

    /// <summary>
    /// 添加降序排序
    /// </summary>
    public SortBuilder<T> Descending<TField>(System.Linq.Expressions.Expression<Func<T, TField>> field)
    {
        // ✅ 获取正确的 BSON 字段名（优先使用 BsonElement 特性）
        var fieldName = GetBsonFieldName(field);
        _sorts.Add(_builder.Descending(fieldName));
        return this;
    }

    /// <summary>
    /// 添加文本搜索排序
    /// </summary>
    public SortBuilder<T> TextScore(string fieldName = "score")
    {
        _sorts.Add(_builder.MetaTextScore(fieldName));
        return this;
    }

    /// <summary>
    /// 构建排序定义
    /// </summary>
    public SortDefinition<T> Build()
    {
        return _sorts.Count > 0 ? _builder.Combine(_sorts) : _builder.Descending(e => e.Id);
    }

    /// <summary>
    /// 清空排序
    /// </summary>
    public SortBuilder<T> Clear()
    {
        _sorts.Clear();
        return this;
    }

    /// <summary>
    /// 获取 BSON 字段名（优先使用 BsonElement 特性，否则使用属性名的 camelCase）
    /// </summary>
    private static string GetBsonFieldName<TField>(System.Linq.Expressions.Expression<Func<T, TField>> field)
    {
        if (field.Body is System.Linq.Expressions.MemberExpression memberExpression)
        {
            var property = memberExpression.Member as System.Reflection.PropertyInfo;
            if (property != null)
            {
                // ✅ 优先使用 BsonElement 特性的 ElementName
                var bsonElementAttr = property.GetCustomAttribute<MongoDB.Bson.Serialization.Attributes.BsonElementAttribute>();
                if (bsonElementAttr != null && !string.IsNullOrEmpty(bsonElementAttr.ElementName))
                {
                    return bsonElementAttr.ElementName;
                }
                
                // ✅ 如果没有 BsonElement 特性，使用属性名的 camelCase
                var propertyName = property.Name;
                if (propertyName.Length > 0)
                {
                    return char.ToLowerInvariant(propertyName[0]) + propertyName.Substring(1);
                }
            }
        }
        throw new ArgumentException("Invalid field expression");
    }
}

/// <summary>
/// 更新构建器
/// </summary>
/// <typeparam name="T">实体类型</typeparam>
public class UpdateBuilder<T> where T : class, IEntity, ISoftDeletable, ITimestamped
{
    private readonly List<UpdateDefinition<T>> _updates = new();
    private readonly UpdateDefinitionBuilder<T> _builder = Builders<T>.Update;

    /// <summary>
    /// 设置字段值
    /// </summary>
    public UpdateBuilder<T> Set<TField>(System.Linq.Expressions.Expression<Func<T, TField>> field, TField value)
    {
        _updates.Add(_builder.Set(field, value));
        return this;
    }

    /// <summary>
    /// 移除字段（Unset）
    /// </summary>
    public UpdateBuilder<T> Unset<TField>(System.Linq.Expressions.Expression<Func<T, TField>> field)
    {
        // 获取字段名（考虑 BsonElement 特性）
        var fieldName = GetBsonFieldNameForUpdate(field);
        _updates.Add(_builder.Unset(fieldName));
        return this;
    }

    /// <summary>
    /// 设置当前时间戳
    /// </summary>
    public UpdateBuilder<T> SetCurrentTimestamp()
    {
        if (typeof(ITimestamped).IsAssignableFrom(typeof(T)))
        {
            _updates.Add(_builder.Set(e => e.UpdatedAt, DateTime.UtcNow));
        }
        return this;
    }

    /// <summary>
    /// 设置操作追踪信息
    /// </summary>
    public UpdateBuilder<T> SetOperationTracking(string userId, string username, OperationType operationType)
    {
        if (typeof(IOperationTrackable).IsAssignableFrom(typeof(T)))
        {
            _updates.Add(_builder.Set("updatedBy", userId));
            _updates.Add(_builder.Set("updatedByUsername", username));
            _updates.Add(_builder.Set("lastOperationType", operationType.ToString()));
            _updates.Add(_builder.Set("lastOperationAt", DateTime.UtcNow));
        }
        return this;
    }

    /// <summary>
    /// 设置软删除
    /// </summary>
    public UpdateBuilder<T> SetSoftDelete()
    {
        if (typeof(ISoftDeletable).IsAssignableFrom(typeof(T)))
        {
            _updates.Add(_builder.Set("isDeleted", true));
        }
        return this;
    }

    /// <summary>
    /// 取消软删除
    /// </summary>
    public UpdateBuilder<T> UnsetSoftDelete()
    {
        if (typeof(ISoftDeletable).IsAssignableFrom(typeof(T)))
        {
            _updates.Add(_builder.Set("isDeleted", false));
        }
        return this;
    }

    /// <summary>
    /// 递增数值字段
    /// </summary>
    public UpdateBuilder<T> Inc<TField>(System.Linq.Expressions.Expression<Func<T, TField>> field, TField value)
    {
        _updates.Add(_builder.Inc(field, value));
        return this;
    }

    /// <summary>
    /// 仅在插入时设置字段值（用于 Upsert 操作）
    /// </summary>
    public UpdateBuilder<T> SetOnInsert<TField>(System.Linq.Expressions.Expression<Func<T, TField>> field, TField value)
    {
        _updates.Add(_builder.SetOnInsert(field, value));
        return this;
    }

    /// <summary>
    /// 向数组字段添加元素
    /// </summary>
    public UpdateBuilder<T> AddToSet<TField>(System.Linq.Expressions.Expression<Func<T, TField>> field, TField value)
    {
        var fieldName = GetFieldName(field);
        _updates.Add(_builder.AddToSet(fieldName, value));
        return this;
    }

    /// <summary>
    /// 从数组字段移除元素
    /// </summary>
    public UpdateBuilder<T> Pull<TField>(System.Linq.Expressions.Expression<Func<T, TField>> field, TField value)
    {
        var fieldName = GetFieldName(field);
        _updates.Add(_builder.Pull(fieldName, value));
        return this;
    }

    /// <summary>
    /// 构建更新定义
    /// </summary>
    public UpdateDefinition<T> Build()
    {
        return _updates.Count > 0 ? _builder.Combine(_updates) : _builder.Set(e => e.Id, "");
    }

    /// <summary>
    /// 清空更新
    /// </summary>
    public UpdateBuilder<T> Clear()
    {
        _updates.Clear();
        return this;
    }

    /// <summary>
    /// 获取字段名称
    /// </summary>
    private static string GetFieldName<TField>(System.Linq.Expressions.Expression<Func<T, TField>> field)
    {
        if (field.Body is System.Linq.Expressions.MemberExpression memberExpression)
        {
            return memberExpression.Member.Name.ToLowerInvariant();
        }
        throw new ArgumentException("Invalid field expression");
    }

    /// <summary>
    /// 获取 BSON 字段名称（考虑 BsonElement 特性）
    /// </summary>
    private static string GetBsonFieldNameForUpdate<TField>(System.Linq.Expressions.Expression<Func<T, TField>> field)
    {
        if (field.Body is System.Linq.Expressions.MemberExpression memberExpression)
        {
            var property = memberExpression.Member as System.Reflection.PropertyInfo;
            if (property != null)
            {
                // ✅ 优先使用 BsonElement 特性的 ElementName
                var bsonElementAttr = property.GetCustomAttribute<MongoDB.Bson.Serialization.Attributes.BsonElementAttribute>();
                if (bsonElementAttr != null && !string.IsNullOrEmpty(bsonElementAttr.ElementName))
                {
                    return bsonElementAttr.ElementName;
                }
                
                // ✅ 如果没有 BsonElement 特性，使用属性名的 camelCase
                var propertyName = property.Name;
                if (propertyName.Length > 0)
                {
                    return char.ToLowerInvariant(propertyName[0]) + propertyName.Substring(1);
                }
            }
        }
        throw new ArgumentException("Invalid field expression");
    }
}

/// <summary>
/// 投影构建器 - 提供链式API构建MongoDB字段投影
/// </summary>
/// <typeparam name="T">实体类型</typeparam>
public class ProjectionBuilder<T> where T : class, IEntity, ISoftDeletable, ITimestamped
{
    private readonly List<ProjectionDefinition<T>> _projections = new();
    private readonly ProjectionDefinitionBuilder<T> _builder = Builders<T>.Projection;

    /// <summary>
    /// 包含字段（只返回指定字段）
    /// </summary>
    public ProjectionBuilder<T> Include<TField>(System.Linq.Expressions.Expression<Func<T, TField>> field)
    {
        // MongoDB 的 Include 方法需要使用字段名
        var fieldName = GetBsonFieldName(field);
        _projections.Add(_builder.Include(fieldName));
        return this;
    }

    /// <summary>
    /// 包含多个字段（只返回指定字段）
    /// </summary>
    public ProjectionBuilder<T> Include(params System.Linq.Expressions.Expression<Func<T, object>>[] fields)
    {
        foreach (var field in fields)
        {
            _projections.Add(_builder.Include(field));
        }
        return this;
    }

    /// <summary>
    /// 排除字段（返回除指定字段外的所有字段）
    /// </summary>
    public ProjectionBuilder<T> Exclude<TField>(System.Linq.Expressions.Expression<Func<T, TField>> field)
    {
        // MongoDB 的 Exclude 方法需要使用字段名
        var fieldName = GetBsonFieldName(field);
        _projections.Add(_builder.Exclude(fieldName));
        return this;
    }

    /// <summary>
    /// 排除多个字段（返回除指定字段外的所有字段）
    /// </summary>
    public ProjectionBuilder<T> Exclude(params System.Linq.Expressions.Expression<Func<T, object>>[] fields)
    {
        foreach (var field in fields)
        {
            _projections.Add(_builder.Exclude(field));
        }
        return this;
    }

    /// <summary>
    /// 使用字符串字段名包含字段
    /// </summary>
    public ProjectionBuilder<T> IncludeField(string fieldName)
    {
        if (!string.IsNullOrEmpty(fieldName))
        {
            _projections.Add(_builder.Include(fieldName));
        }
        return this;
    }

    /// <summary>
    /// 使用字符串字段名排除字段
    /// </summary>
    public ProjectionBuilder<T> ExcludeField(string fieldName)
    {
        if (!string.IsNullOrEmpty(fieldName))
        {
            _projections.Add(_builder.Exclude(fieldName));
        }
        return this;
    }

    /// <summary>
    /// 包含常用字段（Id、CreatedAt、UpdatedAt）
    /// </summary>
    public ProjectionBuilder<T> IncludeCommonFields()
    {
        _projections.Add(_builder.Include(e => e.Id));
        if (typeof(ITimestamped).IsAssignableFrom(typeof(T)))
        {
            _projections.Add(_builder.Include(e => e.CreatedAt));
            _projections.Add(_builder.Include(e => e.UpdatedAt));
        }
        return this;
    }

    /// <summary>
    /// 排除审计字段（CreatedBy、UpdatedBy、DeletedBy 等）
    /// </summary>
    public ProjectionBuilder<T> ExcludeAuditFields()
    {
        if (typeof(IOperationTrackable).IsAssignableFrom(typeof(T)))
        {
            _projections.Add(_builder.Exclude("createdBy"));
            _projections.Add(_builder.Exclude("updatedBy"));
            _projections.Add(_builder.Exclude("deletedBy"));
            _projections.Add(_builder.Exclude("createdByUsername"));
            _projections.Add(_builder.Exclude("updatedByUsername"));
        }
        return this;
    }

    /// <summary>
    /// 构建投影定义
    /// </summary>
    public ProjectionDefinition<T>? Build()
    {
        return _projections.Count > 0 ? _builder.Combine(_projections) : null;
    }

    /// <summary>
    /// 清空投影
    /// </summary>
    public ProjectionBuilder<T> Clear()
    {
        _projections.Clear();
        return this;
    }

    /// <summary>
    /// 获取当前投影数量
    /// </summary>
    public int Count => _projections.Count;

    /// <summary>
    /// 获取 BSON 字段名（优先使用 BsonElement 特性，否则使用属性名的 camelCase）
    /// </summary>
    private static string GetBsonFieldName<TField>(System.Linq.Expressions.Expression<Func<T, TField>> field)
    {
        if (field.Body is System.Linq.Expressions.MemberExpression memberExpression)
        {
            var property = memberExpression.Member as System.Reflection.PropertyInfo;
            if (property != null)
            {
                // ✅ 优先使用 BsonElement 特性的 ElementName
                var bsonElementAttr = property.GetCustomAttribute<MongoDB.Bson.Serialization.Attributes.BsonElementAttribute>();
                if (bsonElementAttr != null && !string.IsNullOrEmpty(bsonElementAttr.ElementName))
                {
                    return bsonElementAttr.ElementName;
                }
                
                // ✅ 如果没有 BsonElement 特性，使用属性名的 camelCase
                var propertyName = property.Name;
                if (propertyName.Length > 0)
                {
                    return char.ToLowerInvariant(propertyName[0]) + propertyName.Substring(1);
                }
            }
        }
        throw new ArgumentException("Invalid field expression");
    }
}
