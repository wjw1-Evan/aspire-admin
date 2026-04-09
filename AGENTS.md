# AI 助手 / Copilot 全局指南

> [!IMPORTANT]
> 本文件定义了 Aspire Admin 项目的最高准则。AI 助手在处理本项目的任何任务时，**必须**优先读取并完全遵守此文档的规范。

## 1. 核心架构与技术栈
本项目是一个基于 **.NET 10 (后端) + React 19 (前端 Admin) + Expo 54 (移动 App) + 微信原生 (小程序 MiniApp)** 的企业级多租户闭环管理系统。

- **后端**：`.NET 10` + `Aspire` 微服务编排 + `MongoDB`
- **前端后台**：`React 19` + `Ant Design 6` + `UmiJS 4`
- **移动端应用**：`Expo 54` 跨端 App，内置原生通知
- **微信小程序**：`Platform.MiniApp` 微信原生开发，轻量级多端扩展
- **基础设施**：`Redis` 缓存、`OpenAI/MCP` 服务、`JWT/国密算法` 加解密认证
- **数据库驱动**：MongoDB.Driver + MongoDB.Entities

**核心项目结构**：
- `Platform.AppHost/AppHost.cs`：所有微服务、数据库、Redis 资源的统筹编排入口。
- `Platform.ApiService`：统一的后端核心业务网关与逻辑层。
- `Platform.ServiceDefaults`：共享的扩展、实体基类及 `PlatformDbContext` 基础设施层。
- `Platform.Admin` / `Platform.App` / `Platform.MiniApp`：多端前端应用。

### 后端项目结构

| 层级 | 项目 | 职责 |
|------|------|------|
| **服务编排** | `Platform.AppHost` | Aspire 资源编排，统一入口 |
| **业务网关** | `Platform.ApiService` | API 控制器 + 业务服务层 |
| **基础设施** | `Platform.ServiceDefaults` | DbContext、中间件、基类 |
| **数据初始化** | `Platform.DataInitializer` | 种子数据、菜单配置 |
| **存储服务** | `Platform.Storage` | 文件存储服务 |
| **系统监控** | `Platform.SystemMonitor` | 监控服务 |

### 前端项目结构

| 应用 | 框架 | 用途 |
|------|------|------|
| `Platform.Admin` | React 19 + UmiJS 4 + Ant Design 6 | 管理后台 |
| `Platform.App` | Expo 54 | 移动端 App |
| `Platform.MiniApp` | 微信原生 | 微信小程序 |

## 2. 交互与代码流基础纪律

### 🤖 会话与 Git 提交
- **全面中文交互**：所有代码注释、README、给用户的回复、以及 **Git 提交信息**，必须使用**简体中文**。
- **Commit 格式**：遵循约定式提交（如 `feat: 添加xxx`，`fix: 修复xxx`，`docs: 更新xxx`）。

### 📝 代码修改成功后自动提交与推送
修改代码成功后，**必须**自动执行以下操作：

#### 1. 运行 lint 检查
```bash
cd Platform.Admin && npm run lint
```

#### 2. 检查 Git 状态
```bash
git status
```

#### 3. 如果有变更，提交并推送
```bash
git add -A
git commit -m "<提交信息>"
git push origin main
```

#### 提交信息规范
- `feat: 添加xxx` - 新功能
- `fix: 修复xxx` - 错误修复
- `docs: 更新xxx` - 文档更新
- `refactor: 重构xxx` - 代码重构
- `style: 调整xxx` - 格式调整
- `perf: 优化xxx` - 性能优化
- `test: 测试xxx` - 测试相关
- `chore: 维护xxx` - 构建或辅助工具的变动

> **注意**：如果没有任何变更，不需要执行提交操作。

### 🚀 Aspire 资源调拨
- 修改 `Platform.AppHost/AppHost.cs` 或 `appsettings.json` 后，必须指导用户重启 `aspire run`。
- 请勿向用户推荐使用过时的 Aspire workload。
- 使用 MCP 提供的 `list resources` / `list integrations` 等工具排查微服务拉起问题。
- 各个服务控制台输出均通过 `list structured logs` / `list console logs` 工具获取。
- 调试分布式错误时，优先使用 `list traces` 查找异常链路。

## 3. 后端开发强制红线 (Backend Redlines)

### 🗄️ 数据库操作：DbContext 注入规范
- **严禁**直接注入或操作 `IMongoCollection<T>` 或 `IMongoDatabase`。
- 业务服务层进行所有数据的新增、查询、修改、删除时，**必须**通过注入 `DbContext` 来完成。由于我们在 `ServiceExtensions.cs` 中已经将底层的 `PlatformDbContext` 注册为 `DbContext`，使用基类注入即可。
- **原因**：底层的 `PlatformDbContext` 封装了多租户（`CompanyId`）自动过滤、`CreatedAt/UpdatedAt` 等审计字段的自动填充。服务层使用 `DbContext` 与 `_context.Set<T>()` 能自动享受这些机制。如果绕过上下文直接操作 MongoDB 的集合，将导致数据污染或跨租户越权。

