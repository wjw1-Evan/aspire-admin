# Platform.App 移动端开发方案

## 项目管理 & 任务管理模块

---

## 一、开发路线图

| 阶段 | 内容 | 预计时间 |
|------|------|---------|
| **1. 基础设施** | 通用组件库 + 类型定义 + 服务层 + Hooks | 1 周 |
| **2. 项目管理** | 项目列表/详情/创建编辑/统计 + Tab 导航重构 | 2 周 |
| **3. 任务管理** | 任务列表/详情/创建编辑/执行 + 首页概览 | 2 周 |
| **4. 收尾优化** | 甘特图 + 离线缓存 + 权限 + 测试 | 1 周 |
| **总计** | | **6 周（1.5 个月）** |

---

## 二、第一阶段：基础设施

### 2.1 通用 UI 组件

| 组件 | 路径 | 功能 |
|------|------|------|
| `PageContainer` | `components/ui/PageContainer.tsx` | 标准页面容器，含 SafeArea + ScrollView |
| `StatCard` | `components/ui/StatCard.tsx` | 统计数字卡片（数字 + 标签 + 图标） |
| `StatusTag` | `components/ui/StatusTag.tsx` | 状态标签（带颜色圆点 + 文字） |
| `PriorityTag` | `components/ui/PriorityTag.tsx` | 优先级标签（低/中/高/紧急颜色映射） |
| `ProgressBar` | `components/ui/ProgressBar.tsx` | 进度条组件（百分比 + 颜色渐变） |
| `EmptyState` | `components/ui/EmptyState.tsx` | 空状态占位（图标 + 文案 + 操作按钮） |
| `LoadingView` | `components/ui/LoadingView.tsx` | 加载中全屏占位 |
| `ErrorView` | `components/ui/ErrorView.tsx` | 错误状态（文案 + 重试按钮） |
| `SearchBar` | `components/ui/SearchBar.tsx` | 顶部搜索栏（Input + 取消按钮） |
| `ConfirmModal` | `components/ui/ConfirmModal.tsx` | 确认弹窗（标题 + 文案 + 取消/确认） |

所有组件遵循现有 `AppStyles` + `commonStyles` 设计系统。

### 2.2 类型定义

**`types/task.ts`** — 完整任务类型：

```typescript
// 枚举
enum TaskStatus { Pending, Assigned, InProgress, Completed, Cancelled, Failed, Paused }
enum TaskPriority { Low, Medium, High, Urgent }
enum TaskExecutionResult { NotExecuted, Success, Failed, Timeout, Interrupted }

// 核心 DTO
interface TaskDto {
  id: string
  taskName: string
  description?: string
  taskType: string
  status: TaskStatus
  statusName: string
  priority: TaskPriority
  priorityName: string
  completionPercentage: number
  assignedTo?: string
  assignedToName?: string
  createdBy: string
  createdByName: string
  createdAt: string
  plannedStartTime?: string
  plannedEndTime?: string
  actualStartTime?: string
  actualEndTime?: string
  estimatedDuration?: number
  actualDuration?: number
  projectId?: string
  projectName?: string
  parentTaskId?: string
  tags?: string[]
  remarks?: string
  participants?: ParticipantInfo[]
}

interface ParticipantInfo { userId: string; username: string; email?: string }
interface TaskExecutionLogDto {
  id?: string; taskId: string; executedBy: string; executedByName?: string
  status: number; statusName: string; message?: string
  progressPercentage: number; createdAt: string
}

// 请求
interface CreateTaskRequest { taskName: string; taskType: string; ... }
interface UpdateTaskRequest { taskId: string; taskName?: string; ... }
interface ExecuteTaskRequest { taskId: string; completionPercentage?: number; message?: string }
interface CompleteTaskRequest { taskId: string; executionResult: number; ... }

// 统计
interface TaskStatistics { totalTasks: number; pendingTasks: number; inProgressTasks: number; completedTasks: number; completionRate: number; ... }
```

**`types/project.ts`** — 完整项目类型：

