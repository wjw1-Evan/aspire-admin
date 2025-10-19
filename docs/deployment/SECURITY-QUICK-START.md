# 🔒 安全快速开始指南

> **⚠️ 重要**: 在运行系统前，必须完成安全配置！

## 🚀 30秒快速配置

### 1. 配置JWT密钥

```bash
# 进入API服务目录
cd Platform.ApiService

# 设置JWT密钥（开发环境）
dotnet user-secrets set "Jwt:SecretKey" "your-development-secret-key-at-least-32-characters-long"
```

### 2. 启动系统

```bash
# 启动完整系统
dotnet run --project Platform.AppHost
```

### 3. 验证配置

```bash
# 运行安全验证脚本
./scripts/verify-security-config.sh
```

**完成！** 🎉 系统现在可以安全运行了。

---

## 📋 详细配置

### 开发环境

**后端配置**:

```bash
cd Platform.ApiService
dotnet user-secrets set "Jwt:SecretKey" "your-dev-secret-key-min-32-chars"
```

**前端配置**:

- 开发环境使用代理，无需额外配置
- 访问: <http://localhost:15001>

### 生产环境

**后端配置**:

```bash
# 方法1: 环境变量
export Jwt__SecretKey="your-production-secret-key"

# 方法2: Azure Key Vault
az keyvault secret set --vault-name myKeyVault --name JwtSecretKey --value "your-secret"
```

**前端配置**:

```bash
# 设置API地址
export REACT_APP_API_BASE_URL="https://api.yourdomain.com"

# 构建应用
npm run build
```

---

## 🔍 安全检查

### 自动检查

```bash
# 运行完整安全检查
./scripts/verify-security-config.sh
```

### 手动检查

1. **JWT密钥配置**:

```bash
dotnet user-secrets list | grep Jwt
```

2. **应用启动**:

```bash
dotnet run --project Platform.ApiService
# 应该正常启动，无异常
```

3. **登录测试**:

```bash
curl -X POST http://localhost:15000/api/login/account \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}'
```

---

## ⚠️ 常见问题

### Q: 启动时提示 "JWT SecretKey must be configured"

**A**: JWT密钥未配置。运行:

```bash
cd Platform.ApiService
dotnet user-secrets set "Jwt:SecretKey" "your-secret-key"
```

### Q: 前端连接不到API

**A**: 检查API地址配置:

- 开发环境：使用代理（无需配置）
- 生产环境：设置 `REACT_APP_API_BASE_URL`

### Q: 安全验证脚本失败

**A**: 检查以下配置:

- [ ] JWT密钥已设置
- [ ] appsettings.json中SecretKey为空
- [ ] 环境变量正确配置

---

## 📚 更多信息

- [完整安全配置指南](JWT-SECRET-CONFIGURATION.md)
- [安全部署检查清单](SECURITY-CHECKLIST.md)
- [安全审计报告](../reports/SECURITY-AUDIT-FINAL-REPORT.md)

---

**记住**: 安全是每个人的责任！🔒

# 🔒 安全快速开始指南

> **⚠️ 重要**: 在运行系统前，必须完成安全配置！

## 🚀 30秒快速配置

### 1. 配置JWT密钥

```bash
# 进入API服务目录
cd Platform.ApiService

# 设置JWT密钥（开发环境）
dotnet user-secrets set "Jwt:SecretKey" "your-development-secret-key-at-least-32-characters-long"
```

### 2. 启动系统

```bash
# 启动完整系统
dotnet run --project Platform.AppHost
```

### 3. 验证配置

```bash
# 运行安全验证脚本
./scripts/verify-security-config.sh
```

**完成！** 🎉 系统现在可以安全运行了。

---

## 📋 详细配置

### 开发环境

**后端配置**:

```bash
cd Platform.ApiService
dotnet user-secrets set "Jwt:SecretKey" "your-dev-secret-key-min-32-chars"
```

**前端配置**:

- 开发环境使用代理，无需额外配置
- 访问: <http://localhost:15001>

### 生产环境

**后端配置**:

```bash
# 方法1: 环境变量
export Jwt__SecretKey="your-production-secret-key"

# 方法2: Azure Key Vault
az keyvault secret set --vault-name myKeyVault --name JwtSecretKey --value "your-secret"
```

**前端配置**:

```bash
# 设置API地址
export REACT_APP_API_BASE_URL="https://api.yourdomain.com"

# 构建应用
npm run build
```

