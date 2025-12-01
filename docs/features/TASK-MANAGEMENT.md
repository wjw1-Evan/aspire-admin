# 任务管理功能文档

## 概述

任务管理是 Aspire Admin Platform 的核心功能模块，提供完整的任务生命周期管理，包括任务创建、分配、执行、监控和统计。

## 功能特性

### 1. 任务创建与分配

#### 功能描述
- **创建任务**：用户可以创建新任务，指定任务名称、描述、类型、优先级等基本信息
- **分配任务**：将任务分配给特定用户或团队成员
- **参与者管理**：添加多个参与者参与任务执行
- **标签管理**：为任务添加标签便于分类和搜索

#### 关键字段
```typescript
interface CreateTaskRequest {
  taskName: string;              // 任务名称（必填）
  description?: string;          // 任务描述
  taskType: string;              // 任务类型（必填）
  priority?: number;             // 优先级（0-低, 1-中, 2-高, 3-紧急）
  assignedTo?: string;           // 分配给的用户ID
  plannedStartTime?: string;     // 计划开始时间
  plannedEndTime?: string;       // 计划完成时间
  estimatedDuration?: number;    // 预计耗时（分钟）
  participantIds?: string[];     // 参与者ID列表
  tags?: string[];               // 标签列表
  remarks?: string;              // 备注
}
```

#### API 端点
- **创建任务**: `POST /api/task/create`
- **分配任务**: `POST /api/task/assign`
- **更新任务**: `PUT /api/task/update`

### 2. 任务调度与执行

#### 功能描述
- **任务状态管理**：支持多种任务状态（待分配、已分配、执行中、已完成、已取消、失败、暂停）
- **进度跟踪**：实时更新任务完成百分比
- **执行日志**：记录每次任务执行的详细信息
- **批量操作**：支持批量更新任务状态

#### 任务状态流转
```
待分配 → 已分配 → 执行中 → 已完成
                ↓
              暂停 → 执行中
                ↓
              已取消
                ↓
              失败
```

#### API 端点
- **执行任务**: `POST /api/task/execute`
- **完成任务**: `POST /api/task/complete`
- **取消任务**: `DELETE /api/task/{taskId}/cancel`
- **批量更新状态**: `POST /api/task/batch-update-status`

#### 执行流程示例
```typescript
// 1. 开始执行任务
await executeTask({
  taskId: 'task123',
  status: TaskStatus.InProgress,
  completionPercentage: 0,
  message: '开始执行'
});

// 2. 更新进度
await executeTask({
  taskId: 'task123',
  status: TaskStatus.InProgress,
  completionPercentage: 50,
  message: '进度更新'
});

// 3. 完成任务
await completeTask({
  taskId: 'task123',
  executionResult: TaskExecutionResult.Success,
  remarks: '任务已按时完成'
});
```

### 3. 任务执行监控

#### 功能描述
- **实时监控**：监控任务执行状态和进度
- **统计分析**：提供任务统计信息和分析数据
- **执行日志**：详细记录每次任务执行的过程
- **性能指标**：计算平均完成时间、完成率等关键指标

#### 统计信息
```typescript
interface TaskStatistics {
  totalTasks: number;              // 总任务数
  pendingTasks: number;            // 待分配任务数
  inProgressTasks: number;         // 进行中任务数
  completedTasks: number;          // 已完成任务数
  failedTasks: number;             // 失败任务数
  averageCompletionTime: number;   // 平均完成时间（分钟）
  completionRate: number;          // 完成率（百分比）
  tasksByPriority: Record<string, number>;  // 按优先级统计
  tasksByStatus: Record<string, number>;    // 按状态统计
}
```

#### API 端点
- **获取统计信息**: `GET /api/task/statistics`
- **获取执行日志**: `GET /api/task/{taskId}/logs`
- **获取待办任务**: `GET /api/task/my/todo`
- **获取创建的任务**: `GET /api/task/my/created`

## 前端实现

### 页面结构

#### 1. 任务管理主页面 (`/task-management`)
```
┌─────────────────────────────────────────────┐
│         任务管理仪表板                       │
├─────────────────────────────────────────────┤
│ 统计卡片区域                                 │
│ ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐        │
│ │总任务│ │进行中│ │已完成│ │完成率│        │
│ └──────┘ └──────┘ └──────┘ └──────┘        │
├─────────────────────────────────────────────┤
│ 任务列表表格                                 │
│ ┌────────────────────────────────────────┐  │
│ │任务名 │状态│优先级│进度│分配给│操作    │  │
│ ├────────────────────────────────────────┤  │
│ │...                                     │  │
│ └────────────────────────────────────────┘  │
└─────────────────────────────────────────────┘
```

