# Rules 更新记录（2025-11-29）

**更新时间**: 2025-11-29  
**范围**: 根据最新代码（Platform.AppHost、Platform.ApiService/Program.cs）同步 `.cursor/rules` 中的 Aspire 编排与部署规范。

## ✅ 本次更新的规则文件

1. `project-structure.mdc`
   - 将服务编排示例替换为当前 `AppHost.cs` 的实现，包含：
     - Docker Compose 环境（Dashboard 固定 18888 端口）
     - 必须从配置读取 `Jwt:SecretKey` 与 `Parameters:openai-openai-endpoint`
     - 使用 `services` 字典集中管理微服务路由与 Scalar API 引用
     - `admin` / `app` Npm 应用的 `WithNpmPackageInstallation`、`PublishAsDockerFile`、Docker Compose 端口映射
   - 更新访问地址说明：本地 `dotnet run` 依旧为 15003，Compose Dashboard 改为 18888。

2. `aspire-microservices.mdc`
   - 与 `AppHost.cs` 对齐，强调：
     - Compose 环境和 Dashboard 端口
     - `services` 字典是 YARP 与 Scalar 共享的单一真相
     - 所有服务（含前端）均显式禁止自动打开浏览器、安装依赖、发布 Docker 镜像/Compose 服务
   - 新增提示：新增微服务时必须同步更新 `services` 字典。

3. `deployment.mdc`
   - 同步最新 CORS 实现：开发环境也使用白名单 + `AllowCredentials()`，生产环境从根级 `AllowedOrigins` 节读取，禁止 `AllowAnyOrigin() + AllowCredentials()` 组合。
   - 更新 `appsettings.Production.json` 示例，将 `AllowedOrigins` 提到根级配置并列出多个域名。
   - 补充 Aspire Dashboard 端口说明（15003 / 18888）。

## 🔍 代码参考

- `Platform.AppHost/AppHost.cs`（Docker Compose 环境、YARP 路由、Scalar 配置）
- `Platform.ApiService/Program.cs`（严格的 CORS 策略、允许凭证、AllowedOrigins 配置）

## 📋 验证清单

- [x] 规则中的代码片段与实际文件保持一致（包含 Compose 配置、`services` 字典、CORS 策略）
- [x] 文档中引用的端口号与最新 AppHost 设置匹配
- [x] `deployment.mdc` 的配置示例可直接复制到生产环境
- [x] 新增内容同步记录在 `docs/reports` 目录，遵循文档规范

## 📎 后续建议

- 新增微服务或暴露额外端口时，优先更新 `services` 字典并同步规则文档
- 若 CORS 或 Dashboard 端口再次调整，请以代码为准同步 `project-structure.mdc` 与 `deployment.mdc`
- 建议每次修改 `AppHost.cs` 或 `Program.cs` 后运行一次“规则差异检查”，确保规范与实现同步


