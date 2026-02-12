using Platform.ApiService.Middleware;

namespace Platform.ApiService.Extensions;

/// <summary>
/// 全局身份验证中间件扩展方法
/// </summary>
public static class GlobalAuthenticationMiddlewareExtensions
{
    /// <summary>
    /// 添加全局身份验证中间件
    /// </summary>
    /// <param name="builder">应用程序构建器</param>
    /// <returns>应用程序构建器</returns>
    public static IApplicationBuilder UseGlobalAuthentication(
        this IApplicationBuilder builder)
    {
        return builder.UseMiddleware<GlobalAuthenticationMiddleware>();
    }

    /// <summary>
    /// 添加全局身份验证中间件并配置自定义公共路径
    /// </summary>
    /// <param name="builder">应用程序构建器</param>
    /// <param name="configurePublicPaths">配置公共路径的委托</param>
    /// <returns>应用程序构建器</returns>
    public static IApplicationBuilder UseGlobalAuthentication(
        this IApplicationBuilder builder,
        Action<GlobalAuthenticationOptions>? configurePublicPaths)
    {
        var options = new GlobalAuthenticationOptions();
        configurePublicPaths?.Invoke(options);
        
        // 注意：这里需要修改中间件以支持外部配置
        return builder.UseMiddleware<GlobalAuthenticationMiddleware>();
    }
}

/// <summary>
/// 全局身份验证选项
/// </summary>
public class GlobalAuthenticationOptions
{
    /// <summary>
    /// 公共路径列表
    /// </summary>
    public List<string> PublicPaths { get; } = new();

    /// <summary>
    /// 添加公共路径
    /// </summary>
    /// <param name="path">路径</param>
    /// <returns>选项实例</returns>
    public GlobalAuthenticationOptions AddPublicPath(string path)
    {
        PublicPaths.Add(path);
        return this;
    }

    /// <summary>
    /// 添加多个公共路径
    /// </summary>
    /// <param name="paths">路径列表</param>
    /// <returns>选项实例</returns>
    public GlobalAuthenticationOptions AddPublicPaths(params string[] paths)
    {
        PublicPaths.AddRange(paths);
        return this;
    }
}