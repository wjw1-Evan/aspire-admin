# 任务与项目管理指南

> 本文档说明任务管理和项目管理功能的使用方式、数据模型和最佳实践。

## 📋 概述

任务与项目管理模块提供完整的任务和项目协作能力，支持：

- **任务管理**：创建、分配、执行、监控任务
- **任务树**：支持父子任务关系
- **任务依赖**：定义任务之间的依赖关系
- **项目管理**：创建项目、管理成员、关联任务
- **执行日志**：记录任务执行过程

## 🎯 核心概念

### 任务（Task）

任务是最小的工作单元，包含以下属性：

- **基本信息**：标题、描述、优先级、状态
- **时间信息**：计划开始时间、计划结束时间、实际开始时间、实际结束时间
- **关联信息**：项目ID、父任务ID、执行人ID
- **状态跟踪**：待分配、进行中、已完成、已取消

### 项目（Project）

项目是任务的容器，包含以下属性：

- **基本信息**：名称、描述、状态
- **成员管理**：项目成员列表
- **统计信息**：任务数量、完成率等

## 📊 数据模型

### 任务状态

```csharp
public enum TaskStatus
{
    Pending = 0,      // 待分配
    InProgress = 1,   // 进行中
    Completed = 2,    // 已完成
    Cancelled = 3     // 已取消
}
```

### 任务优先级

```csharp
public enum TaskPriority
{
    Low = 0,      // 低
    Medium = 1,   // 中
    High = 2,     // 高
    Urgent = 3    // 紧急
}
```

### 项目状态

```csharp
public enum ProjectStatus
{
    Planning = 0,    // 规划中
    Active = 1,      // 进行中
    Completed = 2,   // 已完成
    Cancelled = 3    // 已取消
}
```

## 🚀 API 使用

### 任务管理

#### 1. 创建任务

**API**：
```
POST /api/tasks
```

**请求**：
```json
{
  "title": "实现用户登录功能",
  "description": "实现用户登录、注册、密码重置功能",
  "priority": 2,
  "projectId": "project123",
  "assigneeId": "user456",
  "plannedStartAt": "2024-01-01T00:00:00Z",
  "plannedEndAt": "2024-01-15T00:00:00Z",
  "parentTaskId": null,
  "dependencies": []
}
```

#### 2. 更新任务

**API**：
```
PUT /api/tasks/{id}
```

**请求**：
```json
{
  "title": "实现用户登录功能（更新）",
  "description": "更新后的描述",
  "priority": 3,
  "status": 1,
  "assigneeId": "user789",
  "actualStartAt": "2024-01-02T00:00:00Z"
}
```

#### 3. 查询任务列表

**API**：
```
POST /api/tasks/list
```

**请求**：
```json
{
  "pageIndex": 1,
  "pageSize": 20,
  "projectId": "project123",
  "assigneeId": "user456",
  "status": 1,
  "priority": 2,
  "keyword": "登录"
}
```

#### 4. 获取任务详情

**API**：
```
GET /api/tasks/{id}
```

**响应**：
```json
{
  "success": true,
  "data": {
    "id": "task123",
    "title": "实现用户登录功能",
    "description": "实现用户登录、注册、密码重置功能",
    "priority": 2,
    "status": 1,
    "projectId": "project123",
    "assigneeId": "user456",
    "assigneeName": "张三",
    "parentTaskId": null,
    "plannedStartAt": "2024-01-01T00:00:00Z",
    "plannedEndAt": "2024-01-15T00:00:00Z",
    "actualStartAt": "2024-01-02T00:00:00Z",
    "actualEndAt": null,
    "dependencies": [],
    "subTasks": [],
    "executionLogs": [],
    "createdAt": "2024-01-01T00:00:00Z",
    "updatedAt": "2024-01-02T00:00:00Z"
  }
}
```

#### 5. 删除任务

**API**：
```
DELETE /api/tasks/{id}
```

#### 6. 批量更新任务状态

**API**：
```
POST /api/tasks/batch-update-status
```

**请求**：
```json
{
  "taskIds": ["task1", "task2", "task3"],
  "status": 2
}
```

#### 7. 获取任务树

**API**：
```
GET /api/tasks/{id}/tree
```

**响应**：
```json
{
  "success": true,
  "data": {
    "id": "task123",
    "title": "父任务",
    "subTasks": [
      {
        "id": "task124",
        "title": "子任务1",
        "subTasks": []
      },
      {
        "id": "task125",
        "title": "子任务2",
        "subTasks": []
      }
    ]
  }
}
```

#### 8. 添加执行日志

**API**：
```
POST /api/tasks/{id}/execution-logs
```

**请求**：
```json
{
  "content": "已完成用户登录接口开发",
  "attachments": []
}
```

### 项目管理

#### 1. 创建项目

**API**：
```
POST /api/projects
```

