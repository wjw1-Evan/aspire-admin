namespace Platform.ServiceDefaults.Extensions;

/// <summary>
/// 通用对象扩展方法
/// </summary>
public static class CommonExtensions
{
    /// <summary>
    /// 确保对象不为空，如果为空则抛出 InvalidOperationException
    /// </summary>
    /// <typeparam name="T">对象类型</typeparam>
    /// <param name="obj">要检查的对象</param>
    /// <param name="entityName">实体名称（用于错误消息）</param>
    /// <param name="id">实体ID（用于错误消息）</param>
    /// <returns>返回非空的对象</returns>
    /// <exception cref="InvalidOperationException">当对象为空时抛出</exception>
    public static T EnsureFound<T>(this T? obj, string entityName, object? id = null) where T : class
    {
        if (obj == null)
        {
            var message = id != null
                ? $"{entityName} (ID: {id}) 不存在"
                : $"{entityName} 不存在";
            throw new InvalidOperationException(message);
        }
        return obj;
    }

    /// <summary>
    /// 确保字符串不为空，如果为空则抛出 ArgumentException
    /// </summary>
    /// <param name="str">要检查的字符串</param>
    /// <param name="paramName">参数名称</param>
    /// <returns>返回非空的字符串</returns>
    /// <exception cref="ArgumentException">当字符串为空时抛出</exception>
    public static string EnsureNotEmpty(this string? str, string paramName)
    {
        if (string.IsNullOrWhiteSpace(str))
        {
            throw new ArgumentException($"{paramName} 不能为空", paramName);
        }
        return str;
    }
}
