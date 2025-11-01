# Aspire Admin 项目文档索引

## 🆕 规则优化更新 (2025-01-16)

### 规则合并和清理
- **移动端开发规范** - 合并 `mobile-development.mdc` 和 `mobile-development-best-practices.mdc`
- **多租户开发规范** - 合并 `multi-tenant-development.mdc` 和 `multi-tenant-data-isolation.mdc`
- **后端开发规范** - 合并 `csharp-backend.mdc` 和 `backend-service-pattern.mdc`
- **错误处理规范** - 合并 `error-handling.mdc` 和 `error-messages-usage.mdc`

### 优化结果
- **规则总数**: 从 34 个精简至 31 个
- **重复内容**: 完全消除重复和重叠
- **结构优化**: 提高规则的可读性和维护性
- **覆盖范围**: 保持完整的全栈开发规范覆盖

## 🆕 新增规则文档 (2025-01-16)

### 核心开发规范
- [代码审查和质量保证规范](.cursor/rules/code-review-quality.mdc) - 代码审查流程和质量检查清单
- [性能优化和监控规范](.cursor/rules/performance-optimization.mdc) - 全栈性能优化最佳实践
- [安全最佳实践和漏洞防护](.cursor/rules/security-best-practices.mdc) - 安全开发规范和防护措施

### 架构和设计模式
- [.NET Aspire 微服务架构规范](.cursor/rules/aspire-microservices.mdc) - 微服务架构和编排规范
- [设计模式和架构原则规范](.cursor/rules/design-patterns-architecture.mdc) - SOLID 原则和设计模式应用
- [React Native 和 Expo 移动端开发最佳实践](.cursor/rules/mobile-development-best-practices.mdc) - 移动端开发规范

### 工程规范
- [Git 工作流和版本控制规范](.cursor/rules/git-workflow-version-control.mdc) - Git 工作流和团队协作规范

## 📚 文档组织结构

本项目的所有说明文档都存放在 `docs` 目录下，按类别分类管理。

## 📁 目录结构

```
docs/
├── features/          # 新功能文档
├── bugfixes/         # 问题修复文档
├── reports/          # 报告和总结
├── optimization/     # 优化相关文档
├── refactoring/      # 重构文档
├── middleware/       # 中间件文档
├── soft-delete/      # 软删除相关文档
├── archived/         # 归档文档（已废弃）
│   ├── permissions-v5/  # v5.0 CRUD权限系统文档归档
│   └── versions/        # 历史版本文档归档
└── INDEX.md          # 本文档索引
```

## 🔒 安全相关文档

### 安全审计报告
- [**安全漏洞修复完成总结**](reports/SECURITY-FIXES-COMPLETE-SUMMARY.md) - **新增** 2025-10-19 已修复10个漏洞(83%) ⭐ **最新**
- [系统安全审计最终报告](reports/SECURITY-AUDIT-FINAL-REPORT.md) - 2025年1月安全审计完整报告 ⭐ **重要**
- [后端代码安全审查](reports/BACKEND-SECURITY-REVIEW.md) - 后端代码安全质量评估
- [前端代码安全审查](reports/FRONTEND-SECURITY-REVIEW.md) - 前端代码安全质量评估
- [CORS配置安全审查](reports/CORS-CONFIGURATION-REVIEW.md) - 跨域配置安全分析

### 安全相关
- [Token存储方案评估](reports/TOKEN-STORAGE-EVALUATION.md) - JWT Token存储方案对比分析

