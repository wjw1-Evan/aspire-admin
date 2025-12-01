# 任务管理功能 - 快速开始指南

## 快速概览

任务管理模块提供完整的任务生命周期管理，包括：
- ✅ 任务创建与分配
- ✅ 任务调度与执行
- ✅ 任务执行监控
- ✅ 统计分析

## 文件结构

### 后端文件
```
Platform.ApiService/
├── Models/
│   ├── TaskModels.cs              # 任务数据模型
│   └── TaskDtoModels.cs           # 任务DTO模型
├── Services/
│   ├── ITaskService.cs            # 任务服务接口
│   └── TaskService.cs             # 任务服务实现
└── Controllers/
    └── TaskController.cs          # 任务管理控制器
```

### 前端文件
```
Platform.Admin/src/
├── services/
│   └── task/
│       └── api.ts                 # 任务API服务
├── pages/
│   └── task-management/
│       ├── index.tsx              # 任务管理主页面
│       ├── types.ts               # 类型定义
│       └── components/
│           ├── TaskForm.tsx       # 任务创建/编辑表单
│           ├── TaskDetail.tsx     # 任务详情抽屉
│           └── TaskExecutionPanel.tsx  # 任务执行面板
└── config/
    └── routes.ts                  # 路由配置（已更新）
```

## 快速集成步骤

### 1. 后端集成

#### 步骤 1.1：检查服务注册
任务服务已通过自动扫描注册，无需手动配置。验证 `Program.cs` 中的以下代码：

```csharp
// 自动注册所有业务服务
builder.Services.AddBusinessServices();
```

#### 步骤 1.2：创建数据库索引
在 MongoDB 中创建必要的索引（可选，服务启动时自动创建）：

```javascript
// 连接到 MongoDB
use aspire_platform

// 创建 tasks 集合索引
db.tasks.createIndex({ companyId: 1, status: 1, createdAt: -1 })
db.tasks.createIndex({ assignedTo: 1 })
db.tasks.createIndex({ createdBy: 1 })

// 创建 task_execution_logs 集合索引
db.task_execution_logs.createIndex({ taskId: 1 })
```

#### 步骤 1.3：验证 API 端点
启动后端服务后，访问 Swagger 文档验证 API：
```
https://localhost:5001/openapi/v1.json
```

查找 `/api/task` 相关的端点。

### 2. 前端集成

#### 步骤 2.1：确认路由配置
路由已在 `config/routes.ts` 中配置：

```typescript
{
  path: '/task-management',
  component: './task-management',
  hideInMenu: true,
}
```

#### 步骤 2.2：验证菜单权限
确保数据库中存在 `task-management` 菜单权限。

#### 步骤 2.3：访问任务管理页面
启动前端应用后，访问：
```
http://localhost:15001/task-management
```

## 核心功能使用

### 功能 1：创建任务

#### 前端操作
1. 点击"创建任务"按钮
2. 填写任务信息：
   - 任务名称（必填）
   - 任务类型（必填）
   - 优先级（默认中）
   - 分配给（可选）
   - 计划时间（可选）
   - 参与者（可选）
   - 标签（可选）
3. 点击"确定"提交

#### API 调用
```typescript
import { createTask } from '@/services/task/api';

const response = await createTask({
  taskName: '完成设计',
  taskType: 'Design',
  priority: 2,
  assignedTo: 'user123'
});
```

### 功能 2：查询任务

#### 前端操作
1. 在任务列表页面使用搜索和过滤
2. 按状态、优先级、分配人过滤
3. 按创建时间排序

#### API 调用
```typescript
import { queryTasks, TaskStatus } from '@/services/task/api';

const response = await queryTasks({
  page: 1,
  pageSize: 10,
  status: TaskStatus.InProgress,
  priority: 2,
  sortBy: 'CreatedAt',
  sortOrder: 'desc'
});
```

### 功能 3：执行任务

#### 前端操作
1. 在任务列表中选择任务
2. 点击"执行"按钮
3. 选择执行模式：
   - **更新进度**：调整完成百分比
   - **完成任务**：选择执行结果
4. 点击"确定"提交

