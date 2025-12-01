# 任务管理 - 多语言支持文档

## 概述

本文档说明如何为任务管理功能添加多语言支持。目前已支持以下语言：

- 中文简体 (zh-CN) ✅
- 中文繁体 (zh-TW) ✅
- 英文 (en-US) ✅
- 日本语 (ja-JP) ✅
- 印度尼西亚语 (id-ID) ✅
- 葡萄牙语 (pt-BR) ✅
- 波斯语 (fa-IR) ✅
- 孟加拉语 (bn-BD) ✅

## 已完成的工作

### 1. 菜单多语言支持 ✅

已为所有8种语言的菜单文件添加了任务管理菜单项：

```typescript
'menu.task-management': '任务管理' // 中文简体
'menu.task-management': 'Task Management' // 英文
'menu.task-management': 'タスク管理' // 日本语
// ... 其他语言
```

**修改的文件**:
- `src/locales/zh-CN/menu.ts` ✅
- `src/locales/zh-TW/menu.ts` ✅
- `src/locales/en-US/menu.ts` ✅
- `src/locales/ja-JP/menu.ts` ✅
- `src/locales/id-ID/menu.ts` ✅
- `src/locales/pt-BR/menu.ts` ✅
- `src/locales/fa-IR/menu.ts` ✅
- `src/locales/bn-BD/menu.ts` ✅

### 2. 页面多语言支持 ✅

已为中文简体和英文添加了完整的任务管理页面翻译，包括：

- 页面标题和操作按钮
- 表格列标题
- 表单标签和占位符
- 状态和优先级标签
- 成功/失败消息
- 确认对话框文本
- 执行信息相关文本

**修改的文件**:
- `src/locales/zh-CN/pages.ts` ✅ (已添加 80+ 个翻译项)
- `src/locales/en-US/pages.ts` ✅ (已添加 80+ 个翻译项)

### 3. 翻译键命名规范

所有任务管理相关的翻译键都遵循以下命名规范：

```
pages.taskManagement.{category}.{key}
```

**主要分类**:
- `statistics` - 统计信息
- `search` - 搜索功能
- `filter` - 筛选条件
- `table` - 表格相关
- `status` - 任务状态
- `priority` - 优先级
- `form` - 表单相关
- `detail` - 详情页面
- `action` - 操作按钮
- `message` - 提示消息
- `execution` - 执行相关

## 翻译内容清单

### 统计信息 (Statistics)
- `totalTasks` - 总任务数
- `pendingTasks` - 待分配
- `inProgressTasks` - 进行中
- `completedTasks` - 已完成
- `failedTasks` - 失败
- `completionRate` - 完成率
- `averageTime` - 平均耗时

### 表格列 (Table)
- `taskName` - 任务名称
- `status` - 状态
- `priority` - 优先级
- `assignedTo` - 分配给
- `progress` - 进度
- `createdAt` - 创建时间
- `updatedAt` - 更新时间
- `action` - 操作

### 任务状态 (Status)
- `pending` - 待分配
- `assigned` - 已分配
- `inProgress` - 执行中
- `completed` - 已完成
- `cancelled` - 已取消
- `failed` - 失败
- `paused` - 暂停

### 优先级 (Priority)
- `low` - 低
- `medium` - 中
- `high` - 高
- `urgent` - 紧急

### 表单字段 (Form)
- `taskName` - 任务名称
- `description` - 描述
- `taskType` - 任务类型
- `priority` - 优先级
- `assignedTo` - 分配给
- `plannedStartTime` - 计划开始时间
- `plannedEndTime` - 计划完成时间
- `estimatedDuration` - 预计耗时
- `participants` - 参与者
- `tags` - 标签
- `remarks` - 备注

### 操作按钮 (Action)
- `edit` - 编辑
- `delete` - 删除
- `execute` - 执行
- `complete` - 完成
- `cancel` - 取消
- `pause` - 暂停
- `resume` - 继续

### 提示消息 (Message)
- `deleteSuccess` - 删除成功
- `deleteFailed` - 删除失败
- `executeSuccess` - 执行成功
- `executeFailed` - 执行失败
- `completeSuccess` - 完成成功
- `completeFailed` - 完成失败
- `cancelSuccess` - 取消成功
- `cancelFailed` - 取消失败
- `confirmDelete` - 确认删除
- `confirmCancel` - 确认取消

### 执行信息 (Execution)
- `status` - 执行状态
- `message` - 执行信息
- `completionPercentage` - 完成百分比
- `startTime` - 开始时间
- `endTime` - 结束时间
- `result` - 执行结果
- `resultNotExecuted` - 未执行
- `resultSuccess` - 成功
- `resultFailed` - 失败
- `resultTimeout` - 超时
- `resultInterrupted` - 被中断

## 待完成的工作

### 1. 其他语言的页面翻译 ⏳

需要为以下语言添加任务管理页面翻译：
- [ ] 中文繁体 (zh-TW)
- [ ] 日本语 (ja-JP)
- [ ] 印度尼西亚语 (id-ID)
- [ ] 葡萄牙语 (pt-BR)
- [ ] 波斯语 (fa-IR)
- [ ] 孟加拉语 (bn-BD)

### 2. 组件多语言支持 ⏳

需要为任务管理组件添加多语言支持：
- [ ] TaskForm 组件
- [ ] TaskDetail 组件
- [ ] TaskExecutionPanel 组件
- [ ] 其他相关组件