```typescript
enum ProjectStatus { Planning, InProgress, OnHold, Completed, Cancelled }
enum ProjectPriority { Low, Medium, High }

interface ProjectDto {
  id: string; name: string; description?: string
  status: ProjectStatus; statusName: string
  priority: ProjectPriority; priorityName: string
  progress: number; startDate?: string; endDate?: string
  budget?: number; createdBy?: string; createdByName?: string
  createdAt: string; projectMembers?: string[]
  canEdit?: boolean; canDelete?: boolean
}

interface ProjectStatistics { totalProjects: number; inProgressProjects: number; completedProjects: number; delayedProjects: number }

interface ProjectDashboardStatistics {
  project: ProjectStatistics
  task: { totalTasks: number; overdueTasks: number; completedTasks: number; completionRate: number }
  member: { totalMembers: number; membersByRole: Record<string, number> }
  milestone: { totalMilestones: number; pendingMilestones: number; achievedMilestones: number; delayedMilestones: number }
}
```

### 2.3 服务层

**`services/taskService.ts`**：

| 方法 | API | 用途 |
|------|-----|------|
| `getTaskList(params)` | `GET /api/task/list` | 分页查询 |
| `getTaskById(id)` | `GET /api/task/{id}` | 任务详情 |
| `createTask(data)` | `POST /api/task/create` | 创建 |
| `updateTask(data)` | `PUT /api/task/update` | 更新 |
| `deleteTask(id)` | `DELETE /api/task/{id}` | 删除 |
| `cancelTask(id)` | `DELETE /api/task/{id}/cancel` | 取消 |
| `executeTask(data)` | `POST /api/task/execute` | 执行/更新进度 |
| `completeTask(data)` | `POST /api/task/complete` | 完成 |
| `getTaskLogs(taskId)` | `POST /api/task/{id}/logs` | 执行日志 |
| `getTaskStatistics()` | `GET /api/task/statistics` | 统计 |
| `getMyTodoTasks()` | `GET /api/task/my/todo` | 我的待办 |
| `getTasksByProject(projectId)` | `GET /api/task/project/{projectId}` | 项目下任务 |
| `getTaskTree(projectId)` | `GET /api/task/tree` | 任务树 |
| `getCriticalPath(projectId)` | `GET /api/task/project/{projectId}/critical-path` | 关键路径 |

**`services/projectService.ts`**：

| 方法 | API | 用途 |
|------|-----|------|
| `getProjectList(params)` | `GET /api/project/list` | 分页查询 |
| `getProjectById(id)` | `GET /api/project/{id}` | 详情 |
| `createProject(data)` | `POST /api/project` | 创建 |
| `updateProject(id, data)` | `PUT /api/project/{id}` | 更新 |
| `deleteProject(id)` | `DELETE /api/project/{id}` | 删除 |
| `getProjectStatistics()` | `GET /api/project/statistics` | 统计 |
| `getDashboardStatistics(params)` | `GET /api/project/statistics/dashboard` | 仪表盘统计 |
| `getProjectMembers(id)` | `GET /api/project/{id}/members` | 成员列表 |
| `addProjectMember(id, data)` | `POST /api/project/{id}/members` | 添加成员 |

### 2.4 数据流转架构

```
页面组件 (Screen)
    ↓ hook (useApi / 原生 fetch)
服务层 (taskService / projectService)
    ↓ axios
api.ts (拦截器、认证头、错误处理)
    ↓
后端 API Gateway → ApiService → MongoDB
```

---

## 三、第二阶段：项目管理

### 3.1 Tab 导航重构

`(tabs)/_layout.tsx` 从 2 个 Tab 扩展为 4 个：

| Tab | 图标 | 说明 |
|-----|------|------|
| 首页 | home | 工作台概览 |
| 任务 | checkbox | 任务列表 |
| 项目 | folder | 项目列表 |
| 我的 | person | 个人中心 |

### 3.2 项目列表页 `(tabs)/projects/index.tsx`

