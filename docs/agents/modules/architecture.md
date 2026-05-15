# 架构与代码位置

> **技术栈、项目结构、业务模块等全局概览请参见 [AGENTS.md - 核心架构与技术栈](../../AGENTS.md#1-核心架构与技术栈)**，本文档仅列出架构特有信息。

### 关键代码位置

#### 后端核心文件

| 功能 | 路径 |
|------|------|
| 分页请求类型 | `Platform.ServiceDefaults/Models/ProTableRequest.cs` |
| 分页扩展方法 | `Platform.ServiceDefaults/Extensions/QueryableExtensions.cs` |
| 自动 DI 扫描 | `Platform.ServiceDefaults/Extensions/ServiceDiscoveryExtensions.cs` |
| DbContext | `Platform.ServiceDefaults/Services/PlatformDbContext.cs` |
| 实体基类 | `Platform.ServiceDefaults/Models/BaseEntity.cs` |
| 错误码常量 | `Platform.ServiceDefaults/Models/ErrorCode.cs` |
| 审计信息 | `Platform.ServiceDefaults/Services/PlatformDbContext.cs` (ApplyAuditInfoCore) |
| 多租户过滤 | `Platform.ServiceDefaults/Services/TenantContextMiddleware.cs` |
| JWT 服务 | `Platform.ServiceDefaults/Services/JwtService.cs` |
| SM 加密 | `Platform.ServiceDefaults/Services/SM4EncryptionProvider.cs` |

#### 前端核心文件

| 功能 | 路径 |
|------|------|
| API 响应类型 | `Platform.Admin/src/types/api-response.ts` |
| 错误码常量 | `Platform.Admin/src/constants/errorCodes.ts` |
| Token 工具 | `Platform.Admin/src/utils/token.ts` |
| 错误拦截器 | `Platform.Admin/src/utils/errorInterceptor.ts` |
| SSE Hook | `Platform.Admin/src/hooks/useSseConnection.ts` |
| 标准页面模板 | `Platform.Admin/src/templates/StandardPageTemplate.tsx` |
| 开发标准页面 | `Platform.Admin/src/pages/password-book/index.tsx` |

### 已重构页面清单

> 完整清单见 [前端规范 - 已重构页面清单](frontend.md#717-已重构页面清单)。

### 架构特性

#### 多租户支持

- **数据隔离**：所有实体继承 `MultiTenantEntity`，自动按 `CompanyId` 过滤
- **上下文传递**：`ITenantContext` + `ITenantContextSetter`
- **后台任务**：使用 `ITenantContextSetter.SetContext()` 手动设置

#### 安全机制

- **认证**：JWT Bearer Token + SM2 密码加密传输
- **权限**：`[RequireMenu("menu-name")]` 属性标注
- **加密**：SM2（非对称）、SM3（摘要）、SM4（对称）
- **审计**：自动记录 `CreatedBy`/`CreatedAt`/`UpdatedBy`/`UpdatedAt`

#### 微服务编排（Aspire）

```csharp
// Platform.AppHost/AppHost.cs
var mongo = builder.AddMongoDB("mongo");
var redis = builder.AddRedis("redis");
var apiService = builder.AddProject<Projects.Platform_ApiService>("apiservice")
    .WithReplicas(3);  // 支持多副本
var admin = builder.AddJavaScriptApp("admin", "../Platform.Admin");
```

#### API 网关（YARP）

- 统一入口：`http://localhost:15000`
- 路由规则：`/{service}/{**catch-all}`
- 前端代理：`/apiservice/` → `Platform.ApiService`

### 开发流程

#### 新增业务模块

1. **后端**：创建 Controller + Service + Entity
2. **前端**：创建页面 + API + 路由 + 菜单
3. **菜单**：在 `Menus.json` 中添加配置
4. **翻译**：添加 i18n 翻译文件
5. **测试**：编写 Playwright E2E 测试

#### 代码修改后

> 提交流程请见 [AGENTS.md - 交互与 Git 提交规范](../../AGENTS.md#2-交互与-git-提交规范)。

---

### 架构决策的用户体验影响（新增）

#### 性能架构对 UX 的影响

| 架构特性 | 对用户体验的影响 | 关键考量 |
|---------|----------------|---------|
| **多副本部署** | 高并发下依然响应迅速 | 无状态设计，Session 不依赖本地内存 |
| **Redis 缓存** | 列表页首次加载后秒开 | 热点数据缓存策略，避免缓存穿透 |
| **MongoDB 索引** | 搜索和筛选即时响应 | 监控慢查询，超过 100ms 的查询必须优化 |
| **异步后台处理** | 长耗时操作不阻塞页面 | 进度通知机制，用户知道"正在处理" |

#### 架构层面的 UX 原则

1. **首屏速度优先**：页面首屏 API 调用链不要超过 3 层，避免串行瀑布请求
2. **降级有准备**：当 Redis 不可用时 API 要能回退到直查数据库（体验降级，功能不挂）
3. **批量查询**：始终用 `IN` 查询替代循环查询，预防 N+1 问题
4. **数据预热**：列表页使用 ProTable 的分页模式，不要一次性返回全部数据

#### 用户体验架构检查清单

进行架构设计或修改时，问自己：

- [ ] **性能预算** — 用户最常用的操作能在 1-2 秒内返回吗？
- [ ] **依赖容错** — 当某个微服务或中间件挂了，用户的体验是优雅降级还是白屏报错？
- [ ] **缓存策略** — 用户读取的数据有没有缓存？缓存过期策略合理吗？
- [ ] **安全无感** — 安全措施（Token 刷新、加密传输）在后台完成，不打扰用户
- [ ] **渐进增强** — 核心功能在不依赖第三方服务时也能工作吗？
- [ ] **数据一致性** — 用户提交的数据会不会因为架构问题丢失？