#### 2. 组件说明

**TaskForm** - 任务创建/编辑表单
- 支持创建新任务和编辑现有任务
- 自动加载用户列表用于分配和参与者选择
- 支持日期时间选择、标签管理等

**TaskDetail** - 任务详情抽屉
- 显示任务的完整信息
- 展示执行日志时间线
- 支持参与者和标签展示

**TaskExecutionPanel** - 任务执行面板
- 支持两种模式：更新进度、完成任务
- 进度模式：使用滑块更新完成百分比
- 完成模式：选择执行结果并输入备注

### 主要功能

#### 任务列表操作
```typescript
// 查询任务
await queryTasks({
  page: 1,
  pageSize: 10,
  search: '设计',
  status: TaskStatus.InProgress,
  priority: TaskPriority.High,
  sortBy: 'CreatedAt',
  sortOrder: 'desc'
});

// 获取任务详情
await getTaskById(taskId);

// 删除任务
await deleteTask(taskId);

// 取消任务
await cancelTask(taskId, '需求变更');
```

#### 任务执行操作
```typescript
// 更新任务进度
await executeTask({
  taskId: 'task123',
  status: TaskStatus.InProgress,
  completionPercentage: 50,
  message: '进度更新'
});

// 完成任务
await completeTask({
  taskId: 'task123',
  executionResult: TaskExecutionResult.Success,
  remarks: '任务已完成'
});
```

## 后端实现

### 数据模型

#### Task 实体
```csharp
public class Task
{
    public string? Id { get; set; }
    public string TaskName { get; set; }
    public string? Description { get; set; }
    public string TaskType { get; set; }
    public TaskStatus Status { get; set; }
    public TaskPriority Priority { get; set; }
    public string CreatedBy { get; set; }
    public DateTime CreatedAt { get; set; }
    public string? AssignedTo { get; set; }
    public DateTime? AssignedAt { get; set; }
    public DateTime? PlannedStartTime { get; set; }
    public DateTime? PlannedEndTime { get; set; }
    public DateTime? ActualStartTime { get; set; }
    public DateTime? ActualEndTime { get; set; }
    public int? EstimatedDuration { get; set; }
    public int? ActualDuration { get; set; }
    public TaskExecutionResult ExecutionResult { get; set; }
    public int CompletionPercentage { get; set; }
    public string? Remarks { get; set; }
    public string? CompanyId { get; set; }
    public List<string> ParticipantIds { get; set; }
    public List<string> Tags { get; set; }
    public List<TaskAttachment> Attachments { get; set; }
    public bool IsDeleted { get; set; }
    public DateTime? DeletedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
    public string? UpdatedBy { get; set; }
}
```

#### TaskExecutionLog 实体
```csharp
public class TaskExecutionLog
{
    public string? Id { get; set; }
    public string TaskId { get; set; }
    public string ExecutedBy { get; set; }
    public DateTime StartTime { get; set; }
    public DateTime? EndTime { get; set; }
    public TaskExecutionResult Status { get; set; }
    public string? Message { get; set; }
    public string? ErrorMessage { get; set; }
    public int ProgressPercentage { get; set; }
    public string? CompanyId { get; set; }
    public DateTime CreatedAt { get; set; }
}
```

### 服务实现

