namespace Platform.ServiceDefaults.Exceptions;

/// <summary>
/// 业务异常 - 用于表示可预见的业务逻辑错误
/// </summary>
public class BusinessException : Exception
{
    public int StatusCode { get; }

    public new object? Data { get; }

    public BusinessException(string message, int statusCode = 400)
        : base(message)
    {
        StatusCode = statusCode;
    }

    public BusinessException(string message, int statusCode, object? data)
        : base(message)
    {
        StatusCode = statusCode;
        Data = data;
    }
}
