# 任务通知集成指南

## 概述

本指南说明如何在 TaskService 中集成统一通知服务，使得任务状态变化时自动生成相应的通知。

## 集成步骤

### 步骤 1：在 TaskService 中注入 IUnifiedNotificationService

**文件：** `Platform.ApiService/Services/TaskService.cs`

```csharp
public class TaskService : ITaskService
{
    private readonly IMongoClient _mongoClient;
    private readonly IUserService _userService;
    private readonly IUnifiedNotificationService _unifiedNotificationService;  // 新增

    public TaskService(
        IMongoClient mongoClient,
        IUserService userService,
        IUnifiedNotificationService unifiedNotificationService)  // 新增参数
    {
        _mongoClient = mongoClient;
        _userService = userService;
        _unifiedNotificationService = unifiedNotificationService;  // 新增赋值
    }

    // ... 其他代码 ...
}
```

### 步骤 2：在 AssignTaskAsync 中添加通知

```csharp
/// <summary>
/// 分配任务
/// </summary>
public async Task<TaskDto> AssignTaskAsync(AssignTaskRequest request, string userId)
{
    var task = await GetTaskByIdAsync(request.TaskId);
    if (task == null)
        throw new KeyNotFoundException($"任务 {request.TaskId} 不存在");

    // 更新任务
    task.AssignedTo = request.AssignedTo;
    task.Status = TaskStatus.Assigned;
    task.AssignedAt = DateTime.UtcNow;

    var collection = _mongoClient.GetDatabase("aspire").GetCollection<WorkTask>("tasks");
    await collection.ReplaceOneAsync(
        Builders<WorkTask>.Filter.Eq(t => t.Id, task.Id),
        task
    );

    // 新增：生成任务分配通知
    try
    {
        await _unifiedNotificationService.CreateTaskNotificationAsync(
            taskId: task.Id,
            taskName: task.TaskName,
            actionType: "task_assigned",
            priority: (int)task.Priority,
            status: (int)task.Status,
            assignedTo: task.AssignedTo,
            remarks: request.Remarks ?? "任务已分配给您"
        );
    }
    catch (Exception ex)
    {
        // 记录错误但不影响任务分配
        Console.WriteLine($"创建任务通知失败: {ex.Message}");
    }

    return MapToDto(task);
}
```

### 步骤 3：在 ExecuteTaskAsync 中添加通知

```csharp
/// <summary>
/// 执行任务
/// </summary>
public async Task<TaskDto> ExecuteTaskAsync(ExecuteTaskRequest request, string userId)
{
    var task = await GetTaskByIdAsync(request.TaskId);
    if (task == null)
        throw new KeyNotFoundException($"任务 {request.TaskId} 不存在");

    // 更新任务
    task.Status = TaskStatus.InProgress;
    task.ActualStartTime = DateTime.UtcNow;

    var collection = _mongoClient.GetDatabase("aspire").GetCollection<WorkTask>("tasks");
    await collection.ReplaceOneAsync(
        Builders<WorkTask>.Filter.Eq(t => t.Id, task.Id),
        task
    );

    // 新增：生成任务开始通知
    try
    {
        await _unifiedNotificationService.CreateTaskNotificationAsync(
            taskId: task.Id,
            taskName: task.TaskName,
            actionType: "task_started",
            priority: (int)task.Priority,
            status: (int)task.Status,
            assignedTo: task.AssignedTo,
            remarks: request.Message ?? "任务已开始执行"
        );
    }
    catch (Exception ex)
    {
        Console.WriteLine($"创建任务通知失败: {ex.Message}");
    }

    return MapToDto(task);
}
```

### 步骤 4：在 CompleteTaskAsync 中添加通知

