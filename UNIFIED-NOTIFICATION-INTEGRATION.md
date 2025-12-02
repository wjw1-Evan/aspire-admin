# 统一通知/待办/任务管理整合指南

## 概述

本文档描述了如何将系统消息、通知、待办和任务管理整合到一个统一的通知中心中。该整合提供了一个统一的接口来管理所有类型的通知、待办项和任务相关的信息。

## 架构设计

### 后端架构

#### 1. 数据模型扩展 (`NoticeModels.cs`)

**新增通知类型：**
- `Task` - 任务相关通知
- `System` - 系统消息

**NoticeIconItem 新增字段：**

```csharp
// 任务相关字段
public string? TaskId { get; set; }                    // 关联的任务ID
public int? TaskPriority { get; set; }                 // 任务优先级
public int? TaskStatus { get; set; }                   // 任务状态

// 待办相关字段
public bool IsTodo { get; set; }                       // 是否为待办项
public int? TodoPriority { get; set; }                 // 待办优先级
public DateTime? TodoDueDate { get; set; }             // 待办截止日期

// 系统消息相关字段
public bool IsSystemMessage { get; set; }              // 是否为系统消息
public int? MessagePriority { get; set; }              // 消息优先级

// 其他字段
public List<string> RelatedUserIds { get; set; }       // 相关用户ID列表
public string? ActionType { get; set; }                // 操作类型
```

#### 2. 统一通知服务 (`IUnifiedNotificationService.cs` & `UnifiedNotificationService.cs`)

**核心功能：**

1. **获取统一通知列表**
   ```csharp
   Task<UnifiedNotificationListResponse> GetUnifiedNotificationsAsync(
       int page = 1,
       int pageSize = 10,
       string filterType = "all",
       string sortBy = "datetime")
   ```
   - 支持按类型过滤：all, notification, message, todo, task, system
   - 支持多种排序方式：datetime, priority, dueDate

2. **待办项管理**
   ```csharp
   Task<NoticeIconItem> CreateTodoAsync(CreateTodoRequest request)
   Task<NoticeIconItem?> UpdateTodoAsync(string id, UpdateTodoRequest request)
   Task<bool> CompleteTodoAsync(string id)
   Task<bool> DeleteTodoAsync(string id)
   ```

3. **系统消息管理**
   ```csharp
   Task<SystemMessageListResponse> GetSystemMessagesAsync(int page = 1, int pageSize = 10)
   ```

4. **任务通知管理**
   ```csharp
   Task<NoticeIconItem> CreateTaskNotificationAsync(
       string taskId,
       string taskName,
       string actionType,
       int priority,
       int status,
       string? assignedTo = null,
       string? remarks = null)
   ```

5. **已读状态管理**
   ```csharp
   Task<bool> MarkAsReadAsync(string id)
   Task<bool> MarkMultipleAsReadAsync(List<string> ids)
   Task<int> GetUnreadCountAsync()
   Task<UnreadCountStatistics> GetUnreadCountStatisticsAsync()
   ```

#### 3. 统一通知控制器 (`UnifiedNotificationController.cs`)

**API 端点：**

| 方法 | 端点 | 描述 |
|------|------|------|
| GET | `/api/unified-notification/center` | 获取统一通知列表 |
| GET | `/api/unified-notification/todos` | 获取待办项列表 |
| GET | `/api/unified-notification/system-messages` | 获取系统消息列表 |
| GET | `/api/unified-notification/task-notifications` | 获取任务通知列表 |
| POST | `/api/unified-notification/todos` | 创建待办项 |
| PUT | `/api/unified-notification/todos/{id}` | 更新待办项 |
| POST | `/api/unified-notification/todos/{id}/complete` | 完成待办项 |
| DELETE | `/api/unified-notification/todos/{id}` | 删除待办项 |
| POST | `/api/unified-notification/{id}/mark-as-read` | 标记为已读 |
| POST | `/api/unified-notification/mark-multiple-as-read` | 批量标记为已读 |
| GET | `/api/unified-notification/unread-count` | 获取未读数量 |
| GET | `/api/unified-notification/unread-statistics` | 获取未读统计 |

### 前端架构

#### 1. API 服务 (`services/unified-notification/api.ts`)

提供了所有后端 API 的前端调用接口，包括：
- 获取各类型通知列表
- 创建/更新/删除待办项
- 标记通知为已读
- 获取未读统计

