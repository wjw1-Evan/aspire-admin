# 工作流条件组件业务规则指南

## 概述

条件组件是工作流中的关键分支节点，用于根据流程中绑定的表单数据进行业务判断，并根据判断结果走向不同的下一个组件。

## 核心业务规则

### 1. 数据来源

条件组件的判断数据来自以下三个层级（优先级从低到高）：

```
流程实例变量 < 公文基本信息 < 公文表单数据
```

#### 1.1 流程实例变量
- 在流程启动时通过 `variables` 参数传入
- 示例：`{ "requestId": "REQ-001", "priority": "high" }`

#### 1.2 公文基本信息
- 自动注入的系统变量
- 包括：`document_title`, `document_id`, `started_by`, `document_content`, `document_status`, `document_created_at`

#### 1.3 公文表单数据（优先级最高）
- 来自关联公文的 `FormData` 字段
- 这是条件组件主要使用的数据源
- 示例：`{ "amount": 5000, "department": "Finance", "approvalLevel": "high" }`

### 2. 条件规则配置

条件组件支持两种配置方式：

#### 2.1 表达式模式（推荐）

直接配置一个表达式字符串，支持复杂的逻辑：

```json
{
  "condition": {
    "expression": "{amount} > 1000 && {department} == Finance"
  }
}
```

**支持的操作符：**
- 比较：`>`, `<`, `>=`, `<=`, `==`, `!=`
- 逻辑：`&&` (AND), `||` (OR)
- 变量引用：`{variableName}`

#### 2.2 规则列表模式

配置多个条件规则，通过逻辑运算符组合：

```json
{
  "condition": {
    "conditions": [
      {
        "variable": "amount",
        "operator": "greater_than",
        "value": "1000"
      },
      {
        "variable": "department",
        "operator": "equals",
        "value": "Finance"
      }
    ],
    "logicalOperator": "and"
  }
}
```

**支持的操作符：**
- `equals` / `==`：等于
- `not_equals` / `!=`：不等于
- `greater_than` / `>`：大于
- `less_than` / `<`：小于
- `greater_than_or_equal` / `>=`：大于等于
- `less_than_or_equal` / `<=`：小于等于
- `contains`：包含
- `in` / `not_in`：在列表中

**逻辑运算符：**
- `and`（默认）：所有条件都为真
- `or`：任意一个条件为真

### 3. 条件结果与路由

条件组件的执行结果决定流程的走向：

```
条件评估 → true/false → sourceHandle → 下一个组件
```

#### 3.1 返回值

条件组件返回一个字典，包含：

```json
{
  "__sourceHandle": "true" 或 "false",
  "result": true 或 false,
  "evaluatedAt": "2026-03-13T10:30:00Z"
}
```

#### 3.2 边的配置

在工作流图中，条件节点的出边需要配置 `sourceHandle`：

```json
{
  "edges": [
    {
      "id": "e1",
      "source": "condition_node",
      "target": "approval_high",
      "sourceHandle": "true"    // 条件为真时走这条边
    },
    {
      "id": "e2",
      "source": "condition_node",
      "target": "approval_low",
      "sourceHandle": "false"   // 条件为假时走这条边
    }
  ]
}
```

## 实现细节

### 4. 条件执行流程

```
1. ProcessNodeAsync() 被调用
   ↓
2. ProcessNodeViaExecutorAsync() 获取表单数据
   ↓
3. GetDocumentVariablesAsync() 注入所有变量
   - 流程实例变量
   - 公文基本信息
   - 公文表单数据（优先级最高）
   ↓
4. ConditionExecutor.HandleAsync() 评估条件
   - 如果配置了表达式，使用表达式求值
   - 否则使用规则列表求值
   ↓
5. 返回 sourceHandle ("true" 或 "false")
   ↓
6. MoveToNextNodeAsync() 根据 sourceHandle 路由
```

### 5. 变量解析

条件组件支持灵活的变量解析：

#### 5.1 精确匹配
```
{amount} → 查找 "amount" 变量
```

#### 5.2 大小写不敏感匹配
```
{Amount} → 查找 "amount" 变量（如果精确匹配失败）
```

#### 5.3 嵌套对象（通过表单数据）
```
公文表单数据：{ "user": { "name": "张三", "level": 3 } }
条件表达式：{user.level} > 2  // 需要表单数据支持嵌套
```

