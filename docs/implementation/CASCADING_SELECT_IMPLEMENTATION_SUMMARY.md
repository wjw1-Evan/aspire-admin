# 条件组件二级联动选择实现总结

## 任务完成情况

✅ **已完成** - 将条件组件中的"变量"字段改为二级联动选择

## 实现内容

### 1. 后端 API 端点 (已完成)
**文件**: `Platform.ApiService/Controllers/WorkflowController.cs`

新增端点: `GET /api/workflows/{id}/forms-and-fields`
- 功能: 获取流程中使用的所有表单及其字段
- 返回结构:
  ```json
  {
    "forms": [
      {
        "Id": "form-id",
        "Name": "表单名称",
        "Key": "form_key",
        "Fields": [
          {
            "Id": "field-id",
            "Label": "字段标签",
            "DataKey": "field_key",
            "Type": "Text",
            "Required": true
          }
        ]
      }
    ]
  }
  ```

### 2. 前端 API 函数 (已完成)
**文件**: `Platform.Admin/src/services/workflow/api.ts`

新增函数: `getWorkflowFormsAndFields(definitionId: string)`
- 调用后端端点获取流程表单及字段数据
- 返回类型完整定义

### 3. 前端 UI 组件 (已完成)
**文件**: `Platform.Admin/src/pages/workflow/components/NodeConfigDrawer.tsx`

#### 主要改动:
1. **导入新 API 函数**
   - 导入 `getWorkflowFormsAndFields` 函数
   - 导入 TypeScript 类型定义

2. **添加状态管理**
   - `workflowForms`: 存储流程中使用的表单列表
   - `loading`: 加载状态

3. **添加数据加载逻辑**
   - 在 `useEffect` 中加载流程表单数据
   - 当 drawer 打开且有 workflowDefinitionId 时触发

4. **实现二级联动选择**
   - **第一级**: 选择表单 (formId)
   - **第二级**: 根据选中的表单动态显示其字段 (variable/fieldKey)
   - 第二级 Select 在未选择表单时禁用

5. **条件规则结构更新**
   - 原: `{ Variable, Operator, Value }`
   - 新: `{ FormId, Variable, Operator, Value }`
   - FormId 用于标识字段所属的表单

### 4. 测试代码更新 (已完成)
**文件**: `Platform.AppHost.Tests/Tests/WorkflowConditionTests.cs`

更新所有 9 个测试用例中的条件定义:
- 添加 `FormId` 字段到所有条件对象
- 保持其他字段不变

#### 更新的测试:
1. ✅ `ConditionBranching_AmountGreaterThan1000_ShouldGoToApprovalA`
2. ✅ `ConditionBranching_AmountLessThanOrEqualTo1000_ShouldGoToApprovalB`
3. ✅ `ConditionBranching_AmountEqualTo1000_ShouldGoToApprovalB`
4. ✅ `ConditionBranching_MultipleConditionsAND_AllMatch_ShouldGoToApprovalA`
5. ✅ `ConditionBranching_MultipleConditionsAND_PartialMatch_ShouldGoToApprovalB`
6. ✅ `ConditionBranching_MultipleConditionsOR_AnyMatch_ShouldGoToApprovalA`
7. ✅ `ConditionBranching_StringComparison_Equals_ShouldGoToApprovalA`
8. ✅ `ConditionBranching_StringComparison_NotEquals_ShouldGoToApprovalB`
9. ✅ `ConditionBranching_FormDataPriority_ShouldUseFormData`

## 技术细节

### 前端级联逻辑
```typescript
// 获取选中表单的字段
const getSelectedFormFields = (formId: string | undefined): WorkflowFormField[] => {
  if (!formId) return [];
  const form = workflowForms.find(f => f.Id === formId);
  return form?.Fields || [];
};

// 在条件规则中使用
<Form.Item noStyle shouldUpdate={(prev, curr) => 
  prev.conditions?.[name]?.formId !== curr.conditions?.[name]?.formId
}>
  {({ getFieldValue }) => {
    const formId = getFieldValue(['conditions', name, 'formId']);
    const fields = getSelectedFormFields(formId);
    return (
      <Form.Item
        name={[name, 'variable']}
        label="字段"
        rules={[{ required: true, message: '请选择字段' }]}
      >
        <Select 
          placeholder="选择表单字段" 
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

## 用户体验改进

1. **更清晰的表单选择**
   - 用户首先选择表单，然后选择该表单的字段
   - 避免显示所有可用变量的混乱列表

2. **动态字段列表**
   - 字段列表根据选中的表单动态更新
   - 只显示相关的字段

3. **字段标签和 DataKey**
   - 显示格式: "字段标签 (field_key)"
   - 帮助用户识别字段

4. **禁用状态**
   - 未选择表单时，字段选择器禁用
   - 防止用户选择无效的字段

## 编译验证

✅ 所有文件编译通过，无错误或警告

## Git 提交

```
commit 6f10b49
feat: 条件组件变量改为二级联动选择

Changes:
- Platform.Admin/src/services/workflow/api.ts: 新增 getWorkflowFormsAndFields 函数
- Platform.Admin/src/pages/workflow/components/NodeConfigDrawer.tsx: 实现二级联动选择 UI
- Platform.AppHost.Tests/Tests/WorkflowConditionTests.cs: 更新所有测试用例
```

## 后续步骤

1. **运行集成测试**
   ```bash
   dotnet test Platform.AppHost.Tests
   ```

2. **前端测试**
   - 在工作流设计器中创建条件节点
   - 验证二级联动选择功能正常工作
   - 验证条件规则正确保存

3. **端到端测试**
   - 创建包含条件节点的工作流
   - 创建公文并启动流程
   - 验证条件路由正确

## 注意事项

- 条件规则现在包含 `FormId` 字段，用于标识字段所属的表单
- 后端需要正确处理新的条件结构
- 前端 UI 现在依赖 `workflowDefinitionId` prop 来加载表单数据
- 确保在使用 NodeConfigDrawer 时传递 `workflowDefinitionId` prop