### 全面检查报告
- [**重复代码检查报告**](reports/DUPLICATE-CODE-ANALYSIS.md) - **新增** - 代码重复模式分析和优化建议 ⭐ **最新**
- [**菜单权限模块检查报告 2025**](reports/MENU-PERMISSION-MODULE-CHECK-2025.md) - **新增** - 菜单权限系统设计实现全面检查 ⭐ **最新**
- [Service BaseService 继承检查报告](reports/SERVICE-BASESERVICE-INHERITANCE-CHECK.md) - **新增** - 服务类继承BaseService规范化检查 ⭐ **架构优化**
- [全面代码库深度检查报告](bugfixes/COMPREHENSIVE-CODE-REVIEW-REPORT.md) - **新增** - 全栈深度检查，发现并修复多个关键问题
- [补充深度检查报告](bugfixes/SUPPLEMENTARY-DEEP-CHECK-REPORT.md) - **新增** - 补充安全审计和代码质量检查
- [最终全面检查总结报告](bugfixes/FINAL-COMPREHENSIVE-CHECK-SUMMARY.md) - **新增** - 最终检查总结，系统生产就绪
- [未完成功能检查报告](reports/UNCOMPLETED-FEATURES-ANALYSIS.md) - **新增** - 未完成功能和待实现功能分析 ⭐ **重要**
- [验证码系统检查验证报告](reports/CAPTCHA-SYSTEM-VERIFICATION-REPORT.md) - **新增** - 验证码生成和验证逻辑检查报告 ⭐ **系统检查**
- [验证码数据库操作检查报告](reports/CAPTCHA-DATABASE-OPERATIONS-VERIFICATION-REPORT.md) - **新增** - 验证码数据库操作逻辑深度检查 ⭐ **数据库检查**
- [数据库操作工厂原子操作优化](features/DATABASE-ATOMIC-OPERATIONS-OPTIMIZATION.md) - **新增** - 数据库操作工厂原子操作优化实现 ⭐ **性能优化**
- [**数据库操作工厂完全原子化优化完成报告**](reports/DATABASE-FACTORY-FULL-ATOMIC-OPTIMIZATION-COMPLETE.md) - 数据工厂完全原子化优化完成报告 ⭐ **新增**
- [数据库操作工厂原子操作全面实施报告](reports/DATABASE-ATOMIC-OPERATIONS-COMPLETE-IMPLEMENTATION.md) - **新增** - 原子操作全面实施完成报告 ⭐ **实施完成**
- [**数据工厂日志功能实施完成报告**](reports/DATABASE-FACTORY-LOGGING-IMPLEMENTATION-COMPLETE.md) - **新增** - 数据工厂日志功能实施完成报告 ⭐ **最新**
- [**数据工厂查询语句日志功能完成报告**](reports/DATABASE-FACTORY-QUERY-LOGGING-COMPLETE.md) - **新增** - 查询语句日志功能实现总结 ⭐ **查询日志**
- [**集合名称修复完成报告**](reports/COLLECTION-NAME-FIX-COMPLETE.md) - **新增** - 集合名称规范化和自定义集合名称支持 ⭐ **数据库优化**
- [**重复集合名称修复报告**](reports/DUPLICATE-COLLECTION-NAMES-FIX.md) - **新增** - 修复 captchaimages 和 captcha_images 重复问题 ⭐ **最新**
- [**菜单初始化问题修复报告**](reports/MENU-INITIALIZATION-FIX.md) - **新增** - 修复 Menu 模型字段映射不一致导致的初始化失败 ⭐ **最新**
- [**Menu 模型序列化问题修复完成报告**](reports/MENU-MODEL-SERIALIZATION-FIX-COMPLETE.md) - **新增** - 完整的 Menu 模型序列化问题修复总结 ⭐ **最新**

### 漏洞修复
- [系统安全漏洞修复总结](bugfixes/SECURITY-VULNERABILITIES-FIX-SUMMARY.md) - 所有安全漏洞修复总结
- [系统安全漏洞修复报告](bugfixes/SECURITY-VULNERABILITIES-FIX.md) - 详细漏洞修复报告
- [API权限验证修复](bugfixes/API-PERMISSION-VERIFICATION-FIX.md) - 修复API权限验证问题
- [关键登录修复总结](bugfixes/CRITICAL-LOGIN-FIX-SUMMARY.md) - 登录系统关键修复

### 安全配置
- [JWT密钥配置指南](deployment/JWT-SECRET-CONFIGURATION.md) - JWT密钥安全配置详细指南 ⭐ **部署必读**
- [安全部署检查清单](deployment/SECURITY-CHECKLIST.md) - 生产环境安全部署检查清单
- [安全配置快速指南](deployment/SECURITY-SETUP.md) - 开发和生产环境安全配置快速指南
- [安全快速开始](deployment/SECURITY-QUICK-START.md) - 30秒快速安全配置指南 ⭐ **快速开始**

### 安全功能
- [**API速率限制配置指南**](features/RATE-LIMITING-CONFIGURATION.md) - **新增** 完整的速率限制实施方案 ⭐ **推荐**
- [Rate Limiting实施方案](features/RATE-LIMITING-IMPLEMENTATION.md) - 请求频率限制防暴力破解方案

## 🚀 快速导航

### 📋 快速查找
- [**快速导航指南**](QUICK-NAVIGATION.md) - 按需求、角色、功能快速查找文档 ⭐ **推荐**

