using System.ComponentModel.DataAnnotations;

namespace Platform.ApiService.Models;

/// <summary>
/// 统一的 API 响应格式
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
    /// 创建未授权响应
    /// </summary>
    /// <param name="errorMessage">错误消息</param>
    /// <param name="traceId">追踪ID</param>
    /// <returns>未授权响应</returns>
    public static ApiResponse<T> UnauthorizedResult(string errorMessage = "未授权访问", string? traceId = null)
    {
        return new ApiResponse<T>
        {
            success = false,
            errorCode = "UNAUTHORIZED",
            errorMessage = errorMessage,
            traceId = traceId
        };
    }

    /// <summary>
    /// 创建未找到响应
    /// </summary>
    /// <param name="errorMessage">错误消息</param>
    /// <param name="traceId">追踪ID</param>
    /// <returns>未找到响应</returns>
    public static ApiResponse<T> NotFoundResult(string errorMessage = "资源未找到", string? traceId = null)
    {
        return new ApiResponse<T>
        {
            success = false,
            errorCode = "NOT_FOUND",
            errorMessage = errorMessage,
            traceId = traceId
        };
    }

    /// <summary>
    /// 创建服务器错误响应
    /// </summary>
    /// <param name="errorMessage">错误消息</param>
    /// <param name="traceId">追踪ID</param>
    /// <returns>服务器错误响应</returns>
    public static ApiResponse<T> ServerErrorResult(string errorMessage = "服务器内部错误", string? traceId = null)
    {
        return new ApiResponse<T>
        {
            success = false,
            errorCode = "INTERNAL_SERVER_ERROR",
            errorMessage = errorMessage,
            traceId = traceId
        };
    }
}

/// <summary>
/// 无数据响应的简化版本
/// </summary>
public class ApiResponse : ApiResponse<object>
{
    /// <summary>
    /// 创建成功响应（无数据）
    /// </summary>
    /// <param name="message">成功消息</param>
    /// <param name="traceId">追踪ID</param>
    /// <returns>成功响应</returns>
    public static ApiResponse SuccessResult(string message = "操作成功", string? traceId = null)
    {
        return new ApiResponse
        {
            success = true,
            data = new { message },
            traceId = traceId
        };
    }
}