#### 2. 统一通知中心组件 (`components/UnifiedNotificationCenter/index.tsx`)

**功能特性：**

1. **多标签页面**
   - 全部通知
   - 待办项
   - 系统消息
   - 任务通知

2. **待办项管理**
   - 创建待办项（支持优先级和截止日期）
   - 完成待办项
   - 删除待办项
   - 编辑待办项

3. **通知管理**
   - 标记为已读
   - 批量标记为已读
   - 显示未读状态

4. **实时统计**
   - 显示各类型未读数量
   - 支持分页加载

#### 3. 国际化支持

**中文 (zh-CN):**
```typescript
'pages.unifiedNotificationCenter.title': '通知中心'
'pages.unifiedNotificationCenter.todos': '待办'
'pages.unifiedNotificationCenter.system': '系统消息'
'pages.unifiedNotificationCenter.tasks': '任务通知'
// ... 更多翻译
```

**英文 (en-US):**
```typescript
'pages.unifiedNotificationCenter.title': 'Notification Center'
'pages.unifiedNotificationCenter.todos': 'Todos'
'pages.unifiedNotificationCenter.system': 'System Messages'
'pages.unifiedNotificationCenter.tasks': 'Task Notifications'
// ... 更多翻译
```

## 集成指南

### 1. 后端集成

#### 步骤 1：数据库迁移
由于使用了 MongoDB 的软删除和多租户特性，新增字段会自动处理。无需额外的数据库迁移。

#### 步骤 2：服务注册
统一通知服务已通过自动扫描注册到依赖注入容器中：

```csharp
// 在 Program.cs 中
services.AddBusinessServices("Platform.ApiService.Services");
```

#### 步骤 3：任务状态变化通知
在 `TaskService.cs` 中的任务状态变化方法中调用通知服务：

```csharp
private readonly IUnifiedNotificationService _unifiedNotificationService;

// 在任务分配时
await _unifiedNotificationService.CreateTaskNotificationAsync(
    taskId,
    task.TaskName,
    "task_assigned",
    (int)task.Priority,
    (int)task.Status,
    task.AssignedTo,
    "任务已分配给您"
);

// 在任务完成时
await _unifiedNotificationService.CreateTaskNotificationAsync(
    taskId,
    task.TaskName,
    "task_completed",
    (int)task.Priority,
    (int)task.Status,
    null,
    "任务已完成"
);
```

### 2. 前端集成

#### 步骤 1：在任务管理页面中添加通知中心按钮

```tsx
import UnifiedNotificationCenter from '@/components/UnifiedNotificationCenter';

const TaskManagement: React.FC = () => {
  const [notificationVisible, setNotificationVisible] = useState(false);

  return (
    <PageContainer
      extra={[
        <Button
          key="notification"
          icon={<BellOutlined />}
          onClick={() => setNotificationVisible(true)}
        >
          通知中心
        </Button>,
      ]}
    >
      {/* 任务管理内容 */}
      <UnifiedNotificationCenter
        visible={notificationVisible}
        onClose={() => setNotificationVisible(false)}
      />
    </PageContainer>
  );
};
```

#### 步骤 2：在顶部导航栏添加通知图标

```tsx
// 在 app.tsx 或 layout 中
import { Badge, Button } from 'antd';
import { BellOutlined } from '@ant-design/icons';
import { getUnreadStatistics } from '@/services/unified-notification/api';

const RightContent: React.FC = () => {
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    const fetchUnreadCount = async () => {
      const response = await getUnreadStatistics();
      if (response.success && response.data) {
        setUnreadCount(response.data.total);
      }
    };
    fetchUnreadCount();
  }, []);

  return (
    <Badge count={unreadCount} offset={[-5, 5]}>
      <Button
        type="text"
        icon={<BellOutlined />}
        onClick={() => setNotificationVisible(true)}
      />
    </Badge>
  );
};
```

## 使用示例

### 后端示例

#### 创建系统消息
```csharp
var notification = await _unifiedNotificationService.CreateTaskNotificationAsync(
    taskId: "task123",
    taskName: "完成项目报告",
    actionType: "task_assigned",
    priority: 2, // 高优先级
    status: 1,   // 已分配
    assignedTo: "user456",
    remarks: "请在今天完成"
);
```

