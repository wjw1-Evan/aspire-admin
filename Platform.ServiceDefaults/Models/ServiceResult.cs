namespace Platform.ServiceDefaults.Models;

/// <summary>
/// 通用的服务层返回结果 - 剥离了 API/HTTP 细节
/// </summary>
/// <typeparam name="T">数据类型</typeparam>
public class ServiceResult<T>
{
    private ServiceResult() { }

    /// <summary>
    /// 操作是否成功
    /// </summary>
    public bool IsSuccess { get; private set; }

    /// <summary>
    /// 返回数据
    /// </summary>
    public T? Data { get; private set; }

    /// <summary>
    /// 错误代码
    /// </summary>
    public string? Code { get; private set; }

    /// <summary>
    /// 错误/提示消息
    /// </summary>
    public string? Message { get; private set; }

    /// <summary>
    /// 成功响应
    /// </summary>
    public static ServiceResult<T> Success(T data, string? message = null) => new()
    {
        IsSuccess = true,
        Data = data,
        Message = message
    };

    /// <summary>
    /// 失败响应
    /// </summary>
    public static ServiceResult<T> Failure(string code, string message) => new()
    {
        IsSuccess = false,
        Code = code,
        Message = message
    };

    /// <summary>
    /// 从原始数据隐式转换（快捷写法）
    /// </summary>
    public static implicit operator ServiceResult<T>(T data) => Success(data);
}
