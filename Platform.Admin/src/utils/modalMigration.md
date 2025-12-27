# Modal.confirm 迁移指南

## 问题
使用 `Modal.confirm` 等静态方法会导致 Ant Design 警告：
```
Warning: [antd: Modal] Static function can not consume context like dynamic theme. Please use 'App' component instead.
```

## 解决方案
使用 `useModal` Hook 替代静态方法调用。

## 迁移步骤

### 1. 导入 useModal Hook
```typescript
import { useModal } from '@/hooks/useModal';
```

### 2. 在组件中使用
```typescript
const MyComponent = () => {
  const modal = useModal();
  
  // 替换 Modal.confirm 为 modal.confirm
  const handleDelete = () => {
    modal.confirm({
      title: '确认删除',
      content: '确定要删除吗？',
      onOk: () => {
        // 删除逻辑
      }
    });
  };
};
```

### 3. 替换所有静态调用
- `Modal.confirm` → `modal.confirm`
- `Modal.info` → `modal.info`
- `Modal.success` → `modal.success`
- `Modal.error` → `modal.error`
- `Modal.warning` → `modal.warning`

## 已修复的文件
- ✅ Platform.Admin/src/pages/document/list.tsx
- ✅ Platform.Admin/src/pages/workflow/list.tsx
- ✅ Platform.Admin/src/pages/user-management/index.tsx
- ✅ Platform.Admin/src/pages/role-management/index.tsx

## 待修复的文件
- [ ] Platform.Admin/src/pages/company/search/index.tsx
- [ ] Platform.Admin/src/pages/workflow/components/WorkflowDesigner.tsx
- [ ] Platform.Admin/src/pages/xiaoke-management/config/components/ConfigManagement.tsx
- [ ] Platform.Admin/src/pages/join-requests/pending/index.tsx
- [ ] Platform.Admin/src/pages/xiaoke-management/chat-history/components/ChatHistoryManagement.tsx
- [ ] Platform.Admin/src/pages/task-management/index.tsx
- [ ] Platform.Admin/src/pages/password-book/index.tsx
- [ ] Platform.Admin/src/pages/task-management/components/ProjectMemberManagement.tsx
- [ ] Platform.Admin/src/pages/task-management/components/ProjectView.tsx
- [ ] Platform.Admin/src/pages/task-management/components/TaskTree.tsx