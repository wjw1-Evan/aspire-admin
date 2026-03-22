# TypeScript 类型安全

> **[强制]** 禁止使用 `any` 类型，确保代码的类型安全性。

## 表单处理

### **[强制]** 为每个表单定义明确的类型接口

```tsx
// ✅ 正确：定义明确的表单值类型
import type { Dayjs } from 'dayjs';

interface TaskFormValues {
  taskName: string;
  description?: string;
  taskType: string | string[];
  priority?: number;
  assignedUserIds?: string[];
  plannedStartTime?: Dayjs;
  plannedEndTime?: Dayjs;
  estimatedDuration?: number;
  tags?: string[];
}

const handleSubmit = async (values: TaskFormValues) => {
  // 处理表单提交
  const data = {
    taskName: values.taskName,
    priority: values.priority,
    // ...
  };
  await createTask(data);
};

<Form onFinish={handleSubmit}>
  {/* 表单项 */}
</Form>

// ❌ 禁止：使用 any 类型
const handleSubmit = async (values: any) => {
  await createTask(values);  // 类型不安全
};
```

### ProTable 请求函数

```tsx
import type { RequestParams } from '@/types/pro-components';

// ✅ 正确：使用 RequestParams
const requestFunction = useCallback(
  async (params: RequestParams, sort?: Record<string, 'ascend' | 'descend'>) => {
    const response = await queryTasks({
      Page: params.current,
      PageSize: params.pageSize,
      SortBy: sort?.field,
      SortOrder: sort?.order === 'ascend' ? 'asc' : 'desc',
    });
    
    return {
      data: response.data?.tasks || [],
      success: response.success,
      total: response.data?.total || 0,
    };
  },
  []
);

// ❌ 禁止：使用 any
const requestFunction = useCallback(async (params: any, sort: any) => {
  // ...
}, []);
```

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
