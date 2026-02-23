using Platform.ServiceDefaults.Services;

namespace Platform.ApiService.Services;

/// <summary>
/// SSE 连接管理器接口
/// 管理 SSE 连接的生命周期 and 消息发送
/// </summary>
public interface IChatSseConnectionManager : ISingletonDependency
{
    /// <summary>
    /// 注册连接
    /// </summary>
    /// <param name="connectionId">连接标识</param>
    /// <param name="response">HTTP 响应流</param>
    /// <param name="cancellationToken">取消令牌</param>
    Task RegisterConnectionAsync(string connectionId, HttpResponse response, CancellationToken cancellationToken);

    /// <summary>
    /// 注销连接
    /// </summary>
    /// <param name="connectionId">连接标识</param>
    Task UnregisterConnectionAsync(string connectionId);

    /// <summary>
    /// 发送消息到指定连接
    /// </summary>
    /// <param name="connectionId">连接标识</param>
    /// <param name="message">消息内容（已格式化的 SSE 消息）</param>
    Task SendMessageAsync(string connectionId, string message);

    /// <summary>
    /// 检查连接是否存在
    /// </summary>
    /// <param name="connectionId">连接标识</param>
    /// <returns>连接是否存在</returns>
    bool IsConnectionActive(string connectionId);

    /// <summary>
    /// 注册用户连接（简化版：直接关联用户ID）
    /// </summary>
    /// <param name="userId">用户ID</param>
    /// <param name="connectionId">连接ID</param>
    /// <param name="response">HTTP 响应流</param>
    /// <param name="cancellationToken">取消令牌</param>
    Task RegisterUserConnectionAsync(string userId, string connectionId, HttpResponse response, CancellationToken cancellationToken);

    /// <summary>
    /// 向用户的所有连接发送消息
    /// </summary>
    /// <param name="userId">用户ID</param>
    /// <param name="message">消息内容（已格式化的 SSE 消息）</param>
    Task SendToUserAsync(string userId, string message);
}

