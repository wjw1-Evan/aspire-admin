# 条件规则 UI 配置验证

## 验证内容

确认前端"条件"组件中的"条件规则"配置包含所有必要的字段。

## 条件规则配置字段清单

### ✅ 已实现的字段

| 字段 | 类型 | 说明 | 位置 |
|------|------|------|------|
| 表单 | Select | 选择流程中使用的表单 | 第一行 |
| 字段 | Select | 根据选中的表单动态显示字段 | 第二行 |
| 操作符 | Select | 选择比较操作符 | 第三行 |
| 比较值 | Input | 输入要比较的值 | 第四行 |

### 表单选择配置
```typescript
<Form.Item
  name={[condName, 'formId']}
  label="表单"
  rules={[{ required: true, message: '请选择表单' }]}
>
  <Select
    placeholder="选择流程中使用的表单"
    showSearch
    loading={loading}
    options={workflowForms.map(f => ({ label: f.Name, value: f.Id }))}
  />
</Form.Item>
```

### 字段选择配置（级联）
```typescript
<Form.Item noStyle shouldUpdate={(prev, curr) => {
  const prevFormId = prev.branches?.[name]?.conditions?.[condName]?.formId;
  const currFormId = curr.branches?.[name]?.conditions?.[condName]?.formId;
  return prevFormId !== currFormId;
}}>
  {({ getFieldValue }) => {
    const formId = getFieldValue(['branches', name, 'conditions', condName, 'formId']);
    const fields = getSelectedFormFields(formId);
    return (
      <Form.Item
        name={[condName, 'variable']}
        label="字段"
        rules={[{ required: true, message: '请选择字段' }]}
      >
        <Select
          placeholder="选择表单字段"
          showSearch
          disabled={!formId}
          options={fields.map(f => ({
            label: `${f.Label} (${f.DataKey})`,
            value: f.DataKey
          }))}
        />
      </Form.Item>
    );
  }}
</Form.Item>
```

### 操作符选择配置
```typescript
<Form.Item
  name={[condName, 'operator']}
  label="操作符"
  rules={[{ required: true, message: '请选择操作符' }]}
>
  <Select placeholder="选择操作符">
    <Select.Option value="equals">等于 (==)</Select.Option>
    <Select.Option value="not_equals">不等于 (!=)</Select.Option>
    <Select.Option value="greater_than">大于 (&gt;)</Select.Option>
    <Select.Option value="less_than">小于 (&lt;)</Select.Option>
    <Select.Option value="greater_than_or_equal">大于等于 (&gt;=)</Select.Option>
    <Select.Option value="less_than_or_equal">小于等于 (&lt;=)</Select.Option>
    <Select.Option value="contains">包含 (Contains)</Select.Option>
  </Select>
</Form.Item>
```

### 比较值输入配置
```typescript
<Form.Item
  name={[condName, 'value']}
  label="比较值"
  rules={[{ required: true, message: '请输入比较值' }]}
>
  <Input placeholder="输入值" />
</Form.Item>
```

## 功能验证

### ✅ 表单选择
- 显示流程中绑定的所有表单
- 支持搜索
- 必填项验证

### ✅ 字段级联选择
- 根据选中的表单动态加载字段
- 显示字段标签和数据键
- 未选择表单时禁用
- 必填项验证

### ✅ 操作符选择
- 提供 7 种操作符
- 支持数值比较和字符串比较
- 必填项验证

### ✅ 比较值输入
- 支持任意值输入
- 必填项验证

## 编译验证

```
✅ 前端编译成功
✅ Webpack 编译成功
✅ 无编译错误
```

## 使用流程

1. **打开条件节点配置**
   - 选择条件节点
   - 打开配置抽屉

2. **添加分支**
   - 点击"添加分支"按钮
   - 输入分支标签

3. **添加条件规则**
   - 在分支内点击"添加条件"按钮
   - 选择表单
   - 选择字段（自动根据表单过滤）
   - 选择操作符
   - 输入比较值

4. **配置分支逻辑**
   - 选择条件间逻辑（AND/OR）
   - 选择目标节点

## 数据流向

```
用户选择表单
    ↓
getSelectedFormFields(formId) 获取表单字段
    ↓
字段列表动态更新
    ↓
用户选择字段
    ↓
保存字段的 DataKey 到 variable
    ↓
后端接收 { formId, variable, operator, value }
```

## 相关代码位置

- **UI 实现**：`Platform.Admin/src/pages/workflow/components/NodeConfigDrawer.tsx`
- **类型定义**：`Platform.Admin/src/services/workflow/api.ts`
- **辅助函数**：`getSelectedFormFields()` 方法

## 总结

✅ 条件规则配置中已完整实现：
- 表单选择
- 字段级联选择
- 操作符选择
- 比较值输入

所有字段都有正确的验证和级联逻辑。

---

**验证日期**：2026-03-13
**验证状态**：✅ 完成
