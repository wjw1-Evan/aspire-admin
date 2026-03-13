# 工作流条件组件改进总结

## 改进目标

实现工作流设计中"条件"组件的业务规则，使其能够：
1. 使用流程中绑定的表单数据进行判断
2. 根据判断结果走向不同的下一个组件
3. 提供清晰的数据流和调试能力

## 改进内容

### 1. 条件执行器增强 (`ConditionExecutor.cs`)

**改进点：**
- ✅ 添加详细的业务规则注释
- ✅ 改进条件评估逻辑，支持表达式和规则列表两种模式
- ✅ 增强变量解析，支持大小写不敏感匹配
- ✅ 改进操作符映射，支持更多操作符（`in`, `not_in` 等）
- ✅ 添加详细的调试日志

**关键方法：**
```csharp
// 评估所有条件规则
private bool EvaluateConditions(Dictionary<string, object?> variables)

// 评估单个条件规则
private bool EvaluateSingleRule(ConditionRule rule, Dictionary<string, object?> variables)

// 从变量字典中获取值（支持大小写不敏感）
private object? GetVariableValue(string variableName, Dictionary<string, object?> variables)

// 组合多个条件结果
private bool CombineResults(List<bool> results)
```

### 2. 变量获取增强 (`WorkflowEngine.Helpers.cs`)

**改进点：**
- ✅ 添加详细的业务规则注释
- ✅ 明确表单数据的优先级（最高）
- ✅ 添加日志记录，便于调试
- ✅ 增加文档状态等系统变量

**数据优先级：**
```
流程实例变量 < 公文基本信息 < 公文表单数据
```

**注入的变量：**
- 流程实例变量：通过 `instance.GetVariablesDict()` 获取
- 公文基本信息：`document_title`, `document_id`, `started_by`, `document_content`, `document_status`, `document_created_at`
- 公文表单数据：`document.FormData` 中的所有字段（优先级最高）

### 3. 节点处理增强 (`WorkflowEngine.NodeHandlers.cs`)

**改进点：**
- ✅ 添加详细的业务流程注释
- ✅ 增强日志记录，便于追踪流程执行
- ✅ 改进错误处理和调试信息
- ✅ 添加系统变量注入（`__nodeId`, `__nodeType` 等）

**执行流程：**
```
1. 获取流程实例和表单数据
2. 创建对应的执行器
3. 执行节点逻辑，获取返回结果
4. 根据结果确定 sourceHandle
5. 路由到下一个组件
```

## 数据流示例

### 场景：金额分级审批

**1. 创建公文时的表单数据：**
```json
{
  "amount": 5000,
  "department": "Finance",
  "requestType": "equipment"
}
```

**2. 启动流程时的变量：**
```json
{
  "requestId": "REQ-001",
  "priority": "high"
}
```

**3. 条件组件执行时的变量字典：**
```json
{
  // 流程实例变量
  "requestId": "REQ-001",
  "priority": "high",
  
  // 公文基本信息
  "document_title": "设备采购申请",
  "document_id": "DOC-001",
  "started_by": "user123",
  "document_status": "Approving",
  
  // 公文表单数据（优先级最高）
  "amount": 5000,
  "department": "Finance",
  "requestType": "equipment",
  
  // 系统变量
  "__instanceId": "INST-001",
  "__nodeId": "condition_node",
  "__nodeType": "condition"
}
```

**4. 条件规则：**
```json
{
  "condition": {
    "expression": "{amount} > 1000 && {department} == Finance"
  }
}
```

**5. 条件评估结果：**
```
{amount} > 1000 && {department} == Finance
= 5000 > 1000 && Finance == Finance
= true && true
= true
```

**6. 返回的 sourceHandle：**
```json
{
  "__sourceHandle": "true",
  "result": true,
  "evaluatedAt": "2026-03-13T10:30:00Z"
}
```

**7. 流程路由：**
```
Condition Node (true) → HighAmountApproval → ...
```

## 调试能力

### 调试变量

条件组件执行后，会在流程实例中注入调试变量：

```
debug.condition_node.sourceHandle = "true"
debug.condition_node.resultType = "Dictionary`2"
debug.condition_node.processedAt = "2026-03-13T10:30:00Z"
debug.condition_node.error = null
```

### 日志输出

```
DEBUG_CONDITION: 条件节点开始评估，变量总数 = 10
DEBUG_CONDITION: 变量 amount = 5000
DEBUG_CONDITION: 变量 department = Finance
DEBUG_CONDITION: 使用表达式评估: {amount} > 1000 && {department} == Finance
DEBUG_CONDITION: 表达式 '{amount} > 1000' 评估结果 = true
DEBUG_CONDITION: 表达式 '{department} == Finance' 评估结果 = true
DEBUG_CONDITION: 条件评估结果 = true
```

## 测试覆盖

现有测试文件 `WorkflowConditionTests.cs` 包含：

1. **ConditionBranching_AmountGreaterThan1000_ShouldGoToApprovalA**
   - 测试金额 > 1000 时的分支路由

2. **ConditionBranching_AmountLessThanOrEqualTo1000_ShouldGoToApprovalB**
   - 测试金额 <= 1000 时的分支路由

## 使用指南

详见 `Platform.ApiService/docs/CONDITION_COMPONENT_GUIDE.md`

## 技术细节

### 支持的操作符

**比较操作符：**
- `equals` / `==`：等于
- `not_equals` / `!=`：不等于
- `greater_than` / `>`：大于
- `less_than` / `<`：小于
- `greater_than_or_equal` / `>=`：大于等于
- `less_than_or_equal` / `<=`：小于等于
- `contains`：包含
- `in` / `not_in`：在列表中

**逻辑操作符：**
- `&&`：AND
- `||`：OR

### 类型转换

条件组件自动处理类型转换：
- 数字比较：自动转换为 double 进行比较
- 字符串比较：作为字符串进行比较
- 布尔值：支持布尔值比较

### 变量解析

- 精确匹配：`{amount}` → 查找 "amount"
- 大小写不敏感：`{Amount}` → 查找 "amount"（如果精确匹配失败）

## 后续改进方向

1. **支持嵌套对象访问**
   - 例如：`{user.level} > 2`

2. **支持正则表达式**
   - 例如：`{email} matches "^[a-zA-Z0-9]+@example.com$"`

3. **支持函数调用**
   - 例如：`length({description}) > 10`

4. **支持动态变量**
   - 从数据库或外部服务获取变量

5. **条件节点的可视化编辑**
   - 在前端提供更友好的条件编辑界面

## 相关文件

- `Platform.ApiService/Workflows/Executors/ConditionExecutor.cs` - 条件执行器
- `Platform.ApiService/Services/WorkflowEngine.Helpers.cs` - 变量获取
- `Platform.ApiService/Services/WorkflowEngine.NodeHandlers.cs` - 节点处理
- `Platform.ApiService/Services/WorkflowExpressionEvaluator.cs` - 表达式求值
- `Platform.ApiService/Models/Workflow/WorkflowDefinition.cs` - 数据模型
- `Platform.ApiService/docs/CONDITION_COMPONENT_GUIDE.md` - 使用指南
- `Platform.AppHost.Tests/Tests/WorkflowConditionTests.cs` - 测试用例
