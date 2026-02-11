## 后端核心与中间件规范（Backend Core & Middleware Rules）

> 2026-02 重构：由 `IDatabaseOperationFactory` 升级为 `IDataFactory`

- **全面拥抱 LINQ**：所有数据库查询、分页和更新条件均采用标准的 C# LINQ 表达式。严格禁止在业务代码中使用 MongoDB 特定的 API (如 `FilterBuilder`、`UpdateBuilder`)。
- **分页参数统一范围**：`page` 1–10000，`pageSize` 1–100；查询时直接传参数给 `FindPagedAsync`，由工厂处理底层分页逻辑。
- **审计字段赋值策略**：工厂自动维护 `CreatedAt/UpdatedAt/CreatedBy/UpdatedBy` 等字段。业务代码应优先通过实现 `IOperationTrackable` 等接口来确保审计字段的自动填充，逐步淘汰反射，提升性能。
- **数据库无关性**：`IDataFactory` 抽象层确保了业务逻辑不再绑定到特定的数据库驱动，为未来数据库迁移 (如转向 EF Core) 扫清障碍。

> 本文档是对 `.cursor/rules/rule.mdc` 后端相关总纲的展开说明，**以此文档为准**，总纲只保留硬规则与索引。

### 1. 统一响应格式中间件（ResponseFormattingMiddleware）

- **职责**：统一所有 API 的 JSON 响应格式，自动包裹为 `success` / `data` / `timestamp` 结构（未使用 `ApiResponse<T>` 时的兜底方案）。
- **强制启用**：
  - 所有 HTTP API 服务必须在 `Program.cs` 中注册并启用 `ResponseFormattingMiddleware`。
  - 仅对健康检查、OpenAPI、SSE 等特殊路径做白名单跳过（`/health*`、`/scalar*`、`/openapi*`、`/api/chat/sse` 等）。
- **工作方式**（基于 `Platform.ApiService.Middleware.ResponseFormattingMiddleware` 实现）：
  - 拦截响应流，若 `Content-Type` 为 `application/json` 且 `StatusCode == 200`：
    - 若响应体 **尚未**包含 `"success"` 字段，则将原始 JSON 反序列化为 `data`，再包裹为：
      - `success: true`
      - `data: <原始对象>`
      - `timestamp: DateTime.UtcNow`
    - 若已是标准格式（包含 `"success"`），则直接透传。
  - 使用 camelCase JSON 命名策略、忽略 null 字段，确保前端体验一致。
- **审计配合**：中间件会将最终响应内容存入 `HttpContext.Items["__FormattedResponseBody"]`，供活动日志中间件读取并写入审计日志。

### 2. 活动日志中间件（ActivityLogMiddleware）

- **职责**：记录所有重要 HTTP 请求的活动日志（用户、企业、路径、耗时、状态码、响应摘要等），写入审计日志集合。
- **强制规则**：
  - 必须在 API 服务中注册 `ActivityLogMiddleware`，并保证它运行于响应格式化之后或之前的约定顺序（当前实现会从 `ResponseFormattingMiddleware` 写入的 `ResponseBodyContextItemKey` 读取响应体）。
  - 所有 HTTP 访问审计 **只允许** 通过该中间件 + `IUserActivityLogService` 实现，**禁止**在业务代码中手写与之重复的访问日志逻辑。
- **关键行为**（基于 `Platform.ApiService.Middleware.ActivityLogMiddleware` 实现）：
  - 通过配置 `ActivityLog:Enabled` 控制是否启用，`ActivityLog:ExcludedPaths` 控制额外排除路径。
  - 对每个请求计时，并在请求完成后提取以下字段：
    - 用户信息：`userId`、`username`（从 Claims 与用户表推导）
    - 请求信息：`httpMethod`、`path`、裁剪后的 `queryString`、`scheme`、`host`
    - 响应信息：`statusCode`、`durationMs`、`responseBody`（从 `ResponseFormattingMiddleware` 存入的上下文项读取）
    - 环境信息：客户端 IP、User-Agent。
  - 使用根 `IServiceProvider` 创建 `scope`，获取 `IUserActivityLogService` 并异步调用 `LogHttpRequestAsync` 写入日志，避免在后台线程访问 `HttpContext`。
- **注意事项**：
  - 默认不记录匿名请求，可通过 `ActivityLog:IncludeAnonymous` 控制。
  - 配置 `ActivityLog:MaxQueryStringLength`、`ActivityLog:IncludeQueryString` 控制查询串长度与是否记录。

### 3. 租户上下文（ITenantContext）使用规范

- **职责**：统一提供当前用户与企业上下文信息，避免业务代码直接读取 JWT 中已移除的字段。
- **核心约束**（基于 `Platform.ServiceDefaults.Services.ITenantContext` / `TenantContext` 实现）：
  - **唯一允许直接从 JWT 读取的字段只有 `userId`**，通过 `GetCurrentUserId()` 获取。
  - 企业、角色、权限等信息一律从数据库读取：
    - `GetCurrentUsernameAsync()`：从用户表读取用户名。
    - `GetCurrentCompanyIdAsync()`：从用户表 `currentCompanyId` 字段读取当前企业 ID。
    - `GetCurrentCompanyNameAsync()`：从企业表读取企业名称。
    - `IsAdminAsync()`：根据 `user_companies` 集合中的 `isAdmin` 字段判断。
    - `HasPermissionAsync(string permission)` / `GetUserPermissionsAsync()`：基于用户在企业下的菜单/角色配置计算权限集合。