#### ITaskService 接口
```csharp
public interface ITaskService
{
    Task<TaskDto> CreateTaskAsync(CreateTaskRequest request, string userId, string companyId);
    Task<TaskDto?> GetTaskByIdAsync(string taskId);
    Task<TaskListResponse> QueryTasksAsync(TaskQueryRequest request, string companyId);
    Task<TaskDto> UpdateTaskAsync(UpdateTaskRequest request, string userId);
    Task<TaskDto> AssignTaskAsync(AssignTaskRequest request, string userId);
    Task<TaskDto> ExecuteTaskAsync(ExecuteTaskRequest request, string userId);
    Task<TaskDto> CompleteTaskAsync(CompleteTaskRequest request, string userId);
    Task<TaskDto> CancelTaskAsync(string taskId, string userId, string? remarks = null);
    Task<bool> DeleteTaskAsync(string taskId, string userId);
    Task<TaskStatistics> GetTaskStatisticsAsync(string companyId, string? userId = null);
    Task<(List<TaskExecutionLogDto> logs, int total)> GetTaskExecutionLogsAsync(string taskId, int page = 1, int pageSize = 10);
    Task<TaskExecutionLogDto> LogTaskExecutionAsync(string taskId, string userId, TaskExecutionResult status, string? message = null, int progressPercentage = 0, string? companyId = null);
    Task<List<TaskDto>> GetUserTodoTasksAsync(string userId, string companyId);
    Task<(List<TaskDto> tasks, int total)> GetUserCreatedTasksAsync(string userId, string companyId, int page = 1, int pageSize = 10);
    Task<int> BatchUpdateTaskStatusAsync(List<string> taskIds, TaskStatus status, string userId);
}
```

### 控制器端点

#### TaskController
```csharp
[ApiController]
[Route("api/task")]
[Authorize]
public class TaskController : BaseApiController
{
    // POST /api/task/create - 创建任务
    // GET /api/task/{taskId} - 获取任务详情
    // POST /api/task/query - 查询任务列表
    // PUT /api/task/update - 更新任务
    // POST /api/task/assign - 分配任务
    // POST /api/task/execute - 执行任务
    // POST /api/task/complete - 完成任务
    // DELETE /api/task/{taskId}/cancel - 取消任务
    // DELETE /api/task/{taskId} - 删除任务
    // GET /api/task/statistics - 获取统计信息
    // GET /api/task/{taskId}/logs - 获取执行日志
    // GET /api/task/my/todo - 获取待办任务
    // GET /api/task/my/created - 获取创建的任务
    // POST /api/task/batch-update-status - 批量更新状态
}
```

## 权限管理

所有任务管理相关的 API 都需要以下权限：
- **菜单权限**: `task-management`
- **认证**: 需要有效的 JWT Token

## 数据库集合

### MongoDB 集合

#### tasks 集合
```javascript
db.createCollection("tasks", {
  validator: {
    $jsonSchema: {
      bsonType: "object",
      required: ["taskName", "taskType", "status", "createdBy", "createdAt"],
      properties: {
        _id: { bsonType: "objectId" },
        taskName: { bsonType: "string" },
        description: { bsonType: "string" },
        taskType: { bsonType: "string" },
        status: { bsonType: "int" },
        priority: { bsonType: "int" },
        createdBy: { bsonType: "string" },
        createdAt: { bsonType: "date" },
        assignedTo: { bsonType: "string" },
        assignedAt: { bsonType: "date" },
        companyId: { bsonType: "string" },
        isDeleted: { bsonType: "bool" }
      }
    }
  }
});

// 创建索引
db.tasks.createIndex({ companyId: 1, status: 1, createdAt: -1 });
db.tasks.createIndex({ assignedTo: 1 });
db.tasks.createIndex({ createdBy: 1 });
```

#### task_execution_logs 集合
```javascript
db.createCollection("task_execution_logs", {
  validator: {
    $jsonSchema: {
      bsonType: "object",
      required: ["taskId", "executedBy", "startTime", "status"],
      properties: {
        _id: { bsonType: "objectId" },
        taskId: { bsonType: "string" },
        executedBy: { bsonType: "string" },
        startTime: { bsonType: "date" },
        endTime: { bsonType: "date" },
        status: { bsonType: "int" },
        message: { bsonType: "string" },
        errorMessage: { bsonType: "string" },
        progressPercentage: { bsonType: "int" },
        createdAt: { bsonType: "date" }
      }
    }
  }
});

// 创建索引
db.task_execution_logs.createIndex({ taskId: 1 });
```

## 使用示例

### 前端使用

#### 1. 创建任务
```typescript
import { createTask } from '@/services/task/api';

const handleCreateTask = async () => {
  try {
    const response = await createTask({
      taskName: '完成用户界面设计',
      description: '设计新的用户管理界面',
      taskType: 'Design',
      priority: 2, // 高优先级
      assignedTo: 'user123',
      plannedStartTime: '2024-12-02T10:00:00Z',
      plannedEndTime: '2024-12-05T18:00:00Z',
      estimatedDuration: 480,
      participantIds: ['user456', 'user789'],
      tags: ['UI', 'Design'],
      remarks: '需要与产品经理沟通'
    });
    
    if (response.success) {
      message.success('任务创建成功');
    }
  } catch (error) {
    message.error('创建任务失败');
  }
};
```

