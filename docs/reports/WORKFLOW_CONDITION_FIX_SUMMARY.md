# 工作流条件路由修复总结

## 问题描述

工作流条件组件在评估表单数据时失败，导致条件路由无法正确工作。测试用例期望当 `amount=2000 > 1000` 时流程进入 `approval_a`，但实际返回 400 BadRequest。

## 根本原因分析

### 问题 1：MongoDB EF Core 提供程序的字段映射冲突

**症状**：
```
The property 'FormData' of type 'Platform.ApiService.Models.Workflow.Document' 
cannot use element name 'formData' because it is already being used by property 'FormDataJson'.
```

**原因**：
- `Document` 实体中的 `FormData` 计算属性和 `FormDataJson` 属性都试图映射到同一个 MongoDB 字段 `formData`
- EF Core MongoDB 提供程序在配置时检测到这个冲突，导致模型验证失败

**解决方案**：
在 `FormData` 计算属性上添加 `[BsonIgnore]` 属性，确保它不被映射到数据库：

```csharp
[System.ComponentModel.DataAnnotations.Schema.NotMapped]
[System.Text.Json.Serialization.JsonIgnore]
[BsonIgnore]  // 新增
public Dictionary<string, object>? FormData { get; set; }
```

### 问题 2：布尔值比较的大小写敏感性

**症状**：
OR 条件测试失败。测试设置 `isUrgent=true`（布尔值），条件中的值为 `"true"`（字符串），但比较失败。

**原因**：
- 布尔值 `true` 的 `ToString()` 返回 `"True"`（大写 T）
- 条件中的字符串值是 `"true"`（小写 t）
- 字符串比较是区分大小写的，导致 `"True" != "true"`

**解决方案**：
在 `WorkflowExpressionEvaluator.CompareValues` 方法中添加布尔值的特殊处理：

```csharp
// 处理布尔值比较
if (leftValue is bool leftBool)
{
    if (bool.TryParse(rightValueStr, out var rightBool))
    {
        return op switch
        {
            "==" => leftBool == rightBool,
            "!=" => leftBool != rightBool,
            _ => false
        };
    }
}
```

同时，将字符串比较改为大小写不敏感：

```csharp
// 默认作为字符串比较（不区分大小写）
var leftStr = leftValue.ToString() ?? string.Empty;
var stringResult = op switch
{
    "==" => leftStr.Equals(rightValueStr, StringComparison.OrdinalIgnoreCase),
    "!=" => !leftStr.Equals(rightValueStr, StringComparison.OrdinalIgnoreCase),
    _ => false
};
```

## 修改的文件

1. **Platform.ApiService/Models/Workflow/WorkflowDocument.cs**
   - 为 `FormData` 计算属性添加 `[BsonIgnore]` 属性

2. **Platform.ApiService/Services/WorkflowExpressionEvaluator.cs**
   - 添加布尔值比较的特殊处理
   - 修改字符串比较为大小写不敏感

3. **Platform.ApiService/Controllers/DocumentController.cs**
   - 移除调试代码

4. **Platform.ApiService/Services/DocumentService.cs**
   - 移除调试代码和不必要的 try-catch

5. **Platform.AppHost.Tests/Tests/WorkflowConditionTests.cs**
   - 移除调试输出

## 测试结果

所有 9 个工作流条件路由测试现已通过：

✅ ConditionBranching_AmountGreaterThan1000_ShouldGoToApprovalA
✅ ConditionBranching_AmountLessThanOrEqualTo1000_ShouldGoToApprovalB
✅ ConditionBranching_AmountEqualTo1000_ShouldGoToApprovalB
✅ ConditionBranching_MultipleConditionsAND_AllMatch_ShouldGoToApprovalA
✅ ConditionBranching_MultipleConditionsAND_PartialMatch_ShouldGoToApprovalB
✅ ConditionBranching_MultipleConditionsOR_AnyMatch_ShouldGoToApprovalA
✅ ConditionBranching_StringComparison_Equals_ShouldGoToApprovalA
✅ ConditionBranching_StringComparison_NotEquals_ShouldGoToApprovalB
✅ ConditionBranching_FormDataPriority_ShouldUseFormData

## 关键改进

1. **数据持久化**：FormData 现在能够正确地从 MongoDB 中序列化和反序列化
2. **条件评估**：支持多种数据类型的比较（数字、布尔值、字符串）
3. **容错性**：字符串比较不再区分大小写，提高了条件规则的容错性
4. **代码质量**：移除了所有调试代码，保持代码整洁

## 后续建议

1. 考虑在条件编辑器中添加类型提示，帮助用户正确设置条件值
2. 添加条件评估的日志记录，便于调试复杂的条件规则
3. 考虑支持更多的数据类型比较（日期、时间等）
