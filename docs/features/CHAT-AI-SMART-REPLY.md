# AI 智能回复（同步接口）

## 📋 概述

小科助手提供的智能推荐已从 SSE 流式改为标准 HTTP 接口。调用方可以通过 `/api/chat/ai/smart-replies` 端点一次性获取模型生成的推荐列表与提示信息，接口语义更加简单稳定。当前移动端聊天界面已隐藏智能推荐入口，如需展示可参考本文档接入方式。

## 🔌 新增 API

| 接口 | 方法 | 路径 | 说明 |
| --- | --- | --- | --- |
| 获取智能回复 | `POST` | `/api/chat/ai/smart-replies` | 返回 JSON，包含推荐列表、生成耗时和提示信息 |
| 小科助手回复（流式） | `POST` | `/api/chat/ai/assistant-reply/stream` | 生成助手回复增量文本，并在完成后写入会话消息 |

## 🧠 实现细节

- `AiSuggestionService.GetSmartRepliesAsync` 使用 `OpenAIClient.GetChatClient(...).CompleteChatAsync(...)` 调用模型并一次性返回结果。
- 若 OpenAI 未配置或调用失败，将回退至本地兜底建议，并附带提示信息。
- 响应结构：
  ```json
  {
    "suggestions": [
      { "content": "好的，我再确认一下具体时间。", "source": "smart-reply" }
    ],
    "generatedAt": "2025-11-09T03:20:00Z",
    "latencyMs": 842,
    "notice": null
  }
  ```
- `notice` 字段用于提示“暂无推荐”或错误信息，前端可直接展示；存在有效推荐时该字段为空。
- `ChatService.StreamAssistantReplyAsync` 仍保留 SSE 能力，用于助手回复的实时输出。

## 📱 客户端对接建议

1. 直接使用 `fetch` 或任意 HTTP 客户端请求 `/api/chat/ai/smart-replies`。
2. 根据响应中的 `suggestions` 渲染候选按钮（若需要恢复 UI，可将结果绑定到自定义组件）。
3. 如果 `notice` 不为空或 `suggestions` 为空，可展示提示文案并提供刷新按钮。
4. 重复请求时可以主动取消上一次尚未完成的调用，避免浪费模型配额。

## 🤖 小科助手对话体验

- 前端在向包含 `AI_ASSISTANT_ID` 的会话发送消息时，附带 `metadata.assistantStreaming = true`，服务端会跳过默认的同步回复逻辑。
- 发送成功后调用 `POST /api/chat/ai/assistant-reply/stream`，Stream API 先增量输出文本，再返回最终 `ChatMessage` 对象供前端替换占位消息。
- `Platform.App/contexts/chatActions.ts` 新增 `streamAssistantReplyAction`，会在本地插入一个“助手输入中”占位消息，实时更新内容并在完成后使用 SignalR 推送的正式消息进行替换。
- 失败或取消时会在占位消息上标记 `metadata.streamError`，同时弹出统一的错误提示。
- 后端调用小科助手前，会从 MongoDB 中读取最近 24 条会话消息（按时间正序），并将其按照用户/助手角色构造成上下文发送给大模型，确保回复具有连续性的语境理解。

## ✅ 验证步骤

1. `dotnet run --project Platform.AppHost` 启动全套服务，确保配置了合法的 OpenAI Endpoint 与 ApiKey。
2. 在移动端聊天界面发送消息，确认不会再出现智能推荐区域。
3. 断开外网或清空 OpenAI 配置后，通过 API 调用仍应返回 notice 提示。
4. 通过 `curl` 验证：

   ```bash
   curl -H "Authorization: Bearer <token>" \
        -H "Content-Type: application/json" \
        -X POST http://localhost:15000/apiservice/api/chat/ai/smart-replies \
        -d '{"sessionId":"...","userId":"..."}'
   ```

## 📚 相关文件

- `Platform.ApiService/Controllers/ChatAiController.cs`
- `Platform.ApiService/Services/AiSuggestionService.cs`
- `Platform.ApiService/Models/AiModels.cs`
- `Platform.ApiService/Services/ChatService.cs`
- `Platform.App/contexts/chatActions.ts`
- `Platform.App/services/chat.ts`
- `Platform.App/app/chat/[sessionId].tsx`


