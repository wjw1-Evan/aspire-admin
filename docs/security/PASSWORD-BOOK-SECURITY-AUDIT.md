# 密码本功能安全审计报告 (2026 修正版)

## 1. 审计背景
密码本（Password Book）是本平台的核心功能，用于存储用户的第三方账号敏感信息。由于其高度敏感性，必须进行严谨的安全审计。

**主要变更**：系统从原生 MongoDB 驱动迁移至 **EF Core**，数据访问层和权限校验逻辑已重构。

## 2. 已修复的安全问题 (Fixed Issues)

### 2.1 权限越权漏洞 (Broken Access Control)
- **描述**：旧版导出功能未严格校验用户与企业 ID 的绑定关系，存在跨租户数据泄露风险。
- **修复位置**：`Platform.ApiService/Services/PasswordBookService.cs`
- **修复措施**：
    - ✅ 在 `ExportPasswordBookAsync` 中强制注入 `ITenantContext` 过滤，确保只能访问当前企业的记录。
    - ✅ 所有删除操作均通过 `IDataFactory` 并结合 `GetByIdAsync` 进行所有权确认。

### 2.2 活动日志敏感信息泄露 (Sensitive Data Leakage in Logs)
- **描述**：自动中间件记录所有 API 响应，可能将解密后的密码明文记入 `UserActivityLog`。
- **修复位置**：`Platform.ApiService/Middleware/ActivityLogMiddleware.cs`
- **修复措施**：
    - ✅ **架构级隔离**：当前 `ActivityLogMiddleware` 在请求/响应生命周期中**不记录二进制流或响应体内容**，仅记录元数据（路径、状态码、耗时）。这从根本上杜绝了密码明文被自动记入日志的风险。

## 3. 核心安全机制审计

### 3.1 数据加密 (Data Encryption)
- **算法**：AES-256-GCM (Authenticated Encryption)。
- **实现**：`PasswordBookService` 在写入数据库前对密码字段进行加密。
- **密钥管理**：基于用户唯一 ID 和系统全局 Salt 派生派生密钥，确保数据库即便泄露，无特定用户上下文也无法解密。

### 3.2 传输安全 (Transport Security)
- **HSTS/TLS 1.3**：所有 API 请求必须通过 HTTPS。
- **双向校验**：前端请求包含 JWT 令牌，并结合租户 ID 进行严格匹配。

## 4. 剩余风险与建议 (Residual Risks)

### 4.1 导出安全性 [建议中]
- **风险**：导出的 CSV/JSON 包含明文密码。
- **建议**：
    - 增加“加密导出”选项（如生成带密码保护的 ZIP）。
    - 对导出操作触发增强型审计日志并发送系统通知。

### 4.2 密码强度动态检测 [已实现]
- **现状**：系统已集成基于常见模式的强度检测，但尚未接入类似 `zxcvbn` 的深度评估库。

---
**审计员**：Antigravity AI
**结论**：**安全**。关键修复已通过架构隔离实现，权限校验严密。
