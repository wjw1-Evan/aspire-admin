# Admin 前端规则

> 本目录包含 React/Ant Design Pro/UmiJS 管理后台的详细规范。

## 文件索引

| 文件 | 内容 |
|------|------|
| [`01-路由与菜单.md`](./01-路由与菜单.md) | 路由配置、菜单多语言 |
| [`02-服务层封装.md`](./02-服务层封装.md) | request 封装、ApiResponse 处理 |
| [`03-页面与组件结构.md`](./03-页面与组件结构.md) | 页面骨架、组件拆分、密码本模板 |
| [`04-TypeScript类型安全.md`](./04-TypeScript类型安全.md) | 禁止 any、类型定义规范 |
| [`05-页面风格统一规范.md`](./05-页面风格统一规范.md) | 页面容器、统计卡片、表格、操作列 |

## 快速参考

### 请求封装

```tsx
// ✅ 正确：使用统一 request
import { request } from '@umijs/max';
const response = await request('/api/users', { method: 'GET' });

// ❌ 禁止：直接 fetch
fetch('/api/users').then(res => res.json());
```

### 类型安全

```tsx
// ✅ 正确：定义明确类型
interface TaskFormValues {
  taskName: string;
  priority?: number;
}
const handleSubmit = async (values: TaskFormValues) => {};

// ❌ 禁止：使用 any
const handleSubmit = async (values: any) => {};
```

### 统一 API 响应类型

```tsx
// ✅ 正确：使用统一类型
import type { ApiResponse, PagedResult } from '@/types/unified-api';

export async function getUsers(params: UserQueryParams) {
  return request<ApiResponse<PagedResult<User>>>('/api/users/list', {
    method: 'GET',
    params,
  });
}

// ✅ 正确：分页数据访问
const response = await getUsers(params);
if (response.success && response.data) {
  const paged = response.data as PagedResult<User>;
  return {
    data: paged.queryable,
    total: paged.rowCount,
    success: true,
  };
}
```

### 页面结构

```tsx
// ✅ 正确：统一页面结构
<PageContainer style={{ paddingBlock: 12 }}>
  <Card> {/* 统计卡片 */} </Card>
  <SearchBar /> {/* 搜索表单 */ }
  <Table /> {/* 数据表格 - 使用原生组件 */}
</PageContainer>
```

## 基准模板

`src/pages/password-book` 是所有列表页面的**基准模板**，新建模块时请参考其结构：

```
src/pages/xxx/
├── index.tsx              # 主页面（≤400行）
├── types.ts               # 类型定义
└── components/            # 仅复用组件才建立
    └── XxxForm.tsx
```

核心要点：
- 使用原生 `Table` 组件，不使用封装的 CrudTable
- 操作列在 `columns` 中直接定义，删除用 `modal.confirm`
- 统计卡片用数组 + `map` 渲染
- 类型定义就近放在页面目录的 `types.ts`

## 统一类型来源

所有 API 相关类型统一定义在 `@/types/unified-api.ts`：

```typescript
// 统一 API 响应格式
export interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  data?: T;
  errors?: any;
  details?: any;
  timestamp?: string;
  traceId?: string;
}

// 分页响应格式
export interface PagedResult<T> {
  queryable: T[];
  currentPage: number;
  pageSize: number;
  rowCount: number;
  pageCount: number;
}
```

## 相关文档

- [`00-通用原则.md`](../00-通用原则.md) - 核心架构原则
- [`00-分页规范.md`](../00-分页规范.md) - 统一分页规范（前后端通用）
- [`AGENTS.md`](../../../AGENTS.md) - 项目总纲与 AI 交互指南
- [`backend/04-分页处理规范.md`](../backend/04-分页处理规范.md) - 后端分页规范
