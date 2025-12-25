# 工作流 MongoDB 序列化错误修复

## 问题描述

在工作流审批过程中，出现 MongoDB 序列化错误：
- `ApprovalRecord.Id` 为空字符串导致 MongoDB 序列化失败
- 编译错误：缺少 `ObjectId` 引用、`ITenantContext` 注入等

## 修复内容

### 1. ApprovalRecord Id 生成修复

**问题**：`ApprovalRecord` 创建时 `Id` 属性为空字符串，导致 MongoDB 序列化失败。

**修复**：
- 在 `WorkflowEngine.cs` 的两个 `ApprovalRecord` 创建位置添加 `ObjectId` 生成
- 添加 `using MongoDB.Bson;` 引用

```csharp
var approvalRecord = new ApprovalRecord
{
    Id = ObjectId.GenerateNewId().ToString(), // 生成新的ObjectId
    // ... 其他属性
};
```

### 2. ITenantContext 依赖注入修复

**问题**：`WorkflowEngine` 缺少 `ITenantContext` 依赖注入。

**修复**：
- 添加 `_tenantContext` 字段
- 在构造函数中注入 `ITenantContext`
- 使用 `await _tenantContext.GetCurrentCompanyIdAsync()` 获取企业ID

### 3. 编译错误修复

**修复的编译错误**：
- 添加 `MongoDB.Bson` using 语句
- 修复 `ITenantContext` 异步方法调用
- 确保所有 `ApprovalRecord` 创建都包含正确的 `Id` 和 `CompanyId`

## 验证结果

- ✅ 后端编译成功（仅1个警告）
- ✅ 前端编译成功
- ✅ 应用程序启动成功
- ✅ MongoDB 序列化错误已解决

## 安全检查

修复过程中遵循了平台安全规范：
- 使用 `ITenantContext` 获取企业ID，避免硬编码
- 保持多租户隔离
- 使用工厂模式进行数据库操作
- 审计字段由工厂自动维护