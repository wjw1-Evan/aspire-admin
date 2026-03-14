# 条件组件表单选择实时更新 - 实现说明

## 问题描述

在新建流程时，用户在开始组件中成功绑定了一个表单，但在条件组件内无法看到这个表单。条件组件中的表单选择应该跟随前端流程设计中的数据变化而变化。

## 解决方案

### 核心改动

**文件**: 
- `Platform.Admin/src/pages/workflow/components/NodeConfigDrawer.tsx`
- `Platform.Admin/src/pages/workflow/components/WorkflowDesigner.tsx`

### 实现原理

#### 1. 添加 `allNodes` 参数
在 `NodeConfigDrawerProps` 中添加 `allNodes` 参数，用于接收工作流设计器中的所有节点数据：

```typescript
export interface NodeConfigDrawerProps {
  // ... 其他属性
  allNodes?: Node[];
}
```

#### 2. 从前端节点数据提取表单
新增 `extractFormsFromNodes` 函数，从前端节点数据中实时提取表单信息：

```typescript
const extractFormsFromNodes = useCallback(() => {
  const formMap = new Map<string, WorkflowForm>();

  // 遍历所有节点，收集绑定的表单
  allNodes.forEach(node => {
    const config = node.data?.config;
    if (config?.form?.formDefinitionId) {
      const formId = config.form.formDefinitionId;
      // 从 forms 列表中查找对应的表单定义
      const formDef = forms.find(f => f.id === formId);
      if (formDef && !formMap.has(formId)) {
        formMap.set(formId, {
          Id: formDef.id || 'unknown',
          Name: formDef.name || '',
          Key: formDef.key || '',
          Fields: (formDef.fields || []).map(field => ({
            Id: field.id || 'unknown',
            Label: field.label || '',
            DataKey: field.dataKey || '',
            Type: field.type,
            Required: field.required || false,
          })),
        });
      }
    }
  });

  return Array.from(formMap.values());
}, [allNodes, forms]);
```

#### 3. 优先级策略
在 `useEffect` 中实现两层策略：

```typescript
useEffect(() => {
  if (visible) {
    // 优先使用前端节点数据（新建流程时）
    if (allNodes.length > 0) {
      const localForms = extractFormsFromNodes();
      setWorkflowForms(localForms);
    } else if (workflowDefinitionId) {
      // 如果没有前端节点数据，则从后端获取（编辑已保存的流程时）
      setLoading(true);
      getWorkflowFormsAndFields(workflowDefinitionId)
        .then(response => {
          if (response.data?.forms) {
            setWorkflowForms(response.data.forms);
          }
        })
        .catch(error => {
          console.error('加载流程表单失败:', error);
        })
        .finally(() => {
          setLoading(false);
        });
    }
  }
}, [visible, workflowDefinitionId, allNodes, extractFormsFromNodes]);
```

#### 4. 在 WorkflowDesigner 中传递节点数据
修改 `NodeConfigDrawer` 的调用，传递 `allNodes` 参数：

```typescript
<NodeConfigDrawer
  visible={configDrawerVisible}
  onClose={() => setConfigDrawerVisible(false)}
  selectedNode={selectedNode}
  configForm={configForm}
  onSaveConfig={handleSaveConfig}
  onDeleteNode={handleDeleteNode}
  readOnly={readOnly}
  users={users}
  roles={roles}
  forms={forms}
  availableVariables={availableVariables}
  allNodes={nodes}  // 传递前端节点数据
/>
```

## 工作流程

### 新建流程场景
1. 用户在工作流设计器中创建流程
2. 在开始节点中绑定表单
3. 创建条件节点
4. 打开条件节点配置
5. **条件组件立即显示已绑定的表单**（从前端节点数据获取）
6. 用户选择表单，然后选择字段

### 编辑已保存流程场景
1. 用户打开已保存的流程
2. 打开条件节点配置
3. **条件组件从后端获取表单数据**（因为前端节点数据为空）
4. 用户可以修改条件规则

## 优势

✅ **实时性**: 新建流程时，表单选择立即反映前端设计中的变化
✅ **无需保存**: 用户无需先保存流程就能配置条件
✅ **向后兼容**: 编辑已保存流程时仍然使用后端数据
✅ **性能优化**: 优先使用前端数据，避免不必要的 API 调用
✅ **用户体验**: 流程设计更流畅，减少用户困惑

## 技术细节

### 数据流向

```
新建流程:
WorkflowDesigner (nodes) 
  → NodeConfigDrawer (allNodes)
    → extractFormsFromNodes()
      → workflowForms (前端数据)

编辑已保存流程:
WorkflowDesigner (workflowDefinitionId)
  → NodeConfigDrawer (workflowDefinitionId)
    → getWorkflowFormsAndFields()
      → workflowForms (后端数据)
```

### 依赖关系

- `allNodes`: 前端节点数据
- `forms`: 表单定义列表
- `workflowDefinitionId`: 流程定义 ID（编辑时）
- `extractFormsFromNodes`: 提取表单的回调函数

## 测试场景

1. **新建流程 - 单个表单**
   - 创建流程，在开始节点绑定表单
   - 创建条件节点，验证表单出现在选择列表中

2. **新建流程 - 多个表单**
   - 创建多个节点，每个节点绑定不同的表单
   - 创建条件节点，验证所有表单都出现在选择列表中

3. **新建流程 - 动态更新**
   - 创建条件节点
   - 打开条件配置
   - 在另一个节点中绑定新表单
   - 验证条件组件中的表单列表自动更新

4. **编辑已保存流程**
   - 打开已保存的流程
   - 打开条件节点配置
   - 验证表单从后端正确加载

## Git 提交

```
commit 586e3be
feat: 条件组件表单选择跟随前端流程设计实时数据变化

Changes:
- NodeConfigDrawer: 添加 allNodes 参数和 extractFormsFromNodes 函数
- NodeConfigDrawer: 实现两层策略（前端优先，后端备选）
- WorkflowDesigner: 传递 allNodes 参数给 NodeConfigDrawer
```

## 后续改进

1. 可以添加表单变化的实时监听，进一步优化用户体验
2. 可以在表单列表为空时显示友好的提示信息
3. 可以添加表单绑定的可视化指示

## 总结

通过从前端节点数据中实时提取表单信息，条件组件现在能够立即显示用户在流程设计中绑定的表单，无需等待流程保存。这大大改善了用户体验，使流程设计更加流畅和直观。
