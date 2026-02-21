using Platform.ServiceDefaults.Exceptions;

namespace Platform.ServiceDefaults.Extensions;

/// <summary>
/// 通用对象扩展方法
/// </summary>
public static class CommonExtensions
{
    /// <summary>
    /// 确保对象不为空，如果为空则抛出 BusinessException
    /// </summary>
    /// <typeparam name="T">对象类型</typeparam>
    /// <param name="obj">要检查的对象</param>
    /// <param name="entityName">实体名称（用于错误消息）</param>
    /// <param name="id">实体ID（用于错误消息）</param>
    /// <returns>返回非空的对象</returns>
    /// <exception cref="BusinessException">当对象为空时抛出 404 错误</exception>
    public static T EnsureFound<T>(this T? obj, string entityName, object? id = null) where T : class
    {
        if (obj == null)
        {
            var message = id != null
                ? $"{entityName} (ID: {id}) 不存在"
                : $"{entityName} 不存在";
            throw new BusinessException(message, "NOT_FOUND", 404);
        }
        return obj;
    }

    /// <summary>
    /// 确保字符串不为空，如果为空则抛出 BusinessException
    /// </summary>
    /// <param name="str">要检查的字符串</param>
    /// <param name="paramName">参数名称</param>
    /// <returns>返回非空的字符串</returns>
    /// <exception cref="BusinessException">当字符串为空时抛出 400 错误</exception>
    public static string EnsureNotEmpty(this string? str, string paramName)
    {
        if (string.IsNullOrWhiteSpace(str))
        {
            throw new BusinessException($"{paramName} 不能为空", "VALIDATION_ERROR", 400);
        }
        return str;
    }
}
