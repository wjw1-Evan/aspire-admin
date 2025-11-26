# Rules 更新总结报告

**更新时间**: 2024-12-19
**更新范围**: 根据当前代码库全面更新 Cursor Rules

## 📋 更新概览

本次更新基于当前代码库的实际实现，全面更新了 `.cursor/rules/` 目录下的规则文件，确保规则与实际代码保持一致。

## ✅ 已完成的更新

### 1. project-structure.mdc
- ✅ 更新访问地址信息
  - 更新 API 文档访问方式（通过 Aspire Dashboard 访问 Scalar）
  - 更新 MongoDB Express 访问地址
  - 补充 OpenAPI JSON 端点
- ✅ 更新服务编排配置示例
  - 补充 Scalar API 文档配置（支持多服务）
  - 更新服务依赖关系说明

### 2. frontend-development.mdc
- ✅ 补充 API 服务规范
  - 说明使用 UmiJS `request` 方法
  - 补充请求/响应拦截器说明
- ✅ 更新错误处理规范
  - 补充统一错误处理系统说明
  - 说明支持多种错误响应格式（标准格式、ProblemDetails 格式）
  - 说明错误拦截器的使用
- ✅ 补充 Token 自动刷新机制
  - 说明 TokenRefreshManager 的使用
  - 说明自动刷新流程

### 3. api-integration.mdc
- ✅ 更新错误处理部分
  - 补充管理后台错误处理实现细节
  - 补充移动端错误处理实现细节
  - 说明支持多种错误响应格式
- ✅ 补充 Token 自动刷新实现
  - 说明管理后台的 token 刷新流程
  - 说明防止并发刷新的机制

### 4. csharp-backend.mdc
- ✅ 补充 JSON 序列化配置
  - 说明统一的 JSON 序列化配置
  - 说明 SignalR 使用相同的序列化配置
  - 说明枚举序列化为 camelCase 字符串

## 🔄 待完善的更新

### 1. mobile-development-patterns.mdc
- 需要补充移动端认证守卫的实际实现
- 需要补充 Expo Router 导航守卫的实现细节
- 需要补充移动端 API 集成的实际实现

### 2. auth-system.mdc
- 需要补充认证服务的实际实现细节
- 需要补充 token 刷新的完整流程
- 需要补充前后端认证统一的实现细节

## 📝 主要变更点

### 1. API 文档访问方式
- **变更前**: 直接访问 `http://localhost:15000/scalar/v1`
- **变更后**: 通过 Aspire Dashboard → Resources → Scalar API Reference 访问

### 2. 错误处理系统
- **新增**: 统一错误拦截器系统
- **新增**: 支持 .NET ProblemDetails 格式
- **新增**: 支持多种错误显示方式（消息、通知、静默等）

### 3. Token 刷新机制
- **新增**: TokenRefreshManager 防止并发刷新
- **新增**: 自动重试原始请求
- **新增**: 刷新失败的统一处理

### 4. JSON 序列化
- **新增**: 统一的 JSON 序列化配置
- **新增**: SignalR 使用相同的序列化配置
- **新增**: 枚举序列化为 camelCase 字符串

## 🎯 后续建议

1. **继续完善移动端规范**
   - 补充移动端认证守卫的实现细节
   - 补充移动端错误处理的实际实现
   - 补充移动端 API 集成的实际代码示例

2. **完善认证系统规范**
   - 补充前后端认证统一的实现细节
   - 补充 token 刷新的完整流程文档
   - 补充认证错误处理的实际代码示例

3. **定期审查和更新**
   - 建议每次重大代码变更后同步更新规则
   - 保持规则与实际代码实现的一致性
   - 定期检查规则文件的准确性

## 📚 相关文档

- [项目结构指南](mdc:.cursor/rules/project-structure.mdc)
- [前端开发规范](mdc:.cursor/rules/frontend-development.mdc)
- [API 集成规范](mdc:.cursor/rules/api-integration.mdc)
- [后端开发规范](mdc:.cursor/rules/csharp-backend.mdc)

