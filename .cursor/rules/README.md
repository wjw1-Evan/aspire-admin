# Cursor Rules 使用指南

本目录包含了 Aspire Admin Platform 项目的 Cursor AI 规则文件，这些规则将帮助 AI 更好地理解项目结构和开发规范。

## 📋 规则文件列表

### 🏗️ 项目架构
- **`project-structure.mdc`** - 项目整体结构和架构指南
  - ⚡ 始终自动应用
  - 包含技术栈、目录结构、.NET Aspire 编排、认证系统架构、部署架构
  - 提供开发指南、常见问题解答

### 🔧 微服务架构
- **`data-initializer-microservice.mdc`** - 数据初始化微服务开发规范
  - 📋 手动引用
  - 微服务架构设计和实现规范
  - 单实例运行保证、自动停止机制
  - API 端点设计和监控调试
  - 任务型微服务模式实现

### 💻 前端开发规范

#### TypeScript & React
- **`typescript-coding-standards.mdc`** - TypeScript 编码规范
  - 📁 应用于 `*.ts` 和 `*.tsx` 文件
  - 包含代码风格、命名约定、类型定义、最佳实践
  - Biome 配置规范

- **`react-components.mdc`** - React 组件开发规范
  - 📁 应用于 `*.tsx` 和 `*.jsx` 文件
  - 包含组件设计、Props 设计、样式规范、状态管理
  - 性能优化和最佳实践

#### Ant Design Pro & UmiJS
- **`antd-pro-umi.mdc`** - Ant Design Pro 和 UmiJS 开发规范
  - 📁 应用于 `Platform.Admin` 相关文件
  - app.tsx 运行时配置、网络请求拦截器
  - ProTable、ProForm 使用规范
  - 路由配置和动态菜单

#### 移动端开发
- **`mobile-development.mdc`** - React Native 和 Expo 开发规范
  - 📁 应用于移动端相关文件
  - Expo Router 路由系统、主题化组件
  - 平台适配、性能优化
  - 认证守卫组件

### 🎨 UI & 主题
- **`theme-system.mdc`** - 主题系统使用指南
  - 📁 应用于主题相关文件
  - 主题化组件、普鲁士蓝色系
  - ThemeContext、主题切换
  - 状态栏适配

### 🌐 API & 网络
- **`api-integration.mdc`** - API 集成和网络请求规范
  - 📁 应用于服务层和 API 相关文件
  - API 服务封装、认证服务
  - 自定义 Hooks、错误处理
  - 网络状态检测、离线处理

- **`error-handling.mdc`** - 统一错误处理规范
  - 📁 应用于错误处理相关文件
  - 前后端统一错误格式
  - 错误分类和处理策略
  - 重试机制、错误边界

### 🔐 认证系统
- **`auth-system.mdc`** - 认证系统开发规范
  - 📁 应用于认证相关文件
  - JWT Token 认证、Token 刷新机制
  - AuthContext、useAuth Hook
  - 权限守卫、路由守卫

### 🔄 状态管理
- **`state-management.mdc`** - 状态管理规范和最佳实践
  - 📁 应用于 Context 和 Hooks 文件
  - React Context + useReducer 模式
  - 自定义 Hooks 设计
  - 性能优化、不可变更新

### 🖥️ 后端开发

#### C# 基础规范
- **`csharp-backend.mdc`** - C# 后端开发规范
  - 📁 应用于 `*.cs` 文件
  - 控制器设计、服务层、数据访问
  - MongoDB 集成、JWT 认证
  - 命名约定和最佳实践

- **`baseapicontroller-standard.mdc`** - BaseApiController 统一标准
  - ⚡ 始终自动应用
  - 所有控制器必须继承 BaseApiController
  - 统一响应方法、用户信息获取
  - 禁止手动 try-catch，由中间件处理

#### 服务层开发
- **`backend-service-pattern.mdc`** - Backend 服务层开发规范
  - 📁 应用于 `Platform.ApiService/Services/*.cs`
  - 使用 BaseService 和 BaseRepository
  - 标准服务实现模式

#### 多租户开发规范 ⭐ **重要**
- **`no-global-data.mdc`** - 禁止创建全局数据，确保多租户数据隔离
  - ⚡ 始终自动应用
  - 强制所有数据必须有 CompanyId
  - 禁止在系统启动时创建全局数据
  - 数据孤儿检查和验证

