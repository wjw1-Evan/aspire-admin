# TypeScript 类型安全

> 本文档是前端类型安全规范。**统一分页规范请参阅**：[`00-分页规范.md`](../00-分页规范.md)

本文档重点强调所有类型定义需与后端 DTO 保持同步，禁止 any，接口类型与后端标准一致。

> **[强制]** 禁止使用 `any` 类型，确保代码的类型安全性。

---

## 1. 统一类型来源

### **[强制]** 所有 API 服务必须使用 ApiResponse、PagedResult、PageParams

所有 HTTP 请求必须使用以下三种统一类型，**禁止使用其他响应包装类型**：

```typescript
import type { ApiResponse, PagedResult, PageParams } from '@/types';
```

| 类型 | 用途 | 使用场景 |
|------|------|----------|
| `ApiResponse<T>` | 所有 HTTP 响应的统一包装 | **所有 API 请求** |
| `PagedResult<T>` | 分页数据响应 | **所有分页列表接口** |
| `PageParams` | 分页查询参数 | **所有分页请求参数** |

### 标准模板

```typescript
import { request } from '@umijs/max';
import type { ApiResponse, PagedResult, PageParams } from '@/types';
import type { User } from './types';

// ✅ 正确：分页接口
export async function getUsers(params: PageParams) {
  return request<ApiResponse<PagedResult<User>>>('/api/users/list', {
    method: 'POST',
    data: params,
  });
}

// ✅ 正确：普通接口
export async function getUser(id: string) {
  return request<ApiResponse<User>>(`/api/users/${id}`);
}

// ✅ 正确：创建/更新接口
export async function createUser(data: CreateUserRequest) {
  return request<ApiResponse<User>>('/api/users', {
    method: 'POST',
    data,
  });
}

// ✅ 正确：无返回数据的操作
export async function deleteUser(id: string) {
  return request<ApiResponse<void>>(`/api/users/${id}`, {
    method: 'DELETE',
  });
}

// ❌ 禁止：未使用 ApiResponse
export async function getUser(id: string) {
  return request<User>(`/api/users/${id}`);  // 错误！
}

// ❌ 禁止：自定义响应类型
export async function getUsers(params: PageParams) {
  return request<{ data: User[]; total: number }>('/api/users');  // 错误！
}
```

### 类型定义位置

所有 API 相关类型统一定义在 `@/types/api-response.ts`：

```typescript
// src/types/api-response.ts

/**
 * 统一 API 响应格式（与后端 Platform.ServiceDefaults.Models.ApiResponse 完全一致）
 */
export interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  data?: T;
  errors?: any;
  details?: any;
  timestamp?: string;
  traceId?: string;
  code?: string;
}

/**
 * 分页响应格式(PagedResult<T>)
 * 统一分页结构，所有分页接口均使用，完全对齐后端：
 */
export interface PagedResult<T> {
  queryable: T[];
  currentPage: number;
  pageSize: number;
  rowCount: number;
  pageCount: number;
}
```

### 服务层使用

所有服务层 API 统一使用 `ApiResponse<T>` 和 `PagedResult<T>`：

```typescript
import { request } from '@umijs/max';
import type { ApiResponse, PagedResult } from '@/types/api-response';
import type { User, FileItem, TaskDto } from './types';

// ✅ 正确：分页接口
export async function getUsers(params: UserQueryParams) {
  return request<ApiResponse<PagedResult<User>>>('/api/users/list', {
    method: 'POST',
    data: params,
  });
}

// ✅ 正确：普通接口
export async function getUser(id: string) {
  return request<ApiResponse<User>>(`/api/users/${id}`, {
    method: 'GET',
  });
}
```

---

## 2. PagedResult<T> 结构

