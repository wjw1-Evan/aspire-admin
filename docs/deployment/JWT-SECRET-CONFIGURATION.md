# 🔐 JWT密钥配置指南

## 📋 概述

JWT（JSON Web Token）密钥是系统安全的核心。**绝对不能**将真实密钥提交到源代码仓库！

本指南说明如何在不同环境中安全地配置JWT密钥。

---

## ⚠️ 安全原则

1. **永远不要**将真实密钥提交到Git仓库
2. **永远不要**在代码中硬编码密钥
3. **必须**为每个环境使用不同的密钥
4. **必须**定期轮换生产环境密钥
5. **密钥长度**至少32个字符

---

## 🔧 开发环境配置

### 方法1：用户密钥（推荐）

使用 .NET 用户密钥功能：

```bash
# 进入API服务目录
cd Platform.ApiService

# 初始化用户密钥
dotnet user-secrets init

# 设置JWT密钥
dotnet user-secrets set "Jwt:SecretKey" "your-development-secret-key-min-32-chars"

# 验证配置
dotnet user-secrets list
```

**优点**:
- 密钥存储在用户目录，不会提交到Git
- 每个开发者独立管理
- 支持团队协作

**密钥存储位置**:
- **Windows**: `%APPDATA%\Microsoft\UserSecrets\<user_secrets_id>\secrets.json`
- **Linux/macOS**: `~/.microsoft/usersecrets/<user_secrets_id>/secrets.json`

---

### 方法2：环境变量

设置环境变量：

**Windows (PowerShell)**:
```powershell
$env:Jwt__SecretKey = "your-development-secret-key-min-32-chars"
```

**Linux/macOS**:
```bash
export Jwt__SecretKey="your-development-secret-key-min-32-chars"
```

**持久化**（添加到 shell 配置文件）:
```bash
# ~/.bashrc 或 ~/.zshrc
export Jwt__SecretKey="your-development-secret-key-min-32-chars"
```

---

## 🚀 生产环境配置

### 方法1：环境变量（推荐）

**直接设置**:
```bash
export Jwt__SecretKey="your-production-secret-key-should-be-very-long-and-random"
```

**systemd服务**（Linux）:
```ini
# /etc/systemd/system/aspire-admin.service
[Service]
Environment="Jwt__SecretKey=your-production-secret-key"
```

**Docker**:
```bash
docker run -e Jwt__SecretKey="your-production-secret-key" aspire-admin
```

**Docker Compose**:
```yaml
version: '3.8'
services:
  api:
    image: aspire-admin
    environment:
      - Jwt__SecretKey=${JWT_SECRET_KEY}
```

---

### 方法2：Azure App Service

**应用程序设置**:
1. 登录Azure Portal
2. 进入App Service
3. 设置 → 配置 → 应用程序设置
4. 添加新设置：
   - 名称: `Jwt__SecretKey`
   - 值: `your-production-secret-key`

**Azure CLI**:
```bash
az webapp config appsettings set \
  --resource-group myResourceGroup \
  --name myAppName \
  --settings Jwt__SecretKey="your-production-secret-key"
```

---

### 方法3：Azure Key Vault（最佳实践）

**设置步骤**:

1. **创建Key Vault**:
```bash
az keyvault create \
  --name myKeyVault \
  --resource-group myResourceGroup \
  --location eastus
```

2. **添加密钥**:
```bash
az keyvault secret set \
  --vault-name myKeyVault \
  --name JwtSecretKey \
  --value "your-production-secret-key"
```

3. **配置应用访问**:
```bash
az webapp identity assign \
  --resource-group myResourceGroup \
  --name myAppName

# 获取 principalId
az webapp identity show \
  --resource-group myResourceGroup \
  --name myAppName \
  --query principalId

# 授予权限
az keyvault set-policy \
  --name myKeyVault \
  --object-id <principalId> \
  --secret-permissions get list
```

4. **在代码中引用**（Program.cs）:
```csharp
// 添加Azure Key Vault配置
builder.Configuration.AddAzureKeyVault(
    new Uri($"https://{keyVaultName}.vault.azure.net/"),
    new DefaultAzureCredential());
```

**优点**:
- 集中管理密钥
- 自动轮换
- 审计日志
- 访问控制

---

## 🔑 密钥生成

### 生成安全的密钥

**使用OpenSSL**:
```bash
openssl rand -base64 32
```