**布局**：
```
┌─────────────────────────────┐
│  筛选标签行：[规划中][进行中][已完成][全部]  │
├─────────────────────────────┤
│  ┌─ 项目卡片 ──────────────┐ │
│  │  📁 项目名称        🔴高│ │
│  │  状态: ● 进行中  进度: ██│ │
│  │  成员: 张三, 李四   │ │
│  │  2026-01-01 ~ 2026-06-30 │ │
│  └──────────────────────────┘ │
│  ┌─ 项目卡片 ──────────────┐ │
│  │  ...                     │ │
│  └──────────────────────────┘ │
│         [加载更多]             │
└─────────────────────────────┘
```

**功能**：
- 顶部统计标签行：总项目数 / 进行中 / 已完成 / 延期
- 状态 Tab 快速筛选（`Planning | InProgress | Completed | Cancelled`）
- 项目卡片渲染（名称、状态标签、优先级标签、进度条、成员、日期）
- 点击卡片 → 跳转项目详情
- 右上角 `+` 按钮 → 创建项目
- 搜索栏（按名称搜索）
- 下拉刷新 + 分页加载更多

### 3.3 项目详情页 `project/[id].tsx`

**布局**（ScrollView）：

| 区域 | 内容 |
|------|------|
| 头部 | 项目名称 + 状态Tag + 优先级Tag |
| 进度区 | 进度条 + 百分比 |
| 信息区 | 时间范围、预算、描述 |
| 成员区 | 成员头像列表（横向滚动） |
| 任务概览 | 相关任务列表（前 5 条 + 查看全部） |
| 操作 | 编辑、删除按钮（权限控制） |

**底部操作栏**：
- 编辑（需 `canEdit`）
- 删除（需 `canDelete` + 确认弹窗）

### 3.4 创建/编辑项目 `project/create.tsx` / `project/edit/[id].tsx`

**表单字段**（ScrollView + KeyboardAvoidingView）：

| 字段 | 组件 | 必填 |
|------|------|------|
| 项目名称 | TextInput | ✅ |
| 状态 | Picker/Select | |
| 优先级 | Picker/Select | |
| 描述 | TextInput multiline | |
| 开始日期 | DatePicker | |
| 结束日期 | DatePicker | |
| 预算 | TextInput numeric | |
| 项目成员 | 多选用户列表 | |

### 3.5 项目统计页 `project-statistics/index.tsx`

**布局**（4 个统计卡片）：

```
┌──────────────────────┐
│   项目统计            │
│   总项目: 12  进行中: 5 │
│   已完成: 6  延期: 1   │
├──────────────────────┤
│   任务统计            │
│   总任务: 48  已完成: 30│
│   逾期: 3 ⚠️         │
├──────────────────────┤
│   里程碑统计          │
│   总计: 8  已完成: 5   │
│   延期: 1 ⚠️         │
├──────────────────────┤
│   成员统计            │
│   总人数: 15          │
│   管理员: 3  成员: 12  │
└──────────────────────┘
```

---

## 四、第三阶段：任务管理

### 4.1 任务列表页 `(tabs)/tasks/index.tsx`

**布局**：
```
┌─────────────────────────────┐
│  [待办][进行中][已完成][全部]  │
├─────────────────────────────┤
│  ┌─ 任务卡片 ──────────────┐ │
│  │  ✅ 任务名称          🔴高│ │
│  │  状态: ● 进行中 进度: 60% │ │
│  │  负责人: 张三   截止: 05/20│ │
│  │  项目: XXX              │ │
│  └──────────────────────────┘ │
│  ┌─ 任务卡片 ──────────────┐ │
│  │  ...                     │ │
│  └──────────────────────────┘ │
│         [加载更多]             │
└─────────────────────────────┘
```

**功能**：
- 顶部统计：总任务 / 进行中 / 已完成 / 完成率
- 状态筛选 Tab
- 优先级筛选（底部 Sheet）
- 任务卡片展示（名称、状态、优先级、进度、负责人、截止时间）
- 左滑操作：编辑 / 执行 / 取消
- 右上角 `+` → 创建任务
- 搜索 + 下拉刷新 + 分页

