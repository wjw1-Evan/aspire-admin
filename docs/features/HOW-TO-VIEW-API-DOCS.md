# 如何查看 API 文档

## 🚀 快速开始

### 1. 启动应用

```bash
dotnet run --project Platform.AppHost
```

等待所有服务启动完成（约 30-60 秒）。

### 2. 打开 Aspire Dashboard

浏览器访问: **http://localhost:15003**

这是 .NET Aspire 的管理控制台，可以查看所有服务的运行状态。

### 3. 查看 Scalar API 文档

在 Aspire Dashboard 页面：

1. 点击顶部导航栏的 **"Resources"** 标签
2. 在资源列表中找到 **"Scalar API Reference"** 资源
3. 在该行的右侧，点击 **端点链接图标** 🔗
4. Scalar API 文档会在新标签页中打开

![Aspire Dashboard](https://learn.microsoft.com/en-us/dotnet/aspire/media/fundamentals/app-host-resources.png)

## 📖 Scalar API 文档功能

在 Scalar 文档中，你可以：

- ✅ 浏览所有 API 端点
- ✅ 查看请求/响应的 Schema 定义
- ✅ 查看参数说明和示例
- ✅ 直接测试 API 调用
- ✅ 配置 JWT 认证

## 🔐 使用 JWT 认证测试 API

### 步骤 1: 获取 Token

首先调用登录接口获取 token：

```bash
curl -X POST http://localhost:15000/apiservice/login/account \
  -H "Content-Type: application/json" \
  -d '{
    "username": "admin",
    "password": "admin123"
  }'
```

响应示例：
```json
{
  "success": true,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "...",
    "expiresAt": "2024-10-15T13:00:00Z"
  }
}
```

### 步骤 2: 在 Scalar 中配置认证

1. 在 Scalar 文档页面，点击右上角的 **"Authorize"** 按钮
2. 在弹出的对话框中输入：
   ```
   Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
   ```
   （注意：`Bearer` 后面有一个空格）
3. 点击 **"Authorize"** 确认
4. 现在所有需要认证的 API 调用都会自动带上这个 token

### 步骤 3: 测试 API

选择任意需要认证的端点（标有 🔒 图标），点击 **"Try it out"**：
- 填写必要的参数
- 点击 **"Execute"** 执行请求
- 查看返回结果

## 📊 其他查看方式

### 方式 1: 直接查看 OpenAPI JSON

访问原始的 OpenAPI 规范文档：

```
http://localhost:15000/apiservice/openapi/v1.json
```

可以复制这个 URL 到：
- Swagger Editor: https://editor.swagger.io/
- Postman
- 任何支持 OpenAPI 的工具

### 方式 2: 使用测试脚本

运行项目提供的测试脚本：

```bash
./test-openapi.sh
```

这会自动检查：
- ✅ OpenAPI JSON 是否可访问
- ✅ Schema 数量
- ✅ JWT 安全方案配置
- ✅ 并显示访问地址

## ❓ 常见问题

### Q: 为什么不能直接访问 http://localhost:15000/scalar/v1 ？

**A**: Scalar 是 Aspire 的内置功能，不是独立的 HTTP 端点。它通过 Aspire Dashboard 集成，需要在 Dashboard 中访问。

### Q: 在哪里可以看到所有端点的列表？

**A**: 在 Scalar 文档中，左侧导航栏会显示所有的 API 端点，按 Controller 分组。

### Q: Scalar 显示 INVALID_REFERENCE 错误怎么办？

**A**: 这通常说明 OpenAPI 配置不完整。请确认：
1. XML 文档生成已启用（`<GenerateDocumentationFile>true</GenerateDocumentationFile>`）
2. `AddDocumentTransformer` 和 `AddOperationTransformer` 已配置
3. `app.MapOpenApi()` 已调用

详细的修复方案请查看: [docs/bugfixes/SCALAR-API-REFERENCE-FIX.md](docs/bugfixes/SCALAR-API-REFERENCE-FIX.md)

### Q: 如何添加新的 API 到文档？

**A**: 只需在 Controller 中添加新的端点并加上 XML 注释：

```csharp
/// <summary>
/// 获取用户信息
/// </summary>
/// <param name="id">用户ID</param>
/// <returns>用户详细信息</returns>
[HttpGet("{id}")]
public async Task<IActionResult> GetUser(string id)
{
    // ...
}
```

重启应用后，新端点会自动出现在 Scalar 文档中。

## 🔗 相关链接

- [Aspire Dashboard 官方文档](https://learn.microsoft.com/en-us/dotnet/aspire/fundamentals/dashboard)
- [.NET 9 OpenAPI 文档](https://learn.microsoft.com/en-us/aspnet/core/fundamentals/openapi/overview)
- [Scalar 官方网站](https://github.com/scalar/scalar)
- [项目完整文档索引](docs/INDEX.md)

## 💡 提示

- 🔄 修改代码后需要重启应用，文档才会更新
- 🎯 使用 Aspire Dashboard 可以实时监控所有服务的状态
- 📝 良好的 XML 注释会让 API 文档更加清晰易懂
- 🔐 JWT token 有过期时间，过期后需要重新登录获取

---

**最后更新**: 2024年10月15日  
**适用版本**: .NET 9, Aspire 9.0

