namespace Platform.ServiceDefaults.Exceptions;

/// <summary>
/// 服务异常 - 支持自定义 HTTP 状态码
/// </summary>
public class ServiceException : Exception
{
    public int StatusCode { get; }

    public ServiceException(string message, int statusCode = 400)
        : base(message)
    {
        StatusCode = statusCode;
    }

    public ServiceException(string message, int statusCode, Exception innerException)
        : base(message, innerException)
    {
        StatusCode = statusCode;
    }
}