### 新手入门
- [**如何查看 API 文档**](features/HOW-TO-VIEW-API-DOCS.md) - 快速访问 Scalar API 文档指南 ⭐ **新手必读**
- [**Docker 日志配置快速验证**](features/DOCKER-LOGGING-QUICK-START.md) - Docker 容器日志输出验证指南 ⭐ **调试必读**
- [**用户注册全权限初始化验证**](features/USER-FULL-PERMISSIONS-INITIALIZATION.md) - 验证用户注册时权限初始化的完整性 ⭐ **权限验证**
- [**API权限验证修复**](bugfixes/API-PERMISSION-VERIFICATION-FIX.md) - 修复MongoDB集合名称不一致导致的权限验证失败 ⭐ **重要修复**
- [**用户列表API空数据修复**](bugfixes/USER-LIST-API-EMPTY-DATA-FIX.md) - 修复用户查询字段错误导致的空数据问题 ⭐ **数据查询修复**
- [**v5.0 优化完成**](reports/V5-OPTIMIZATION-COMPLETE.md) - v5.0 后端架构优化完成
- [**移除全局数据初始化**](reports/REMOVE-GLOBAL-DATA-INITIALIZATION.md) - 修复多租户数据隔离漏洞
- [**业务逻辑检查与修复**](reports/BUSINESS-LOGIC-REVIEW-AND-FIXES.md) - v3.0 业务流程优化报告
- [**用户加入流程实施**](reports/USER-JOIN-FLOW-IMPLEMENTATION.md) - 用户注册流程修复
- [**v3.0 多租户实施完成**](reports/MULTI-TENANT-IMPLEMENTATION-COMPLETE.md) - 多企业多用户管理系统实施报告
- [业务逻辑修复总结](reports/BUSINESS-LOGIC-FIXES-SUMMARY.md) - v3.0 业务逻辑修复清单
- [第二轮修复总结](reports/SECOND-ROUND-FIXES-SUMMARY.md) - v3.0 第二轮业务逻辑修复总结

### v2.0 版本更新（已归档）
- [v2.0 更新总结](archived/versions/v2.0-UPDATES-SUMMARY.md) - 完整的 v2.0 版本更新说明（已归档）

### v3.0 版本更新（最新）
- [v3.0 最终报告](optimization/OPTIMIZATION-V3-FINAL.md) - 完整的最终报告
- [代码质量改进指南](optimization/CODE-QUALITY-IMPROVEMENTS.md) - 最佳实践指南
- [组件优化指南](optimization/COMPONENT-OPTIMIZATION-GUIDE.md) - 组件拆分和性能优化

### v3.1 版本更新（多企业隶属架构）
- [v3.1 快速开始](features/QUICK-START-V3.1.md) - v3.1 多企业隶属架构快速上手指南 ⭐ **推荐**
- [v3.1 架构变更提案](features/V3.1-ARCHITECTURE-CHANGE-PROPOSAL.md) - 多企业隶属架构设计方案
- [多租户系统说明](features/MULTI-TENANT-SYSTEM.md) - 多租户系统完整文档
- [v3.1 实施完成](reports/V3.1-IMPLEMENTATION-COMPLETE.md) - 完整实施报告
- [v3.1 最终总结](reports/V3.1-FINAL-SUMMARY.md) - 项目完成总结

### 核心功能

#### 多租户系统 ⭐ **v3.0 新增**
- [多租户快速开始](features/MULTI-TENANT-QUICK-START.md) - 5分钟快速上手指南 ⭐ **推荐**
- [多租户系统完整文档](features/MULTI-TENANT-SYSTEM.md) - 多企业多用户管理系统
- [企业切换和加入功能](features/COMPANY-SWITCHER-AND-JOIN.md) - 企业切换器和加入企业申请 ⭐ **新增**
- [用户加入指南](features/USER-ONBOARDING-GUIDE.md) - 用户如何加入企业 ⭐ **重要**
- [用户加入流程设计](features/USER-JOIN-COMPANY-DESIGN.md) - 技术设计方案
- [API 端点汇总](features/API-ENDPOINTS-SUMMARY.md) - 完整的 API 列表
- [API 检查报告](features/API-CHECK-REPORT.md) - API 测试状态
- [多租户变更日志](features/MULTI-TENANT-CHANGELOG.md) - v3.0 变更记录

#### 通知系统
- [欢迎通知功能](features/WELCOME-NOTICE-FEATURE.md) - v2.0 欢迎通知
- [标记未读功能](features/NOTICE-MARK-UNREAD-FEATURE.md) - 单条通知标记
- [通知详情模态框](features/NOTICE-DETAIL-MODAL-FEATURE.md) - 详情查看功能

#### 数据初始化微服务 ⭐ **新增**
- [数据初始化微服务](features/DATA-INITIALIZER-MICROSERVICE.md) - 专门负责数据初始化工作的微服务架构 ⭐ **最新**
- [数据库操作工厂使用指南](features/DATABASE-OPERATION-FACTORY-GUIDE.md) - 数据库操作工厂使用指南 ⭐ **新增**
- [数据库操作工厂迁移指南](features/DATABASE-FACTORY-MIGRATION.md) - 从 BaseRepository 迁移到工厂的详细指南 ⭐ **新增**
- [**数据工厂日志功能**](features/DATABASE-FACTORY-LOGGING-FEATURE.md) - **新增** - 数据工厂详细日志输出功能，实时监控数据操作 ⭐ **最新**
- [自定义集合名称支持功能](features/CUSTOM-COLLECTION-NAME-SUPPORT.md) - **新增** - 支持自定义 MongoDB 集合名称的规范命名 ⭐ **数据库优化**

