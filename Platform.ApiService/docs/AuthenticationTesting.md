# 身份验证测试指南

## 🚀 启动服务

首先启动API服务：
```bash
cd /Users/mac/Projects/aspire-admin/Platform.ApiService
dotnet watch
```

服务启动后，通常会在以下端口运行：
- HTTP: http://localhost:5xxx (具体端口查看启动日志)
- 或者使用配置的端口：http://localhost:15000

## 🧪 手动测试步骤

### 1. 测试公共接口（无需认证）

```bash
# 测试公共接口 - 应该返回200
curl -X GET http://localhost:15000/api/public/test

# 期望响应：
# {
#   "success": true,
#   "message": "公共接口测试成功",
#   "timestamp": "2024-02-12T10:30:00Z"
# }
```

### 2. 测试认证相关接口（无需认证）

```bash
# 测试验证码接口 - 应该返回200
curl -X GET http://localhost:15000/api/auth/captcha/image?type=login

# 测试健康检查 - 应该返回200
curl -X GET http://localhost:15000/health
```

### 3. 测试受保护接口（需要认证）

```bash
# 无token访问受保护接口 - 应该返回401
curl -X GET http://localhost:15000/api/project

# 期望响应：
# {
#   "success": false,
#   "errorMessage": "未提供有效的认证令牌或令牌已过期。请重新登录。",
#   "errorCode": "UNAUTHORIZED"
# }
```

### 4. 测试无效Token

```bash
# 使用无效token - 应该返回401
curl -X GET http://localhost:15000/api/project \
  -H "Authorization: Bearer invalid.token.here"
```

### 5. 测试登录接口

```bash
# 登录接口 - 应该可访问（但可能返回400验证错误）
curl -X POST http://localhost:15000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"test","password":"test"}'
```

## 🔍 验证中间件功能

### 检查日志输出

在API服务启动的终端中，您应该能看到：
- 中间件启动日志
- 认证失败的详细日志（如果启用了详细日志）
- Token验证过程中的错误信息

### 验证配置

1. **检查中间件是否注册**
   - 在Program.cs中确认有以下代码：
   ```csharp
   app.UseGlobalAuthentication();
   ```

2. **检查配置是否加载**
   - 启动时应该能看到配置信息
   - 公共路径列表应该正确加载

3. **检查属性是否生效**
   - AuthController应该有`[SkipGlobalAuthentication]`属性
   - PublicController的公共方法应该可访问

## 🛠️ 故障排除

### 如果所有请求都返回403：

1. **检查中间件执行顺序**
   ```csharp
   app.UseAuthentication();        // 1. 必须先
   app.UseAuthorization();         // 2. 其次
   app.UseGlobalAuthentication();  // 3. 最后
   ```

2. **检查JWT配置**
   ```json
   {
     "Jwt": {
       "SecretKey": "your-secret-key-here",
       "Issuer": "Platform.ApiService",
       "Audience": "Platform.Web"
     }
   }
   ```

3. **检查公共路径配置**
   - 确认`GlobalAuthentication:PublicPaths`包含正确的路径
   - 路径应该以"/"开头

### 如果公共接口仍要求认证：

1. **检查属性标记**
   - 确认控制器有`[SkipGlobalAuthentication]`属性
   - 检查属性是否正确导入

2. **检查路径匹配**
   - 路径匹配是前缀匹配，不要求完全相等
   - 大小写不敏感

### 如果服务启动失败：

1. **检查编译错误**
   ```bash
   dotnet build
   ```

2. **检查NuGet包**
   - 确认所有必要的包都已安装
   - 特别是Microsoft.AspNetCore.Authentication.JwtBearer

## 📊 性能监控

在生产环境中，监控以下指标：

1. **认证延迟**
   - Token验证时间
   - 中间件执行时间

2. **失败率**
   - 401错误数量
   - Token格式错误率

3. **配置变化**
   - 公共路径列表变化
   - JWT配置变化

## 🎯 成功标准

✅ **功能正常**的标志：
- 公共接口返回200
- 受保护接口无token返回401  
- 认证接口可正常访问
- 错误响应格式统一
- 日志记录正常

✅ **安全增强**的标志：
- 所有API默认需要认证
- 只有明确配置的接口可匿名访问
- Token验证严格
- 错误信息不泄露敏感信息

---

**注意**: 全局身份验证中间件是对ASP.NET Core内置认证的增强，不是替代。它提供了额外的安全层和更细粒度的控制。