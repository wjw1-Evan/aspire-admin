# 🔐 安全配置快速指南

> **⚠️ 重要**: 在运行系统前，必须完成安全配置！

---

## 🚀 快速开始（开发环境）

### 1. 配置JWT密钥（使用 Aspire 集中管理）

**⭐ 推荐方式**：在 AppHost 中配置，自动传递给所有服务：

```bash
# 进入 AppHost 目录
cd Platform.AppHost

# 初始化用户密钥（如果尚未初始化）
dotnet user-secrets init

# 设置JWT密钥（使用User Secrets）
dotnet user-secrets set "Jwt:SecretKey" "your-development-secret-key-at-least-32-characters-long"

# 可选：设置其他JWT配置
dotnet user-secrets set "Jwt:Issuer" "Platform.ApiService.Dev"
dotnet user-secrets set "Jwt:Audience" "Platform.Web.Dev"
dotnet user-secrets set "Jwt:ExpirationMinutes" "120"
dotnet user-secrets set "Jwt:RefreshTokenExpirationDays" "30"

# 验证配置
dotnet user-secrets list
```

**生成安全密钥**:

```bash
# 使用OpenSSL生成随机密钥
openssl rand -base64 32
```

**💡 说明**：
- AppHost 会自动将 JWT 配置传递给 API 服务
- 不需要在 `Platform.ApiService` 中单独配置
- 所有服务共享相同的配置源

### 2. 启动系统

```bash
# 启动完整系统（推荐）
dotnet run --project Platform.AppHost

# AppHost 会自动启动所有服务（MongoDB、API服务、前端应用等）
```

---

## 🏭 生产环境部署

### 1. 环境变量配置

**必需的环境变量**:

```bash
# JWT密钥（必需）
export Jwt__SecretKey="your-production-secret-key-very-long-and-random"

# 前端API地址（必需）
export REACT_APP_API_BASE_URL="https://api.yourdomain.com"

# CORS允许源（可选，在appsettings.Production.json中配置）
export AllowedOrigins__0="https://yourdomain.com"
export AllowedOrigins__1="https://app.yourdomain.com"
```

### 2. Azure部署（推荐使用Key Vault）

**创建Key Vault**:

```bash
az keyvault create --name myKeyVault --resource-group myRG --location eastus
```

**添加密钥**:

```bash
az keyvault secret set --vault-name myKeyVault --name JwtSecretKey --value "your-secret"
```

**配置App Service访问**:

```bash
az webapp identity assign --resource-group myRG --name myApp
az keyvault set-policy --name myKeyVault --object-id <principalId> --secret-permissions get list
```

---

## ⚠️ 安全检查清单

在部署前，确认以下事项：

### 后端

- [ ] JWT SecretKey已通过安全方式配置（不在代码中）
- [ ] appsettings.json中SecretKey为空
- [ ] CORS配置正确（生产环境限制域名）
- [ ] 数据库连接使用加密连接
- [ ] 所有敏感配置使用环境变量

### 前端

- [ ] REACT_APP_API_BASE_URL已配置
- [ ] 生产构建前设置环境变量
- [ ] .env文件不提交到Git
- [ ] 敏感日志仅在开发环境输出

---

## 🔒 已修复的安全漏洞

### ✅ P0-严重

1. **JWT密钥管理** - 移除硬编码默认密钥，强制配置
2. **企业ID验证** - GetRequiredCompanyId正确抛出异常

### ✅ P1-高危

3. **敏感日志保护** - 生产环境不输出Token等敏感信息
4. **API地址配置** - 使用环境变量而非硬编码
5. **密码哈希统一** - 移除重复代码，统一使用IPasswordHasher

---

## 📚 详细文档

- [JWT密钥配置详细指南](docs/deployment/JWT-SECRET-CONFIGURATION.md)
- [安全部署检查清单](docs/deployment/SECURITY-CHECKLIST.md)
- [安全漏洞修复报告](docs/bugfixes/SECURITY-VULNERABILITIES-FIX.md)

---

## 🚨 安全事故响应

### 密钥泄露时

1. **立即轮换密钥**
2. **重启所有服务**
3. **检查访问日志**
4. **通知用户重新登录**

### 报告安全问题

如发现安全漏洞，请立即通知团队负责人。

---

## ✨ 最佳实践

1. ✅ **永不提交密钥**到Git仓库
2. ✅ **定期轮换密钥**（建议3-6个月）
3. ✅ **不同环境使用不同密钥**
4. ✅ **限制密钥访问权限**
5. ✅ **监控异常登录行为**

---

## 🎯 常见问题

### Q: 启动时提示 "JWT SecretKey must be configured"

**A**: JWT密钥未配置。运行:

```bash
cd Platform.ApiService
dotnet user-secrets set "Jwt:SecretKey" "your-secret-key"
```

### Q: 前端连接不到API

**A**: 检查API地址配置:

```bash
# 开发环境：使用代理（config/proxy.ts）
# 生产环境：设置环境变量
export REACT_APP_API_BASE_URL="https://api.yourdomain.com"
```

### Q: 生产环境如何配置密钥？

**A**: 使用环境变量或Azure Key Vault，参见 [JWT密钥配置指南](docs/deployment/JWT-SECRET-CONFIGURATION.md)

---

## 📞 获取帮助

- 查看文档：`docs/` 目录
- 安全问题：联系团队安全负责人
- 技术问题：创建Issue或联系开发团队

---

**记住：安全是每个人的责任！** 🔒