#### API 文档系统 ⭐ **新增**
- [API 文档系统](features/API-ENDPOINT-SUMMARY-FEATURE.md) - 完整的 API 接口文档和 Scalar 集成 ⭐ **推荐**
- [OpenAPI + Scalar 规范](.cursor/rules/openapi-scalar-standard.mdc) - 移除 Swagger，使用 .NET 9 原生 OpenAPI 和 Scalar ⭐ **强制规范**
- [Scalar API 文档修复](bugfixes/SCALAR-API-REFERENCE-FIX.md) - 修复 API 文档无法显示问题 ⭐ **最新**
- [通知类型修复](bugfixes/NOTICE-TYPE-MISMATCH-FIX.md) - 类型序列化问题
- [软删除过滤修复](bugfixes/NOTICE-SOFT-DELETE-FIX.md) - 查询过滤问题
- [通知调试指南](bugfixes/NOTICE-DEBUG-GUIDE.md) - 常见问题排查

#### 帮助系统
- [**统一错误拦截器**](features/UNIFIED-ERROR-INTERCEPTOR.md) - 集中式错误处理系统 ⭐ **最新**
- [帮助模块功能](features/HELP-MODULE-FEATURE.md) - 系统内帮助模块
- [**getUserStatistics API 函数缺失修复**](bugfixes/GET-USER-STATISTICS-API-FIX.md) - 修复欢迎页面统计数据加载问题 ⭐ **最新**
- [帮助模块调试](bugfixes/HELP-MODAL-DEBUG.md) - 问题排查指南
- [**帮助系统版本合并更新**](features/HELP-VERSION-MERGE-UPDATE.md) - 版本信息整合优化 ⭐ **最新**

#### 用户界面优化
- [**UI 主题升级和日间/夜间模式切换**](features/UI-THEME-UPGRADE.md) - 现代化主题系统和主题切换功能 ⭐ **最新**
- [**欢迎页面重新设计**](features/WELCOME-PAGE-REDESIGN.md) - 现代化企业级管理平台欢迎页面

#### 系统监控 ⭐ **新增**
- [**WMI直接读取系统内存信息**](features/WMI-MEMORY-READING-FEATURE.md) - 使用WMI直接读取系统内存，不再依赖估算 ⭐ **最新**
- [**内存使用率图表显示改进**](features/MEMORY-CHART-DISPLAY-IMPROVEMENT.md) - 增强图表显示内存使用量和百分比信息
- [**Admin 端系统信息显示功能**](features/ADMIN-SYSTEM-INFO-DISPLAY.md) - 系统资源监控和显示功能
- [**内存使用率曲线图功能**](features/MEMORY-USAGE-CHART-FEATURE.md) - 实时内存监控曲线图实现

#### 路由和认证
- [**路由守卫增强**](features/ROUTE-GUARD-ENHANCEMENT.md) - Token有效性验证和自动跳转 ⭐ **最新**
- [**登录错误消息重复修复**](bugfixes/LOGIN-ERROR-MESSAGE-DUPLICATION-FIX.md) - 修复错误提示重复显示问题

#### 用户注册
- [**用户全权限初始化**](features/USER-FULL-PERMISSIONS-INITIALIZATION.md) - 确保用户拥有企业全部权限的完整方案 ⭐ **最新**
- [**用户注册数据完整性检查指南**](bugfixes/USER-REGISTRATION-INTEGRITY-CHECK-GUIDE.md) - 用户注册问题排查和修复指南 ⭐ **新增**
- [**MongoDB索引多租户修复**](bugfixes/MONGODB-INDEX-MULTI-TENANT-FIX.md) - 修复索引不支持多租户问题 ⭐ **最新**
- [**MongoDB事务错误修复**](bugfixes/MONGODB-TRANSACTION-FIX.md) - 修复单机模式不支持事务问题
- [**MongoDB事务移除总结**](bugfixes/MONGODB-TRANSACTION-REMOVAL-SUMMARY.md) - 完全移除MongoDB事务支持，改用错误回滚机制 ⭐ **最新**
- [**删除企业注册页面**](reports/REMOVE-COMPANY-REGISTRATION-PAGE.md) - 简化注册流程，统一使用用户注册

