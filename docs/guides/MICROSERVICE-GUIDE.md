# 微服务拆分开发指南

本文档记录 Platform.ApiService 拆分微服务的开发规范。

## 一、微服务架构

### 1.1 整体架构

```
Platform/
├── Platform.Core/                    # 核心共享库：实体、DTO、基类
├── Platform.ServiceDefaults/         # 基础设施：DbContext、ITenantContext
├── Platform.Auth/                    # 认证服务
├── Platform.Users/                   # 用户组织服务
├── Platform.Projects/                # 项目服务
├── Platform.Tasks/                   # 任务服务
├── Platform.Workflows/               # 工作流引擎
├── Platform.IoT/                     # 物联网服务
├── Platform.AiChat/                  # AI 聊天服务
├── Platform.Files/                   # 文件存储服务
├── Platform.Notifications/           # 通知服务
├── Platform.Social/                  # 社交通知
├── Platform.System/                  # 系统管理
├── Platform.Park/                    # 园区服务
├── Platform.SystemMonitor/           # 系统监控服务
└── Platform.Gateway/                 # API 网关
```

### 1.2 网关路由配置

在 AppHost.cs 中使用 YARP 配置网关路由：

```csharp
var services = new Dictionary<string, IResourceBuilder<IResourceWithServiceDiscovery>>
{
    ["apiservice"] = apiService,
    ["systemmonitor"] = systemMonitor
};

var yarp = builder.AddYarp("apigateway")
    .WithHostPort(15000)
    .WithConfiguration(config =>
    {
        foreach (var service in services)
        {
            // 路由规则：/{service}/{**catch-all}
            // 自动转换：将 {**catch-all} 转换为 /api/**
            config.AddRoute($"/{service.Key}/{{**catch-all}}", config.AddCluster(service.Value))
                .WithMaxRequestBodySize(-1)
                .WithTransformPathRouteValues("/{**catch-all}");
        }
    });
```

### 1.3 路由映射表

| 前端路径 | 网关路由 | 后端服务 |
|---------|---------|---------|
| `/apiservice/api/xxx` | `/apiservice/{**catch-all}` → `/api/xxx` | ApiService |
| `/systemmonitor/api/xxx` | `/systemmonitor/{**catch-all}` → `/api/xxx` | SystemMonitor |

## 二、新增微服务步骤

### 2.1 创建微服务项目

1. 在 Platform 目录下创建新项目目录
2. 创建项目文件和 Program.cs

```csharp
// Platform.NewService/Program.cs
var builder = WebApplication.CreateBuilder(args);
builder.AddServiceDefaults();
builder.AddPlatformDatabase();

builder.Services.AddControllers()
    .AddJsonOptions(options =>
    {
        options.JsonSerializerOptions.PropertyNamingPolicy = JsonNamingPolicy.CamelCase;
    });

var app = builder.Build();
app.MapControllers();
app.MapDefaultEndpoints();
await app.RunAsync();
```

### 2.2 配置 AppHost

在 AppHost.cs 中添加服务和数据库：

```csharp
// 新增数据库
var newServiceDb = mongo.AddDatabase("newservice-db");

// 新增服务
var newService = builder.AddProject<Projects.Platform_NewService>("newservice")
    .WithReference(newServiceDb)
    .WithHttpEndpoint(port: 15021)
    .WithHttpHealthCheck("/health");

// 添加到路由字典
var services = new Dictionary<string, IResourceBuilder<IResourceWithServiceDiscovery>>
{
    ["apiservice"] = apiService,
    ["systemmonitor"] = systemMonitor,
    ["newservice"] = newService  // 新增服务
};
```

### 2.3 更新前端 Proxy

在 Platform.Admin/config/proxy.ts 中添加路由：

```typescript
export default {
  dev: {
    '/apiservice/': {
      target: 'http://localhost:15000',
      changeOrigin: true,
      ws: true,
    },
    '/systemmonitor/': {
      target: 'http://localhost:15000',
      changeOrigin: true,
      ws: true,
    },
    '/newservice/': {  // 新增服务
      target: 'http://localhost:15000',
      changeOrigin: true,
      ws: true,
    },
  },
};
```

### 2.4 更新前端 API 地址

在前端服务文件中，使用网关路径：

```typescript
// 错误示例
return request('/api/users/list');

// 正确示例 - 使用 apiservice 前缀
return request('/apiservice/api/users/list');
```

## 三、MongoDB 分库规划

| 服务 | 数据库名 | 集合 |
|------|---------|------|
| ApiService | `mongodb` | users, projects, tasks 等 |
| SystemMonitor | `systemmonitor-db` | (无，内存/系统数据) |

后续服务按需创建独立数据库。

## 四、前端开发规范

### 4.1 API 路径规范

前端 API 路径必须与网关路由一致：

- **ApiService**: `/apiservice/api/{module}/{action}`
- **SystemMonitor**: `/systemmonitor/api/{module}/{action}`
- **其他服务**: `/{service-name}/api/{module}/{action}`

### 4.2 Proxy 配置

开发环境下，Proxy 将请求转发到 API 网关（15000）：

```typescript
// Platform.Admin/config/proxy.ts
export default {
  dev: {
    '/apiservice/': {
      target: 'http://localhost:15000',
      changeOrigin: true,
      ws: true,
    },
    '/systemmonitor/': {
      target: 'http://localhost:15000',
      changeOrigin: true,
      ws: true,
    },
  },
};
```

### 4.3 SSE 特殊处理

对于 SSE（Server-Sent Events）请求，需要确保 Proxy 支持 WebSocket：

```typescript
'/apiservice/': {
  target: 'http://localhost:15000',
  changeOrigin: true,
  ws: true,  // 必须启用 WebSocket
},
```

## 五、已有微服务示例

### 5.1 SystemMonitor 服务

**创建时间**: 2026-04-08

**功能**: 系统监控（CPU、内存、磁盘、系统信息）

**端口**: 15020

**数据库**: systemmonitor-db

**前端 API**:
```typescript
// services/system/api.ts
export async function getSystemResources() {
  return request('/systemmonitor/api/system-monitor/resources');
}
```

## 六、注意事项

1. **不要在 proxy 中做路径转换**，前端 API 地址应直接使用网关路径
2. **新增微服务时**，需要同时更新 AppHost.cs、前端 proxy 和前端 API 地址
3. **数据库分库是可选的**，初期可以使用共享数据库验证功能
4. **确保服务独立运行**，每个微服务应该有独立的健康检查端点