### 4.2 任务详情页 `task/[id].tsx`

**布局**（ScrollView）：

| 区域 | 内容 |
|------|------|
| 头部 | 任务名称 + 状态Tag + 优先级Tag |
| 进度区 | 大号进度环 + 百分比 |
| 基本信息 | 任务类型、描述 |
| 分配信息 | 创建人、负责人、分配时间 |
| 时间信息 | 计划开始/结束、实际开始/结束 |
| 参与者 | 参与者标签列表 |
| 标签 | 标签 Tag 列表 |
| 备注 | 备注文本 |
| 执行日志 | Timeline 时间线组件 |
| 关联项目 | 项目名称（可点击跳转） |

**底部操作栏**（根据状态动态显示）：
- 执行任务（`Pending / InProgress` 时显示）
- 完成任务（`InProgress` 时显示）
- 取消任务（非已完成/已取消时显示）

### 4.3 创建/编辑任务 `task/create.tsx` / `task/edit/[id].tsx`

**表单字段**：

| 字段 | 组件 | 必填 |
|------|------|------|
| 任务名称 | TextInput | ✅ |
| 任务类型 | Picker（开发/设计/测试/文档/其他） | ✅ |
| 优先级 | Picker（低/中/高/紧急） | |
| 描述 | TextInput multiline | |
| 关联项目 | Select + 搜索 | |
| 父任务 | Select（基于项目动态加载） | |
| 负责人 | 用户选择器（搜索） | |
| 参与者 | 多选用户 | |
| 计划开始时间 | DatePicker | |
| 计划结束时间 | DatePicker | |
| 预估时长 | TextInput numeric | |
| 标签 | 多选 Tag 选择器 | |
| 备注 | TextInput multiline | |
| 排序 | TextInput numeric（隐藏） | |

### 4.4 任务执行页 `task/execute/[id].tsx`

两种模式，通过 SegmentedControl 切换：

**模式 A：进度更新**
```
┌──────────────────────┐
│  更新进度              │
│                      │
│  ───●───────── 60%   │
│  0  25  50  75  100  │
│                      │
│  进度说明:            │
│  [已完成前端页面开发]  │
│                      │
│  [  确认更新  ]       │
└──────────────────────┘
```

**模式 B：完成任务**
```
┌──────────────────────┐
│  完成任务              │
│                      │
│  执行结果: [成功/失败/超时/中断]│
│                      │
│  错误信息:            │
│  [______________]     │
│                      │
│  完成备注:            │
│  [______________]     │
│                      │
│  [  确认完成  ]       │
└──────────────────────┘
```

### 4.5 首页概览（改造现有 `(tabs)/index.tsx`）

在现有首页基础上增加：

```
┌─────────────────────────────┐
│  [渐变头部: 欢迎 + 通知]      │
├─────────────────────────────┤
│  我的待办 (3)  →            │
│  ┌──────────────────────┐  │
│  │ □ 完成UI设计     🔴高 │  │
│  │ □ 修复登录bug    🟡中 │  │
│  │ □ 撰写API文档    🟢低 │  │
│  └──────────────────────┘  │
│                             │
│  进行中项目 (2) →           │
│  ┌──────────────────────┐  │
│  │ V2.0 重构    ████ 60%│  │
│  │ App开发      ██ 30%  │  │
│  └──────────────────────┘  │
│                             │
│  快捷操作                   │
│  [创建任务] [创建项目] [审批]│
│                             │
│  [现有: 个人信息卡片]       │
└─────────────────────────────┘
```

使用 `GET /api/task/my/todo` 获取待办任务列表。
使用 `GET /api/project/list?pageSize=5` 获取进行中项目。

---

## 五、第四阶段：收尾优化

### 5.1 移动端甘特图

简化版甘特图组件 `components/project/GanttChart.tsx`：