```csharp
/// <summary>
/// 完成任务
/// </summary>
public async Task<TaskDto> CompleteTaskAsync(CompleteTaskRequest request, string userId)
{
    var task = await GetTaskByIdAsync(request.TaskId);
    if (task == null)
        throw new KeyNotFoundException($"任务 {request.TaskId} 不存在");

    // 更新任务
    task.Status = TaskStatus.Completed;
    task.ExecutionResult = request.ExecutionResult ?? TaskExecutionResult.Success;
    task.ActualEndTime = DateTime.UtcNow;

    if (task.ActualStartTime.HasValue)
    {
        task.ActualDuration = (int)(task.ActualEndTime.Value - task.ActualStartTime.Value).TotalMinutes;
    }

    var collection = _mongoClient.GetDatabase("aspire").GetCollection<WorkTask>("tasks");
    await collection.ReplaceOneAsync(
        Builders<WorkTask>.Filter.Eq(t => t.Id, task.Id),
        task
    );

    // 新增：生成任务完成通知
    try
    {
        await _unifiedNotificationService.CreateTaskNotificationAsync(
            taskId: task.Id,
            taskName: task.TaskName,
            actionType: "task_completed",
            priority: (int)task.Priority,
            status: (int)task.Status,
            assignedTo: task.AssignedTo,
            remarks: request.Remarks ?? "任务已完成"
        );
    }
    catch (Exception ex)
    {
        Console.WriteLine($"创建任务通知失败: {ex.Message}");
    }

    return MapToDto(task);
}
```

### 步骤 5：在 CancelTaskAsync 中添加通知

```csharp
/// <summary>
/// 取消任务
/// </summary>
public async Task<bool> CancelTaskAsync(string taskId, string userId, string? remarks = null)
{
    var task = await GetTaskByIdAsync(taskId);
    if (task == null)
        throw new KeyNotFoundException($"任务 {taskId} 不存在");

    // 更新任务
    task.Status = TaskStatus.Cancelled;

    var collection = _mongoClient.GetDatabase("aspire").GetCollection<WorkTask>("tasks");
    var result = await collection.ReplaceOneAsync(
        Builders<WorkTask>.Filter.Eq(t => t.Id, task.Id),
        task
    );

    // 新增：生成任务取消通知
    try
    {
        await _unifiedNotificationService.CreateTaskNotificationAsync(
            taskId: task.Id,
            taskName: task.TaskName,
            actionType: "task_cancelled",
            priority: (int)task.Priority,
            status: (int)task.Status,
            assignedTo: task.AssignedTo,
            remarks: remarks ?? "任务已取消"
        );
    }
    catch (Exception ex)
    {
        Console.WriteLine($"创建任务通知失败: {ex.Message}");
    }

    return result.ModifiedCount > 0;
}
```

### 步骤 6：在 CreateTaskAsync 中添加通知（可选）

```csharp
/// <summary>
/// 创建任务
/// </summary>
public async Task<TaskDto> CreateTaskAsync(CreateTaskRequest request, string userId, string companyId)
{
    var task = new WorkTask
    {
        TaskName = request.TaskName,
        Description = request.Description,
        TaskType = request.TaskType,
        Priority = (TaskPriority)(request.Priority ?? 1),
        CreatedBy = userId,
        CreatedAt = DateTime.UtcNow,
        CompanyId = companyId,
        // ... 其他字段 ...
    };

    var collection = _mongoClient.GetDatabase("aspire").GetCollection<WorkTask>("tasks");
    await collection.InsertOneAsync(task);

    // 新增：生成任务创建通知（可选，如果需要的话）
    try
    {
        await _unifiedNotificationService.CreateTaskNotificationAsync(
            taskId: task.Id,
            taskName: task.TaskName,
            actionType: "task_created",
            priority: (int)task.Priority,
            status: (int)task.Status,
            assignedTo: request.AssignedTo,
            remarks: "新任务已创建"
        );
    }
    catch (Exception ex)
    {
        Console.WriteLine($"创建任务通知失败: {ex.Message}");
    }

    return MapToDto(task);
}
```

## 完整示例

### 完整的 TaskService 集成示例

