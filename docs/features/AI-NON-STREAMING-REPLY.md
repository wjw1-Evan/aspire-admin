# AI 非流式回复功能说明

## 功能概述

AI助手（"小科"）现在使用非流式回复，即等待完整回复生成后再一次性显示，而不是流式输出。

## 实现方式

### 前端变更

1. **移除流式回复调用**：
   - 移除了 `streamAssistantReply` 的调用
   - 移除了 `assistantStreaming` 标记
   - 发送消息后不再主动触发流式回复

2. **后端自动处理**：
   - 发送消息时不再设置 `metadata.assistantStreaming = true`
   - 后端会检测到会话中有AI助手，自动调用 `RespondAsAssistantAsync` 生成完整回复
   - 回复通过 SignalR 实时消息推送返回给前端

### 后端逻辑

后端的 `RespondAsAssistantAsync` 方法会在以下情况自动触发：

1. **触发条件**：
   - 会话参与者包含AI助手（`AiAssistantConstants.AssistantUserId`）
   - 消息发送者不是AI助手本身
   - 消息的 `metadata.assistantStreaming` 不为 `true`（现在前端不再设置）

2. **处理流程**：
   ```csharp
   private async Task RespondAsAssistantAsync(ChatSession session, ChatMessage triggerMessage)
   {
       // 检查是否应该跳过自动回复
       if (ShouldSkipAutomaticAssistantReply(triggerMessage))
       {
           return; // 如果设置了 assistantStreaming，会跳过
       }
       
       // 生成完整回复
       var generated = await GenerateAssistantReplyAsync(session, triggerMessage, null);
       
       // 创建并发送AI助手消息
       await CreateAssistantMessageAsync(
           session,
           replyContent,
           triggerMessage.SenderId,
           clientMessageId: null,
           CancellationToken.None);
   }
   ```

3. **消息推送**：
   - AI助手的回复通过 `CreateAssistantMessageAsync` 创建
   - 自动调用 `NotifyMessageCreatedAsync` 通过 SignalR 广播消息
   - 前端通过 `ReceiveMessage` 事件接收完整回复

## 用户体验

### 之前（流式回复）
- 用户发送消息后，AI助手的气泡立即显示（占位符）
- 内容逐步流式输出，用户可以看到逐字显示的效果
- 可能存在延迟或卡顿

### 现在（非流式回复）
- 用户发送消息后，等待AI助手生成完整回复
- 回复完成后，AI助手的气泡一次性显示完整内容
- 响应更加稳定，不会出现流式输出中的卡顿问题

## 代码变更

### 前端文件

- `Platform.App/app/chat/[sessionId].tsx`
  - 移除了 `streamAssistantReply` 的调用
  - 移除了 `assistantStreaming` 标记的设置
  - 移除了 `AI_ASSISTANT_ID` 的导入（不再需要）

### 后端文件

无需修改，后端逻辑已经支持自动回复：
- `Platform.ApiService/Services/ChatService.cs`
  - `RespondAsAssistantAsync` 方法已实现自动回复逻辑
  - `ShouldSkipAutomaticAssistantReply` 方法会检查 `assistantStreaming` 标记

## 注意事项

1. **回复延迟**：
   - 非流式回复需要等待AI完整生成回复后才显示
   - 如果AI回复较长，用户可能需要等待几秒钟

2. **消息推送**：
   - 确保 SignalR 连接正常，否则前端无法实时接收AI回复
   - 如果 SignalR 未连接，可以通过轮询机制获取新消息

3. **回退支持**：
   - 如果需要恢复流式回复，只需恢复前端代码，重新设置 `assistantStreaming: true` 并调用 `streamAssistantReply`

## 相关代码

- `Platform.App/app/chat/[sessionId].tsx` - 消息发送逻辑
- `Platform.App/contexts/ChatContext.tsx` - 聊天上下文（移除流式回复相关）
- `Platform.ApiService/Services/ChatService.cs` - 后端自动回复逻辑
- `Platform.ApiService/Services/ChatService.cs` - `RespondAsAssistantAsync` 方法
- `Platform.ApiService/Hubs/ChatHub.cs` - SignalR 消息推送

## 创建日期

2025-01-27

