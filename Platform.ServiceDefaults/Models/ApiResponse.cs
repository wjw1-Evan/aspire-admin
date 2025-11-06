using System.ComponentModel.DataAnnotations;

namespace Platform.ServiceDefaults.Models;

/// <summary>
/// 统一的 API 响应格式 - 所有微服务通用
/// </summary>
/// <typeparam name="T">数据类型</typeparam>
public class ApiResponse<T>
{
    /// <summary>
    /// 操作是否成功
    /// </summary>
    [Required]
    public bool success { get; set; }

    /// <summary>
    /// 响应数据
    /// </summary>
    public T? data { get; set; }

    /// <summary>
    /// 错误代码
    /// </summary>
    public string? errorCode { get; set; }

    /// <summary>
    /// 错误消息
    /// </summary>
    public string? errorMessage { get; set; }

    /// <summary>
    /// 响应时间戳
    /// </summary>
    [Required]
    public string timestamp { get; set; } = DateTime.UtcNow.ToString("yyyy-MM-ddTHH:mm:ss.fffZ");

    /// <summary>
    /// 请求追踪ID（用于调试）
    /// </summary>
    public string? traceId { get; set; }

    /// <summary>
    /// 创建成功响应
    /// </summary>
    /// <param name="data">响应数据</param>
    /// <param name="traceId">追踪ID</param>
    /// <returns>成功响应</returns>
    public static ApiResponse<T> SuccessResult(T data, string? traceId = null)
    {
        return new ApiResponse<T>
        {
            success = true,
            data = data,
            traceId = traceId
        };
    }

    /// <summary>
    /// 创建失败响应
    /// </summary>
    /// <param name="errorCode">错误代码</param>
    /// <param name="errorMessage">错误消息</param>
    /// <param name="traceId">追踪ID</param>
    /// <returns>失败响应</returns>
    public static ApiResponse<T> ErrorResult(string errorCode, string errorMessage, string? traceId = null)
    {
        return new ApiResponse<T>
        {
            success = false,
            errorCode = errorCode,
            errorMessage = errorMessage,
            traceId = traceId
        };
    }

    /// <summary>
    /// 创建验证错误响应
    /// </summary>
    /// <param name="errorMessage">错误消息</param>
    /// <param name="traceId">追踪ID</param>
    /// <returns>验证错误响应</returns>
    public static ApiResponse<T> ValidationErrorResult(string errorMessage, string? traceId = null)
    {
        return new ApiResponse<T>
        {
            success = false,
            errorCode = "VALIDATION_ERROR",
            errorMessage = errorMessage,
            traceId = traceId
        };
    }

    /// <summary>
    /// 创建未找到错误响应
    /// </summary>
    /// <param name="resource">资源名称</param>
    /// <param name="id">资源ID</param>
    /// <param name="traceId">追踪ID</param>
    /// <returns>未找到错误响应</returns>
    public static ApiResponse<T> NotFoundResult(string resource, string id, string? traceId = null)
    {
        return new ApiResponse<T>
        {
            success = false,
            errorCode = "NOT_FOUND",
            errorMessage = $"{resource} {id} 不存在",
            traceId = traceId
        };
    }

    /// <summary>
    /// 创建未授权错误响应
    /// </summary>
    /// <param name="message">错误消息</param>
    /// <param name="traceId">追踪ID</param>
    /// <returns>未授权错误响应</returns>
    public static ApiResponse<T> UnauthorizedResult(string message = "未授权访问", string? traceId = null)
    {
        return new ApiResponse<T>
        {
            success = false,
            errorCode = "UNAUTHORIZED",
            errorMessage = message,
            traceId = traceId
        };
    }

    /// <summary>
    /// 创建分页响应
    /// </summary>
    /// <param name="data">数据列表</param>
    /// <param name="total">总数</param>
    /// <param name="page">页码</param>
    /// <param name="pageSize">页面大小</param>
    /// <param name="traceId">追踪ID</param>
    /// <returns>分页响应</returns>
    public static ApiResponse<PagedResult<T>> PagedResult(IEnumerable<T> data, long total, int page, int pageSize, string? traceId = null)
    {
        return new ApiResponse<PagedResult<T>>
        {
            success = true,
            data = new PagedResult<T>
            {
                list = data.ToList(),
                total = total,
                page = page,
                pageSize = pageSize
            },
            traceId = traceId
        };
    }
}

/// <summary>
/// 分页结果模型
/// </summary>
/// <typeparam name="T">数据类型</typeparam>
public class PagedResult<T>
{
    /// <summary>
    /// 数据列表
    /// </summary>
    public List<T> list { get; set; } = new();
    
    /// <summary>
    /// 总记录数
    /// </summary>
    public long total { get; set; }
    
    /// <summary>
    /// 当前页码
    /// </summary>
    public int page { get; set; }
    
    /// <summary>
    /// 每页大小
    /// </summary>
    public int pageSize { get; set; }
    
    /// <summary>
    /// 总页数
    /// </summary>
    public int totalPages => (int)Math.Ceiling((double)total / pageSize);
}