#### 2. 查询任务列表
```typescript
import { queryTasks, TaskStatus, TaskPriority } from '@/services/task/api';

const handleQueryTasks = async () => {
  try {
    const response = await queryTasks({
      page: 1,
      pageSize: 10,
      search: '设计',
      status: TaskStatus.InProgress,
      priority: TaskPriority.High,
      sortBy: 'CreatedAt',
      sortOrder: 'desc'
    });
    
    if (response.success) {
      console.log('任务列表:', response.data.tasks);
      console.log('总数:', response.data.total);
    }
  } catch (error) {
    message.error('查询任务失败');
  }
};
```

#### 3. 执行任务
```typescript
import { executeTask, TaskStatus } from '@/services/task/api';

const handleExecuteTask = async (taskId: string) => {
  try {
    const response = await executeTask({
      taskId,
      status: TaskStatus.InProgress,
      completionPercentage: 50,
      message: '正在进行中'
    });
    
    if (response.success) {
      message.success('任务进度已更新');
    }
  } catch (error) {
    message.error('更新任务失败');
  }
};
```

#### 4. 完成任务
```typescript
import { completeTask, TaskExecutionResult } from '@/services/task/api';

const handleCompleteTask = async (taskId: string) => {
  try {
    const response = await completeTask({
      taskId,
      executionResult: TaskExecutionResult.Success,
      remarks: '任务已按时完成'
    });
    
    if (response.success) {
      message.success('任务已完成');
    }
  } catch (error) {
    message.error('完成任务失败');
  }
};
```

### 后端使用

#### 1. 创建任务（C#）
```csharp
var request = new CreateTaskRequest
{
    TaskName = "完成用户界面设计",
    Description = "设计新的用户管理界面",
    TaskType = "Design",
    Priority = (int)TaskPriority.High,
    AssignedTo = "user123",
    PlannedStartTime = DateTime.UtcNow.AddDays(1),
    PlannedEndTime = DateTime.UtcNow.AddDays(4),
    EstimatedDuration = 480,
    ParticipantIds = new List<string> { "user456", "user789" },
    Tags = new List<string> { "UI", "Design" },
    Remarks = "需要与产品经理沟通"
};

var task = await _taskService.CreateTaskAsync(request, userId, companyId);
```

#### 2. 查询任务列表（C#）
```csharp
var request = new TaskQueryRequest
{
    Page = 1,
    PageSize = 10,
    Search = "设计",
    Status = (int)TaskStatus.InProgress,
    Priority = (int)TaskPriority.High,
    SortBy = "CreatedAt",
    SortOrder = "desc"
};

var result = await _taskService.QueryTasksAsync(request, companyId);
```

## 性能优化

### 数据库优化
- 创建复合索引以加快查询速度
- 使用软删除避免数据丢失
- 定期清理过期的执行日志

### 缓存策略
- 缓存用户信息以减少数据库查询
- 缓存统计信息（可选）

### 分页处理
- 所有列表查询都支持分页
- 默认每页 10 条记录

## 扩展功能（未来计划）

1. **任务依赖关系**：支持任务之间的依赖关系
2. **任务模板**：预定义常用任务模板
3. **自动化工作流**：支持任务自动化流转
4. **通知提醒**：任务状态变化时发送通知
5. **文件附件**：支持上传和下载任务附件
6. **评论讨论**：任务内评论和讨论功能
7. **时间追踪**：详细的时间追踪和工作日志
8. **报表导出**：支持导出任务报表

## 常见问题

### Q: 如何批量创建任务？
A: 目前不支持批量创建，但可以通过循环调用 `createTask` API 来实现。

### Q: 任务删除后是否可以恢复？
A: 可以。任务使用软删除，数据仍保留在数据库中。可以通过数据库操作恢复。

### Q: 如何查看任务的执行历史？
A: 使用 `getTaskExecutionLogs` API 可以获取任务的完整执行日志。

### Q: 是否支持任务的权限控制？
A: 是的。任务管理需要 `task-management` 菜单权限。

## 相关文档

- [API 文档](./API.md)
- [数据库设计](./DATABASE.md)
- [权限管理](./PERMISSION.md)