**使用示例：**
```csharp
// ✅ 正确：直接注入 DbContext 并使用 Set<T>() 操作
using Microsoft.EntityFrameworkCore;

public class UserService
{
    private readonly DbContext _context;
    
    public UserService(DbContext context)
    {
        _context = context;
    }
    
    // 查询
    public async Task<User?> GetUserAsync(string id)
        => await _context.Set<User>().FirstOrDefaultAsync(u => u.Id == id);
    
    // 创建
    public async Task<User> CreateUserAsync(User user)
    {
        await _context.Set<User>().AddAsync(user);
        await _context.SaveChangesAsync();
        return user;
    }
    
    // 更新
    public async Task<User?> UpdateUserAsync(string id, Action<User> updateAction)
    {
        var user = await _context.Set<User>().FirstOrDefaultAsync(u => u.Id == id);
        if (user == null) return null;
        
        updateAction(user);
        await _context.SaveChangesAsync();
        return user;
    }
    
    // 删除 （PlatformDbContext自动实现软删除）
    public async Task<bool> DeleteUserAsync(string id)
    {
        var user = await _context.Set<User>().FirstOrDefaultAsync(u => u.Id == id);
        if (user == null) return false;
        
        _context.Set<User>().Remove(user);
        await _context.SaveChangesAsync();
        return true;
    }
}
```

### 📊 审计字段与软删除（自动处理）
- **软删除**：调用 `DbContext.Remove()` 时，`PlatformDbContext` 自动转换为软删除（设置 `IsDeleted=true`、`DeletedAt`、`DeletedBy`）。
- **多租户过滤**：查询时由 `PlatformDbContext` 全局查询过滤器自动过滤 `CompanyId` 和 `IsDeleted=false`。
- **审计字段**：`CreatedAt/UpdatedAt/CreatedBy/UpdatedBy` 由 `PlatformDbContext` 在 `SaveChangesAsync()` 时自动维护。

### 🏢 多租户与上下文安全
- 除了用户身份主键 `userId` 以外，任何企业级上下文（企业的 `companyId` / 用户拥有的菜单权限 / 角色），**严禁**直接从 JWT claim 中读取解包。
- **正确获取方式**：统一通过注入 `ITenantContext` 读取当前操作人在当前企业下的属性约束。

### 🔐 鉴权策略
- **移除旧版判断**：禁止在控制器层再使用过时的 `HasPermission()` 等方法。
- **唯一正确手段**：全部 API 操作需打上 `[RequireMenu("menu-action-name")]` 属性（来自 `Platform.ApiService.Attributes`）来进行基于菜单按钮层级的鉴权。

### 📡 接口与实时通信
- 所有常规 HTTP 接口返回数据，必须被包装为 `ApiResponse<T>`，并默认开启 camelCase （首字母小写）且忽略 Null 返回。
- 后端不再向前端使用 SignalR 发送实时数据或通知事件，必须改为使用 **SSE (Server-Sent Events)** 推送（连接管理器为 `IChatSseConnectionManager`）。对于 SSE 响应管道，需注意跳过中间件格式化。

## 4. MCP 服务与 AI 能力整合

本项目在 `Platform.ApiService` 中，包含了一个强大的单一类 `McpService.cs`（及 `Mcp/` 下的各 Handler），它通过 Model Context Protocol 向外层 AI（不仅限于本 Copilot）提供系统内深度业务能力投射。

- **不要重复造轮子**：当面临读取【工作流进度】、【IoT设备状态】或【园区资产查询】等复杂任务时，AI 助手应优先分析项目中是否已有现成的 MCP Handlers 支持提取能力。
- 本项目不仅是一个应用，它自身也是一个巨大的 AI 知识源提供者。

## 5. 更多领域专项规范参阅

如果需要深入到前端、微服务或移动端的开发，请务必提前通过工具读取 `docs/rules/` 目录下的规则卡片：

| 分类 | 路径 | 说明 |
|------|------|------|
| 通用原则 | `docs/rules/00-通用原则.md` | 全局开发准则 |
| 后端规范 | `docs/rules/backend/` | API 服务开发规范 |
| Admin 前端 | `docs/rules/frontend-admin/` | React Admin 后台规范 |
| 移动端 | `docs/rules/frontend-app/` | Expo 移动端规范 |

> 每次开展复杂的新功能迭代前，务必查阅上述规则卡以确保架构走向绝不偏离当前轨辙。