- **`multi-tenant-development.mdc`** - 多租户系统开发规范
  - 📋 手动引用
  - BaseRepository 自动租户过滤
  - ITenantContext 使用
  - 跨企业操作安全规范

- **`multi-tenant-data-isolation.mdc`** - 多租户数据隔离开发规范
  - 📁 应用于 `*.cs` 文件和 `Platform.ApiService` 相关文件
  - MultiTenantEntity 和 MultiTenantRepository 使用
  - 企业数据过滤和验证
  - 跨企业操作安全规范

- **`user-registration-flow.mdc`** - 用户注册流程和企业自动创建规范
  - 📋 手动引用
  - 用户注册时自动创建企业
  - 默认权限、角色、菜单创建
  - MongoDB 事务保护

#### 数据库开发规范 🆕
- **`database-initialization.mdc`** - 数据库初始化规范
  - ⚡ 始终自动应用
  - 数据初始化由专门的微服务负责
  - 单实例运行保证安全
  - 确保幂等性和原子操作

- **`data-initializer-microservice.mdc`** - 数据初始化微服务开发规范
  - 📋 手动引用
  - 微服务架构设计和实现规范
  - 单实例运行保证、自动停止机制
  - API 端点设计和监控调试
  - 任务型微服务模式实现


- **`mongodb-atomic-operations.mdc`** - MongoDB 原子操作最佳实践
  - 📋 手动引用
  - 插入或忽略、更新或插入模式
  - 条件更新、原子递增
  - 避免"查询+更新"非原子模式

- **`global-menu-architecture.mdc`** - 全局菜单架构规范 🆕
  - ⚡ 始终自动应用
  - 菜单是全局系统资源（无 CompanyId）
  - 系统初始化创建，用户不可管理
  - 通过权限控制显示

#### 权限控制
- **`menu-level-permission.mdc`** - 菜单级权限控制规范
  - 📁 应用于控制器和权限相关文件
  - 使用 [RequireMenu] 特性
  - BaseApiController 菜单权限辅助方法
  - 菜单权限映射规范

#### 验证和扩展方法
- **`validation-extensions.mdc`** - 参数验证规范
  - 📋 手动引用
  - 使用 ValidationExtensions 扩展方法
  - 统一验证和错误消息

- **`resource-extensions-usage.mdc`** - 资源检查规范
  - 📋 手动引用
  - 使用 ResourceExtensions 扩展方法

- **`error-messages-usage.mdc`** - 错误消息规范
  - 📋 手动引用
  - 使用 ErrorMessages 常量类

### 📝 文档管理
- **`documentation-organization.mdc`** - 文档组织规范
  - ⚡ 始终自动应用
  - 所有文档必须放在 docs 目录
  - 文档分类和命名规范

- **`sync-help-documentation.mdc`** - 代码修改后同步更新系统帮助
  - ⚡ 始终自动应用
  - API 变更必须更新文档
  - 前端帮助模块同步

### 🧪 测试规范
- **`testing-standards.mdc`** - 测试规范和最佳实践
  - 📁 应用于测试文件
  - 单元测试、集成测试、端到端测试
  - Jest 配置、测试工具函数
  - React Testing Library、Expo Testing

### 🚀 部署运维
- **`deployment.mdc`** - 部署和运维规范
  - Docker 容器化部署
  - 生产环境配置、Nginx 配置
  - 监控日志、健康检查
  - CI/CD 流程、备份恢复

### 📋 实体开发
- **`new-entity-checklist.mdc`** - 新增业务实体开发清单
  - 📋 手动引用
  - 完整的实体开发步骤
  - 包含 Controller、Service、Model、前端等

## 🎯 使用方式

### 自动应用规则 (7个)
- **`project-structure.mdc`** - 项目概览和架构
- **`baseapicontroller-standard.mdc`** - BaseApiController 规范
- **`no-global-data.mdc`** - 禁止全局数据（含 Menu 例外说明）
- **`database-initialization.mdc`** - 数据库初始化规范
- **`global-menu-architecture.mdc`** - 全局菜单架构规范
- **`documentation-organization.mdc`** - 文档组织规范
- **`sync-help-documentation.mdc`** - 文档同步规范

其他规则根据 `globs` 模式自动匹配相应文件类型