#### 权限系统 (v6.0)
- [**菜单级权限使用指南**](features/MENU-LEVEL-PERMISSION-GUIDE.md) - v6.0 菜单级权限系统使用指南 ⭐ **最新**
- [**菜单级权限重构**](refactoring/MENU-LEVEL-PERMISSION-REFACTORING.md) - v6.0 权限系统架构重构文档 ⭐ **重要**
- [**v6.0 菜单权限快速入门**](features/MENU-PERMISSION-V6-README.md) - v6.0 菜单级权限系统快速入门指南 ⭐ **推荐**
- [**v6.0 重构检查清单**](refactoring/V6-REFACTORING-CHECKLIST.md) - v6.0 重构完成状态检查清单
- [**v6.0 重构完成总结**](reports/V6-REFACTORING-SUMMARY.md) - v6.0 菜单级权限重构完成报告
- [**数据库清理指南**](optimization/DATABASE-CLEANUP-GUIDE.md) - v6.0 权限系统重构后数据库清理指南

> ⚠️ **v5.0 CRUD权限系统已完全废弃**  
> 旧的权限文档已归档至 [archived/permissions-v5/](archived/permissions-v5/) 目录。

#### 用户管理
- [用户日志系统](features/USER-LOG-IMPLEMENTATION.md) - 完整的用户活动记录和审计功能 ⭐ **推荐**
- [用户控制器路由修复](bugfixes/USER-CONTROLLER-ROUTES-FIX.md) - 路由问题
- [用户软删除修复](bugfixes/USER-ISDELETED-FIX.md) - IsDeleted 字段
- [用户统计管理员数量修复](bugfixes/USER-STATISTICS-ADMIN-COUNT-FIX.md) - 管理员统计修复

#### 验证码系统
- [验证码解决方案](features/CAPTCHA-SOLUTION.md) - 验证码功能
- [本地验证码实现](features/LOCAL-CAPTCHA-IMPLEMENTATION.md) - 本地验证码
- [前端验证码更新](features/FRONTEND-CAPTCHA-UPDATE.md) - 前端集成
- [**验证码 ID 字段修复**](bugfixes/IMAGE-CAPTCHA-ID-FIX.md) - **新增** - 修复 FindOneAndReplace 操作中 _id 不可修改错误 ⭐ **最新**

#### 软删除机制
- [软删除快速开始](soft-delete/SOFT-DELETE-QUICK-START.md) - 快速入门
- [软删除实现](soft-delete/SOFT-DELETE-IMPLEMENTATION.md) - 完整实现
- [软删除感知初始化](soft-delete/SOFT-DELETE-AWARE-INITIALIZATION.md) - 初始化
- [软删除字段修复](soft-delete/SOFT-DELETE-FIELD-FIX.md) - 字段问题

### 开发规范

#### 后端开发
- [BaseApiController 标准化](features/BASEAPICONTROLLER-STANDARDIZATION.md) - 控制器规范
- [**ActivityLogMiddleware 设计评估**](middleware/ACTIVITY-LOG-MIDDLEWARE-REVIEW.md) - **新增** - 活动日志中间件架构评估和改进建议 ⭐ **最新**
- [**UserActivityLogService 设计说明**](middleware/ACTIVITY-LOG-SERVICE-DESIGN.md) - **新增** - 活动日志服务设计决策说明 ⭐ **最新**
- [中间件重构分析](refactoring/MIDDLEWARE-REFACTORING-ANALYSIS.md) - 中间件设计
- [中间件重构完成](refactoring/MIDDLEWARE-REFACTORING-COMPLETE.md) - 重构总结
- [自动活动日志中间件](middleware/AUTO-ACTIVITY-LOG-MIDDLEWARE.md) - 日志中间件

#### 前端开发
- [Admin 布局标准](features/ADMIN-LAYOUT-STANDARD.md) - 布局规范
- [多语言支持](features/MULTILINGUAL-SUPPORT.md) - 国际化

### 问题修复

#### Bug 修复
- [**我的活动数据记录不完整修复**](bugfixes/ACTIVITY-LOG-INCOMPLETE-FIX.md) - **新增** - 修复"我的活动"页面缺少很多操作记录的 Bug ⭐ **最新**
- [**多租户过滤失效修复**](bugfixes/MULTI-TENANT-FILTER-BUG-FIX.md) - 修复角色管理显示所有企业角色的 Bug
- [**表格排序功能修复**](bugfixes/TABLE-SORT-FUNCTION-FIX.md) - 修复用户管理页面排序功能无法正常使用
- [**我的活动页面多租户过滤修复**](bugfixes/MY-ACTIVITY-MULTI-TENANT-FILTER-FIX.md) - 修复我的活动页面未按当前企业过滤的问题
- [**角色分配全部菜单权限后用户无法访问模块的修复**](bugfixes/ROLE-ALL-MENUS-PERMISSION-FIX.md) - **新增** - 修复分配全部菜单权限后用户无法访问模块的问题
- [**角色菜单权限更新导致用户无法访问模块的修复**](bugfixes/ROLE-MENU-PERMISSION-FIX.md) - **新增** - 修复修改角色菜单权限后用户无法访问任何模块的问题
- [**企业切换JWT Token未更新修复**](bugfixes/COMPANY-SWITCH-TOKEN-FIX.md) - **新增** - 修复企业切换后JWT Token未重新生成的问题
- [**新注册用户菜单获取403错误修复**](bugfixes/NEW-USER-MENU-403-FIX.md) - **新增** - 修复新用户注册后无法获取菜单的403错误
- [**Menu 软删除不一致性修复**](bugfixes/MENU-SOFT-DELETE-INCONSISTENCY-FIX.md) - **新增** - 修复用户注册时菜单查询返回0结果的问题