```csharp
using Platform.ApiService.Models;
using Platform.ServiceDefaults.Models;
using Platform.ServiceDefaults.Services;
using MongoDB.Driver;

namespace Platform.ApiService.Services;

public class TaskService : ITaskService
{
    private readonly IMongoClient _mongoClient;
    private readonly IUserService _userService;
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

    // ... 其他方法 ...

    public async Task<TaskDto> AssignTaskAsync(AssignTaskRequest request, string userId)
    {
        var task = await GetTaskByIdAsync(request.TaskId);
        if (task == null)
            throw new KeyNotFoundException($"任务 {request.TaskId} 不存在");

        task.AssignedTo = request.AssignedTo;
        task.Status = TaskStatus.Assigned;
        task.AssignedAt = DateTime.UtcNow;

        var collection = _mongoClient.GetDatabase("aspire").GetCollection<WorkTask>("tasks");
        await collection.ReplaceOneAsync(
            Builders<WorkTask>.Filter.Eq(t => t.Id, task.Id),
            task
        );

        // 生成通知
        await CreateTaskNotificationSafely(
            task.Id,
            task.TaskName,
            "task_assigned",
            (int)task.Priority,
            (int)task.Status,
            task.AssignedTo,
            request.Remarks ?? "任务已分配给您"
        );

        return MapToDto(task);
    }

    public async Task<TaskDto> ExecuteTaskAsync(ExecuteTaskRequest request, string userId)
    {
        var task = await GetTaskByIdAsync(request.TaskId);
        if (task == null)
            throw new KeyNotFoundException($"任务 {request.TaskId} 不存在");

        task.Status = TaskStatus.InProgress;
        task.ActualStartTime = DateTime.UtcNow;

        var collection = _mongoClient.GetDatabase("aspire").GetCollection<WorkTask>("tasks");
        await collection.ReplaceOneAsync(
            Builders<WorkTask>.Filter.Eq(t => t.Id, task.Id),
            task
        );

        // 生成通知
        await CreateTaskNotificationSafely(
            task.Id,
            task.TaskName,
            "task_started",
            (int)task.Priority,
            (int)task.Status,
            task.AssignedTo,
            request.Message ?? "任务已开始执行"
        );

        return MapToDto(task);
    }

    public async Task<TaskDto> CompleteTaskAsync(CompleteTaskRequest request, string userId)
    {
        var task = await GetTaskByIdAsync(request.TaskId);
        if (task == null)
            throw new KeyNotFoundException($"任务 {request.TaskId} 不存在");

        task.Status = TaskStatus.Completed;
        task.ExecutionResult = request.ExecutionResult ?? TaskExecutionResult.Success;
        task.ActualEndTime = DateTime.UtcNow;

        if (task.ActualStartTime.HasValue)
        {
            task.ActualDuration = (int)(task.ActualEndTime.Value - task.ActualStartTime.Value).TotalMinutes;
        }

        var collection = _mongoClient.GetDatabase("aspire").GetCollection<WorkTask>("tasks");
        await collection.ReplaceOneAsync(
            Builders<WorkTask>.Filter.Eq(t => t.Id, task.Id),
            task
        );

        // 生成通知
        await CreateTaskNotificationSafely(
            task.Id,
            task.TaskName,
            "task_completed",
            (int)task.Priority,
            (int)task.Status,
            task.AssignedTo,
            request.Remarks ?? "任务已完成"
        );

        return MapToDto(task);
    }

    public async Task<bool> CancelTaskAsync(string taskId, string userId, string? remarks = null)
    {
        var task = await GetTaskByIdAsync(taskId);
        if (task == null)
            throw new KeyNotFoundException($"任务 {taskId} 不存在");

        task.Status = TaskStatus.Cancelled;

        var collection = _mongoClient.GetDatabase("aspire").GetCollection<WorkTask>("tasks");
        var result = await collection.ReplaceOneAsync(
            Builders<WorkTask>.Filter.Eq(t => t.Id, task.Id),
            task
        );

        // 生成通知
        await CreateTaskNotificationSafely(
            task.Id,
            task.TaskName,
            "task_cancelled",
            (int)task.Priority,
            (int)task.Status,
            task.AssignedTo,
            remarks ?? "任务已取消"
        );

        return result.ModifiedCount > 0;
    }

    // 辅助方法：安全地创建任务通知
    private async Task CreateTaskNotificationSafely(
        string taskId,
        string taskName,
        string actionType,
        int priority,
        int status,
        string? assignedTo,
        string remarks)
    {
        try
        {
            await _unifiedNotificationService.CreateTaskNotificationAsync(
                taskId: taskId,
                taskName: taskName,
                actionType: actionType,
                priority: priority,
                status: status,
                assignedTo: assignedTo,
                remarks: remarks
            );
        }
        catch (Exception ex)
        {
            // 记录错误但不影响任务操作
            Console.WriteLine($"创建任务通知失败 [{actionType}]: {ex.Message}");
            // 可以添加日志记录
            // _logger.LogError($"创建任务通知失败: {ex}");
        }
    }

    // ... 其他方法 ...
}
```

