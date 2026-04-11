# 微服务拆分开发指南

本文档描述 **当前仓库已实现** 的 Aspire 编排与网关形态，并说明如何新增卫星服务。领域逻辑目前主要位于 `Platform.ApiService`（模块化单体网关），与「按领域拆成十多个独立仓库」的目标路线图区分开，避免按虚构结构实现功能。

## 一、当前架构（已实现）

### 1.1 后端与数据面

| 项目 | 职责 | 数据库 / 依赖 |
|------|------|----------------|
| `Platform.AppHost` | Aspire 编排、YARP 网关、环境变量注入 | — |
| `Platform.ApiService` | 业务 API、MCP、SSE 等 | MongoDB `mongodb` |
| `Platform.Storage` | GridFS 文件 HTTP API | MongoDB `storagedb` |
| `Platform.SystemMonitor` | 主机资源监控 API | **无业务库**（不连接 `mongodb`） |
| `Platform.DataInitializer` | 一次性种子 / 初始化任务 | MongoDB `mongodb` |
| `Platform.ServiceDefaults` | DbContext、租户上下文、卫星服务统一认证扩展 | — |

YARP 将下列前缀转发到对应服务（路径去掉服务前缀后原样转发到上游）：

| 前端 / 客户端路径前缀 | 后端服务 |
|----------------------|----------|
| `/apiservice/` | ApiService |
| `/storage/` | Storage |
| `/systemmonitor/` | SystemMonitor |

### 1.2 网关路由配置（AppHost）

在 [Platform.AppHost/AppHost.cs](../../Platform.AppHost/AppHost.cs) 中通过字典注册集群与路由，`/{serviceKey}/{**catch-all}` → 上游 `/{**catch-all}`。

### 1.3 卫星服务认证（Storage / SystemMonitor）

Storage 与 SystemMonitor 使用 `Platform.ServiceDefaults.Authentication` 中的 **`AddSatelliteJwtAndInternalKeyAuthentication`**：

- **浏览器 / 管理端**：在请求头携带与 ApiService 相同的 **JWT**（`Authorization: Bearer …`），须与 `Jwt:SecretKey`、`Jwt:Issuer`、`Jwt:Audience` 一致（由 AppHost 注入 `Jwt__SecretKey` 等）。
- **服务间（如 ApiService → Storage）**：在 `HttpClient` 上增加请求头 **`X-Internal-Service-Key`**，值与配置 **`InternalService:ApiKey`** 一致（AppHost 向 ApiService、Storage、SystemMonitor 注入相同的 `InternalService__ApiKey`）。

健康检查 `/health` 仍匿名；业务控制器使用 `[Authorize]`。

头像等需在浏览器中匿名展示的文件，应通过 **ApiService** 的受控端点（例如 `/apiservice/api/avatar/view/...`）暴露，而不是直接请求 Storage 的下载 URL（`<img src>` 无法带 JWT）。

### 1.4 编排要点

- **ApiService** 必须 **`WithReference(storage)`** 且 **`WaitFor(storage)`**，以便服务发现解析 `storage` 主机名，并保证 Storage 就绪后再承接流量。
- **Redis**：当前编排中未启用；若后续引入缓存，在 AppHost 添加 `AddRedis` 后应对具体项目使用 **`WithReference(redis)`**。
- **`AddDockerComposeEnvironment("compose")`**：用于 Compose 发布与 Dashboard 等场景；各 `AddProject` 已通过 `PublishAsDockerComposeService` 等参与发布时，无需把返回值赋给局部变量再逐一手动挂载（未使用变量时 IDE 可能对 `compose` 告警，可改为 `_ = builder.AddDockerComposeEnvironment(...)` 或保留并抑制告警）。

### 1.5 未来拆分路线图（未实现）

以下目录 **尚未** 作为独立项目存在，仅作演进参考：`Platform.Auth`、`Platform.Users`、`Platform.Core` 多领域拆分等。新增能力默认仍在 `Platform.ApiService` 内按模块划分，直到有明确的拆分边界与数据归属再独立项目。

## 二、新增卫星服务步骤

### 2.1 创建项目