**使用PowerShell**:
```powershell
[Convert]::ToBase64String([System.Security.Cryptography.RandomNumberGenerator]::GetBytes(32))
```

**使用在线工具**（仅用于开发）:
```
https://www.random.org/strings/
```

**要求**:
- 至少32个字符
- 包含大小写字母、数字、特殊字符
- 随机生成，不使用可预测的模式

---

## 🔄 密钥轮换

### 定期轮换策略

**建议频率**:
- **生产环境**: 每3-6个月
- **测试环境**: 每6-12个月
- **开发环境**: 按需轮换

### 轮换步骤

1. **生成新密钥**:
   ```bash
   openssl rand -base64 32
   ```

2. **更新Key Vault或环境变量**:
   ```bash
   az keyvault secret set \
     --vault-name myKeyVault \
     --name JwtSecretKey \
     --value "new-secret-key"
   ```

3. **重启应用**:
   ```bash
   az webapp restart \
     --resource-group myResourceGroup \
     --name myAppName
   ```

4. **验证**:
   - 检查应用日志
   - 测试登录功能
   - 验证现有token仍有效

**注意**: 轮换密钥会使所有现有token失效！需要用户重新登录。

---

## 🧪 验证配置

### 检查密钥是否生效

**查看应用日志**:
```bash
# 应用启动时应该正常，不报错
# 如果密钥未配置，会看到：
# System.InvalidOperationException: JWT SecretKey must be configured
```

**测试登录**:
```bash
curl -X POST http://localhost:5000/api/login/account \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}'
```

**成功响应**:
```json
{
  "success": true,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "...",
    "expiresAt": "2025-01-15T..."
  }
}
```

---

## ❌ 常见错误

### 错误1：密钥未配置

**错误信息**:
```
System.InvalidOperationException: JWT SecretKey must be configured. 
Set it via User Secrets, Environment Variables, or Azure Key Vault.
```

**解决方法**:
- 检查用户密钥是否设置
- 检查环境变量是否设置
- 检查Key Vault连接是否正常

---

### 错误2：密钥格式错误

**错误信息**:
```
System.ArgumentOutOfRangeException: IDX10603: 
The algorithm: 'HS256' requires the SecurityKey.KeySize to be greater than 128 bits.
```

**解决方法**:
- 密钥长度必须至少32个字符
- 重新生成足够长的密钥

---

### 错误3：密钥包含特殊字符

**问题**: 环境变量中的特殊字符未正确转义

**解决方法**:
```bash
# 使用单引号避免shell解析
export Jwt__SecretKey='your-secret-key-with-$pecial-chars'
```

---

## 📋 配置检查清单

### 开发环境

- [ ] 使用用户密钥或环境变量
- [ ] 密钥至少32字符
- [ ] appsettings.json 中 SecretKey 为空
- [ ] .gitignore 包含 `**/secrets.json`

### 测试环境

- [ ] 使用环境变量
- [ ] 密钥与开发环境不同
- [ ] 密钥存储在CI/CD变量中

### 生产环境

- [ ] 使用环境变量或Key Vault
- [ ] 密钥强度高（长且随机）
- [ ] 密钥与其他环境完全不同
- [ ] 建立密钥轮换计划
- [ ] 限制密钥访问权限

---

## 🚨 安全事故响应

### 密钥泄露时的处理

1. **立即轮换密钥**
2. **重启所有应用实例**
3. **检查日志寻找异常活动**
4. **通知用户重新登录**
5. **审计系统访问记录**
6. **更新安全流程**

---

## 📚 相关文档

- [.NET User Secrets](https://docs.microsoft.com/aspnet/core/security/app-secrets)
- [Azure Key Vault](https://docs.microsoft.com/azure/key-vault/)
- [环境变量最佳实践](https://12factor.net/config)
- [JWT最佳实践](https://tools.ietf.org/html/rfc8725)

---

## 🎯 总结

JWT密钥是系统安全的基石。遵循以下原则：

1. ✅ **永不提交**密钥到源代码
2. ✅ **使用安全的配置方式**（User Secrets、环境变量、Key Vault）
3. ✅ **不同环境使用不同密钥**
4. ✅ **定期轮换密钥**
5. ✅ **限制密钥访问权限**

**记住**: 一个泄露的密钥可以让攻击者伪造任何用户的身份！

