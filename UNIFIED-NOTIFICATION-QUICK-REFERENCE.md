# 统一通知中心 - 快速参考指南

## 快速开始

### 后端集成（5分钟）

#### 1. 在 TaskService 中添加通知生成

```csharp
// 在 TaskService 构造函数中注入服务
private readonly IUnifiedNotificationService _unifiedNotificationService;

public TaskService(
    IMongoClient mongoClient,
    IUserService userService,
    IUnifiedNotificationService unifiedNotificationService)
{
    _mongoClient = mongoClient;
    _userService = userService;
    _unifiedNotificationService = unifiedNotificationService;
}

// 在 AssignTaskAsync 方法中添加通知
public async Task<TaskDto> AssignTaskAsync(AssignTaskRequest request, string userId)
{
    // ... 现有代码 ...
    
    // 生成任务分配通知
    await _unifiedNotificationService.CreateTaskNotificationAsync(
        task.Id,
        task.TaskName,
        "task_assigned",
        (int)task.Priority,
        (int)task.Status,
        task.AssignedTo,
        request.Remarks
    );
    
    return taskDto;
}

// 在 CompleteTaskAsync 方法中添加通知
public async Task<TaskDto> CompleteTaskAsync(CompleteTaskRequest request, string userId)
{
    // ... 现有代码 ...
    
    // 生成任务完成通知
    await _unifiedNotificationService.CreateTaskNotificationAsync(
        task.Id,
        task.TaskName,
        "task_completed",
        (int)task.Priority,
        (int)task.Status,
        null,
        request.Remarks
    );
    
    return taskDto;
}
```

#### 2. 验证服务注册

在 `Program.cs` 中确保已注册服务：

```csharp
// 自动注册所有业务服务
services.AddBusinessServices("Platform.ApiService.Services");
```

### 前端集成（10分钟）

#### 1. 在任务管理页面中添加通知中心

```tsx
// Platform.Admin/src/pages/task-management/index.tsx

import UnifiedNotificationCenter from '@/components/UnifiedNotificationCenter';
import { BellOutlined } from '@ant-design/icons';

const TaskManagement: React.FC = () => {
  const [notificationVisible, setNotificationVisible] = useState(false);

  return (
    <PageContainer
      extra={[
        <Button
          key="notification"
          type="primary"
          icon={<BellOutlined />}
          onClick={() => setNotificationVisible(true)}
        >
          通知中心
        </Button>,
      ]}
    >
      {/* 现有任务管理内容 */}
      
      <UnifiedNotificationCenter
        visible={notificationVisible}
        onClose={() => setNotificationVisible(false)}
      />
    </PageContainer>
  );
};
```

#### 2. 在顶部导航栏添加通知图标（可选）

```tsx
// Platform.Admin/src/app.tsx

import { Badge, Button, Tooltip } from 'antd';
import { BellOutlined } from '@ant-design/icons';
import { getUnreadStatistics } from '@/services/unified-notification/api';

// 在 RightContent 组件中
const [unreadCount, setUnreadCount] = useState(0);
const [notificationVisible, setNotificationVisible] = useState(false);

useEffect(() => {
  const fetchUnreadCount = async () => {
    try {
      const response = await getUnreadStatistics();
      if (response.success && response.data) {
        setUnreadCount(response.data.total);
      }
    } catch (error) {
      console.error('获取未读数量失败:', error);
    }
  };

  fetchUnreadCount();
  // 每30秒刷新一次
  const interval = setInterval(fetchUnreadCount, 30000);
  return () => clearInterval(interval);
}, []);

return (
  <Tooltip title="通知中心">
    <Badge count={unreadCount} offset={[-5, 5]}>
      <Button
        type="text"
        icon={<BellOutlined />}
        onClick={() => setNotificationVisible(true)}
      />
    </Badge>
  </Tooltip>
);
```

## API 快速参考

### 获取通知