---

## 🔍 安全检查

### 自动检查

```bash
# 运行完整安全检查
./scripts/verify-security-config.sh
```

### 手动检查

1. **JWT密钥配置**:

```bash
dotnet user-secrets list | grep Jwt
```

2. **应用启动**:

```bash
dotnet run --project Platform.ApiService
# 应该正常启动，无异常
```

3. **登录测试**:

```bash
curl -X POST http://localhost:15000/api/login/account \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}'
```

---

## ⚠️ 常见问题

### Q: 启动时提示 "JWT SecretKey must be configured"

**A**: JWT密钥未配置。运行:

```bash
cd Platform.ApiService
dotnet user-secrets set "Jwt:SecretKey" "your-secret-key"
```

### Q: 前端连接不到API

**A**: 检查API地址配置:

- 开发环境：使用代理（无需配置）
- 生产环境：设置 `REACT_APP_API_BASE_URL`

### Q: 安全验证脚本失败

**A**: 检查以下配置:

- [ ] JWT密钥已设置
- [ ] appsettings.json中SecretKey为空
- [ ] 环境变量正确配置

---

## 📚 更多信息

- [完整安全配置指南](docs/deployment/JWT-SECRET-CONFIGURATION.md)
- [安全部署检查清单](docs/deployment/SECURITY-CHECKLIST.md)
- [安全审计报告](docs/reports/SECURITY-AUDIT-FINAL-REPORT.md)

---

**记住**: 安全是每个人的责任！🔒

# 🔒 安全快速开始指南

> **⚠️ 重要**: 在运行系统前，必须完成安全配置！

## 🚀 30秒快速配置

### 1. 配置JWT密钥

```bash
# 进入API服务目录
cd Platform.ApiService

# 设置JWT密钥（开发环境）
dotnet user-secrets set "Jwt:SecretKey" "your-development-secret-key-at-least-32-characters-long"
```

### 2. 启动系统

```bash
# 启动完整系统
dotnet run --project Platform.AppHost
```

### 3. 验证配置

```bash
# 运行安全验证脚本
./scripts/verify-security-config.sh
```

**完成！** 🎉 系统现在可以安全运行了
---

## 📋 详细配置

### 开发环境

**后端配置**:

```bash
cd Platform.ApiService
dotnet user-secrets set "Jwt:SecretKey" "your-dev-secret-key-min-32-chars"
```

**前端配置**:

- 开发环境使用代理，无需额外配置
- 访问: <http://localhost:15001>

### 生产环境

**后端配置**:

```bash
# 方法1: 环境变量
export Jwt__SecretKey="your-production-secret-key"

# 方法2: Azure Key Vault
az keyvault secret set --vault-name myKeyVault --name JwtSecretKey --value "your-secret"
```

**前端配置**:

```bash
# 设置API地址
export REACT_APP_API_BASE_URL="https://api.yourdomain.com"

# 构建应用
npm run build
```

---

## 🔍 安全检查

### 自动检查

```bash
# 运行完整安全检查
./scripts/verify-security-config.sh
```

### 手动检查

1. **JWT密钥配置**:

```bash
dotnet user-secrets list | grep Jwt
```

2. **应用启动**:

```bash
dotnet run --project Platform.ApiService
# 应该正常启动，无异常
```

3. **登录测试**:

```bash
curl -X POST http://localhost:15000/api/login/account \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}'
```

---

## ⚠️ 常见问题

### Q: 启动时提示 "JWT SecretKey must be configured"

**A**: JWT密钥未配置。运行:

```bash
cd Platform.ApiService
dotnet user-secrets set "Jwt:SecretKey" "your-secret-key"
```

### Q: 前端连接不到API

**A**: 检查API地址配置:

- 开发环境：使用代理（无需配置）
- 生产环境：设置 `REACT_APP_API_BASE_URL`

### Q: 安全验证脚本失败

**A**: 检查以下配置:

- [ ] JWT密钥已设置
- [ ] appsettings.json中SecretKey为空
- [ ] 环境变量正确配置

---

## 📚 更多信息

- [完整安全配置指南](docs/deployment/JWT-SECRET-CONFIGURATION.md)
- [安全部署检查清单](docs/deployment/SECURITY-CHECKLIST.md)
- [安全审计报告](docs/reports/SECURITY-AUDIT-FINAL-REPORT.md)

---

**记住**: 安全是每个人的责任！🔒
