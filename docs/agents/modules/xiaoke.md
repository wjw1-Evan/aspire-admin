# 小科 AI 聊天系统

## 11. 小科 AI 聊天系统

### 11.1 系统架构

**核心组件**：

| 组件 | 位置 | 说明 |
|------|------|------|
| ChatAiController | `Platform.ApiService/Controllers/ChatAiController.cs` | AI 聊天 API 入口 |
| ChatAiService | `Platform.ApiService/Services/ChatAiService.cs` | 聊天核心服务 |
| XiaokeConfigController | `Platform.ApiService/Controllers/XiaokeConfigController.cs` | 小科配置管理 |
| ChatSessionsController | `Platform.ApiService/Controllers/ChatSessionsController.cs` | 会话管理 |
| ChatMessagesController | `Platform.ApiService/Controllers/ChatMessagesController.cs` | 消息管理 |

### 11.2 AI 模型集成

**支持的 LLM 提供商**：

| 提供商 | 配置键 | 说明 |
|--------|--------|------|
| OpenAI | `OpenAI` | GPT-3.5/GPT-4 系列 |
| Azure OpenAI | `AzureOpenAI` | Azure 托管的 OpenAI 服务 |
| 本地模型 | `LocalLLM` | 本地部署的开源模型 |

**配置示例**（`appsettings.json`）：

```json
{
  "LLM": {
    "Provider": "OpenAI",
    "OpenAI": {
      "ApiKey": "sk-xxx",
      "Model": "gpt-4",
      "Endpoint": "https://api.openai.com/v1"
    }
  }
}
```

### 11.3 聊天服务核心流程

```csharp
// ChatAiService.cs 核心方法
public async Task<ChatResponse> SendMessageAsync(
    string sessionId,
    string message,
    string userId)
{
    // 1. 获取或创建会话
    var session = await GetOrCreateSessionAsync(sessionId, userId);

    // 2. 保存用户消息
    var userMessage = await SaveMessageAsync(session.Id, message, "user");

    // 3. 构建上下文（最近 N 条消息）
    var context = await BuildConversationContextAsync(session.Id);

    // 4. 调用 LLM
    var llmResponse = await CallLLMAsync(context);

    // 5. 保存 AI 回复
    var aiMessage = await SaveMessageAsync(session.Id, llmResponse, "assistant");

    // 6. 返回结果
    return new ChatResponse
    {
        Message = aiMessage,
        SessionId = session.Id
    };
}
```

### 11.4 会话管理

**会话数据结构**：

```csharp
public class ChatSession
{
    public string Id { get; set; } = Guid.NewGuid().ToString();
    public string UserId { get; set; } = string.Empty;
    public string Title { get; set; } = "新对话";
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? LastMessageAt { get; set; }
    public bool IsArchived { get; set; }
}
```

**会话列表 API**：

```typescript
// 前端调用
const sessions = await request<ApiResponse<ChatSession[]>>(
  '/apiservice/api/chat-sessions',
  { params: { pageSize: 20 } }
);
```

### 11.5 消息格式

**消息类型**：

| 类型 | 说明 |
|------|------|
| `user` | 用户发送的消息 |
| `assistant` | AI 回复的消息 |
| `system` | 系统提示消息 |

**消息结构**：

```csharp
public class ChatMessage
{
    public string Id { get; set; } = Guid.NewGuid().ToString();
    public string SessionId { get; set; } = string.Empty;
    public string Role { get; set; } = "user";
    public string Content { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public string? Model { get; set; }  // AI 模型名称
    public int? TokensUsed { get; set; }  // 使用的 token 数
}
```

### 11.6 前端聊天界面

**核心组件**：`Platform.Admin/src/pages/xiaoke-management/chat/`

```typescript
// 使用 ProChat 组件
import { ProChat } from '@ant-design/pro-chat';

<ProChat
  request={async (messages) => {
    const response = await api.sendMessage({
      sessionId: currentSessionId,
      message: messages[messages.length - 1].content,
    });
    return response.data;
  }}
  onConversationChange={(activeKey) => {
    setCurrentSessionId(activeKey);
  }}
/>
```

### 11.7 小科配置管理

**配置项**：

| 配置 | 说明 | 默认值 |
|------|------|--------|
| `Model` | LLM 模型名称 | `gpt-3.5-turbo` |
| `Temperature` | 创造力参数 | `0.7` |
| `MaxTokens` | 最大回复 token 数 | `2000` |
| `SystemPrompt` | 系统提示词 | `你是小科AI助手` |
| `EnableMCP` | 是否启用 MCP 工具调用 | `true` |

**配置管理 API**：

```typescript
// 获取配置
const config = await request<ApiResponse<XiaokeConfig>>(
  '/apiservice/api/xiaoke-config'
);

// 更新配置
await request<ApiResponse<void>>(
  '/apiservice/api/xiaoke-config',
  { method: 'PUT', data: newConfig }
);
```

### 11.8 MCP 工具调用集成

小科 AI 支持通过 MCP 协议调用后端工具：

```csharp
// 在 ChatAiService 中集成 MCP
public async Task<string> CallLLMWithMCPAsync(
    List<ChatMessage> context)
{
    // 1. 调用 LLM 获取回复
    var response = await _llmService.ChatAsync(context);

    // 2. 检测是否需要调用工具
    if (response.ContainsToolCall())
    {
        // 3. 解析工具调用请求
        var toolCall = ParseToolCall(response);

        // 4. 通过 McpService 执行工具
        var toolResult = await _mcpService.CallToolAsync(
            toolCall.ToolName,
            toolCall.Parameters
        );

        // 5. 将工具结果返回给 LLM
        context.Add(new ChatMessage
        {
            Role = "tool",
            Content = JsonSerializer.Serialize(toolResult)
        });

        // 6. 再次调用 LLM 生成最终回复
        response = await _llmService.ChatAsync(context);
    }

    return response.Content;
}
```

### 11.9 前端页面清单

| 页面 | 路径 | 说明 |
|------|------|------|
| 聊天界面 | `xiaoke-management/chat/` | AI 对话主界面 |
| 会话管理 | `xiaoke-management/sessions/` | 会话列表与管理 |
| 配置管理 | `xiaoke-management/config/` | 小科配置设置 |

### 11.10 部署注意事项

1. **API Key 安全**：LLM API Key 必须存储在服务端，不得暴露给前端
2. **Token 计费**：注意 LLM 的 token 使用量，避免超出配额
3. **流式响应**：建议使用 SSE 实现流式回复，提升用户体验
4. **上下文长度**：注意模型的上下文窗口限制（如 GPT-4 是 128k tokens）
5. **错误处理**：LLM 调用失败时，给用户友好的提示

### 11.11 调试技巧

**查看 LLM 请求/响应**：

```csharp
// 在 ChatAiService 中添加日志
_logger.LogInformation("LLM Request: {Request}", JsonSerializer.Serialize(context));
_logger.LogInformation("LLM Response: {Response}", response.Content);
```

**前端调试**：

```typescript
// 在浏览器 DevTools 中查看网络请求
// 筛选 /apiservice/api/chat-ai 相关请求
```
