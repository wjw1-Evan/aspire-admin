namespace Platform.ApiService.Models.Response;

/// <summary>
/// 分页响应模型
/// </summary>
/// <typeparam name="T">数据类型</typeparam>
public class PaginatedResponse<T>
{
    /// <summary>
    /// 数据列表
    /// </summary>
    public List<T> Data { get; set; } = new();
    
    /// <summary>
    /// 总记录数
    /// </summary>
    public long Total { get; set; }
    
    /// <summary>
    /// 当前页码
    /// </summary>
    public int Page { get; set; }
    
    /// <summary>
    /// 每页数量
    /// </summary>
    public int PageSize { get; set; }
    
    /// <summary>
    /// 总页数
    /// </summary>
    public int TotalPages => (int)Math.Ceiling((double)Total / PageSize);
    
    /// <summary>
    /// 是否有上一页
    /// </summary>
    public bool HasPreviousPage => Page > 1;
    
    /// <summary>
    /// 是否有下一页
    /// </summary>
    public bool HasNextPage => Page < TotalPages;
}


