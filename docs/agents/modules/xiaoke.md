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

### 11.12 对话体验设计（新增）

#### 对话交互的核心原则

AI 聊天的用户体验与传统 UI 不同——用户用自然语言与系统交互，体验好坏取决于**回复速度、准确性和上下文连贯性**。

#### 流式响应（Streaming）

流式响应是 AI 聊天的**基础用户体验要求**：

| 方式 | 用户体验 | 推荐场景 |
|------|---------|---------|
| **流式响应**（SSE） | 用户看到 AI 逐字输出，感觉"在思考" | 所有聊天场景 |
| **非流式响应** | 用户盯着 loading，不知道 AI 在不在工作 | 应避免使用 |

```csharp
// 流式响应实现要点
public async IAsyncEnumerable<string> StreamMessageAsync(
    string sessionId,
    string message,
    string userId,
    CancellationToken cancellationToken)
{
    // 1. 立即返回"已收到"的视觉反馈
    await SaveUserMessageAsync(sessionId, message, userId);

    // 2. 一边生成一边输出
    await foreach (var chunk in _llmService.StreamAsync(context, cancellationToken))
    {
        yield return chunk;
        // 每 100ms 至少推送一次，保持前端的"正在输出"效果
    }
}
```

#### 聊天的状态管理

| 状态 | 用户看到 | 实现要点 |
|------|---------|---------|
| **空闲** | 输入框可用，显示历史消息 | 正常状态 |
| **发送中** | 用户消息出现 + 打字指示器 | 立即显示用户消息，不等待后端 |
| **AI 回复中** | 逐字输出 + 可随时停止 | SSE 流式 + 中止令牌 |
| **回复完成** | 完整回复 + 可继续输入 | 滚动到底部 |
| **出错** | 错误提示 + 重发按钮 | 不丢失刚才的输入 |

```typescript
// 前端聊天状态管理示例
const [chatState, setChatState] = useState<'idle' | 'sending' | 'responding' | 'error'>('idle');

// 发送消息
async function handleSend(content: string) {
  // 立即显示用户消息（乐观更新）
  addMessage({ role: 'user', content });
  setChatState('responding');

  try {
    // 流式接收 AI 回复
    await streamResponse(sessionId, content, (chunk) => {
      updateLastMessage(chunk); // 逐字追加
    });
    setChatState('idle');
  } catch (e) {
    setChatState('error');
    showRetryOption();
  }
}
```

#### 错误恢复设计

AI 的不可靠性比传统系统更高，错误恢复设计尤为重要：

```typescript
// ✅ 好的错误恢复
try {
  const response = await api.sendMessage({ sessionId, message });
} catch (error) {
  // 1. 不丢失上下文
  // 2. 提供重试选项
  // 3. 给出友好提示说明原因
  showError('回复生成中断', {
    description: '网络不稳定，请重试或换一种问法',
    actions: [
      { label: '重试', onPress: () => resend() },
      { label: '换个问法', onPress: () => clearAndRetry() },
    ],
  });
}

// ❌ 差的错误处理
catch (error) {
  message.error('请求失败');
  // 用户不知道刚才说了什么，不知道怎么恢复
}
```

#### 会话延续体验

| 场景 | 好的体验 | 差的体验 |
|------|---------|---------|
| 刷新页面 | 自动恢复上次对话列表和最后一条消息 | 回到空聊天界面 |
| 切换会话 | 保留切换前的位置和滚动 | 滚动到最顶部 |
| 长时间未活动 | 提示"继续上次的讨论" | 清空上下文 |
| 多轮对话 | AI 记得之前说过的内容 | AI 问同样的信息第二次 |

#### 输入体验设计

```typescript
// 输入框设计的用户体验要点
<Input.TextArea
  // ✅ 支持 Enter 发送，Shift+Enter 换行
  onKeyDown={(e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }}
  // ✅ 保留草稿
  value={draft}
  onChange={(e) => saveDraft(sessionId, e.target.value)}
  // ✅ 发送中禁用
  disabled={chatState === 'responding'}
  // ✅ 占位符提示
  placeholder="输入消息，Enter 发送"
  // ✅ 高度自适应
  autoSize={{ minRows: 1, maxRows: 6 }}
/>
```

#### 关键用户体验检查清单

开发聊天功能时，问自己：

- [ ] **流式输出** — 用户能看到 AI 逐字回复吗？还是需要等全部生成完？
- [ ] **即时反馈** — 发送消息后用户消息立即出现在聊天区域吗？
- [ ] **错误恢复** — LLM 调用失败时，用户能不丢上下文重试吗？
- [ ] **会话延续** — 刷新后能回到之前的对话吗？
- [ ] **输入体验** — Enter 发送、草稿保存、高度自适应都支持了吗？
- [ ] **打字指示器** — AI 回复中有打字效果吗？还是让用户面对空白发呆？
- [ ] **上下文管理** — 长对话中有没有提供历史摘要或上下文管理？
