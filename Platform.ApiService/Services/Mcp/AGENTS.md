# MCP 处理器指南 (Platform.ApiService/Services/Mcp)

## OVERVIEW
本目录定义了系统内 21 个 MCP 工具处理器，通过 Model Context Protocol 向 AI 助手投射深度业务能力。

## HANDLERS
系统内置以下 21 个领域处理器（位于 `Handlers/` 目录）：
- **任务管理**: Task
- **项目协作**: Project
- **密码本**: PasswordBook
- **统计分析**: Statistics
- **社交互动**: Social
- **知识库**: Knowledge
- **工作流**: Workflow
- **通知系统**: Notification
- **表单定义**: Form
- **系统资源**: System
- **用户管理**: User
- **园区资产**: Park
- **组织架构**: Organization
- **公告通知**: Notice
- **菜单权限**: Menu
- **加入申请**: JoinRequest
- **文件版本**: FileVersion
- **IoT 设备**: IoT
- **文档管理**: Document
- **文件共享**: FileShare
- **基础支持**: McpToolHandlerBase (抽象基类)

## WHERE TO LOOK
工具执行流转逻辑如下：
1. **入口**: `McpService.cs` 接收请求并负责工具路由。
2. **匹配**: `ScoreAndMatchTools` 根据用户消息内容进行关键词评分匹配。
3. **解析**: `ResolveParameters` 根据工具 Schema 自动从输入中提取 ID 或关键词。
4. **执行**: 匹配到的 `IMcpToolHandler` 实例执行具体的业务逻辑。

## KEY PATTERNS
- **工具匹配**: 采用领域关键词评分机制，支持自动检测并并行执行最多 2 个匹配工具。
- **性能优化**: 使用 `IMemoryCache` 对工具定义进行缓存（TTL 10分钟），减少反射开销。
- **审计日志**: 所有工具的调用、参数及执行耗时均会被自动记录到系统日志中。
- **安全约束**: 继承 `McpToolHandlerBase` 以自动享受多租户过滤与基础权限校验。
