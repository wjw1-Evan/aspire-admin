# 项目列表卡片 - 欢迎页面集成

## 概述

在欢迎页面左侧列添加了项目列表卡片，用于快速查看最近的项目信息。

## 功能特性

### 1. 项目列表显示
- 显示最近 5 个项目
- 按创建时间倒序排列
- 支持项目名称、状态、优先级、进度等信息展示

### 2. 项目信息展示
- **项目名称**：支持鼠标悬停显示完整描述
- **项目状态**：规划中(蓝)、进行中(绿)、暂停(橙)、已完成(青)、已取消(红)
- **优先级**：低(蓝)、中(橙)、高(红)
- **进度**：圆形进度条显示，100% 时显示绿色
- **操作**：快速查看项目详情

### 3. 快速操作
- **新建项目**：右上角按钮快速创建新项目
- **查看详情**：点击项目行快速查看项目详情
- **查看全部**：底部链接跳转到项目管理页面

### 4. 自动轮询
- 每 60 秒自动刷新一次项目数据
- 页面不可见时停止轮询，节省资源
- 页面恢复可见时立即刷新

### 5. 权限控制
- 仅当用户有项目管理访问权限时显示
- 无权限时模块自动隐藏

## 文件结构

```
Platform.Admin/
├── src/
│   ├── pages/
│   │   ├── Welcome.tsx                          # 欢迎页面（已更新）
│   │   └── welcome/
│   │       └── components/
│   │           ├── index.ts                     # 导出文件（已更新）
│   │           └── ProjectListCard.tsx          # 新增组件
│   └── services/
│       └── task/
│           └── project.ts                       # 项目 API 服务（已存在）
```

## API 接口

### 查询项目列表
```typescript
getProjectList(data: ProjectQueryRequest): Promise<ApiResponse<ProjectListResponse>>
```

**参数**：
- `page`：页码（从 1 开始）
- `pageSize`：每页数量
- `sortBy`：排序字段（如 'createdAt'）
- `sortOrder`：排序顺序（'asc' 或 'desc'）

**返回**：
```typescript
{
  projects: ProjectDto[],
  total: number,
  page: number,
  pageSize: number
}
```

## 项目数据模型

```typescript
interface ProjectDto {
  id?: string;
  name: string;
  description?: string;
  status: number;
  statusName: string;
  startDate?: string;
  endDate?: string;
  progress: number;
  managerId?: string;
  managerName?: string;
  budget?: number;
  priority: number;
  priorityName: string;
  createdAt: string;
  createdBy?: string;
  createdByName?: string;
  updatedAt: string;
}
```

## 项目状态枚举

| 值 | 名称 | 颜色 |
|----|------|------|
| 0 | 规划中 | 蓝色 |
| 1 | 进行中 | 绿色 |
| 2 | 暂停 | 橙色 |
| 3 | 已完成 | 青色 |
| 4 | 已取消 | 红色 |

## 项目优先级枚举

| 值 | 名称 | 颜色 |
|----|------|------|
| 0 | 低 | 蓝色 |
| 1 | 中 | 橙色 |
| 2 | 高 | 红色 |

## 使用示例

组件会自动在欢迎页面左侧列显示，无需额外配置：

```tsx
<ProjectListCard loading={loading} />
```

## 性能优化

1. **轮询优化**：
   - 使用 `document.visibilityState` 检测页面可见性
   - 页面不可见时停止轮询
   - 页面恢复可见时立即刷新

2. **错误处理**：
   - API 调用失败时仅记录警告，不中断流程
   - 支持优雅降级

3. **内存管理**：
   - 组件卸载时清理定时器和事件监听器
   - 避免内存泄漏

## 后端 API 要求

后端项目控制器需要提供以下端点：

1. `POST /api/project/list` - 查询项目列表

## 欢迎页面布局

项目列表卡片位置：
- **位置**：欢迎页面左侧列
- **顺序**：任务概览 → **项目列表** → 统计概览
- **宽度**：响应式（移动端全宽，桌面端 50%）

## 扩展建议

1. **项目搜索**：支持按项目名称搜索
2. **状态过滤**：支持按项目状态过滤
3. **优先级排序**：支持按优先级排序
4. **项目统计**：显示项目总数、进行中数量等
5. **快速操作**：支持快速编辑、删除等操作
6. **项目成员**：显示项目经理和成员信息