1. 在仓库根目录新增 `Platform.NewService`（Web SDK），引用 `Platform.ServiceDefaults`。
2. 在 `Program.cs` 中：

```csharp
var builder = WebApplication.CreateBuilder(args);
builder.AddServiceDefaults();
builder.AddSatelliteJwtAndInternalKeyAuthentication(); // 若需对浏览器 + 内部调用开放 API
// 按需：builder.AddPlatformDatabase("your-db-name");

builder.Services.AddControllers()
    .AddJsonOptions(options =>
    {
        options.JsonSerializerOptions.PropertyNamingPolicy = JsonNamingPolicy.CamelCase;
    });

var app = builder.Build();
app.UseAuthentication();
app.UseAuthorization();
app.MapHealthChecks("/health");
app.MapControllers();
app.MapDefaultEndpoints();
await app.RunAsync();
```

控制器上对业务 API 使用 **`[Authorize]`**（健康检查除外）。

### 2.2 配置 AppHost

```csharp
var newService = builder.AddProject<Projects.Platform_NewService>("newservice")
    .WithReference(optionalDb)
    .WithHttpEndpoint(port: 15021)
    .WithHttpHealthCheck("/health")
    .WithEnvironment("Jwt__SecretKey", jwtSecretKey)
    .WithEnvironment("InternalService__ApiKey", internalServiceApiKey);

// 若有其它服务通过 HttpClient 调用 newservice，应对调用方 WithReference(newService) 并 WaitFor。

var services = new Dictionary<string, IResourceBuilder<IResourceWithServiceDiscovery>>
{
    ["apiservice"] = apiService,
    ["systemmonitor"] = systemMonitor,
    ["storage"] = storage,
    ["newservice"] = newService,
};
```

### 2.3 更新前端 Proxy

在 [Platform.Admin/config/proxy.ts](../../Platform.Admin/config/proxy.ts) 的 `dev` 中增加：

```typescript
'/newservice/': {
  target: 'http://localhost:15000',
  changeOrigin: true,
  ws: true,
},
```

### 2.4 前端请求路径

```typescript
// 正确：带网关服务前缀（且需携带登录 JWT）
return request('/newservice/api/...');
```

## 三、MongoDB 分库（当前）

| 服务 | 连接名 / 库 | 说明 |
|------|-------------|------|
| ApiService、DataInitializer | `mongodb` | 业务数据 |
| Storage | `storagedb` | GridFS 与文件元数据 |
| SystemMonitor | 无 | 仅进程/系统指标，不持有业务 DbContext |

## 四、前端开发规范

### 4.1 API 路径

- ApiService：`/apiservice/api/...`
- SystemMonitor：`/systemmonitor/api/...`（需登录态）
- Storage：`/storage/api/...`（需登录态；优先通过 ApiService 封装敏感或匿名展示场景）

### 4.2 Proxy

开发环境统一将上述前缀代理到网关 `http://localhost:15000`（见 `proxy.ts`）。

### 4.3 SSE

`/apiservice/` 代理须 `ws: true`（与现有配置一致）。

## 五、已有服务说明

### 5.1 SystemMonitor

- **端口**：15020（Aspire 分配时以仪表板为准）
- **数据库**：无
- **示例**：`Platform.Admin/src/services/system/api.ts` 中 `getSystemResources` 请求需携带 JWT。

### 5.2 Storage

- **端口**：15010（同上）
- **数据库**：`storagedb`
- **调用方**：`Platform.ApiService` 通过 `IStorageClient` 使用服务发现主机名 `storage` 与 **`X-Internal-Service-Key`**；管理端直连上传需携带用户 JWT。

## 六、注意事项

1. 不要在 proxy 中随意改写路径；保持与 YARP `/{service}/{**catch-all}` 规则一致。
2. 新增可从前端访问的后端项目时，同步更新 AppHost 路由字典、`Jwt__SecretKey` / `InternalService__ApiKey` 注入及 Admin `proxy.ts`。
3. 消费另一 Aspire 项目时务必 **`WithReference` + `WaitFor`**，避免服务发现缺失或启动竞态。
4. 每个 Web 项目应提供 `/health` 供编排与探针使用。
