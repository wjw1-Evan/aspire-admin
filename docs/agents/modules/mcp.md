# MCP 服务与 AI 能力整合

## 10. MCP 服务与 AI 能力整合

### 10.1 MCP 核心架构

**位置**：`Platform.ApiService/Services/McpService.cs`

**核心功能**：
1. **工具路由**：通过 `IEnumerable<IMcpToolHandler>` 自动发现所有 Handler
2. **自动检测匹配**：`DetectAndCallMcpToolsAsync` 实现智能匹配
3. **参数解析**：`ResolveParameters` 从用户输入中提取参数
4. **关键词评分**：`ScoreAndMatchTools` 对工具进行匹配评分

**关键特性**：
- 支持最多同时执行 2 个匹配工具（`MaxMatchedTools = 2`）
- 最低匹配分数阈值 5.0（`MinimumMatchScore = 5.0`）
- 安全过滤：检测用户消息是否包含操作意图，防止误执行

### 10.2 MCP 控制器

**位置**：`Platform.ApiService/Controllers/McpController.cs`

**端点**：
- `POST api/mcp/initialize` - 初始化 MCP 服务器
- `POST api/mcp/tools/list` - 列出所有可用工具
- `POST api/mcp/tools/call` - 调用指定工具

### 10.3 MCP Handlers 列表（20 个）

| Handler 文件 | 功能领域 | 状态 |
|-------------|---------|------|
| TaskMcpToolHandler.cs | 任务管理 | ✅ |
| ProjectMcpToolHandler.cs | 项目管理 | ✅ |
| UserMcpToolHandler.cs | 用户管理 | ✅ |
| WorkflowMcpToolHandler.cs | 工作流引擎 | ✅ |
| IoTMcpToolHandler.cs | 物联网平台 | ✅ |
| ParkMcpToolHandler.cs | 园区管理 | ✅ |
| KnowledgeMcpToolHandler.cs | 知识库 | ✅ |
| DocumentMcpToolHandler.cs | 公文管理 | ✅ |
| PasswordBookMcpToolHandler.cs | 密码本 | ✅ |
| NotificationMcpToolHandler.cs | 通知推送 | ✅ |
| FileShareMcpToolHandler.cs | 文件分享 | ✅ |
| FormMcpToolHandler.cs | 表单管理 | ✅ |
| MenuMcpToolHandler.cs | 菜单管理 | ✅ |
| SocialMcpToolHandler.cs | 社交功能 | ✅ |
| OrganizationMcpToolHandler.cs | 组织架构 | ✅ |
| JoinRequestMcpToolHandler.cs | 加入申请 | ✅ |
| StatisticsMcpToolHandler.cs | 统计分析 | ✅ |
| SystemMcpToolHandler.cs | 系统管理 | ✅ |
| WebScraperMcpToolHandler.cs | 网页抓取 | ✅ |
| ChatAiMcpToolHandler.cs | AI 聊天 | ✅ |

### 10.4 Handler 开发标准

所有 Handler 必须实现 `IMcpToolHandler` 接口：

```csharp
public interface IMcpToolHandler
{
    string ToolName { get; }
    string Description { get; }
    string Version { get; }
    Task<object?> HandleAsync(JsonElement parameters, CancellationToken cancellationToken);
}
```

**标准 Handler 模板**：

```csharp
public class XxxMcpToolHandler : BaseMcpToolHandler, IMcpToolHandler
{
    public string ToolName => "xxx_tool";
    public string Description => "XXX 工具描述";
    public string Version => "1.0.0";

    private readonly IXxxService _service;
    private readonly ILogger<XxxMcpToolHandler> _logger;

    public XxxMcpToolHandler(IXxxService service, ILogger<XxxMcpToolHandler> logger)
    {
        _service = service ?? throw new ArgumentNullException(nameof(service));
        _logger = logger ?? throw new ArgumentNullException(nameof(logger));
    }

    public async Task<object?> HandleAsync(JsonElement parameters, CancellationToken cancellationToken)
    {
        try
        {
            // 解析参数
            var param = ParseParameters<XxxRequest>(parameters);

            // 调用服务
            var result = await _service.DoSomethingAsync(param);

            return new { success = true, data = result };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "执行工具 {ToolName} 失败", ToolName);
            return new { success = false, error = ex.Message };
        }
    }
}
```

### 10.5 MCP 工具匹配机制

**工作流程**：

1. 用户消息进入 `McpService.DetectAndCallMcpToolsAsync`
2. 对所有 Handler 进行关键词评分（`ScoreAndMatchTools`）
3. 选择分数 > `MinimumMatchScore` 的工具（最多 `MaxMatchedTools` 个）
4. 从用户消息中解析参数（`ResolveParameters`）
5. 并发执行匹配的工具
6. 返回聚合结果

**评分规则**：
- 工具名称匹配：+10 分
- 描述关键词匹配：+5 分
- 参数名匹配：+3 分
- 用户消息包含操作动词：+2 分

### 10.6 参数解析

`ResolveParameters` 支持以下格式：

1. **MongoDB ObjectId**：24 位十六进制字符串
2. **GUID**：标准 GUID 格式
3. **JSON 参数**：`{"key": "value"}` 格式
4. **自然语言**：从句子中提取关键信息

**示例**：

```
用户输入: "查看任务 507f1f77bcf86cd799439011 的详情"
解析结果: { "id": "507f1f77bcf86cd799439011" }
```

### 10.7 安全过滤

McpService 内置安全过滤，检测用户消息是否包含危险操作：

```csharp
private static readonly string[] DangerousOperations = 
{
    "删除", "delete", "drop", "truncate", "rm -rf", "格式化"
};

// 如果消息包含危险操作，拒绝执行命令类工具
if (ContainsDangerousOperations(userMessage))
{
    return new { requiresConfirmation = true, message = "此操作需要确认" };
}
```

### 10.8 AI 助手使用建议

**对于 AI 助手**：

1. **按需调用工具**：不要尝试一次性加载所有 Handler，而是根据任务类型调用相关工具
2. **利用工具描述**：每个 Handler 都有 Description，用于理解工具用途
3. **参数传递**：优先使用结构化参数（JSON），避免自然语言解析
4. **错误处理**：工具返回 `{ success: false }` 时，检查 `error` 字段

**示例：查询任务列表**

```
用户: "显示我的任务列表"
AI 操作:
1. 识别需要调用 TaskMcpToolHandler
2. 构造参数: { "action": "list", "page": 1, "pageSize": 20 }
3. 调用 POST /api/mcp/tools/call
4. 解析返回结果并展示给用户
```

### 10.9 新增 MCP Handler 流程

1. 在 `Platform.ApiService/Services/Mcp/Handlers/` 下创建 Handler 文件
2. 实现 `IMcpToolHandler` 接口
3. 继承 `BaseMcpToolHandler`（可选，提供通用方法）
4. 注册服务（自动发现，无需手动注册）
5. 在 AGENTS.md 的 Handler 列表中添加记录