#### 创建待办项
```csharp
var todo = await _unifiedNotificationService.CreateTodoAsync(
    new CreateTodoRequest
    {
        Title = "准备会议材料",
        Description = "为明天的会议准备 PPT 和文档",
        Priority = 2, // 高优先级
        DueDate = DateTime.UtcNow.AddDays(1),
        Tags = new List<string> { "会议", "紧急" }
    }
);
```

#### 获取统一通知列表
```csharp
var response = await _unifiedNotificationService.GetUnifiedNotificationsAsync(
    page: 1,
    pageSize: 10,
    filterType: "all",
    sortBy: "priority"
);
```

### 前端示例

#### 获取待办项列表
```typescript
const response = await getTodos(1, 10, 'dueDate');
if (response.success) {
  console.log('待办项:', response.data.todos);
}
```

#### 创建待办项
```typescript
const todo = await createTodo({
  title: '完成代码审查',
  description: '审查 PR #123',
  priority: 2,
  dueDate: dayjs().add(1, 'day').toISOString(),
});
```

#### 完成待办项
```typescript
await completeTodo(todoId);
```

## 优先级说明

| 值 | 标签 | 颜色 | 用途 |
|----|------|------|------|
| 0 | 低 | blue | 非紧急任务 |
| 1 | 中 | orange | 普通任务 |
| 2 | 高 | red | 重要任务 |
| 3 | 紧急 | volcano | 紧急任务 |

## 任务状态说明

| 值 | 状态 | 说明 |
|----|------|------|
| 0 | Pending | 待分配 |
| 1 | Assigned | 已分配 |
| 2 | InProgress | 执行中 |
| 3 | Completed | 已完成 |
| 4 | Cancelled | 已取消 |
| 5 | Failed | 失败 |
| 6 | Paused | 暂停 |

## 操作类型说明

| 操作类型 | 说明 | 触发条件 |
|---------|------|---------|
| task_created | 任务创建 | 新建任务时 |
| task_assigned | 任务分配 | 分配任务给用户时 |
| task_started | 任务开始 | 任务状态变为执行中时 |
| task_completed | 任务完成 | 任务状态变为已完成时 |
| task_cancelled | 任务取消 | 任务状态变为已取消时 |
| task_failed | 任务失败 | 任务状态变为失败时 |
| task_paused | 任务暂停 | 任务状态变为暂停时 |

## 最佳实践

### 1. 自动通知生成
在任务状态变化时自动生成通知，而不是手动创建。这样可以确保通知的一致性和完整性。

### 2. 优先级管理
根据任务的重要性设置合适的优先级，帮助用户快速识别重要任务。

### 3. 分页加载
对于大量通知，使用分页加载而不是一次性加载所有数据，提高性能。

### 4. 实时更新
使用 WebSocket 或 SignalR 实现实时通知更新，提升用户体验。

### 5. 清理过期数据
定期清理已读且超过一定时间的通知，保持数据库性能。

## 故障排除

### 问题 1：通知未显示
**原因：** 可能是权限问题或服务未正确注册
**解决方案：**
1. 检查用户是否已登录
2. 验证 `IUnifiedNotificationService` 是否已正确注册
3. 检查数据库连接是否正常

### 问题 2：待办项创建失败
**原因：** 可能是标题为空或用户信息获取失败
**解决方案：**
1. 确保标题不为空
2. 检查当前用户信息是否正确
3. 查看服务器日志获取详细错误信息

### 问题 3：性能问题
**原因：** 可能是一次性加载过多数据
**解决方案：**
1. 使用分页加载
2. 添加数据库索引
3. 考虑使用缓存

## 扩展功能

### 1. 通知模板
可以创建通知模板，支持变量替换，提高通知生成的效率。

### 2. 通知规则
支持创建通知规则，根据条件自动生成通知。

### 3. 通知订阅
允许用户订阅特定类型的通知，减少信息过载。

### 4. 通知导出
支持导出通知列表为 Excel 或 PDF 格式。

### 5. 通知分析
提供通知统计和分析功能，帮助了解用户行为。

## 相关文档

- [任务管理文档](./docs/features/TASK-MANAGEMENT.md)
- [API 文档](./docs/api.md)
- [数据库设计](./docs/database-design.md)

## 更新日志

### v1.0.0 (2024-12-02)
- 初始版本发布
- 支持系统消息、通知、待办和任务管理的统一管理
- 提供完整的前后端实现
- 支持国际化

## 许可证

MIT

