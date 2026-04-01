namespace Platform.ServiceDefaults.Models;

public class ServiceResult
{
    public bool IsSuccess { get; protected set; }
    public string? Code { get; protected set; }
    public string? Message { get; protected set; }

    public static ServiceResult Success(string? message = null)
        => new() { IsSuccess = true, Message = message };

    public static ServiceResult Failure(string code, string message)
        => new() { IsSuccess = false, Code = code, Message = message };
}

public class ServiceResult<T> : ServiceResult
{
    public T? Data { get; private set; }

    public new static ServiceResult<T> Success(T data, string? message = null)
        => new() { IsSuccess = true, Data = data, Message = message };

    public new static ServiceResult<T> Failure(string code, string message)
        => new() { IsSuccess = false, Code = code, Message = message };

    public static implicit operator ServiceResult<T>(T data) => Success(data);
}
