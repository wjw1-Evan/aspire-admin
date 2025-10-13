using Platform.ApiService.Constants;

namespace Platform.ApiService.Extensions;

/// <summary>
/// 查询扩展方法
/// </summary>
public static class QueryExtensions
{
    /// <summary>
    /// 验证并规范化分页参数
    /// </summary>
    /// <param name="page">页码，小于1时将调整为1</param>
    /// <param name="pageSize">每页数量，小于1时将调整为1，超过最大值时将调整为最大值</param>
    /// <returns>规范化后的页码和每页数量</returns>
    /// <example>
    /// <code>
    /// var (normalizedPage, normalizedPageSize) = QueryExtensions.NormalizePagination(page, pageSize);
    /// </code>
    /// </example>
    public static (int page, int pageSize) NormalizePagination(int page, int pageSize)
    {
        // 确保页码至少为1
        var normalizedPage = Math.Max(1, page);
        
        // 确保页面大小在合理范围内
        var normalizedPageSize = Math.Max(1, Math.Min(pageSize, ValidationRules.MaxPageSize));
        
        return (normalizedPage, normalizedPageSize);
    }
    
    /// <summary>
    /// 计算跳过的记录数
    /// </summary>
    /// <param name="page">页码（从1开始）</param>
    /// <param name="pageSize">每页数量</param>
    /// <returns>需要跳过的记录数</returns>
    /// <example>
    /// <code>
    /// var skip = QueryExtensions.CalculateSkip(2, 10); // 返回 10
    /// </code>
    /// </example>
    public static int CalculateSkip(int page, int pageSize)
    {
        return (page - 1) * pageSize;
    }
    
    /// <summary>
    /// 计算总页数
    /// </summary>
    /// <param name="totalRecords">总记录数</param>
    /// <param name="pageSize">每页数量</param>
    /// <returns>总页数（向上取整）</returns>
    /// <example>
    /// <code>
    /// var totalPages = QueryExtensions.CalculateTotalPages(25, 10); // 返回 3
    /// </code>
    /// </example>
    public static int CalculateTotalPages(long totalRecords, int pageSize)
    {
        return (int)Math.Ceiling((double)totalRecords / pageSize);
    }
    
    /// <summary>
    /// 验证排序字段是否在允许的字段列表中
    /// </summary>
    /// <param name="sortField">要验证的排序字段</param>
    /// <param name="allowedFields">允许的字段列表</param>
    /// <returns>如果字段有效且在允许列表中返回 true，否则返回 false</returns>
    /// <example>
    /// <code>
    /// var isValid = QueryExtensions.IsValidSortField("Username", "Username", "Email", "CreatedAt");
    /// </code>
    /// </example>
    public static bool IsValidSortField(string? sortField, params string[] allowedFields)
    {
        if (string.IsNullOrWhiteSpace(sortField))
        {
            return false;
        }
        
        return allowedFields.Any(f => f.Equals(sortField, StringComparison.OrdinalIgnoreCase));
    }
    
    /// <summary>
    /// 判断排序方向是否为降序
    /// </summary>
    /// <param name="sortOrder">排序方向字符串（asc/desc/ascending/descending）</param>
    /// <returns>如果是降序返回 true，否则返回 false</returns>
    /// <example>
    /// <code>
    /// var isDesc = QueryExtensions.IsDescending("desc"); // 返回 true
    /// </code>
    /// </example>
    public static bool IsDescending(string? sortOrder)
    {
        return sortOrder?.ToLower() == "desc" || sortOrder?.ToLower() == "descending";
    }
}