```typescript
// 获取所有通知
const response = await getUnifiedNotifications(
  page: 1,
  pageSize: 10,
  filterType: 'all',      // 'all', 'notification', 'message', 'todo', 'task', 'system'
  sortBy: 'datetime'       // 'datetime', 'priority', 'dueDate'
);

// 获取待办项
const todos = await getTodos(page: 1, pageSize: 10, sortBy: 'dueDate');

// 获取系统消息
const messages = await getSystemMessages(page: 1, pageSize: 10);

// 获取任务通知
const taskNotifications = await getTaskNotifications(page: 1, pageSize: 10);
```

### 管理待办项

```typescript
// 创建待办项
const todo = await createTodo({
  title: '完成代码审查',
  description: '审查 PR #123',
  priority: 2,              // 0=低, 1=中, 2=高, 3=紧急
  dueDate: '2024-12-03T10:00:00Z',
  tags: ['代码审查', '紧急']
});

// 更新待办项
const updated = await updateTodo(todoId, {
  title: '已开始代码审查',
  priority: 3
});

// 完成待办项
await completeTodo(todoId);

// 删除待办项
await deleteTodo(todoId);
```

### 管理已读状态

```typescript
// 标记单个通知为已读
await markAsRead(notificationId);

// 批量标记为已读
await markMultipleAsRead([id1, id2, id3]);

// 获取未读数量
const { unreadCount } = await getUnreadCount();

// 获取未读统计（按类型）
const stats = await getUnreadStatistics();
// stats = {
//   total: 5,
//   systemMessages: 1,
//   notifications: 2,
//   messages: 0,
//   todos: 1,
//   taskNotifications: 1
// }
```

## 常见场景

### 场景 1：任务分配时生成通知

```csharp
// 后端代码
public async Task<TaskDto> AssignTaskAsync(AssignTaskRequest request, string userId)
{
    var task = await GetTaskByIdAsync(request.TaskId);
    task.AssignedTo = request.AssignedTo;
    task.Status = TaskStatus.Assigned;
    
    await _taskCollection.ReplaceOneAsync(
        Builders<WorkTask>.Filter.Eq(t => t.Id, task.Id),
        task
    );
    
    // 生成通知
    await _unifiedNotificationService.CreateTaskNotificationAsync(
        task.Id,
        task.TaskName,
        "task_assigned",
        (int)task.Priority,
        (int)task.Status,
        task.AssignedTo,
        $"任务已分配给 {request.AssignedTo}"
    );
    
    return MapToDto(task);
}
```

### 场景 2：用户创建待办项

```typescript
// 前端代码
const handleCreateTodo = async () => {
  if (!title.trim()) {
    message.error('请输入待办项标题');
    return;
  }

  try {
    const todo = await createTodo({
      title,
      description,
      priority,
      dueDate: dueDate?.toISOString(),
    });
    
    message.success('待办项创建成功');
    setTitle('');
    setDescription('');
    setPriority(1);
    setDueDate(null);
    
    // 刷新列表
    fetchTodos();
  } catch (error) {
    message.error('创建失败');
  }
};
```

### 场景 3：显示未读通知徽章

```typescript
const [unreadStats, setUnreadStats] = useState(null);

useEffect(() => {
  const fetchStats = async () => {
    const response = await getUnreadStatistics();
    if (response.success) {
      setUnreadStats(response.data);
    }
  };

  fetchStats();
  const interval = setInterval(fetchStats, 30000);
  return () => clearInterval(interval);
}, []);

return (
  <Tabs
    items={[
      {
        key: 'all',
        label: <Badge count={unreadStats?.total}>全部</Badge>,
      },
      {
        key: 'todos',
        label: <Badge count={unreadStats?.todos}>待办</Badge>,
      },
      {
        key: 'system',
        label: <Badge count={unreadStats?.systemMessages}>系统消息</Badge>,
      },
      {
        key: 'tasks',
        label: <Badge count={unreadStats?.taskNotifications}>任务通知</Badge>,
      },
    ]}
  />
);
```

## 数据模型

### 通知项 (UnifiedNotificationItem)

