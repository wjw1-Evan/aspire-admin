using Microsoft.EntityFrameworkCore;
using Platform.ServiceDefaults.Models;

namespace Platform.ServiceDefaults.Extensions;

/// <summary>
/// 分页结果
/// </summary>
public class PagedResult<T>
{
    public List<T> Items { get; set; } = new();
    public long Total { get; set; }
    public int Page { get; set; }
    public int PageSize { get; set; }
    public int TotalPages => (int)Math.Ceiling((double)Total / PageSize);
}

/// <summary>
/// 分页扩展方法
/// </summary>
public static class PaginationExtensions
{
    /// <summary>
    /// 分页查询
    /// </summary>
    public static async Task<PagedResult<T>> ToPagedAsync<T>(
        this IQueryable<T> query,
        int page,
        int pageSize)
    {
        var total = await query.LongCountAsync();
        var items = await query
            .Skip((Math.Max(1, page) - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync();

        return new PagedResult<T>
        {
            Items = items,
            Total = total,
            Page = page,
            PageSize = pageSize
        };
    }

    /// <summary>
    /// 分页查询（从 ServiceResult 返回）
    /// </summary>
    public static ServiceResult<PagedResult<T>> ToPagedResult<T>(
        this PagedResult<T> result,
        string? message = null)
    {
        return ServiceResult<PagedResult<T>>.Success(result, message);
    }
}