#### 逻辑审查
- [**多企业关联逻辑审查报告**](reports/MULTI-COMPANY-ASSOCIATION-LOGIC-REVIEW.md) - **新增** - 用户与多企业关联逻辑的全面审查
- [**macOS vm_stat页面大小解析修复**](bugfixes/MACOS-PAGE-SIZE-PARSING-FIX.md) - **新增** - 修复vm_stat页面大小解析导致的内存计算错误 ⭐ **最新**
- [**macOS原生内存获取修复**](bugfixes/MACOS-NATIVE-MEMORY-FIX.md) - 删除估算代码，使用系统原生方法获取实际内存
- [**macOS系统内存读取问题修复**](bugfixes/MACOS-MEMORY-READING-FIX.md) - 修复WMI在macOS上不工作的问题
- [**内存数值计算错误修复**](bugfixes/MEMORY-VALUES-CALCULATION-FIX.md) - 修复系统内存估算和计算逻辑
- [**内存使用率计算逻辑修复**](bugfixes/MEMORY-USAGE-CALCULATION-FIX.md) - 修复系统内存和进程内存计算错误
- [**删除图表恢复到原来的数据显示方式**](bugfixes/REMOVE-CHART-RESTORE-DISPLAY.md) - 删除图表组件恢复ResourceCard显示
- [**欢迎页面抖动问题修复**](bugfixes/WELCOME-PAGE-JITTER-FIX.md) - 修复useEffect依赖和性能优化问题
- [Welcome 页面 UsagePercent 错误修复](bugfixes/WELCOME-PAGE-USAGEPERCENT-FIX.md) - 修复系统资源监控 undefined 访问错误
- [系统资源显示问题排查](bugfixes/SYSTEM-RESOURCES-DISPLAY-DEBUG.md) - 系统资源监控显示问题调试 ⭐ **最新**
- [菜单国际化修复](bugfixes/BUGFIX-MENU-I18N.md) - 菜单 i18n
- [菜单权限弹窗国际化修复](bugfixes/MENU-PERMISSION-I18N-FIX.md) - 分配权限弹窗多语言支持
- [菜单标题字段缺失修复](bugfixes/MENU-TITLE-FIELD-FIX.md) - 菜单 Title 字段修复和数据迁移
- [路由修复](bugfixes/BUGFIX-ROUTES.md) - 路由问题
- [用户日志修复](bugfixes/BUGFIX-USER-LOG.md) - 日志问题
- [表格操作列修复](bugfixes/TABLE-ACTION-COLUMN-FIX.md) - 表格组件

#### 登录和安全修复
- [**移除重复错误提示修复**](bugfixes/REMOVE-DUPLICATE-ERROR-MESSAGES.md) - 修复 admin 端重复显示错误提示的问题 ⭐ **最新**
- [**Admin 端 401 错误提示修复**](bugfixes/ADMIN-401-ERROR-DISPLAY-FIX.md) - 修复 admin 端显示 401 错误提示的问题 ⭐ **最新**
- [紧急登录修复](bugfixes/CRITICAL-LOGIN-FIX-SUMMARY.md) - 登录安全漏洞修复报告 ⚠️ **重要**

#### API 修复
- [API 504 错误修复](reports/API-504-ERROR-FIX.md) - 网关超时问题
- [**Scalar API 文档修复**](bugfixes/SCALAR-API-REFERENCE-FIX.md) - 修复 API 文档无法显示问题 ⭐ **最新**

#### 编译和运行问题
- [**DataInitializer dotnet watch 模式支持**](bugfixes/DATAINITIALIZER-WATCH-MODE-FIX.md) - **新增** - 修复 dotnet watch 模式下 DataInitializer 无法停止的问题 ⭐ **最新**