- **禁止行为**：
  - 业务代码禁止直接从 JWT token Claims 中读取 `companyId` / `role` / `permissions` 等字段（这些字段已经从 token 中移除或不再可靠）。
  - 不允许在各个服务中自行注入 `IMongoDatabase` 去读取用户/企业/权限信息，统一通过 `ITenantContext` 间接访问。
- **推荐用法**：
  - 在服务层通过构造函数注入 `ITenantContext`：

    ```csharp
    public class SomeService : ISomeService
    {
        private readonly ITenantContext _tenantContext;

        public SomeService(ITenantContext tenantContext)
        {
            _tenantContext = tenantContext;
        }

        public async Task DoAsync()
        {
            var companyId = await _tenantContext.GetCurrentCompanyIdAsync();
            // 使用 companyId 进行多租户数据访问……
        }
    }
    ```

### 4. 审计字段与数据库操作工厂协作

- **审计字段来源**：
  - `IDataFactory<T>` 在 `CreateAsync` / `UpdateAsync` / `DeleteAsync` 相关方法中，自动维护：
    - 时间戳：`CreatedAt`、`UpdatedAt`
    - 软删除：`IsDeleted`、`DeletedAt`、`DeletedBy`
    - 审计人：`CreatedBy`、`CreatedByUsername`、`UpdatedBy`、`UpdatedByUsername`
  - 它通过 `ITenantContext` 获取当前用户信息来填充上述字段。
- **规则**：
  - 实现了 `ISoftDeletable` / `ITimestamped` 的实体，**禁止**在业务代码中手工设置上述审计字段。
  - 所有创建、更新、删除操作必须通过 `IDatabaseOperationFactory<T>` 的原子方法完成，避免绕过审计逻辑。

- **统一注册扩展**（`Platform.ServiceDefaults.Extensions.ServiceExtensions`）：
  - `AddDataFactory<T>()`：为指定实体类型 `T` 注册 `IDataFactory<T>`。
  - `AddDatabaseFactory()`：推荐方式，统一注册 `IAuditService` 与开放泛型的 `IDataFactory<>` / `EFCoreDataFactory<>` 等实现。
- **服务启动约定**：
  - 每个微服务在 `Program.cs` 必须调用 `services.AddDatabaseFactory()` 一次。
  - 业务层只能通过构造函数注入 `IDataFactory<T>` 使用工厂：

    ```csharp
    public class UserService : IUserService
    {
        private readonly IDataFactory<User> _userFactory;

        public UserService(IDataFactory<User> userFactory)
        {
            _userFactory = userFactory;
        }
    }
    ```

- **禁止行为**：
  - **严禁**在控制器或服务中直接注入 `IMongoCollection<T>`、`IMongoDatabase` 或 `DbContext`。所有数据操作必须使用 `IDataFactory<T>`。
  - **严禁**绕过工厂自行维护审计字段、多租户过滤或软删除逻辑。
  - **严禁**在业务逻辑中使用数据库特定的 API（如 MongoDB `FilterBuilder`）。

### 6. 实体基类与接口规范

- **基础模型**（`Platform.ServiceDefaults.Models.BaseEntity` 等）：
  - `BaseEntity`：提供通用字段 `Id`、`CreatedAt`、`UpdatedAt`、`IsDeleted`、`DeletedAt`、`DeletedBy`、`DeletedReason`、`CreatedBy`、`CreatedByUsername`、`UpdatedBy`、`UpdatedByUsername`。
  - `MultiTenantEntity`：继承自 `BaseEntity` 并实现 `IMultiTenant`，新增 `CompanyId`。
  - 接口：
    - `IEntity`：`Id`
    - `ISoftDeletable`：`IsDeleted`、`DeletedAt`、`DeletedBy`、`DeletedReason`
    - `ITimestamped`：`CreatedAt`、`UpdatedAt`、`DeletedAt`
    - `IMultiTenant`：`CompanyId`
- **推荐建模方式**：
  - 所有 MongoDB 实体必须至少实现：`IEntity`、`ISoftDeletable`、`ITimestamped`。
  - 多租户业务实体优先继承 `MultiTenantEntity`，自动获得 `CompanyId` 及审计字段，并实现 `IMultiTenant`。
  - 若因历史原因未继承基类，仍必须实现对应接口，并保证字段含义与工厂期望一致。
- **多租户过滤与跨租户访问**：
  - 默认情况下，`IDataFactory<T>` 会：
    - 为实现 `IMultiTenant` 的实体自动附加当前 `CompanyId` 过滤；
    - 始终附加 `IsDeleted = false` 软删除过滤。
  - 仅在极少数需要跨企业运维或全局管理场景下，才允许使用：
    - `FindWithoutTenantFilterAsync` 等带 `WithoutTenantFilter` 后缀的方法。
  - 使用 *WithoutTenantFilter* 方法前置条件：
    - 必须拥有明确的运维/平台级菜单权限；
    - 必须在上层服务中有严格的审计记录（谁、何时、对哪些企业做了什么操作）。

### 5. 在 Cursor Rules 总纲中的位置

- `.cursor/rules/rule.mdc` 中仅保留以下与本文件相关的**硬规则摘要**：
  - 必须启用统一响应格式中间件和活动日志中间件；
  - 只能通过 `ITenantContext` 获取企业与权限信息；
  - 审计字段由 `IDataFactory<T>` 自动维护，业务代码不得手动修改；
  - 数据库工厂必须通过统一扩展方法注册，业务实体必须实现统一的接口/基类约定。
- 详细实现、示例与背景说明请以本文件为准。