## 测试

### 单元测试示例

```csharp
[TestClass]
public class TaskServiceNotificationTests
{
    private TaskService _taskService;
    private Mock<IMongoClient> _mongoClientMock;
    private Mock<IUserService> _userServiceMock;
    private Mock<IUnifiedNotificationService> _notificationServiceMock;

    [TestInitialize]
    public void Setup()
    {
        _mongoClientMock = new Mock<IMongoClient>();
        _userServiceMock = new Mock<IUserService>();
        _notificationServiceMock = new Mock<IUnifiedNotificationService>();

        _taskService = new TaskService(
            _mongoClientMock.Object,
            _userServiceMock.Object,
            _notificationServiceMock.Object
        );
    }

    [TestMethod]
    public async Task AssignTaskAsync_ShouldCreateNotification()
    {
        // Arrange
        var taskId = "task123";
        var assignedTo = "user456";
        var request = new AssignTaskRequest { TaskId = taskId, AssignedTo = assignedTo };

        // Act
        await _taskService.AssignTaskAsync(request, "user123");

        // Assert
        _notificationServiceMock.Verify(
            x => x.CreateTaskNotificationAsync(
                taskId,
                It.IsAny<string>(),
                "task_assigned",
                It.IsAny<int>(),
                It.IsAny<int>(),
                assignedTo,
                It.IsAny<string>()
            ),
            Times.Once
        );
    }

    [TestMethod]
    public async Task CompleteTaskAsync_ShouldCreateNotification()
    {
        // Arrange
        var taskId = "task123";
        var request = new CompleteTaskRequest { TaskId = taskId };

        // Act
        await _taskService.CompleteTaskAsync(request, "user123");

        // Assert
        _notificationServiceMock.Verify(
            x => x.CreateTaskNotificationAsync(
                taskId,
                It.IsAny<string>(),
                "task_completed",
                It.IsAny<int>(),
                It.IsAny<int>(),
                It.IsAny<string>(),
                It.IsAny<string>()
            ),
            Times.Once
        );
    }
}
```

## 验证

### 手动验证步骤

1. **启动应用**
   ```bash
   dotnet run --project Platform.ApiService
   ```

2. **创建任务**
   ```bash
   POST /api/task/create
   {
     "taskName": "测试任务",
     "taskType": "development",
     "priority": 2
   }
   ```

3. **分配任务**
   ```bash
   POST /api/task/assign
   {
     "taskId": "task123",
     "assignedTo": "user456"
   }
   ```

4. **验证通知**
   ```bash
   GET /api/unified-notification/task-notifications
   ```
   应该看到任务分配通知

5. **执行任务**
   ```bash
   POST /api/task/execute
   {
     "taskId": "task123"
   }
   ```

6. **完成任务**
   ```bash
   POST /api/task/complete
   {
     "taskId": "task123"
   }
   ```

7. **验证通知**
   ```bash
   GET /api/unified-notification/task-notifications
   ```
   应该看到任务完成通知

## 常见问题

### Q: 通知创建失败会影响任务操作吗？
A: 不会。我们使用 try-catch 捕获异常，确保通知创建失败不会影响任务操作。

### Q: 如何禁用通知生成？
A: 可以注释掉 `CreateTaskNotificationSafely` 的调用，或者在配置中添加开关。

### Q: 如何自定义通知内容？
A: 修改 `CreateTaskNotificationSafely` 方法中的 `remarks` 参数，或者在 `UnifiedNotificationService` 中修改 `GenerateTaskNotificationContent` 方法。

## 下一步

1. ✅ 在 TaskService 中集成通知生成
2. ⏳ 在任务管理页面中集成通知中心
3. ⏳ 添加实时通知推送
4. ⏳ 实现通知模板系统

## 相关文档

- [统一通知集成指南](./UNIFIED-NOTIFICATION-INTEGRATION.md)
- [快速参考指南](./UNIFIED-NOTIFICATION-QUICK-REFERENCE.md)
- [变更总结](./UNIFIED-NOTIFICATION-CHANGES-SUMMARY.md)