### 手动引用规则
在对话中可以手动引用特定规则：
```
请参考 typescript-coding-standards 规则
请参考 auth-system 规则来实现认证功能
请参考 data-initializer-microservice 规则来实现数据初始化微服务
请参考 code-review-quality 规则进行代码审查
请参考 performance-optimization 规则优化性能
请参考 security-best-practices 规则确保安全性
```

### 规则匹配示例
- 编辑 `*.ts` 文件时，自动应用 `typescript-coding-standards.mdc`
- 编辑 `*.tsx` 文件时，自动应用 `react-components.mdc`
- 编辑认证相关文件时，自动应用 `auth-system.mdc`
- 编辑 Context 文件时，自动应用 `state-management.mdc`

## 📊 规则统计

| 类型 | 数量 | 说明 |
|------|------|------|
| 项目架构 | 1 | 始终应用 |
| 前端规范 | 5 | TypeScript、React、Ant Design Pro、移动端、主题系统 |
| 后端规范 | 2 | C# 开发规范（含服务层）、BaseApiController |
| 多租户规范 ⭐ | 3 | 多租户开发、用户注册、全局数据控制 |
| 数据库规范 🆕 | 3 | 初始化、微服务、原子操作、全局菜单 |
| 权限规范 | 1 | 权限控制 |
| 验证扩展 | 2 | 参数验证、资源检查 |
| 文档管理 | 2 | 文档组织、同步更新 |
| 系统规范 | 4 | API、认证、错误处理、状态管理 |
| 工程规范 | 3 | 测试、部署、Git工作流 |
| 实体开发 | 1 | 新增实体清单 |
| **核心开发规范** 🆕 | **6** | 代码审查、性能优化、安全实践、微服务架构、设计模式、移动端最佳实践 |
| **总计** | **31** | 涵盖全栈开发各个方面（已合并重复规则） |

## 🆕 v5.0 新增规则

### 数据初始化微服务架构 (2025-01)

针对数据初始化微服务架构和单实例运行模式新增重要规则：

1. **`database-initialization.mdc`** (⚡ 自动应用)
   - 数据初始化由专门的微服务负责
   - 单实例运行保证安全
   - 幂等性设计
   - 全局菜单初始化

2. **`data-initializer-microservice.mdc`** (📋 手动引用)
   - 数据初始化微服务开发规范
   - 微服务架构设计和实现规范
   - API 端点设计和监控调试
   - 单实例运行保证

3. **`mongodb-atomic-operations.mdc`** (📋 手动引用)
   - MongoDB 原子操作模式
   - 插入或忽略、条件更新
   - 避免并发竞态条件
   - 批量操作优化

4. **`global-menu-architecture.mdc`** (⚡ 自动应用)
   - 全局菜单架构规范
   - 菜单是系统资源（无 CompanyId）
   - 系统初始化创建，用户不可管理
   - 100% 动态加载，无静态后备

**关键改进**：
- ✅ 简化架构，移除分布式锁复杂性
- ✅ 数据初始化代码精简 87.5%
- ✅ 启动性能提升 58%-93%
- ✅ 单实例运行保证安全
- ✅ 统一菜单管理，权限精确控制

### 新增核心开发规范 (2025-01-16)

针对代码质量、性能优化和团队协作新增重要规则：

5. **`code-review-quality.mdc`** (📁 应用于代码文件)
   - 代码审查和质量保证规范
   - 安全性检查清单
   - 多租户数据隔离检查
   - 代码质量检查流程
   - 自动化检查工具配置

6. **`performance-optimization.mdc`** (📁 应用于代码文件)
   - 性能优化和监控规范
   - 后端数据库查询优化
   - 前端 React 组件优化
   - 性能监控和指标
   - 移动端性能优化

7. **`security-best-practices.mdc`** (📁 应用于代码文件)
   - 安全最佳实践和漏洞防护
   - 认证和授权安全
   - 输入验证和防护
   - 数据安全和加密
   - 前端安全防护

8. **`aspire-microservices.mdc`** (📁 应用于配置文件)
   - .NET Aspire 微服务架构规范
   - 服务编排和生命周期管理
   - 监控和可观测性
   - 配置管理和部署
   - 微服务开发检查清单

9. **`mobile-development-best-practices.mdc`** (📁 应用于移动端文件)
   - React Native 和 Expo 最佳实践
   - Expo Router 路由系统
   - 主题化和样式管理
   - 性能优化和平台适配
   - 用户体验优化