#### API 调用
```typescript
import { executeTask, completeTask } from '@/services/task/api';

// 更新进度
await executeTask({
  taskId: 'task123',
  completionPercentage: 50,
  message: '进度更新'
});

// 完成任务
await completeTask({
  taskId: 'task123',
  executionResult: 1, // Success
  remarks: '任务已完成'
});
```

### 功能 4：监控任务

#### 前端操作
1. 查看任务列表中的进度条
2. 点击任务查看详情
3. 查看执行日志时间线

#### API 调用
```typescript
import { getTaskStatistics, getTaskExecutionLogs } from '@/services/task/api';

// 获取统计信息
const stats = await getTaskStatistics();

// 获取执行日志
const logs = await getTaskExecutionLogs('task123', 1, 10);
```

## 常见操作

### 操作 1：分配任务给用户

```typescript
import { assignTask } from '@/services/task/api';

await assignTask({
  taskId: 'task123',
  assignedTo: 'user456',
  remarks: '请在本周内完成'
});
```

### 操作 2：取消任务

```typescript
import { cancelTask } from '@/services/task/api';

await cancelTask('task123', '需求变更');
```

### 操作 3：删除任务

```typescript
import { deleteTask } from '@/services/task/api';

await deleteTask('task123');
```

### 操作 4：批量更新任务状态

```typescript
import { batchUpdateTaskStatus, TaskStatus } from '@/services/task/api';

await batchUpdateTaskStatus(
  ['task1', 'task2', 'task3'],
  TaskStatus.Completed
);
```

### 操作 5：获取我的待办任务

```typescript
import { getMyTodoTasks } from '@/services/task/api';

const todoTasks = await getMyTodoTasks();
```

## 数据模型速查

### 任务状态
```typescript
enum TaskStatus {
  Pending = 0,      // 待分配
  Assigned = 1,     // 已分配
  InProgress = 2,   // 执行中
  Completed = 3,    // 已完成
  Cancelled = 4,    // 已取消
  Failed = 5,       // 失败
  Paused = 6        // 暂停
}
```

### 任务优先级
```typescript
enum TaskPriority {
  Low = 0,      // 低
  Medium = 1,   // 中
  High = 2,     // 高
  Urgent = 3    // 紧急
}
```

### 执行结果
```typescript
enum TaskExecutionResult {
  NotExecuted = 0,  // 未执行
  Success = 1,      // 成功
  Failed = 2,       // 失败
  Timeout = 3,      // 超时
  Interrupted = 4   // 被中断
}
```

## 测试检查清单

- [ ] 后端服务启动成功
- [ ] 前端应用启动成功
- [ ] 能访问任务管理页面
- [ ] 能创建新任务
- [ ] 能查询任务列表
- [ ] 能分配任务
- [ ] 能执行任务
- [ ] 能完成任务
- [ ] 能查看统计信息
- [ ] 能查看执行日志
- [ ] 能取消/删除任务

## 故障排除

### 问题 1：无法访问任务管理页面
**解决方案**：
1. 检查是否有 `task-management` 菜单权限
2. 检查路由配置是否正确
3. 检查前端应用是否正确编译

### 问题 2：创建任务失败
**解决方案**：
1. 检查后端服务是否运行
2. 检查 MongoDB 连接是否正常
3. 查看浏览器控制台错误信息

### 问题 3：查询任务返回空列表
**解决方案**：
1. 检查是否创建了任务
2. 检查企业ID是否正确
3. 检查数据库中是否有任务数据

### 问题 4：执行任务失败
**解决方案**：
1. 检查任务状态是否允许执行
2. 检查用户权限是否足够
3. 查看服务器日志获取详细错误信息

## 下一步

1. **配置菜单权限**：在后台管理中配置 `task-management` 菜单权限
2. **自定义任务类型**：根据业务需求添加更多任务类型
3. **集成通知系统**：任务状态变化时发送通知
4. **创建任务模板**：为常用任务创建模板
5. **扩展执行日志**：添加更详细的执行日志记录

## 相关资源

- [完整功能文档](./TASK-MANAGEMENT.md)
- [API 参考](./API.md)
- [数据库设计](./DATABASE.md)
- [权限管理](./PERMISSION.md)

## 支持

如有问题或建议，请联系开发团队。

