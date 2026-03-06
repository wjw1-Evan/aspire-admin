# 新模块开发指南 (New Module Development Guide)

本指南介绍如何在 Aspire Admin Platform 中从零开始创建一个完整的业务模块。以“知识库 (Knowledge Base)”模块为例，涵盖后端、前端、数据初始化及多语言配置。

## 1. 后端开发 (Platform.ApiService)

### 1.1 创建实体模型 (Entity)
在 `Models/` 或其子目录下创建实体类。
- **要求**：必须继承 `MultiTenantEntity`（如果涉及租户隔离）或 `BaseEntity`。
- **示例**：`Models/Workflow/KnowledgeBase.cs`

### 1.2 定义与实现服务 (Service)
1. **接口**：在 `Services/` 下定义接口，定义 CRUD 操作。
2. **实现**：实现该接口，并注入 `IDataFactory<T>` 进行数据操作。
- **关键点**：使用 LINQ 表达式进行查询，严禁直连数据库驱动。
- **示例**：`IKnowledgeService.cs` 和 `KnowledgeService.cs`

### 1.3 创建控制器 (Controller)
在 `Controllers/` 下创建控制器，暴露 REST API。
- **要求**：必须继承 `BaseApiController`，返回 `ApiResponse<T>`。
- **示例**：`KnowledgeBaseController.cs`

---

## 2. 前端开发 (Platform.Admin)

### 2.1 创建 API 服务
在 `src/services/` 下创建对应的 TypeScript 服务文件。
- **示例**：`src/services/workflow/knowledge-base.ts`

### 2.2 开发管理页面
在 `src/pages/` 下创建页面组件。
- **建议**：使用 `PageContainer` 和 `ProTable/DataTable` 保持 UI 一致性。
- **示例**：`src/pages/workflow/knowledge-base/index.tsx`

---

## 3. 路由与菜单配置

### 3.1 注册路由
在 `config/routes.ts` 中添加新的路由项。

### 3.2 数据初始化 (Menus.json)
在 `Platform.DataInitializer/Menus.json` 中添加菜单种子数据。
- **目的**：确保系统初始化或重置时菜单能自动加载。

---

## 4. 多语言支持 (Localization)

在 `src/locales/zh-CN/pages.ts` (及其他语言文件) 中添加翻译键。
- **命名规范**：`pages.[module].[feature].[key]`
- **示例**：`pages.workflow.knowledgeBase.title`

---

## 5. 验证清单
- [ ] 后端编译通过，API 通过 Scalar/Swagger 可正常调用。
- [ ] 前端菜单显示正常，点击路由正确跳转。
- [ ] CRUD 操作流畅，租户 ID 自动过滤。
- [ ] 控制器日志正常记录操作行为。
