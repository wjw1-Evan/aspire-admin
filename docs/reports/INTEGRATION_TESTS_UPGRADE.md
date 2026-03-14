# 工作流条件组件集成测试升级总结

## 升级目标

升级集成测试，使其遵循正确的工作流设计流程：
1. **创建表单定义** - 定义条件组件需要的字段
2. **创建工作流** - 在 start 节点绑定表单，条件节点配置条件规则
3. **创建公文** - 填充表单数据
4. **启动流程** - 验证条件组件根据表单数据正确路由

## 核心改进

### 1. 表单创建与绑定

**新增辅助方法：**
```csharp
// 创建表单定义
private async Task<string> CreateFormDefinitionAsync(
    string formName, 
    List<FormFieldRequest> fields)

// 创建带表单绑定的工作流
private WorkflowDefinitionRequest CreateWorkflowWithFormBinding(
    string formDefinitionId, 
    string conditionLabel,
    List<object> conditions,
    string logicalOperator = "and")
```

### 2. 工作流设计流程

**Start 节点配置：**
```json
{
  "Id": "start",
  "Type": "start",
  "Data": {
    "Config": {
      "Form": {
        "FormDefinitionId": "form_id",
        "Target": "Document",
        "Required": true
      }
    }
  }
}
```

**条件节点配置：**
```json
{
  "Id": "condition_node",
  "Type": "condition",
  "Data": {
    "Config": {
      "Condition": {
        "LogicalOperator": "and",
        "Conditions": [
          {
            "Variable": "amount",
            "Operator": "greater_than",
            "Value": "1000"
          }
        ]
      }
    }
  }
}
```

### 3. 测试流程

每个测试都遵循以下步骤：

```
1. 创建表单定义
   ↓
2. 创建工作流并在 start 节点绑定表单
   ↓
3. 创建公文并填充表单数据
   ↓
4. 启动流程
   ↓
5. 验证条件组件根据表单数据正确路由
```

## 测试用例

### 1. 单一条件测试（3 个）

| 测试名称 | 场景 | 预期结果 |
|---------|------|--------|
| `ConditionBranching_AmountGreaterThan1000_ShouldGoToApprovalA` | amount=2000 > 1000 | approval_a |
| `ConditionBranching_AmountLessThanOrEqualTo1000_ShouldGoToApprovalB` | amount=500 > 1000 | approval_b |
| `ConditionBranching_AmountEqualTo1000_ShouldGoToApprovalB` | amount=1000 > 1000（边界值） | approval_b |

### 2. 多条件 AND 逻辑（2 个）

| 测试名称 | 场景 | 预期结果 |
|---------|------|--------|
| `ConditionBranching_MultipleConditionsAND_AllMatch_ShouldGoToApprovalA` | amount=5000 > 1000 && department=Finance | approval_a |
| `ConditionBranching_MultipleConditionsAND_PartialMatch_ShouldGoToApprovalB` | amount=5000 > 1000 && department=IT | approval_b |

### 3. 多条件 OR 逻辑（1 个）

| 测试名称 | 场景 | 预期结果 |
|---------|------|--------|
| `ConditionBranching_MultipleConditionsOR_AnyMatch_ShouldGoToApprovalA` | amount=500 > 1000 \|\| isUrgent=true | approval_a |

### 4. 字符串比较（2 个）

| 测试名称 | 场景 | 预期结果 |
|---------|------|--------|
| `ConditionBranching_StringComparison_Equals_ShouldGoToApprovalA` | department=Finance | approval_a |
| `ConditionBranching_StringComparison_NotEquals_ShouldGoToApprovalB` | department=IT | approval_b |

### 5. 数据优先级验证（1 个）

| 测试名称 | 场景 | 预期结果 |
|---------|------|--------|
| `ConditionBranching_FormDataPriority_ShouldUseFormData` | 表单数据 amount=2000 覆盖 Variables 中的 amount=500 | approval_a |

## 总计：9 个测试用例

## 关键特性

### 1. 表单数据优先级

```
流程实例变量 < 公文基本信息 < 公文表单数据
```

测试验证表单数据能够正确覆盖流程变量。

### 2. 条件评估

支持的操作符：
- 数值比较：`>`, `<`, `>=`, `<=`, `==`, `!=`
- 字符串比较：`==`, `!=`
- 逻辑运算：`and`, `or`

### 3. 路由验证

条件组件根据评估结果返回 `sourceHandle`：
- `true` - 走 true 分支（approval_a）
- `false` - 走 false 分支（approval_b）

## 测试执行

运行所有条件组件测试：
```bash
dotnet test Platform.AppHost.Tests --filter "WorkflowConditionTests"
```

运行单个测试：
```bash
dotnet test Platform.AppHost.Tests --filter "ConditionBranching_AmountGreaterThan1000_ShouldGoToApprovalA"
```

## 测试输出示例

```
✓ 创建表单: 507f1f77bcf86cd799439011
✓ 创建工作流: 507f1f77bcf86cd799439012
✓ 创建公文: 507f1f77bcf86cd799439013，表单数据: amount=2000
✓ 条件评估：amount=2000 > 1000 = true，流程进入 approval_a
```

## 文件变更

- `Platform.AppHost.Tests/Tests/WorkflowConditionTests.cs` - 完全重写，添加表单创建和绑定逻辑
- `Platform.AppHost.Tests/Helpers/TestDataGenerator.cs` - 保持不变（已有必要的辅助方法）

## 验证清单

- ✅ 所有测试代码通过编译
- ✅ 表单创建和绑定逻辑正确
- ✅ 条件评估逻辑覆盖所有场景
- ✅ 数据优先级验证正确
- ✅ 测试输出清晰易读
