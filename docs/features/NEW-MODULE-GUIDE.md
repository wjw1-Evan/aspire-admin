# 新模块开发指南 (New Module Development Guide)

> 本指南介绍如何在 Aspire Admin Platform 中从零开始创建一个完整的业务模块。
> **前端开发标准请参考**：[密码本开发标准](../rules/frontend-admin/06-页面开发标准.md)

## 开发标准参考

**密码本模块** (`src/pages/password-book`) 是前端页面的开发标准参考：

```
src/pages/password-book/
├── index.tsx              # 主页面（≤200行，API 内联）
└── (无其他文件)            # 极简模式
```

**核心特点：**
- 使用 `ProTable` + `ModalForm`
- API 直接内联在页面中
- 子组件定义为内联函数
- 类型定义清晰，禁用 `any`

> 详细规范请参阅：[前端页面开发标准](../rules/frontend-admin/06-页面开发标准.md)

---

## 1. 后端开发 (Platform.ApiService)

### 1.1 创建实体模型 (Entity)
在 `Models/` 或其子目录下创建实体类。
- **要求**：必须继承 `MultiTenantEntity`（如果涉及租户隔离）或 `BaseEntity`。
- **示例**：`Models/Workflow/KnowledgeBase.cs`

### 1.2 定义与实现服务 (Service)
1. **接口**：在 `Services/` 下定义接口，定义 CRUD 操作。
2. **实现**：实现该接口，并注入 `DbContext` 进行数据操作。
- **关键点**：使用 LINQ 表达式进行查询，严禁直连数据库驱动（禁止 IMongoCollection/IMongoDatabase）。
- **示例**：`IKnowledgeService.cs` 和 `KnowledgeService.cs`

### 1.3 创建控制器 (Controller)
在 `Controllers/` 下创建控制器，暴露 REST API。
- **要求**：必须继承 `BaseApiController`，返回 `ApiResponse<T>`。
- **示例**：`KnowledgeBaseController.cs`

---

## 2. 前端开发 (Platform.Admin)

### 2.1 创建 API 服务
> **简化原则**：功能简单的页面，API 直接内联在 `index.tsx` 中，不单独创建服务文件。

**推荐方式**（极简模式）：
```typescript
// src/pages/xxx/index.tsx
const api = {
  list: (params: PageParams) => request<ApiResponse<PagedResult<Entry>>>('/api/xxx/list', { params }),
  get: (id: string) => request<ApiResponse<Entry>>(`/api/xxx/${id}`),
  create: (data: EntryFormData) => request<ApiResponse<Entry>>('/api/xxx', { method: 'POST', data }),
  // ...
};
```

**传统方式**（复杂模块）：
```typescript
// src/services/xxx/api.ts
export async function getXxxList(params: PageParams) {
  return request<ApiResponse<PagedResult<Xxx>>('/api/xxx/list', { params });
}
```

### 2.2 开发管理页面
参考 [前端页面开发标准](../rules/frontend-admin/06-页面开发标准.md)

**标准页面结构**：
```tsx
// src/pages/xxx/index.tsx
import { ProTable, ModalForm, ProFormText } from '@ant-design/pro-table';
import { ApiResponse, PagedResult, PageParams } from '@/types/api-response';

// 类型定义
interface Entry { id: string; name: string; /* ... */ }

// API 内联
const api = { /* ... */ };

// 主组件
const XxxPage: React.FC = () => {
  const actionRef = useRef<ActionType>();
  const [state, setState] = useState({ /* ... */ });
  const set = (partial) => setState(prev => ({ ...prev, ...partial }));

  const columns = [/* 列配置 */];

  return (
    <PageContainer>
      <ProTable
        request={async (params) => {
          const res = await api.list(params);
          return { data: res.data?.queryable || [], total: res.data?.rowCount || 0, success: res.success };
        }}
        columns={columns}
      />
      <ModalForm key={state.editingId || 'create'} /* ... */ />
    </PageContainer>
  );
};
```

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

### 后端
- [ ] 后端编译通过
- [ ] API 通过 Swagger 可正常调用
- [ ] 返回统一 `ApiResponse<T>` 格式
- [ ] 支持分页参数 `page`、`pageSize`
- [ ] 支持排序参数 `sortBy`、`sortOrder`

### 前端
- [ ] 页面使用 `ProTable` + `ModalForm`
- [ ] API 使用 `ApiResponse<T>` 包装
- [ ] 类型定义清晰，禁用 `any`
- [ ] 编辑表单使用 `key` 强制重新挂载
- [ ] `npm run lint` 无错误

### 功能
- [ ] 列表展示正常（分页、排序、搜索）
- [ ] 新建/编辑功能正常
- [ ] 删除功能正常
- [ ] 详情查看功能正常

---

## 相关文档

- [前端页面开发标准](../rules/frontend-admin/06-页面开发标准.md)
- [TypeScript 类型安全](../rules/frontend-admin/04-TypeScript类型安全.md)
- [服务层封装规范](../rules/frontend-admin/02-服务层封装.md)
- [统一分页规范](../rules/00-分页规范.md)