```
┌─────────────────────────────┐
│  5/1  5/5  5/10  5/15  5/20 │
├─────────────────────────────┤
│  ├─ 需求分析    ████████   │
│  │  └─ 用户调研   ████    │
│  │  └─ 竞品分析      ████ │
│  ├─ 设计阶段    ██████████ │
│  │  ...                   │
│      今日 ↑                │
└─────────────────────────────┘
```

仅展示时间线 + 任务条，不做拖拽交互。支持项目选择。

### 5.2 性能优化

| 优化点 | 方案 |
|--------|------|
| 列表虚拟化 | FlatList `windowSize` + `getItemLayout` |
| 图片懒加载 | 项目成员头像延迟加载 |
| 数据缓存 | React Query 或简单 LRU 缓存列表数据 |
| 页面预加载 | `useFocusEffect` 按需刷新 |

### 5.3 权限控制

- 项目 DTO 中 `canEdit` / `canDelete` 控制按钮显隐
- 任务 API 后端校验权限，前端 401 时自动跳转登录
- 创建/编辑按钮根据菜单权限 `project-management-task` / `project-management-project` 控制

---

## 六、API 对接要点

| 注意点 | 说明 |
|--------|------|
| 基础路径 | `{API_BASE_URL}/api/task/...` 和 `/api/project/...` |
| 认证头 | `Bearer` token 已由 `api.ts` 拦截器自动注入 |
| 分页参数 | `page` + `pageSize`，返回 `PagedResult<T>` |
| 错误处理 | 统一走 `api.ts` 的 `response interceptor` |
| 枚举值 | 前后端枚举值需保持一致（见类型定义） |
| 日期格式 | 后端返回 ISO 8601 字符串，前端用 `Intl.DateTimeFormat` 格式化 |

---

## 七、文件创建清单

### 新建文件（总计 ~30 个）

```
Platform.App/
├── types/task.ts
├── types/project.ts
├── services/taskService.ts
├── services/projectService.ts
├── hooks/useRefresh.ts
├── hooks/useApi.ts
├── utils/task.ts
├── components/ui/PageContainer.tsx
├── components/ui/StatCard.tsx
├── components/ui/StatusTag.tsx
├── components/ui/PriorityTag.tsx
├── components/ui/ProgressBar.tsx
├── components/ui/EmptyState.tsx
├── components/ui/LoadingView.tsx
├── components/ui/ErrorView.tsx
├── components/ui/SearchBar.tsx
├── components/ui/ConfirmModal.tsx
├── components/task/TaskCard.tsx
├── components/task/TaskForm.tsx
├── components/task/TaskExecutionForm.tsx
├── components/project/ProjectCard.tsx
├── components/project/ProjectForm.tsx
├── components/project/ProjectMemberList.tsx
├── components/project/GanttChart.tsx
├── components/statistics/StatOverviewCard.tsx
├── app/(tabs)/tasks/_layout.tsx
├── app/(tabs)/tasks/index.tsx
├── app/(tabs)/projects/_layout.tsx
├── app/(tabs)/projects/index.tsx
├── app/task/[id].tsx
├── app/task/create.tsx
├── app/task/edit/[id].tsx
├── app/task/execute/[id].tsx
├── app/project/[id].tsx
├── app/project/create.tsx
├── app/project/edit/[id].tsx
├── app/project-statistics/index.tsx
```

### 修改文件（4 个）

| 文件 | 修改内容 |
|------|---------|
| `app/_layout.tsx` | 新增路由声明（task/*, project/* 全屏页） |
| `app/(tabs)/_layout.tsx` | Tab 从 2 个扩展为 4 个 |
| `app/(tabs)/index.tsx` | 首页增加任务/项目概览卡片 |
| `app/(tabs)/profile.tsx` | 不变或微调 |

---

## 八、开始实施

准备好后，我将按**第一阶段 → 第二阶段 → 第三阶段 → 第四阶段**的顺序逐步实现。是否现在开始第一阶段（基础设施 + 类型定义）？
