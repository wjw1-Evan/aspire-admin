# TypeScript 类型安全

本规范重点强调所有类型定义需与后端 DTO 保持同步，禁止 any，接口类型与后端标准一致。

> **[强制]** 禁止使用 `any` 类型，确保代码的类型安全性。

---

## 1. 统一类型来源

### 类型定义位置

所有 API 相关类型统一定义在 `@/types/unified-api.ts`：

```typescript
// src/types/unified-api.ts

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
}

/**
 * 分页响应格式(PagedResult<T>)
 * 统一分页结构，所有分页接口均使用
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
import type { ApiResponse, PagedResult } from '@/types/unified-api';
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

## 2. 分页类型标准化

### PagedResult<T> 结构

| 属性 | 类型 | 说明 |
|------|------|------|
| `queryable` | `T[]` | 分页后的数据数组 |
| `currentPage` | `number` | 当前页码 |
| `pageSize` | `number` | 每页数量 |
| `rowCount` | `number` | 总行数 |
| `pageCount` | `number` | 总页数 |

### DataTable 请求函数

```tsx
import type { PagedResult } from '@/types/unified-api';
import type { WorkflowDefinition } from '@/services/workflow/api';

const fetchWorkflows = async (params: any) => {
  const response = await getWorkflowList({
    current: params.current || 1,
    pageSize: params.pageSize || 10,
    keyword: params.keyword,
  });
  
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

## 3. DTO 类型复用

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
import type { PagedResult } from '@/types/unified-api';
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
import type { PagedResult } from '@/types/unified-api';

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
    Page: params.current,
    PageSize: params.pageSize,
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
import type { PagedResult } from '@/types/unified-api';

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
- 所有新 API 必须使用 `@/types/unified-api.ts` 中定义的基础类型。

---

## 相关代码位置

| 组件 | 位置 |
|------|------|
| 统一类型定义 | `Platform.Admin/src/types/unified-api.ts` |
| 服务层参考 | `Platform.Admin/src/services/cloud-storage/api.ts` |
| 后端分页规范 | `docs/rules/backend/04-分页处理规范.md` |

---

## 8. 非分页响应处理

### 返回数组的 API

某些 API 返回普通数组而非分页结果，应使用对应的数组类型：

```typescript
import type { ApiResponse } from '@/types/unified-api';
import type { Role } from '@/services/role/api';
import type { AppUser } from '@/services/user/api';

// ✅ 正确：返回数组的 API
export async function getAllRoles() {
  return request<ApiResponse<Role[]>>('/api/roles/all', { method: 'GET' });
}

export async function getAllUsers() {
  return request<ApiResponse<AppUser[]>>('/api/users/all', { method: 'GET' });
}

// 使用示例
const response = await getAllRoles();
if (response.success && response.data) {
  const roles: Role[] = response.data;
  // ...
}
```

### 访问分页数据

```typescript
// 分页响应
const response = await getUserList(params);
if (response.success && response.data) {
  const { queryable, rowCount, pageCount, currentPage, pageSize } = response.data;
  // queryable: 数据数组
  // rowCount: 总记录数
  // pageCount: 总页数
}
```

---

## 9. 统计与分页数据分离

### 设计原则

统计数据和分页数据必须**分离为两个独立接口**：

| 接口类型 | 用途 | 数据范围 |
|----------|------|----------|
| 统计接口 | 计算全局统计 | 基于全部数据 |
| 分页接口 | 表格展示 | 只返回当前页 |

### ❌ 错误做法

```typescript
// ❌ 错误：为计算统计加载大量数据
const response = await getRoles({ page: 1, pageSize: 1000 });
const data = response.data.queryable;

// 计算的统计不准确（只统计了第一页）
const stats = {
  total: data.length,
  active: data.filter(r => r.isActive).length,
};
```

### ✅ 正确做法

```typescript
// 1. 服务层定义统计接口
export async function getRoleStatistics() {
  return request<ApiResponse<RoleStatistics>>('/api/roles/statistics');
}

// 2. 服务层定义分页接口
export async function getRoles(params) {
  return request<ApiResponse<PagedResult<Role>>>('/api/roles', { params });
}

// 3. 页面组件分别加载
const loadStatistics = useCallback(async () => {
  const response = await getRoleStatistics();
  if (response.success && response.data) {
    setStatistics(response.data);  // 使用统计接口返回的完整统计
  }
}, []);

const loadRoleData = useCallback(async (params) => {
  const response = await getRoles(params);
  if (response.success && response.data) {
    // 只处理分页数据，不计算统计
    return {
      data: response.data.queryable,
      total: response.data.rowCount,
      success: true,
    };
  }
}, []);

// 4. 初始化时分别加载
useEffect(() => {
  loadStatistics();
}, [loadStatistics]);
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
