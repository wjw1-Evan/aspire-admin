# Ant Design 6 规范遵循指南

## 项目状态
- **当前版本**: Ant Design 6.1.2
- **React 版本**: 19.2.3
- **图标库版本**: @ant-design/icons 6.1.0

## 已完成的迁移

### 1. Modal 组件更新 ✅
- `destroyOnClose` → `destroyOnHidden`
- `bodyStyle` → `styles.body`
- 已在 `Platform.Admin/src/pages/workflow/forms/index.tsx` 中完成

### 2. Message API 更新 ✅
- 静态方法 `message.success()` → `useMessage()` Hook
- 已创建 `src/hooks/useMessage.ts` 统一管理
- 支持动态主题和上下文

### 3. Modal 静态方法更新 ✅
- `Modal.confirm()` → `useModal()` Hook
- 已创建 `src/hooks/useModal.ts` 统一管理
- 支持动态主题和上下文

## 当前符合 Ant Design 6 规范的组件

### 1. 正确使用的组件属性
- **Modal**: 使用 `open` 而非 `visible`
- **Drawer**: 使用 `open` 而非 `visible`
- **Select**: `mode="multiple"` 正确使用
- **Space**: `direction="vertical"` 正确使用
- **Steps**: `direction="vertical"` 正确使用
- **Tooltip**: `title` 属性正确使用

### 2. 响应式设计
- 使用 `Grid.useBreakpoint()` 检测移动端
- 统一的移动端适配规范
- 响应式布局组件正确使用

## 建议的进一步优化

### 1. Drawer 组件优化
当前使用 `size={600}` 的地方可以考虑使用更语义化的尺寸：

```typescript
// 当前
<Drawer size={600} />

// 建议
<Drawer size="large" /> // 或根据内容使用 "default" | "large"
```

**影响文件**:
- `Platform.Admin/src/pages/user-management/index.tsx`
- `Platform.Admin/src/components/CrudPage.tsx`

### 2. 主题配置优化
建议在 `app.tsx` 中配置统一的主题：

```typescript
import { ConfigProvider, theme } from 'antd';

// 配置全局主题
const themeConfig = {
  algorithm: theme.defaultAlgorithm,
  token: {
    colorPrimary: '#1890ff',
    borderRadius: 6,
  },
};
```

### 3. 组件 API 最佳实践

#### Form 组件
- 优先使用 `Form.useForm()` 而非 `ref`
- 使用 `validateFields()` 进行表单验证

#### Table 组件
- 使用 `scroll={{ x: 'max-content' }}` 支持横向滚动
- 操作列使用 `fixed: 'right'`

#### Button 组件
- 统一使用 `type="link"` 和 `size="small"` 用于操作按钮
- 危险操作使用 `danger` 属性

## 性能优化建议

### 1. 按需加载
确保只导入使用的组件：

```typescript
// 推荐
import { Button, Modal } from 'antd';

// 避免
import * as antd from 'antd';
```

### 2. 图标优化
使用 Tree Shaking 优化图标导入：

```typescript
// 推荐
import { EditOutlined, DeleteOutlined } from '@ant-design/icons';

// 避免
import * as Icons from '@ant-design/icons';
```

## 兼容性检查清单

- [x] Modal 组件废弃属性已更新
- [x] Message API 已迁移到 Hook
- [x] Modal 静态方法已迁移到 Hook
- [x] 所有组件使用 `open` 而非 `visible`
- [x] 响应式设计符合 Ant Design 6 规范
- [x] 图标库版本兼容
- [x] TypeScript 类型定义正确

## 未来升级建议

### 1. 持续监控
- 定期检查 Ant Design 更新日志
- 关注废弃警告并及时处理
- 使用 ESLint 规则检查废弃 API

### 2. 测试覆盖
- 确保所有组件在不同主题下正常工作
- 测试移动端适配效果
- 验证无障碍访问功能

### 3. 文档维护
- 更新组件使用文档
- 记录自定义组件的 Ant Design 6 兼容性
- 维护迁移指南

## 总结

项目已经很好地遵循了 Ant Design 6 的规范，主要的迁移工作已经完成。当前代码库与 Ant Design 6.1.2 版本完全兼容，没有发现需要紧急修复的问题。

建议继续关注 Ant Design 的更新，并在新功能开发时严格遵循最新的 API 规范。