10. **`design-patterns-architecture.mdc`** (📁 应用于代码文件)
    - 设计模式和架构原则规范
    - SOLID 原则应用
    - 常见设计模式实现
    - 架构模式选择
    - 前端设计模式

11. **`git-workflow-version-control.mdc`** (📁 应用于文档文件)
    - Git 工作流和版本控制规范
    - 分支策略和命名规范
    - 提交信息规范
    - Pull Request 规范
    - 代码审查流程

**新增规则特点**：
- ✅ 覆盖代码质量全生命周期
- ✅ 提供详细的检查清单和最佳实践
- ✅ 包含丰富的代码示例和反例
- ✅ 支持自动化和工具集成
- ✅ 注重团队协作和知识传承

## 🔧 规则文件格式

每个规则文件包含：

### Frontmatter 元数据
```yaml
---
# 选项 1: 始终应用
alwaysApply: true

# 选项 2: 文件匹配模式
globs: *.ts,*.tsx

# 选项 3: 手动引用描述
description: TypeScript 编码规范和最佳实践
---
```

### Markdown 内容结构
- 🎯 概述和技术栈
- 🏗️ 架构和模式
- ✅ 推荐做法（带代码示例）
- ❌ 避免的做法
- 🔧 最佳实践
- 📚 相关资源

## 📝 维护建议

### 更新规则
1. **及时同步** - 代码规范变化时同步更新规则
2. **添加示例** - 基于实际项目代码提供示例
3. **保持一致** - 确保规则与实际代码风格一致
4. **测试验证** - 更新后验证规则是否正确触发

### 编写规则
1. **明确目标** - 规则应该解决具体问题
2. **结构清晰** - 使用标准的 Markdown 结构
3. **示例丰富** - 提供正反面代码示例
4. **类型安全** - 使用 TypeScript 类型定义

## 🚀 扩展规则

添加新规则的步骤：

1. **创建文件**
   ```bash
   touch .cursor/rules/new-rule.mdc
   ```

2. **添加 Frontmatter**
   ```yaml
   ---
   globs: *.example.ts
   description: 新规则描述
   ---
   ```

3. **编写内容**
   - 使用标准模板
   - 添加代码示例
   - 提供最佳实践

4. **更新 README**
   - 在本文件中添加规则说明
   - 更新规则统计

5. **测试验证**
   - 创建测试文件验证规则触发
   - 确认 AI 能正确理解规则

## 🎓 学习路径

### 新手入门
1. 阅读 `project-structure.mdc` 了解项目架构
2. 学习 `typescript-coding-standards.mdc` 掌握代码规范
3. 参考 `react-components.mdc` 开始组件开发

### 前端开发
1. `antd-pro-umi.mdc` - 管理后台开发
2. `mobile-development.mdc` - 移动端开发
3. `theme-system.mdc` - 主题定制
4. `state-management.mdc` - 状态管理

### 后端开发
1. `csharp-backend.mdc` - C# 开发规范
2. `baseapicontroller-standard.mdc` - 控制器标准
3. `backend-service-pattern.mdc` - 服务层模式
4. `database-initialization.mdc` - 数据库初始化
5. `multi-tenant-development.mdc` - 多租户开发
6. `api-integration.mdc` - API 设计
7. `auth-system.mdc` - 认证授权

### 进阶主题
1. `data-initializer-microservice.mdc` - 数据初始化微服务
2. `mongodb-atomic-operations.mdc` - 原子操作
3. `error-handling.mdc` - 错误处理
4. `testing-standards.mdc` - 测试规范
5. `deployment.mdc` - 部署运维

## 📚 相关资源

- [Cursor Rules 文档](https://docs.cursor.com/context/rules-for-ai)
- [项目 GitHub 仓库](https://github.com/your-repo)
- [.NET Aspire 文档](https://learn.microsoft.com/aspnet/core/aspire/)
- [Ant Design Pro 文档](https://pro.ant.design)
- [数据库初始化优化报告](mdc:docs/optimization/DATABASE-INITIALIZATION-OPTIMIZATION.md)
- [分布式锁移除总结报告](mdc:docs/reports/DISTRIBUTED-LOCK-REMOVAL-SUMMARY.md)

---

💡 **提示**: 这些规则由项目团队维护，确保 Cursor AI 能够提供准确、一致的代码建议。如有问题或建议，欢迎提出！

**最后更新**: 2025-01-16 (v5.2 - 合并清理重复规则，优化规则结构，规则总数精简至 31 个)
