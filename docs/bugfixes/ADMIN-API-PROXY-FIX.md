# 管理后台 API 代理配置修复

## 问题描述

程序发布后运行出现错误，请求 `http://localhost:15001/api/login/account` 时状态代码为空（连接失败）。

## 问题原因

在生产环境（Docker 容器）中，`Platform.Admin` 的 nginx 配置存在两个问题：

1. **缺少 API 代理规则**：前端应用在生产模式下使用相对路径 `/api/...` 发送请求，但 nginx 没有将这些请求代理到后端 API 网关。

2. **路径转换错误**：API 网关的路由配置是 `/apiservice/{**catch-all}` → `/{**catch-all}`，会去掉 `/apiservice` 前缀。如果 nginx 直接代理 `/api/login/account` 到 `/apiservice/login/account`，转换后会变成 `/login/account`，但 API 服务的实际路由是 `/api/login/account`，导致 404 错误。

### 技术细节

1. **开发环境**：使用 UmiJS 的代理配置（`config/proxy.ts`），将 `/api/` 请求代理到 `http://localhost:15000/apiservice/`
2. **生产环境**：UmiJS 代理不生效，需要 nginx 配置代理规则
3. **前端配置**：`src/app.tsx` 中，生产环境的 `baseURL` 为 `process.env.REACT_APP_API_BASE_URL || ''`，如果未设置环境变量，则使用相对路径

## 解决方案

在 `Platform.Admin/nginx.conf` 中添加 API 代理配置，将 `/api/` 路径的请求代理到 API 网关。

### 修改内容

```nginx
# API 代理配置 - 将 /api/ 请求代理到 API 网关
# 在 Docker 容器中，通过服务名 apigateway 访问
# 注意：需要保留 /api 前缀，因为 API 网关会去掉 /apiservice 前缀
# 请求流程：/api/login/account -> /apiservice/api/login/account -> /api/login/account (API 服务)
# API 网关配置：/apiservice/{**catch-all} -> /{**catch-all}
location /api/ {
    # 代理到 API 网关的 /apiservice/api/ 路径，保留 /api 前缀
    # docker-compose.yaml 中配置的是 apigateway:5000
    proxy_pass http://apigateway:5000/apiservice/api/;
    
    # 保留原始请求头
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_set_header X-Forwarded-Host $host;
    proxy_set_header X-Forwarded-Port $server_port;
    
    # WebSocket 支持（如果需要）
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
    
    # 超时设置
    proxy_connect_timeout 60s;
    proxy_send_timeout 60s;
    proxy_read_timeout 60s;
    
    # 缓冲设置
    proxy_buffering off;
    proxy_request_buffering off;
}
```

### 配置说明

1. **代理地址**：`http://apigateway:5000/apiservice/api/`
   - `apigateway`：Docker Compose 中的服务名
   - `5000`：容器内部暴露的端口（从 `docker-compose.yaml` 的 `expose` 和环境变量配置获取）
   - `/apiservice/api/`：API 网关的路由前缀 + 保留的 `/api` 前缀

2. **路径转换逻辑**：
   - 前端请求：`/api/login/account`
   - nginx 代理到：`http://apigateway:5000/apiservice/api/login/account`
   - API 网关匹配：`/apiservice/{**catch-all}` → `/apiservice/api/login/account`
   - 路径转换：`/{**catch-all}` → `/api/login/account`
   - 转发到 API 服务：`http://apiservice:${APISERVICE_PORT}/api/login/account` ✅

3. **请求头保留**：确保原始请求头（如 `Authorization`、`Content-Type` 等）正确传递到后端

4. **WebSocket 支持**：为 SignalR 等 WebSocket 连接提供支持

5. **超时设置**：防止长时间请求导致连接超时

## 验证方法

### 1. 重新构建 Docker 镜像

```bash
# 重新构建 admin 镜像
docker build -t platform-admin:latest -f Platform.Admin/Dockerfile Platform.Admin/

# 或者使用 Aspire 发布
dotnet run --project Platform.AppHost -- publish
```

### 2. 启动服务

```bash
# 使用 docker-compose 启动
docker-compose -f Platform.AppHost/aspire-output/docker-compose.yaml up -d
```

### 3. 测试 API 请求

```bash
# 测试登录接口
curl -X POST http://localhost:15001/api/login/account \
  -H "Content-Type: application/json" \
  -d '{
    "username": "admin",
    "password": "admin123"
  }'
```

### 4. 检查 nginx 日志

```bash
# 查看 admin 容器日志
docker logs <admin-container-id>

# 查看 nginx 访问日志（如果已启用）
docker exec <admin-container-id> tail -f /var/log/nginx/access.log
```

## 相关文件

- `Platform.Admin/nginx.conf` - nginx 配置文件
- `Platform.Admin/config/proxy.ts` - 开发环境代理配置
- `Platform.Admin/src/app.tsx` - 前端请求配置
- `Platform.AppHost/aspire-output/docker-compose.yaml` - Docker Compose 配置

## 注意事项

1. **端口配置**：确保 nginx 配置中的端口与 `docker-compose.yaml` 中的 `expose` 端口一致
2. **服务名**：在 Docker Compose 网络中，使用服务名（`apigateway`）而不是 `localhost`
3. **路径匹配**：nginx 的 `location /api/` 会匹配所有以 `/api/` 开头的路径
4. **路径重写**：`proxy_pass` 末尾的 `/` 确保路径正确重写（`/api/login/account` → `/apiservice/login/account`）

## 后续优化建议

1. **环境变量配置**：考虑通过环境变量配置 API 网关地址，提高灵活性
2. **健康检查**：添加 API 网关健康检查，确保代理目标可用
3. **错误处理**：配置 nginx 错误页面，提供更好的错误提示
4. **日志记录**：启用 nginx 访问日志，便于问题排查

## 更新日期

2024-12-19