### 重构文档
- [Cursor Rules 清理总结报告](reports/CURSOR-RULES-CLEANUP-SUMMARY.md) - 清理过时规则，简化架构指导 ⭐ **最新**
- [Cursor Rules 更新总结报告](reports/CURSOR-RULES-UPDATE-SUMMARY.md) - 更新开发规范与架构同步
- [分布式锁移除总结报告](reports/DISTRIBUTED-LOCK-REMOVAL-SUMMARY.md) - 简化数据初始化微服务架构
- [数据初始化微服务实施报告](reports/DATA-INITIALIZER-MICROSERVICE-IMPLEMENTATION.md) - 数据初始化微服务完整实施报告
- [后端重构完成](refactoring/BACKEND-REFACTORING-COMPLETE.md) - 后端重构总结
- [后端问题修复进度](refactoring/BACKEND-ISSUES-FIX-PROGRESS.md) - 修复进度
- [后端问题最终报告](refactoring/BACKEND-ISSUES-FINAL-REPORT.md) - 最终报告
- [重构最终检查](refactoring/REFACTORING-FINAL-CHECK.md) - 最终检查
- [重构总结](refactoring/REFACTORING-SUMMARY.md) - 重构总结

### 优化文档
- [**角色管理菜单权限合并优化**](optimization/ROLE-FORM-MENU-PERMISSION-MERGE.md) - **新增** - 将菜单权限集成到角色表单，提升用户体验 ⭐ **最新**
- [业务逻辑优化总结](optimization/BUSINESS-LOGIC-OPTIMIZATION-SUMMARY.md) - 业务优化
- [v3.0 优化最终报告](optimization/OPTIMIZATION-V3-FINAL.md) - v3.0 完整报告
- [代码清理报告](optimization/CODE-CLEANUP-REPORT.md) - 代码清理
- [**BaseService 简化重构报告**](optimization/BASESERVICE-SIMPLIFICATION.md) - BaseService 简化重构详细报告 ⭐ **最新**
- [**BaseService 完全删除报告**](optimization/BASESERVICE-COMPLETE-REMOVAL.md) - BaseService 完全删除和功能迁移总结 ⭐ **最新**
- [**v5.0 优化完成摘要**](optimization/OPTIMIZATION-V5-SUMMARY.md) - v5.0 架构优化总结 ⭐ **最新**
- [**v5.0 优化前后对比**](optimization/V5-BEFORE-AFTER-COMPARISON.md) - 代码对比展示 ⭐ **推荐**
- [**后端代码优化报告**](optimization/BACKEND-CODE-OPTIMIZATION-REPORT.md) - 后端架构优化详情 ⭐ **新增**
- [**后端代码冗余优化**](optimization/BACKEND-CODE-REFACTORING.md) - **新增** - ITenantContext 异步改造和代码优化总结 ⭐ **最新**
- [**ITenantContext 异步改造**](optimization/TENANT-CONTEXT-ASYNC-REFACTORING.md) - **新增** - ITenantContext 完全异步化改造，消除死锁风险 ⭐ **最新**
- [**DataInitializer 微服务自动停止优化**](optimization/DATA-INITIALIZER-AUTO-STOP.md) - **新增** - DataInitializer 微服务完成初始化后自动停止，避免资源浪费 ⭐ **推荐**
- [**基础组件使用指南**](optimization/BASE-COMPONENTS-GUIDE.md) - 基础组件开发指南 ⭐ **新增**
- [**Cursor Rules 使用指南**](optimization/CURSOR-RULES-GUIDE.md) - 代码规则配置说明 ⭐ **新增**
- [**Docker 日志配置优化**](optimization/DOCKER-LOGGING-CONFIGURATION.md) - Docker 容器日志输出配置 ⭐ **新增**

### 数据完整性
- [数据完整性检查](features/DATA-INTEGRITY-CHECK.md) - 数据检查机制

## 🎯 按功能查找

### 认证和授权
- BaseApiController 标准化
- 权限系统文档（完整系列）
- JWT 优化（v2.0 更新总结）

### 数据管理
- 软删除机制（完整系列）
- 数据完整性检查
- 用户日志系统

### 用户界面
- 通知系统（完整系列）
- 帮助模块
- 验证码系统
- 多语言支持
- Admin 布局标准

### 性能和安全
- v2.0 性能优化
- 安全加固
- 中间件架构
- 数据库索引

## 📖 文档编写规范

### 文件命名
- 使用大写和连字符：`FEATURE-NAME.md`
- 功能文档：`FEATURE-*.md`
- 修复文档：`BUGFIX-*.md` 或 `*-FIX.md`
- 报告文档：描述性名称

### 文档分类

| 类别 | 目录 | 用途 |
|------|------|------|
| **新功能** | `features/` | 新增功能的说明文档 |
| **问题修复** | `bugfixes/` | Bug 修复和问题排查 |
| **报告总结** | `reports/` | 项目报告和阶段总结 |
| **优化文档** | `optimization/` | 性能和业务逻辑优化 |
| **重构文档** | `refactoring/` | 代码重构相关文档 |
| **中间件** | `middleware/` | 中间件设计和实现 |
| **软删除** | `soft-delete/` | 软删除机制相关 |
| **归档文档** | `archived/` | 已废弃的历史文档 |

### 文档模板