```typescript
interface UnifiedNotificationItem {
  id: string;                    // 通知ID
  title: string;                 // 标题
  description?: string;          // 描述
  avatar?: string;               // 头像/图标
  datetime: string;              // 时间
  type: 'Notification' | 'Message' | 'Event' | 'Task' | 'System';
  read: boolean;                 // 是否已读
  
  // 任务相关
  taskId?: string;               // 关联任务ID
  taskPriority?: number;         // 任务优先级
  taskStatus?: number;           // 任务状态
  
  // 待办相关
  isTodo?: boolean;              // 是否为待办项
  todoPriority?: number;         // 待办优先级
  todoDueDate?: string;          // 待办截止日期
  
  // 系统消息相关
  isSystemMessage?: boolean;     // 是否为系统消息
  messagePriority?: number;      // 消息优先级
  
  // 其他
  actionType?: string;           // 操作类型
  relatedUserIds?: string[];     // 相关用户ID列表
}
```

### 未读统计 (UnreadCountStatistics)

```typescript
interface UnreadCountStatistics {
  total: number;                 // 总未读数
  systemMessages: number;        // 系统消息未读数
  notifications: number;         // 通知未读数
  messages: number;              // 消息未读数
  todos: number;                 // 待办项未读数
  taskNotifications: number;     // 任务通知未读数
}
```

## 优先级对应表

| 值 | 标签 | 颜色 | 用途 |
|----|------|------|------|
| 0 | 低 | blue | 非紧急任务 |
| 1 | 中 | orange | 普通任务 |
| 2 | 高 | red | 重要任务 |
| 3 | 紧急 | volcano | 紧急任务 |

## 操作类型对应表

| 操作类型 | 说明 | 自动生成 |
|---------|------|---------|
| task_created | 任务创建 | ✓ |
| task_assigned | 任务分配 | ✓ |
| task_started | 任务开始 | ✓ |
| task_completed | 任务完成 | ✓ |
| task_cancelled | 任务取消 | ✓ |
| task_failed | 任务失败 | ✓ |
| task_paused | 任务暂停 | ✓ |

## 故障排除

### Q: 通知未显示？
A: 检查以下几点：
1. 确保用户已登录
2. 检查浏览器控制台是否有错误
3. 验证后端服务是否正常运行
4. 检查网络请求是否成功

### Q: 待办项创建失败？
A: 检查以下几点：
1. 标题不能为空
2. 检查网络连接
3. 查看服务器日志获取详细错误信息

### Q: 性能问题？
A: 尝试以下方案：
1. 使用分页加载而不是一次性加载所有数据
2. 定期清理已读通知
3. 添加数据库索引

## 文件清单

### 后端文件
- `Platform.ApiService/Models/NoticeModels.cs` - 数据模型
- `Platform.ApiService/Services/IUnifiedNotificationService.cs` - 服务接口
- `Platform.ApiService/Services/UnifiedNotificationService.cs` - 服务实现
- `Platform.ApiService/Controllers/UnifiedNotificationController.cs` - API 控制器

### 前端文件
- `Platform.Admin/src/services/unified-notification/api.ts` - API 服务
- `Platform.Admin/src/components/UnifiedNotificationCenter/index.tsx` - 组件
- `Platform.Admin/src/components/UnifiedNotificationCenter/index.less` - 样式
- `Platform.Admin/src/locales/zh-CN/pages.ts` - 中文翻译
- `Platform.Admin/src/locales/en-US/pages.ts` - 英文翻译

### 文档文件
- `UNIFIED-NOTIFICATION-INTEGRATION.md` - 完整集成指南
- `UNIFIED-NOTIFICATION-QUICK-REFERENCE.md` - 快速参考（本文件）

## 下一步

1. ✅ 后端模型扩展完成
2. ✅ 后端服务实现完成
3. ✅ 前端组件实现完成
4. ⏳ 在 TaskService 中集成通知生成逻辑
5. ⏳ 在任务管理页面中集成通知中心
6. ⏳ 测试整个流程
7. ⏳ 部署到生产环境

## 支持

如有问题，请查看完整的集成指南：`UNIFIED-NOTIFICATION-INTEGRATION.md`