### 6. 类型转换

条件组件自动处理类型转换：

```
数字比较：
  {amount} > 1000
  → 自动将 "1000" 转换为数字进行比较

字符串比较：
  {department} == Finance
  → 作为字符串进行比较

布尔值：
  {isApproved} == true
  → 支持布尔值比较
```

## 使用示例

### 示例 1：金额分级审批

**场景：** 根据申请金额决定审批流程

**表单数据：**
```json
{
  "amount": 5000,
  "department": "IT",
  "requestType": "equipment"
}
```

**条件配置：**
```json
{
  "condition": {
    "expression": "{amount} > 10000"
  }
}
```

**流程图：**
```
Start → Condition (amount > 10000) 
  ├─ true → HighAmountApproval → End
  └─ false → LowAmountApproval → End
```

### 示例 2：多条件组合

**场景：** 根据多个条件决定审批流程

**表单数据：**
```json
{
  "amount": 5000,
  "department": "Finance",
  "isUrgent": true
}
```

**条件配置：**
```json
{
  "condition": {
    "conditions": [
      {
        "variable": "amount",
        "operator": "greater_than",
        "value": "1000"
      },
      {
        "variable": "department",
        "operator": "equals",
        "value": "Finance"
      }
    ],
    "logicalOperator": "and"
  }
}
```

**结果：** 如果金额 > 1000 **且** 部门 = Finance，条件为真

### 示例 3：OR 逻辑

**场景：** 满足任意一个条件即可

**条件配置：**
```json
{
  "condition": {
    "conditions": [
      {
        "variable": "isUrgent",
        "operator": "equals",
        "value": "true"
      },
      {
        "variable": "amount",
        "operator": "greater_than",
        "value": "50000"
      }
    ],
    "logicalOperator": "or"
  }
}
```

**结果：** 如果紧急 **或** 金额 > 50000，条件为真

## 调试与日志

### 7. 调试变量

条件组件执行后，会在流程实例中注入调试变量：

```
debug.{nodeId}.sourceHandle    // 返回的 handle 值
debug.{nodeId}.resultType      // 结果类型
debug.{nodeId}.processedAt     // 处理时间
debug.{nodeId}.error           // 错误信息（如果有）
```

### 8. 日志输出

条件组件会输出详细的调试日志：

```
DEBUG_CONDITION: 条件节点开始评估，变量总数 = 10
DEBUG_CONDITION: 变量 amount = 5000
DEBUG_CONDITION: 变量 department = Finance
DEBUG_CONDITION: 规则 [amount greater_than 1000] = true
DEBUG_CONDITION: 规则 [department equals Finance] = true
DEBUG_CONDITION: 条件评估结果 = true
```

## 最佳实践

### 9. 设计建议

1. **优先使用表达式模式**
   - 更简洁、更易维护
   - 支持复杂的逻辑组合

2. **变量命名规范**
   - 使用小写 + 下划线：`approval_amount`, `is_urgent`
   - 避免特殊字符

3. **条件设计**
   - 保持条件简单明了
   - 复杂逻辑可以分解为多个条件节点

4. **测试覆盖**
   - 测试所有分支路径
   - 测试边界值（如 amount = 1000）
   - 测试变量缺失的情况

### 10. 常见问题

**Q: 变量不存在时会怎样？**
A: 条件组件会返回 false（对于 `!=` 操作符返回 true）

**Q: 支持嵌套对象吗？**
A: 目前不支持，建议在表单数据中展平嵌套结构

**Q: 支持正则表达式吗？**
A: 目前不支持，可以使用 `contains` 操作符进行简单的字符串匹配

**Q: 条件评估失败会怎样？**
A: 流程会记录错误并停止（状态设为 Cancelled）

## 相关文件

- `Platform.ApiService/Workflows/Executors/ConditionExecutor.cs` - 条件执行器实现
- `Platform.ApiService/Services/WorkflowEngine.Helpers.cs` - 变量获取逻辑
- `Platform.ApiService/Services/WorkflowExpressionEvaluator.cs` - 表达式求值器
- `Platform.ApiService/Models/Workflow/WorkflowDefinition.cs` - 条件配置模型
- `Platform.AppHost.Tests/Tests/WorkflowConditionTests.cs` - 条件组件测试
