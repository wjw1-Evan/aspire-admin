# SSE 流式输出移除说明

## 移除概述

已完全移除项目中的 SSE (Server-Sent Events) 流式输出功能，AI 助手现在使用非流式回复方式。

## 移除内容

### 前端移除

1. **服务层 (`Platform.App/services/chat.ts`)**：
   - 移除了 `streamAssistantReply` 方法
   - 移除了 `AssistantReplyStreamHandlers` 类型定义
   - 移除了 `AssistantReplyStreamOptions` 类型定义
   - 移除了 `parseAssistantStreamEvent` 函数
   - 移除了 `handleAssistantStreamChunk` 函数
   - 移除了 `drainAssistantSseBuffer` 函数
   - 移除了 `fetchAssistantReplyResponse` 函数
   - 移除了 `consumeAssistantReplyStream` 函数

2. **状态管理 (`Platform.App/contexts/chatActions.ts`)**：
   - 移除了 `streamAssistantReplyAction` 函数
   - 移除了 `assistantStreamControllers` Map

3. **上下文 (`Platform.App/contexts/ChatContext.tsx`)**：
   - 移除了 `streamAssistantReply` 方法的定义和导出
   - 移除了相关的导入和使用

4. **配置 (`Platform.App/services/apiConfig.ts`)**：
   - 移除了 `aiAssistantReplyStream` 端点配置

5. **组件 (`Platform.App/components/chat/MessageList.tsx`)**：
   - 移除了流式消息的显示逻辑（`metadata.streaming` 检查）

6. **页面 (`Platform.App/app/chat/[sessionId].tsx`)**：
   - 移除了 `streamAssistantReply` 的调用
   - 移除了 `AI_ASSISTANT_ID` 的导入（不再需要）

### 后端移除

1. **控制器 (`Platform.ApiService/Controllers/ChatAiController.cs`)**：
   - 移除了 `StreamAssistantReply` SSE 端点

2. **服务接口 (`Platform.ApiService/Services/IChatService.cs`)**：
   - 移除了 `StreamAssistantReplyAsync` 接口定义

3. **服务实现 (`Platform.ApiService/Services/ChatService.cs`)**：
   - 移除了 `StreamAssistantReplyAsync` 方法实现
   - 移除了 `ResolveTriggerMessageAsync` 辅助方法（仅用于流式）
   - 移除了 `ChunkAssistantReply` 辅助方法（仅用于流式分块）
   - 移除了 `IsSentenceBoundary` 辅助方法（仅用于流式分块）

### 类型定义（保留但未使用）

以下类型定义在前端和后端中仍然存在，但已不再使用：

- `Platform.App/types/ai.ts`：
  - `AssistantReplyStreamChunkType`
  - `AssistantReplyStreamChunk`
  - `AssistantReplyStreamRequest`

- `Platform.ApiService/Models/AiModels.cs`：
  - `AssistantReplyStreamRequest`
  - `AssistantReplyStreamChunk`

这些类型定义保留是为了避免破坏其他可能引用的代码，但在实际功能中已不再使用。

## 当前实现方式

AI 助手现在使用非流式回复：

1. **前端发送消息**：
   - 用户发送消息时，不再设置 `assistantStreaming` 标记
   - 不再调用 `streamAssistantReply` 方法

2. **后端自动处理**：
   - 后端检测到会话中有 AI 助手，自动调用 `RespondAsAssistantAsync`
   - 生成完整回复后，通过 `CreateAssistantMessageAsync` 创建消息
   - 通过 SignalR 的 `ReceiveMessage` 事件推送完整回复给前端

3. **前端接收消息**：
   - 前端通过 SignalR 的 `ReceiveMessage` 事件接收完整回复
   - 消息一次性显示，不再流式输出

## 用户体验变化

- **之前（流式输出）**：
  - AI 助手的气泡立即显示（占位符）
  - 内容逐步流式输出，逐字显示效果
  - 可能存在延迟或卡顿

- **现在（非流式输出）**：
  - 用户发送消息后，等待 AI 助手生成完整回复
  - 回复完成后，AI 助手的气泡一次性显示完整内容
  - 响应更稳定，不会出现流式输出中的卡顿问题

## 相关文档

- [AI 非流式回复功能说明](AI-NON-STREAMING-REPLY.md)
- [聊天后端 API 实现说明](CHAT-BACKEND-API.md)
- [SignalR 实时聊天集成说明](CHAT-REALTIME-SIGNALR.md)

## 创建日期

2025-01-27

