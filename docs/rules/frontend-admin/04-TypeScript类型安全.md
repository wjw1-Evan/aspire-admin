# TypeScript 类型安全

> **[强制]** 禁止使用 `any` 类型，确保代码的类型安全性。

## 表单处理

# TypeScript 类型安全与后端 DTO 对齐

本规范重点强调所有类型定义需与后端 DTO 保持同步，禁止 any，接口类型与后端标准一致。

## 1. 禁止 any，类型必须明确
>
> **[强制]** 禁止使用 `any` 类型，所有表单、接口、数据结构必须定义明确类型。

## 2. 表单与接口类型同步后端 DTO

- 表单、接口、分页等类型必须与后端 DTO 保持同步，推荐通过 openapi/ts-auto-generate 工具自动生成。

```tsx
// ✅ 正确：类型与后端 DTO 对齐
import type { UserDto } from '@/services/user/types';

interface TaskFormValues /* 对应后端 TaskCreateDto */ {
  taskName: string;
  description?: string;
  // ... 其余字段与后端一致
}

const handleSubmit = async (values: TaskFormValues) => {
  await createTask(values);
};

<Form onFinish={handleSubmit}>
  {/* 表单项 */}
</Form>

// ❌ 错误：使用 any 类型
const handleSubmit = async (values: any) => {
  await createTask(values);  // 类型不安全
};
```

## 3. 分页类型标准化

- 分页、批量接口统一使用与后端一致的 PagedResult<T> 类型。

```typescript
interface PagedResult<T> {
  data: T[];
  currentPage: number;
  pageSize: number;
  rowCount: number;
  pageCount: number;
}
```

## 4. ProTable/Antd Table 请求函数

```tsx
import type { RequestParams } from '@/types/pro-components';
const requestFunction = useCallback(
  async (params: RequestParams, sort?: Record<string, 'ascend' | 'descend'>) => {
    const response = await queryTasks({
      page: params.current,
      pageSize: params.pageSize,
      sortBy: sort?.field,
      sortOrder: sort?.order === 'ascend' ? 'asc' : 'desc',
    });
    return {
      data: response.data.data,
      success: response.success,
      total: response.data.rowCount,
    };
  },
  [],
);
```

## 5. 变更与维护建议

- 类型如需扩展，优先同步后端 DTO，禁止自定义 any。
- 发现类型实现与本规范或后端标准不符时，优先以本规范为准，及时修订文档与代码。

---

## DTO 类型复用

### **[强制]** 从 services 层导入已定义的 DTO 类型

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

export interface TaskQueryParams {
  Page: number;
  PageSize: number;
  Search?: string;
  Status?: number;
  Priority?: number;
  AssignedTo?: string;
  SortBy: string;
  SortOrder: string;
  [key: string]: unknown;  // 允许其他参数
}
```

---

## 类型导出规范

### 从 services 导出

```typescript
// src/services/task/api.ts

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

// Request
export interface CreateTaskRequest {
  taskName: string;
  priority?: number;
  // ...
}

// 导出类型和枚举
export type { TaskDto, CreateTaskRequest, UpdateTaskRequest } from './types';
export { TaskStatus, TaskPriority } from './types';
```

### 在页面中使用

```tsx
// ✅ 正确：导入所有需要的类型
import {
  type TaskDto,
  type CreateTaskRequest,
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

## 常见错误示例

### ❌ 错误 1：表单值使用 any

```tsx
// ❌ 禁止
const handleSubmit = (values: any) => {
  createTask(values);  // values 是 any
};

// ✅ 正确
const handleSubmit = (values: TaskFormValues) => {
  createTask({
    taskName: values.taskName,
    priority: values.priority,
  });
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
// 在 pages/task-management/types.ts 中
interface TaskDto {
  id: string;
  taskName: string;
  // 后端已有，会导致不一致
}

// ✅ 正确：从 services 导入
import type { TaskDto } from '@/services/task/api';
```

### ❌ 错误 4：硬编码类型

```tsx
// ❌ 禁止：硬编码类型
const columns = [
  {
    title: '状态',
    dataIndex: 'status',
    render: (status: number) => {  // 硬编码
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

## 严格模式配置

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