> 详细说明请参阅：[`00-分页规范.md`](../00-分页规范.md#1-统一分页类型)

| 属性 | 类型 | 说明 |
|------|------|------|
| `queryable` | `T[]` | 分页后的数据数组 |
| `currentPage` | `number` | 当前页码 |
| `pageSize` | `number` | 每页数量 |
| `rowCount` | `number` | 总行数 |
| `pageCount` | `number` | 总页数 |

### 分页请求函数

```tsx
import type { PagedResult } from '@/types/api-response';
import type { WorkflowDefinition } from '@/services/workflow/api';

const fetchWorkflows = async () => {
  const response = await getWorkflowList({});

  if (response.success && response.data) {
    const paged = response.data as PagedResult<WorkflowDefinition>;
    return {
      data: paged.queryable,
      total: paged.rowCount,
      success: true,
    };
  }

  return { data: [], total: 0, success: false };
};
```

---

## 3. PageParams 使用规范

### **[强制]** 前端不传 pageSize，由后端统一默认值

| 参数 | 后端默认值 | 前端行为 |
|------|-----------|----------|
| `page` | `1` | **必须显式传值**（如需指定页码） |
| `pageSize` | `10` | **禁止前端传值**，使用后端默认值 |
| `search` | `''` | 可选，不传则为空字符串 |
| `sortBy` | 无 | 可选 |
| `sortOrder` | `'desc'` | 可选 |

### PageParams 定义

```typescript
interface PageParams {
  page?: number;       // 当前页码（从 1 开始），需显式传值
  pageSize?: number;   // 每页数量，**禁止前端传值**，后端默认 10
  sortBy?: string;     // 排序字段
  sortOrder?: 'asc' | 'desc';  // 排序方向，默认 'desc'
  search?: string;     // 搜索关键词
}
```

### 正确用法

```typescript
// ✅ 正确：使用空对象
await getUserList({})

// ✅ 正确：只需指定 page
await getUserList({ page: 2 })

// ✅ 正确：只需搜索
await getUserList({ search: 'keyword' })

// ✅ 正确：searchParamsRef 使用空对象
const searchParamsRef = useRef<PageParams>({});
```

### 错误用法

```typescript
// ❌ 禁止：显式传 pageSize
await getUserList({ page: 1, pageSize: 10 })

// ❌ 禁止：设置默认值
const searchParamsRef = useRef<PageParams>({ page: 1, pageSize: 10, search: '' })
```

---

## 4. DTO 类型复用

### 从 services 层导入已定义的 DTO 类型

```tsx
// ✅ 正确：从 services 导入类型
import { type TaskDto, type ProjectDto, queryTasks } from '@/services/task/api';
import type { AppUser } from '@/services/user/api';

// 使用类型
const handleTaskSelect = (task: TaskDto) => {
  console.log(task.id, task.taskName);
};

// ❌ 禁止：重复定义已有的类型
interface TaskDto {
  id: string;
  taskName: string;
  // 重复定义！
}
```

### 页面级别类型定义

```tsx
// src/pages/task-management/types.ts
import type { PagedResult } from '@/types/api-response';
import type { TaskDto as TaskDtoBase } from '@/services/task/api';

// 扩展或定义页面级别类型
export interface TaskStatistics {
  totalTasks: number;
  pendingTasks: number;
  inProgressTasks: number;
  completedTasks: number;
  failedTasks: number;
}

export interface SearchFormValues {
  search?: string;
  status?: number;
  priority?: number;
  assignedTo?: string;
  createdBy?: string;
  taskType?: string;
  projectId?: string;
}

// 分页响应类型
export type TaskListResponse = PagedResult<TaskDtoBase>;
```

---

## 4. 类型导出规范

### 从 services 导出

```typescript
// src/services/task/api.ts
import type { PagedResult } from '@/types/api-response';

// 枚举
export enum TaskStatus {
  Pending = 0,
  Assigned = 1,
  InProgress = 2,
  Completed = 3,
  Cancelled = 4,
}

export enum TaskPriority {
  Low = 0,
  Medium = 1,
  High = 2,
  Urgent = 3,
}

// DTO
export interface TaskDto {
  id?: string;
  taskName: string;
  status: number;
  // ...
}

// 分页响应
export type TaskListResponse = PagedResult<TaskDto>;

// 导出类型和枚举
export type { TaskDto, TaskListResponse } from './types';
export { TaskStatus, TaskPriority } from './types';
```

### 在页面中使用

```tsx
// ✅ 正确：导入所有需要的类型
import {
  type TaskDto,
  type TaskListResponse,
  TaskStatus,
  TaskPriority,
  queryTasks,
  createTask,
} from '@/services/task/api';

// 使用
const statusOptions = [
  { label: '待分配', value: TaskStatus.Pending },
  { label: '已分配', value: TaskStatus.Assigned },
  { label: '执行中', value: TaskStatus.InProgress },
  { label: '已完成', value: TaskStatus.Completed },
];
```

---

## 5. 常见错误示例

### ❌ 错误 1：表单值使用 any

```tsx
// ❌ 禁止
const handleSubmit = (values: any) => {
  createTask(values);
};

// ✅ 正确
const handleSubmit = (values: TaskFormValues) => {
  createTask(values);
};
```

### ❌ 错误 2：请求参数使用 any

```tsx
// ❌ 禁止
const fetchData = async (params: any) => {
  return queryTasks(params);
};

// ✅ 正确
const fetchData = async (params: RequestParams) => {
  return queryTasks({
    page: params.current,
    pageSize: params.pageSize,
  });
};
```

### ❌ 错误 3：重复定义后端已有类型

```tsx
// ❌ 禁止：重复定义 TaskDto
interface TaskDto {
  id: string;
  taskName: string;
  // 后端已有，会导致不一致
}

// ✅ 正确：从 services 导入
import type { TaskDto } from '@/services/task/api';
```

### ❌ 错误 4：使用 `as any` 强制类型转换

```tsx
// ❌ 禁止
const response = await getUsers(params);
const users = (response.data as any).queryable || [];
const total = (response.data as any).rowCount || 0;

// ✅ 正确：使用强类型
import type { PagedResult } from '@/types/api-response';

const response = await getUsers(params);
if (response.success && response.data) {
  const paged = response.data as PagedResult<User>;
  return { data: paged.queryable, total: paged.rowCount, success: true };
}
```

### ❌ 错误 5：硬编码类型

```tsx
// ❌ 禁止：硬编码类型
const columns = [
  {
    title: '状态',
    dataIndex: 'status',
    render: (status: number) => {
      return status === 0 ? '待分配' : '已分配';
    },
  },
];

// ✅ 正确：使用枚举
import { TaskStatus } from '@/services/task/api';

const columns = [
  {
    title: '状态',
    dataIndex: 'status',
    render: (status: TaskStatus) => {
      return status === TaskStatus.Pending ? '待分配' : '已分配';
    },
  },
];
```

### ❌ 错误 6：使用非标准分页参数名

```tsx
// ❌ 禁止：使用 current 而非 page
const response = await getUsers({ current: 1, pageSize: 20 });

// ✅ 正确：使用标准的 page
const response = await getUsers({ page: 1, pageSize: 20 });
```

---

## 6. 严格模式配置

### tsconfig.json

```json
{
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true,
    "strictFunctionTypes": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true
  }
}
```

### eslint 配置

```json
{
  "@typescript-eslint/no-explicit-any": "error",
  "@typescript-eslint/explicit-module-boundary-types": "off"
}
```

---

## 7. 变更与维护建议

- 类型如需扩展，优先同步后端 DTO，禁止自定义 any。
- 发现类型实现与本规范或后端标准不符时，优先以本规范为准，及时修订文档与代码。
- 所有新 API 必须使用 `@/types/api-response.ts` 中定义的基础类型。

---

## 8. 相关代码位置

| 组件 | 位置 |
|------|------|
| 统一类型定义 | `Platform.Admin/src/types/api-response.ts` |
| 服务层参考 | `Platform.Admin/src/services/cloud-storage/api.ts` |
| 统一分页规范 | [`00-分页规范.md`](../00-分页规范.md) |

---

## 9. 统计与分页数据分离

> 详细说明请参阅：[`00-分页规范.md`](../00-分页规范.md#3-统计与分页接口分离)

### ✅ 正确做法

```typescript
// 1. 服务层定义统计接口
export async function getRoleStatistics() {
  return request<ApiResponse<RoleStatistics>>('/api/roles/statistics');
}

// 2. 服务层定义分页接口
export async function getRoles(params: { page: number; pageSize: number }) {
  return request<ApiResponse<PagedResult<Role>>>('/api/roles', { params });
}

// 3. 页面组件分别加载
const loadStatistics = async () => {
  const response = await getRoleStatistics();
  if (response.success && response.data) {
    setStatistics(response.data);
  }
};

const loadRoleData = async (params: { page: number; pageSize: number }) => {
  const response = await getRoles(params);
  if (response.success && response.data) {
    return {
      data: response.data.queryable,
      total: response.data.rowCount,
      success: true,
    };
  }
};

// 4. 初始化时分别加载
useEffect(() => {
  loadStatistics();
}, []);
```

### 统计接口类型定义

```typescript
// types.ts
export interface RoleStatistics {
  totalRoles: number;
  activeRoles: number;
  totalUsers: number;
  totalMenus: number;
}
```

### 常见统计接口

| 模块 | 接口 | 类型 |
|------|------|------|
| 角色管理 | `/api/role/statistics` | `RoleStatistics` |
| IoT 平台 | `/api/iot/statistics/platform` | `PlatformStatistics` |
| 设备事件 | `/api/iot/events/unhandled-count` | `{ Count: number }` |
