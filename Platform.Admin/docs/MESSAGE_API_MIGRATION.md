# Message API 迁移指南

## 问题描述

Ant Design 5.x 版本中，静态的 `message` 方法无法消费动态主题上下文，会产生以下警告：

```
Warning: [antd: message] Static function can not consume context like dynamic theme. Please use 'App' component instead.
```

## 解决方案

项目已经提供了完整的解决方案：

### 1. 全局配置（已完成）

- `src/app.tsx` 中已使用 `App` 组件包裹应用
- `src/utils/antdAppInstance.ts` 提供全局实例管理
- `src/hooks/useMessage.ts` 提供便捷的 Hook

### 2. 组件迁移步骤

#### 旧的写法（会产生警告）：
```tsx
import { message } from 'antd';

const MyComponent = () => {
  const handleClick = () => {
    message.success('操作成功');
  };
  // ...
};
```

#### 新的写法（推荐）：
```tsx
import { useMessage } from '@/hooks/useMessage';

const MyComponent = () => {
  const message = useMessage();
  
  const handleClick = () => {
    message.success('操作成功');
  };
  // ...
};
```

### 3. 需要迁移的文件列表

以下文件仍在使用静态 `message` 方法，需要逐步迁移：

- `src/pages/password-book/components/PasswordBookForm.tsx`
- `src/pages/password-book/components/PasswordGenerator.tsx`
- `src/pages/password-book/components/ExportDialog.tsx`
- `src/pages/account/center/index.tsx`
- `src/pages/task-management/components/ProjectView.tsx`
- `src/pages/company/search/index.tsx`
- `src/pages/user-management/index.tsx`
- `src/pages/role-management/index.tsx`
- `src/pages/workflow/list.tsx`
- `src/pages/document/create.tsx`
- `src/pages/document/create-by-workflow.tsx`
- `src/pages/role-management/components/RoleForm.tsx`
- 以及其他使用 `message.success/error/warning/info` 的文件

### 4. 迁移步骤

1. **移除静态导入**：
   ```tsx
   // 删除这行
   import { Button, message } from 'antd';
   
   // 改为
   import { Button } from 'antd';
   ```

2. **添加 Hook 导入**：
   ```tsx
   import { useMessage } from '@/hooks/useMessage';
   ```

3. **在组件中使用 Hook**：
   ```tsx
   const MyComponent = () => {
     const message = useMessage();
     // 其余代码保持不变
   };
   ```

### 5. 已完成迁移的文件

- `src/pages/workflow/components/WorkflowDesigner.tsx` ✅
- `src/pages/workflow/components/WorkflowCreateForm.tsx` ✅
- `src/pages/workflow/list.tsx` ✅
- `src/pages/user-management/index.tsx` ✅
- `src/pages/role-management/index.tsx` ✅
- `src/pages/document/create.tsx` ✅
- `src/pages/document/create-by-workflow.tsx` ✅
- `src/components/ImageCaptcha/index.tsx` ✅
- `src/components/CreateCompanyModal/index.tsx` ✅
- `src/pages/password-book/components/PasswordBookForm.tsx` ✅
- `src/pages/password-book/components/PasswordGenerator.tsx` ✅
- `src/pages/password-book/components/ExportDialog.tsx` ✅
- `src/global.tsx` ✅（使用 getMessage 工具函数）

### 6. 其他修复

- **Divider 组件警告修复** ✅：将废弃的 `type="vertical"` 替换为 `orientation="vertical"`

## 注意事项

1. **向后兼容**：`useMessage` Hook 会优先使用 App 实例，如果不可用会回退到静态方法
2. **渐进迁移**：可以逐步迁移，不需要一次性修改所有文件
3. **功能不变**：迁移后 API 使用方式完全相同，只是获取实例的方式不同

## 验证

迁移完成后，浏览器控制台应该不再出现相关警告信息。