**请求**：
```json
{
  "name": "用户管理系统",
  "description": "开发用户管理相关功能",
  "status": 1,
  "memberIds": ["user1", "user2", "user3"]
}
```

#### 2. 更新项目

**API**：
```
PUT /api/projects/{id}
```

#### 3. 查询项目列表

**API**：
```
POST /api/projects/list
```

**请求**：
```json
{
  "pageIndex": 1,
  "pageSize": 20,
  "status": 1,
  "keyword": "用户"
}
```

#### 4. 获取项目详情

**API**：
```
GET /api/projects/{id}
```

**响应**：
```json
{
  "success": true,
  "data": {
    "id": "project123",
    "name": "用户管理系统",
    "description": "开发用户管理相关功能",
    "status": 1,
    "members": [
      {
        "userId": "user1",
        "username": "张三",
        "role": "项目经理"
      }
    ],
    "statistics": {
      "totalTasks": 10,
      "completedTasks": 5,
      "inProgressTasks": 3,
      "pendingTasks": 2,
      "completionRate": 50.0
    },
    "createdAt": "2024-01-01T00:00:00Z",
    "updatedAt": "2024-01-15T00:00:00Z"
  }
}
```

#### 5. 添加项目成员

**API**：
```
POST /api/projects/{id}/members
```

**请求**：
```json
{
  "userId": "user456",
  "role": "开发人员"
}
```

#### 6. 移除项目成员

**API**：
```
DELETE /api/projects/{id}/members/{userId}
```

#### 7. 获取项目统计

**API**：
```
GET /api/projects/{id}/statistics
```

## 🌳 任务树结构

### 创建子任务

```json
{
  "title": "子任务",
  "parentTaskId": "parentTask123",
  "projectId": "project123"
}
```

### 任务树查询

任务树支持多级嵌套，通过 `GET /api/tasks/{id}/tree` 获取完整的任务树结构。

## 🔗 任务依赖

### 定义依赖

```json
{
  "title": "任务B",
  "dependencies": ["taskA"]  // 依赖任务A
}
```

### 依赖检查

- 任务开始前检查依赖任务是否完成
- 如果依赖任务未完成，不允许开始当前任务
- 删除任务时检查是否有其他任务依赖它

## 📝 执行日志

### 日志内容

执行日志记录任务执行过程中的关键信息：

- **内容**：日志描述
- **附件**：相关文件
- **时间戳**：记录时间
- **操作人**：记录人信息

### 日志查询

```
GET /api/tasks/{id}/execution-logs
```

## 🔐 权限控制

### 菜单权限

- **任务管理**：`project-management-task`
- **项目管理**：`project-management-project`

### 操作权限

- **创建任务**：需要 `project-management-task` 权限
- **分配任务**：需要项目成员身份或管理员权限
- **更新任务**：任务执行人或项目管理员
- **删除任务**：项目管理员

## 💡 最佳实践

### 1. 任务规划

- ✅ 任务粒度适中，不宜过大或过小
- ✅ 明确任务优先级和截止时间
- ✅ 合理分配任务执行人
- ✅ 定义清晰的验收标准

### 2. 任务依赖

- ✅ 识别任务之间的依赖关系
- ✅ 优先完成关键路径上的任务
- ✅ 避免循环依赖
- ✅ 及时更新依赖状态

### 3. 任务跟踪

- ✅ 定期更新任务进度
- ✅ 记录关键决策和问题
- ✅ 及时调整任务计划
- ✅ 保持沟通畅通

### 4. 项目管理

- ✅ 明确项目目标和范围
- ✅ 合理分配项目成员
- ✅ 定期回顾项目进度
- ✅ 及时处理项目风险

## 📊 统计报表

### 任务统计

- 总任务数
- 各状态任务数量
- 完成率
- 平均完成时间
- 优先级分布

### 项目统计

- 项目总数
- 各状态项目数量
- 项目完成率
- 项目成员统计
- 任务分布统计

## 🔍 常见问题

### Q: 如何创建任务树？

A: 创建子任务时指定 `parentTaskId`，系统会自动建立父子关系。

### Q: 任务依赖如何工作？

A: 任务依赖通过 `dependencies` 字段定义，系统会检查依赖任务状态。

### Q: 可以跨项目分配任务吗？

A: 任务必须属于某个项目，不能跨项目分配。

### Q: 删除项目会影响任务吗？

A: 删除项目前需要先处理项目下的所有任务（完成或取消）。

### Q: 执行日志可以删除吗？

A: 执行日志是历史记录，不建议删除。如需修改，可以添加新的日志说明。

## 📚 相关文档

- [后端核心与中间件规范](BACKEND-RULES.md)
- [统一 API 响应与控制器规范](API-RESPONSE-RULES.md)
- [菜单级权限模型](MENU-LEVEL-PERMISSION-GUIDE.md)
