using System;

namespace Platform.ServiceDefaults.Exceptions;

/// <summary>
/// 业务异常 - 用于表示可预见的业务逻辑错误
/// </summary>
public class BusinessException : Exception
{
    /// <summary>
    /// 错误码
    /// </summary>
    public string Code { get; }

    /// <summary>
    /// HTTP 状态码
    /// </summary>
    public int StatusCode { get; }

    /// <summary>
    /// 额外的错误数据
    /// </summary>
    public new object? Data { get; }

    public BusinessException(string message, string code = "BUSINESS_ERROR", int statusCode = 400)
        : base(message)
    {
        Code = code;
        StatusCode = statusCode;
    }

    public BusinessException(string message, int statusCode)
        : this(message, "BUSINESS_ERROR", statusCode)
    {
    }
}