```markdown
# 功能/修复标题

## 📋 功能概述/问题描述
简要说明

## ✨ 实现内容 / 🐛 问题原因
详细说明

## 🔧 解决方案
具体方案

## 📊 技术细节
技术实现

## ✅ 测试验证
测试方法

## 📚 相关文档
相关链接
```

## 🚫 文档存放规则

### ✅ 正确
- 功能文档 → `docs/features/`
- 问题修复 → `docs/bugfixes/`
- 项目报告 → `docs/reports/`
- 优化文档 → `docs/optimization/`
- 重构文档 → `docs/refactoring/`
- 中间件文档 → `docs/middleware/`
- 软删除文档 → `docs/soft-delete/`
- 归档文档 → `docs/archived/`

### ❌ 禁止
- 在项目根目录创建 `.md` 文件（除 README.md 外）
- 在代码目录创建通用文档（页面级 README 除外）
- 混乱的文档命名和分类

## 📝 文档维护

### 新增文档
1. 确定文档类别
2. 在对应目录创建文件
3. 使用规范的文件名
4. 更新本索引文件

### 更新文档
1. 直接修改对应文件
2. 更新修改日期
3. 如有重大变更，在文档顶部添加更新说明

### 归档文档
对于过时的文档：
1. 在文件顶部添加 `⚠️ 已过时` 标记
2. 说明被哪个文档替代
3. 或移动到 `docs/archived/` 目录

## 📊 最新报告

### 流程设计审查 ⭐ **新增** 2025-10-19
- [**流程设计全面审查报告**](reports/PROCESS-DESIGN-REVIEW.md) - **新增** 全面审查所有核心业务流程和系统架构设计 ⭐ **重要**
- [**紧急修复任务清单**](reports/CRITICAL-FIXES-REQUIRED.md) - **新增** P0和P1优先级问题修复计划 ⭐ **紧急**
- [**P0修复：UserCompany记录缺失**](bugfixes/P0-USER-COMPANY-RECORDS-FIX.md) - **新增** 企业注册缺少UserCompany记录修复 ✅ **已修复**
- [**新注册用户菜单为空修复**](bugfixes/EMPTY-MENUIDS-FIX.md) - **新增** 修复新注册用户角色 MenuIds 为空导致无法看到菜单的问题 ⭐ **最新**
- [**用户注册错误回滚支持**](features/USER-REGISTRATION-TRANSACTION-SUPPORT.md) - **新增** 为用户注册流程添加完整的错误回滚机制，确保数据一致性 ⭐ **最新**

### 设计问题修复
- [设计问题全面分析报告](reports/DESIGN-ISSUES-ANALYSIS.md) - 项目设计问题全面分析
- [P0 优先级设计问题修复完成报告](reports/P0-DESIGN-FIXES-COMPLETE.md) - P0 优先级问题修复完成

### 项目维护报告
- [**合并说明文档清理报告**](reports/DOCUMENTATION-CLEANUP-2025-01-16.md) - **新增** - 归档过渡性帮助系统更新文档 ⭐ **最新**
- [测试代码移除总结报告](reports/TEST-CODE-REMOVAL-SUMMARY.md) - **新增** - 测试代码清理完成报告
- [无用代码清理报告](reports/UNUSED-CODE-CLEANUP-SUMMARY.md) - **新增** - 无用代码清理完成报告
- [文档清理报告 2025-10-20](reports/DOCUMENTATION-CLEANUP-2025-10-20.md) - 历史版本文档归档

### 微服务优化
- [**DataInitializer 微服务自动停止功能实现报告**](reports/DATA-INITIALIZER-AUTO-STOP-IMPLEMENTATION.md) - **新增** - DataInitializer 微服务自动停止功能实现详情 ⭐ **推荐**
- [**Cursor Rules 更新总结报告**](reports/CURSOR-RULES-UPDATE-SUMMARY.md) - **新增** - Cursor Rules 更新总结，包含微服务自动停止模式规范 ⭐ **推荐**

## 🎉 总结

已完成：
- ✅ 移动根目录文档到 docs 相应子目录（v6.0 相关文档）
- ✅ 归档 v5.0 已废弃的 CRUD 权限系统文档
- ✅ 创建文档索引和导航
- ✅ 更新文档组织结构和分类规范
- ✅ 修复 P0 优先级设计问题
- ✅ 完成 v6.0 菜单级权限系统重构
- ✅ 统一认证系统和权限管理
- ✅ 简化数据库模型和状态管理

## 📋 最新状态 (2025-10-14)

### v6.0 权限系统重构完成
- **菜单级权限** 替代复杂的 CRUD 权限系统
- **文档整理** 过期内容归档，新文档规范组织
- **架构简化** 减少70%的权限相关代码

现在所有文档都井然有序，系统架构得到显著改善！