### 3. 页面代码更新 ⏳

需要更新任务管理页面代码，使用 `intl` 翻译所有硬编码文本：
- [ ] `src/pages/task-management/index.tsx`
- [ ] `src/pages/task-management/components/TaskForm.tsx`
- [ ] `src/pages/task-management/components/TaskDetail.tsx`
- [ ] `src/pages/task-management/components/TaskExecutionPanel.tsx`

## 使用指南

### 在页面中使用翻译

```typescript
import { useIntl } from '@umijs/max';

const TaskManagement: React.FC = () => {
  const intl = useIntl();
  
  return (
    <div>
      <h1>{intl.formatMessage({ id: 'pages.taskManagement.title' })}</h1>
      <button>
        {intl.formatMessage({ id: 'pages.taskManagement.createTask' })}
      </button>
    </div>
  );
};
```

### 在表格列中使用翻译

```typescript
const columns: ProColumns<TaskDto>[] = [
  {
    title: intl.formatMessage({ id: 'pages.taskManagement.table.taskName' }),
    dataIndex: 'taskName',
  },
  {
    title: intl.formatMessage({ id: 'pages.taskManagement.table.status' }),
    dataIndex: 'status',
    render: (status) => {
      const statusKey = `pages.taskManagement.status.${getStatusKey(status)}`;
      return intl.formatMessage({ id: statusKey });
    },
  },
];
```

### 在表单中使用翻译

```typescript
<Form.Item
  label={intl.formatMessage({ id: 'pages.taskManagement.form.taskName' })}
  name="taskName"
  rules={[
    {
      required: true,
      message: intl.formatMessage({ id: 'pages.taskManagement.form.taskNameRequired' }),
    },
  ]}
>
  <Input
    placeholder={intl.formatMessage({ id: 'pages.taskManagement.form.taskNamePlaceholder' })}
  />
</Form.Item>
```

### 在消息提示中使用翻译

```typescript
message.success(
  intl.formatMessage({ id: 'pages.taskManagement.message.createSuccess' })
);

Modal.confirm({
  title: intl.formatMessage({ id: 'pages.taskManagement.message.confirmDelete' }),
  onOk() {
    // 删除逻辑
  },
});
```

## 翻译键参考表

| 功能 | 翻译键前缀 | 示例 |
|------|----------|------|
| 菜单 | `menu.task-management` | `menu.task-management` |
| 页面标题 | `pages.taskManagement.title` | `pages.taskManagement.title` |
| 统计信息 | `pages.taskManagement.statistics.*` | `pages.taskManagement.statistics.totalTasks` |
| 表格 | `pages.taskManagement.table.*` | `pages.taskManagement.table.taskName` |
| 表单 | `pages.taskManagement.form.*` | `pages.taskManagement.form.taskName` |
| 状态 | `pages.taskManagement.status.*` | `pages.taskManagement.status.pending` |
| 优先级 | `pages.taskManagement.priority.*` | `pages.taskManagement.priority.high` |
| 操作 | `pages.taskManagement.action.*` | `pages.taskManagement.action.edit` |
| 消息 | `pages.taskManagement.message.*` | `pages.taskManagement.message.deleteSuccess` |
| 执行 | `pages.taskManagement.execution.*` | `pages.taskManagement.execution.status` |

## 最佳实践

### 1. 一致性
- 使用统一的翻译键命名规范
- 保持不同语言之间的一致性
- 避免硬编码文本

### 2. 可维护性
- 将所有翻译文本集中在 `locales` 目录中
- 使用有意义的翻译键名称
- 定期审查和更新翻译

### 3. 性能
- 避免在渲染时创建新的翻译对象
- 使用 `useMemo` 缓存翻译结果（如果需要）
- 避免过度使用 `intl.formatMessage`

### 4. 质量
- 确保翻译的准确性和自然性
- 考虑文化差异和地区特色
- 进行本地化测试

## 常见问题

### Q: 如何添加新的翻译键？

A: 在相应的 `locales/{language}/pages.ts` 文件中添加新的翻译键值对：

```typescript
'pages.taskManagement.newKey': 'New Translation',
```

### Q: 如何为新语言添加翻译？

A: 
1. 在 `locales` 目录中创建新的语言文件夹
2. 复制现有语言的文件结构
3. 翻译所有文本内容
4. 在应用配置中注册新语言

### Q: 如何测试翻译？

A: 
1. 在浏览器开发者工具中切换语言
2. 检查所有文本是否正确显示
3. 验证没有缺失的翻译键
4. 测试特殊字符和格式化

## 相关资源

- [UmiJS 国际化文档](https://umijs.org/docs/guides/i18n)
- [React Intl 文档](https://formatjs.io/docs/react-intl)
- [多语言最佳实践](https://www.w3.org/International/questions/qa-what-is-i18n)

## 贡献指南

如果您想为任务管理功能添加或改进翻译：

1. Fork 项目
2. 创建新的分支 (`git checkout -b feature/i18n-improvement`)
3. 提交您的更改 (`git commit -am 'Add translations for task management'`)
4. 推送到分支 (`git push origin feature/i18n-improvement`)
5. 创建 Pull Request

---

**最后更新**: 2025-12-01  
**维护者**: Cascade AI Assistant  
**状态**: 进行中 🚀

