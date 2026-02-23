using Platform.ApiService.Models;
using System;
using System.Threading;
using System.Threading.Tasks;

namespace Platform.ApiService.Services;

/// <summary>
/// 聊天 AI 服务，负责处理助手回复与流式生成
/// </summary>
public interface IChatAiService
{
    /// <summary>
    /// 自动作为助手进行回复
    /// </summary>
    /// <param name="session">当前会话</param>
    /// <param name="triggerMessage">触发自动回复的消息</param>
    /// <param name="cancellationToken">取消令牌</param>
    Task RespondAsAssistantAsync(ChatSession session, ChatMessage triggerMessage, CancellationToken cancellationToken);

    /// <summary>
    /// 获取或生成助手的流式回复（如果满足被触发条件）
    /// </summary>
    /// <param name="session">当前会话</param>
    /// <param name="userMessage">触发回复的用户消息</param>
    /// <param name="onChunk">增量内容回调</param>
    /// <param name="onComplete">完成回调</param>
    /// <param name="cancellationToken">取消令牌</param>
    /// <returns>生成的 AI 消息（如果有）</returns>
    Task<ChatMessage?> GetOrGenerateAssistantReplyStreamAsync(
        ChatSession session,
        ChatMessage userMessage,
        Func<string, string, string, Task>? onChunk,
        Func<ChatMessage, Task>? onComplete,
        CancellationToken cancellationToken);

    /// <summary>
    /// 判断是否应该跳过自动生成助手回复（例如客户端选择手动流式获取时）
    /// </summary>
    /// <param name="triggerMessage">触发消息</param>
    /// <returns>是否跳过</returns>
    bool ShouldSkipAutomaticAssistantReply(ChatMessage triggerMessage);
}
