using Platform.ApiService.Models.Response;

namespace Platform.ApiService.Extensions;

/// <summary>
/// 分页扩展方法 - 简化分页响应构建
/// </summary>
public static class PaginationExtensions
{
    /// <summary>
    /// 构建分页响应
    /// </summary>
    /// <typeparam name="T">数据类型</typeparam>
    /// <param name="data">当前页数据</param>
    /// <param name="total">总记录数</param>
    /// <param name="page">当前页码</param>
    /// <param name="pageSize">每页大小</param>
    /// <returns>分页响应对象</returns>
    public static PaginatedResponse<T> ToPaginatedResponse<T>(
        this IEnumerable<T> data, 
        long total, 
        int page, 
        int pageSize)
    {
        return new PaginatedResponse<T>
        {
            Data = data.ToList(),
            Total = total,
            Page = page,
            PageSize = pageSize
        };
    }
    
    /// <summary>
    /// 构建分页响应（从元组）
    /// </summary>
    /// <typeparam name="T">数据类型</typeparam>
    /// <param name="result">包含数据和总数的元组</param>
    /// <param name="page">当前页码</param>
    /// <param name="pageSize">每页大小</param>
    /// <returns>分页响应对象</returns>
    public static PaginatedResponse<T> ToPaginatedResponse<T>(
        this (List<T> data, long total) result, 
        int page, 
        int pageSize)
    {
        return result.data.ToPaginatedResponse(result.total, page, pageSize);
    }
    
    /// <summary>
    /// 验证并规范化分页参数
    /// </summary>
    /// <param name="page">页码</param>
    /// <param name="pageSize">每页大小</param>
    /// <param name="maxPageSize">最大每页大小</param>
    /// <returns>规范化后的分页参数</returns>
    public static (int page, int pageSize) NormalizePagination(int page, int pageSize, int maxPageSize = 100)
    {
        var normalizedPage = Math.Max(1, page);
        var normalizedPageSize = Math.Min(Math.Max(1, pageSize), maxPageSize);
        
        return (normalizedPage, normalizedPageSize);
    }
    
    /// <summary>
    /// 计算跳过的记录数
    /// </summary>
    /// <param name="page">页码</param>
    /// <param name="pageSize">每页大小</param>
    /// <returns>跳过的记录数</returns>
    public static int CalculateSkip(int page, int pageSize)
    {
        return Math.Max(0, (page - 1) * pageSize);
    }
}






















































