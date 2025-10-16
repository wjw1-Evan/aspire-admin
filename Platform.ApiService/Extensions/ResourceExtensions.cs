using Platform.ApiService.Constants;

namespace Platform.ApiService.Extensions;

/// <summary>
/// 资源检查扩展方法 - 简化null检查和错误抛出
/// </summary>
public static class ResourceExtensions
{
    /// <summary>
    /// 确保资源存在，如果为null则抛出KeyNotFoundException
    /// </summary>
    /// <typeparam name="T">资源类型</typeparam>
    /// <param name="resource">资源对象</param>
    /// <param name="resourceName">资源名称（用于错误消息）</param>
    /// <param name="resourceId">资源ID（可选，用于错误消息）</param>
    /// <returns>非null的资源对象</returns>
    /// <exception cref="KeyNotFoundException">当资源为null时抛出</exception>
    public static T EnsureFound<T>(this T? resource, string resourceName, string? resourceId = null) where T : class
    {
        if (resource == null)
        {
            var message = string.IsNullOrEmpty(resourceId)
                ? string.Format(ErrorMessages.ResourceNotFound, resourceName)
                : $"{resourceName} {resourceId} 不存在";
            throw new KeyNotFoundException(message);
        }
        
        return resource;
    }
    
    /// <summary>
    /// 确保布尔操作成功，如果为false则抛出KeyNotFoundException
    /// </summary>
    /// <param name="success">操作结果</param>
    /// <param name="resourceName">资源名称</param>
    /// <param name="resourceId">资源ID</param>
    /// <exception cref="KeyNotFoundException">当操作失败时抛出</exception>
    public static void EnsureSuccess(this bool success, string resourceName, string? resourceId = null)
    {
        if (!success)
        {
            var message = string.IsNullOrEmpty(resourceId)
                ? string.Format(ErrorMessages.ResourceNotFound, resourceName)
                : $"{resourceName} {resourceId} 不存在";
            throw new KeyNotFoundException(message);
        }
    }
}








