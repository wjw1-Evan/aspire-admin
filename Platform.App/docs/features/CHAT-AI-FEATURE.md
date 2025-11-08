# 聊天 & AI 助手功能说明

## 📋 概述

`Platform.App` 新增移动端聊天与社交体验，整合服务器存储的即时消息、AI 智能建议、附件上传与附近的人搜索能力，所有数据统一由后端 API 托管。

## 🏗️ 系统结构

- **数据契约**：`types/chat.ts` 与 `types/ai.ts` 定义会话、消息、附件、AI 建议、附近用户等核心模型。
- **服务层**：
  - `services/chat.ts`：会话、消息、附件上传 API。
  - `services/ai.ts`：智能回复、好友推荐、话题引导。
  - `services/location.ts`：定位权限、位置上报与附近用户检索。
- **全局状态**：`ChatContext`（会话、消息、AI 建议、附近人、服务器附件引用）。
- **Hooks**：
  - `useAiAssistant`：节流调用智能建议。
  - `useNearbyUsers`：定位授权、附近人刷新与上报。

## 🔌 消息同步策略

- **统一后端存储**：所有消息、附件均通过 `chatService` 调用 REST API 发送并持久化，移动端仅负责展示与轮询刷新。
- **消息轮询**：`app/chat/[sessionId].tsx` 每隔 5 秒调用 `loadMessages`，并在发送成功后立即刷新上下文，确保不同终端数据一致。
- **附件上传**：`chatService.uploadAttachment` 使用 `FormData` 将文件提交至后端，返回的 `AttachmentMetadata.url` 可直接用于预览与下载。

## 💬 聊天体验

- **Tab 页**：`app/(tabs)/chat.tsx` 显示最新会话与未读数。
- **会话窗口**：`app/chat/[sessionId].tsx`
  - `ConversationHeader` 展示会话信息与导航。
  - `MessageList` + `AttachmentPreview` 呈现文本与富媒体。
  - `MessageComposer` + `AiSuggestionBar` 支持文本发送、智能候选、附件选择。
- **消息处理**：
  - 发送文本：调用 `sendMessage` 后自动刷新列表并触发 AI 推荐。
  - 上传附件：`AttachmentPicker` 选取文件 → `chatService.uploadAttachment` 返回资源 → 再调用 `sendMessage` 携带 `attachmentId` 完成消息发送。

## 🤖 AI 增益能力

- **智能回复**：`useAiAssistant` 在发送或加载消息时拉取上下文建议（节流 3 秒）。
- **好友推荐**：`app/people/recommend.tsx` 调用 `aiService.getMatchSuggestions`，按匹配度排序并跳转聊天。
- **话题引导**：后续可通过 `aiService.getTopicGuides` 扩展 UI。

## 📍 附近的人

- `useNearbyUsers` 请求定位权限、上报 `locationBeacon` 并调用 `fetchNearbyUsers`。
- `app/people/nearby.tsx` 展示距离、兴趣标签，支持一键跳转聊天。

## ⚙️ 配置与依赖

- **环境变量**：
  - API 网关沿用 `constants/apiConfig.ts` 动态解析的 Aspire Endpoint。
- **后端大模型配置**：在 `Platform.AppHost/appsettings.json` 中通过 `Ai` 节点统一管理大模型接口信息，默认示例（OpenAI）如下：

```json
{
  "Ai": {
    "Endpoint": "https://api.openai.com/v1/chat/completions",
    "Model": "gpt-4o-mini",
    "SystemPrompt": "你是小科，请使用简体中文提供简洁、专业且友好的回复。",
    "TimeoutSeconds": 30,
    "MaxTokens": 512
  }
}
```

  - 通过 `dotnet user-secrets set "Ai:ApiKey" "sk-xxxxx"` 或 Aspire 环境变量 `Ai__ApiKey` 注入敏感令牌，禁止将 token 写入仓库。
  - 可根据需要定制 `SystemPrompt`、`TimeoutSeconds` 与 `MaxTokens` 等高级参数，ApiService 会自动读取这些配置并通过 `AiCompletionOptions` 在 `OpenAIClient` 调用时生效。
- **设备权限**：
  - 相册/文件：附件选择需在系统设置中允许访问。
  - 定位：附近的人功能需前台定位权限。
- **推荐超参**：`NEARBY_SEARCH_DEFAULT_RADIUS = 2000m`、`NEARBY_SEARCH_DEFAULT_LIMIT = 20`。

## 🚀 使用指引

1. 登录后进入“聊天”标签，系统会自动从后端拉取会话列表与未读消息。
2. 在对话页发送文本或附件，消息立即提交至服务器并同步至所有终端。
3. 访问“Explore”页，进入“附近的人”或“AI 推荐”获取新的会话对象。
4. 若需要强制刷新，可下拉消息列表或等待轮询自动同步。

## 🔍 运维与调试

- `ChatContext` 暴露 `clearError` 与 `resetChat` 用于清理异常状态。
- 使用 `console` 日志可跟踪消息轮询与附件上传流程。
- 如需定位附件问题，可检查后端返回的文件 URL 与 HTTP 日志。

## 📚 相关文件

- 类型定义：`types/chat.ts`、`types/ai.ts`
- 服务层：`services/chat.ts`、`services/ai.ts`、`services/location.ts`
- 上下文 & Hooks：`contexts/ChatContext.tsx`、`hooks/useAiAssistant.ts`、`hooks/useNearbyUsers.ts`
- UI 组件：`components/chat/*`
- 页面：`app/(tabs)/chat.tsx`、`app/chat/[sessionId].tsx`、`app/people/*`

