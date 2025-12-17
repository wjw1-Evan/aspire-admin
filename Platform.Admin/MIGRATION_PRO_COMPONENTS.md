# ProComponents 迁移指南

由于 `@ant-design/pro-components` 与 antd 6 不兼容，需要将所有 ProComponents 替换为 antd 原生组件。

## 已完成的替换

1. ✅ `PageContainer` → 自定义组件 (`@/components/PageContainer`)
2. ✅ `LayoutSettings` 类型 → 自定义类型 (`@/types/layout`)
3. ✅ `SettingDrawer` → 已移除（开发环境功能）
4. ✅ `DefaultFooter` → antd `Layout.Footer`
5. ✅ `ActionType`, `ProColumns` 类型 → 自定义类型 (`@/types/pro-components`)
6. ✅ `ProTable` → `DataTable` 组件 (`@/components/DataTable`)
7. ✅ `ProCard` → `Card` (antd)
8. ✅ `ProDescriptions` → `Descriptions` (antd)
9. ✅ `ProForm/ProFormText` → `Form/Input` (antd)
10. ✅ `ProFormDigit` → `Form.Item` + `InputNumber` (antd)
11. ✅ `ProFormTextArea` → `Form.Item` + `Input.TextArea` (antd)
12. ✅ `ProFormCaptcha` → `Form.Item` + `Input` + `Button` (自定义实现)
13. ✅ `ProFormCheckbox` → `Form.Item` + `Checkbox` (antd)
14. ✅ `ModalForm` → `Modal` + `Form` (antd)
15. ✅ `LoginForm` → `Card` + `Form` (自定义实现)

## 注意事项

- ✅ **迁移完成**：所有 ProComponents 已成功替换为 antd 原生组件或自定义实现
- `@ant-design/pro-components` 仍然作为 `@umijs/max` 和 `umi-presets-pro` 的传递依赖存在，这是正常的。只要代码中不再直接导入和使用即可
- 所有 ProComponents 特有的属性（如 `valueType`, `valueEnum`, `copyable`, `hideInTable`, `hideInSearch` 等）已移除或替换为 antd Table 兼容的实现
- 构建验证：`npm run build` 成功通过 ✅

## 替换说明

### DataTable 组件

`DataTable` 组件（`@/components/DataTable`）用于替代 `ProTable`，提供类似的功能：
- 支持 `request` 属性自动处理数据加载
- 支持 `actionRef` 用于手动刷新数据
- 支持 `toolbar.actions` 配置工具栏按钮
- 自动处理分页、排序等逻辑

### 表单组件

所有表单组件已替换为 antd 原生组件：
- `ProForm` → `Form`
- `ProFormText` → `Form.Item` + `Input`
- `ProFormCaptcha` → `Form.Item` + `Input` + `Button`（自定义验证码逻辑）
- `ProFormCheckbox` → `Form.Item` + `Checkbox`
- `ProFormDigit` → `Form.Item` + `InputNumber`
- `ProFormTextArea` → `Form.Item` + `Input.TextArea`

### 其他组件

- `ProCard` → `Card` (antd)
- `ProDescriptions` → `Descriptions` (antd)
- `ModalForm` → `Modal` + `Form` (antd)
- `LoginForm` → `Card` + `Form` (自定义实现)
