using Platform.ApiService.Models;
using System.Threading;
using System.Threading.Tasks;

namespace Platform.ApiService.Services;

/// <summary>
/// 聊天意图与 MCP 工具调用服务
/// </summary>
public interface IChatMcpService
{
    /// <summary>
    /// 检测用户意图并尝试调用 MCP 工具
    /// </summary>
    /// <param name="session">当前会话</param>
    /// <param name="triggerMessage">触发意图检测的消息</param>
    /// <param name="currentUserId">当前用户标识</param>
    /// <param name="cancellationToken">取消令牌</param>
    /// <returns>工具执行结果汇总，若无调用则返回为空</returns>
    Task<string?> DetectAndCallMcpToolsAsync(ChatSession session, ChatMessage triggerMessage, string currentUserId, CancellationToken cancellationToken);
}
