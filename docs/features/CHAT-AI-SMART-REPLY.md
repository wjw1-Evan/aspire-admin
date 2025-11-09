# AI 智能回复（SSE 流式输出）

## 📋 概述

本次更新在后端新增对 OpenAI Chat 完整的 Server-Sent Events（SSE）转发能力，移动端或其他调用方可以通过 `/api/chat/ai/smart-replies/stream` 端点实时获取模型输出的增量文本及最终建议集合，显著缩短用户等待时间。

## 🔌 新增 API

| 接口 | 方法 | 路径 | 说明 |
| --- | --- | --- | --- |
| 获取智能回复（流式） | `POST` | `/api/chat/ai/smart-replies/stream` | 返回 `text/event-stream`，每条事件包含增量文本或最终候选列表 |

> ⚠️ 旧的非流式端点 `/api/chat/ai/smart-replies` 已移除，所有调用方需要切换至流式接口。

### 事件格式

```text
data: {"type":"delta","text":"正在为你准备..."}

data: {"type":"delta","text":"建议 1：我们下午再跟进"}

data: {"type":"complete","latencyMs":842,"suggestions":[{"content":"好的，我再确认一下具体时间。","source":"smart-reply"}]}
```

- `type = delta`：模型增量输出，`text` 为原始文本片段。
- `type = complete`：模型完成并成功解析为候选列表。
- `type = fallback`：调用失败或配置缺失，返回本地兜底候选。
- `type = error`：非预期异常（不会终止 SSE，建议前端提示）。

## 🧠 实现细节

- `AiSuggestionService.StreamSmartRepliesAsync` 使用 `OpenAIClient.GetChatClient(...).CompleteChatStreamingAsync(...)` 调用官方流式接口，将所有文本增量逐条 `yield`。
- 移除原有非流式实现，后端仅保留流式生成能力，避免重复维护。
- 流式完成后尝试将最终文本解析成 JSON，成功时输出 `complete` 事件；否则退化为本地 `BuildFallbackSuggestions`。
- 未配置 OpenAI 相关参数（`AiCompletionOptions.Endpoint/ApiKey`）时直接返回 `fallback` 事件，避免客户端长时间等待。

## 📱 客户端对接建议

1. 使用 `EventSource` 或任意支持 SSE 的库监听事件。
2. `delta` 事件可用于即时更新占位文案或“思考中”提示。
3. 接收 `complete` 或 `fallback` 后，渲染最终的候选按钮并关闭流。
4. 若出现 `error` 事件，可提示用户稍后再试，同时保留 `fallback` 文案作为兜底。

## ✅ 验证步骤

1. `dotnet run --project Platform.AppHost` 启动全套服务，确保配置了合法的 OpenAI Endpoint 与 ApiKey。
2. 在移动端聊天界面发送消息，观察智能回复区域：
   - 短时间内即可看到流式文字逐条输出。
   - 完成后渲染 3 条候选。
3. 断开外网或清空 OpenAI 配置，再次触发智能回复，应该迅速收到 `fallback` 事件。
4. 通过浏览器 `curl` 验证：

   ```bash
   curl -N -H "Authorization: Bearer <token>" \
        -H "Content-Type: application/json" \
        -X POST http://localhost:15000/apiservice/api/chat/ai/smart-replies/stream \
        -d '{"sessionId":"...","userId":"..."}'
   ```

## 📚 相关文件

- `Platform.ApiService/Controllers/ChatAiController.cs`
- `Platform.ApiService/Services/AiSuggestionService.cs`
- `Platform.ApiService/Models/AiModels.cs`
- `Platform.App/components/chat/AiSuggestionBar.tsx`（前端消费 SSE 的理想位置）


