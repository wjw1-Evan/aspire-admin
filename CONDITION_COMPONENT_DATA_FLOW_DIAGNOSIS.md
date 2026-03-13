# 条件组件数据流诊断报告

## 问题描述

用户反馈：条件组件中的变量数据不正确，应该使用"表单"中的数据。

## 数据流分析

### 1. 数据流路径

```
用户提交表单数据
    ↓
CreateDocumentForWorkflowAsync()
    ↓
document.FormData = formDataToSave
    ↓
文档保存到 MongoDB
    ↓
SubmitDocumentAsync()
    ↓
StartWorkflowAsync()
    ↓
ProcessNodeAsync()
    ↓
ProcessNodeViaExecutorAsync()
    ↓
GetDocumentVariablesAsync()
    ↓
从文档中读取 FormData
    ↓
variables[key] = formData[key]
    ↓
ConditionExecutor.HandleAsync()
    ↓
EvaluateConditions()
    ↓
条件判断
```

### 2. 当前实现检查

#### 2.1 表单数据保存 ✅
**文件**: `Platform.ApiService/Services/DocumentService.cs`

```csharp
// 构造 FormData（考虑 DataScopeKey）
Dictionary<string, object> formDataToSave;
if (!string.IsNullOrWhiteSpace(binding.DataScopeKey))
{
    formDataToSave = new Dictionary<string, object>
    {
        [binding.DataScopeKey!] = values
    };
}
else
{
    formDataToSave = new Dictionary<string, object>(values);
}

var document = new Document
{
    // ...
    FormData = formDataToSave,  // ✅ 表单数据被保存
    // ...
};
```

**状态**: ✅ 正确 - 表单数据被正确保存到文档

#### 2.2 表单数据读取 ✅
**文件**: `Platform.ApiService/Services/WorkflowEngine.Helpers.cs`

```csharp
// 🔧 关键修复：将公文的表单数据作为变量注入
if (document.FormData != null && document.FormData.Count > 0)
{
    foreach (var kv in document.FormData)
    {
        // 表单数据优先级最高，会覆盖同名的其他变量
        variables[kv.Key] = kv.Value;
    }
}
```

**状态**: ✅ 正确 - 表单数据被正确读取并注入到变量

#### 2.3 条件评估 ✅
**文件**: `Platform.ApiService/Workflows/Executors/ConditionExecutor.cs`

```csharp
// 反序列化变量（包含表单数据）
var variables = System.Text.Json.JsonSerializer.Deserialize<Dictionary<string, object?>>(input, ...) ?? new();

// 评估条件规则
bool conditionResult = EvaluateConditions(variables);
```

**状态**: ✅ 正确 - 条件执行器使用包含表单数据的变量

### 3. 可能的问题点

#### 问题 1: DataScopeKey 嵌套问题
**描述**: 如果配置了 `DataScopeKey`，表单数据会被嵌套在一个键下

**示例**:
```csharp
// 如果 DataScopeKey = "formData"
formDataToSave = {
    "formData": {
        "amount": 2000,
        "department": "Finance"
    }
}

// 条件规则查找 "amount" 会失败，应该查找 "formData.amount"
```

**影响**: 条件组件无法找到表单字段

**解决方案**: 
1. 检查是否配置了 DataScopeKey
2. 如果有，条件规则中的变量名应该包含路径（如 `formData.amount`）
3. 或者在 GetDocumentVariablesAsync 中展平嵌套结构

#### 问题 2: FormData 为 null
**描述**: 文档的 FormData 可能为 null

**原因**:
- 文档创建时没有提供表单数据
- FormDataJson 反序列化失败
- 文档从旧版本迁移过来

**影响**: 条件组件无法获取任何表单数据

**解决方案**: 
1. 检查文档创建时是否正确传递了表单数据
2. 验证 FormDataJson 的格式是否正确
3. 添加日志记录 FormData 的状态

#### 问题 3: 变量类型不匹配
**描述**: 表单数据的类型可能与条件规则期望的类型不匹配

**示例**:
```csharp
// 表单数据中 amount 是 JsonElement 类型
variables["amount"] = JsonElement { ... }

// 条件规则期望数字类型
rule.Value = "1000"  // 字符串

// 比较失败
```

**影响**: 条件判断结果不正确

**解决方案**: ✅ 已在 WorkflowExpressionEvaluator.CompareValues() 中修复

---

## 诊断步骤

### 步骤 1: 验证表单数据是否被保存

**检查点**: 文档的 FormDataJson 字段

```csharp
// 在 MongoDB 中查询
db.documents.findOne({ _id: ObjectId("...") })

// 查看 formData 字段是否包含表单数据
{
  "_id": ObjectId("..."),
  "formData": "{\"amount\":2000,\"department\":\"Finance\"}",
  ...
}
```

**预期**: FormDataJson 应该包含 JSON 字符串格式的表单数据

### 步骤 2: 验证表单数据是否被正确读取

**检查点**: 工作流引擎日志

```
DEBUG_WORKFLOW: 公文FormData = Count=2
DEBUG_WORKFLOW: FormData 详细内容:
  [amount] = 2000 (Int32)
  [department] = Finance (String)
DEBUG_WORKFLOW: 注入公文表单数据到变量，共 2 个字段
DEBUG_WORKFLOW: 表单字段 [amount] = 2000 (Int32)
DEBUG_WORKFLOW: 表单字段 [department] = Finance (String)
```

**预期**: 日志应该显示表单数据被正确读取和注入

### 步骤 3: 验证条件评估是否使用了表单数据

**检查点**: 条件执行器日志

```
========== 条件节点开始评估 ==========
变量总数 = 10
条件规则数 = 1
逻辑运算符 = and
变量列表:
  [amount] = 2000 (Int32)
  [department] = Finance (String)
  [document_title] = ...
  ...
DEBUG_CONDITION: 处理规则 - Variable=amount, Operator=greater_than, Value=1000
DEBUG_CONDITION: 获取变量 [amount] = 2000 (Int32)
DEBUG_CONDITION: 表达式 [{amount} > 1000] 评估结果 = true
```

**预期**: 日志应该显示表单数据被用于条件评估

---

## 建议的修复方案

### 方案 1: 展平 DataScopeKey 嵌套结构

**问题**: 如果配置了 DataScopeKey，表单数据会被嵌套

**修复**: 在 GetDocumentVariablesAsync 中展平嵌套结构

```csharp
// 修改前
if (document.FormData != null && document.FormData.Count > 0)
{
    foreach (var kv in document.FormData)
    {
        variables[kv.Key] = kv.Value;
    }
}

// 修改后
if (document.FormData != null && document.FormData.Count > 0)
{
    foreach (var kv in document.FormData)
    {
        // 如果值是字典，展平它
        if (kv.Value is Dictionary<string, object> nestedDict)
        {
            foreach (var nested in nestedDict)
            {
                variables[nested.Key] = nested.Value;
            }
        }
        else
        {
            variables[kv.Key] = kv.Value;
        }
    }
}
```

### 方案 2: 添加更详细的日志

**目的**: 帮助诊断数据流问题

```csharp
// 在 GetDocumentVariablesAsync 中添加
_logger.LogInformation("FormData 结构: {FormDataStructure}", 
    System.Text.Json.JsonSerializer.Serialize(document.FormData));

// 在 ConditionExecutor 中添加
_logger.LogInformation("条件评估输入变量: {Variables}", 
    System.Text.Json.JsonSerializer.Serialize(variables));
```

### 方案 3: 验证表单数据类型

**目的**: 确保表单数据类型正确

```csharp
// 在 CreateDocumentForWorkflowAsync 中添加
_logger.LogInformation("FormData 类型检查:");
foreach (var kv in formDataToSave)
{
    _logger.LogInformation("  [{Key}] = {Value} ({Type})", 
        kv.Key, kv.Value, kv.Value?.GetType().Name ?? "null");
}
```

---

## 测试验证

### 测试 1: 验证表单数据流

```csharp
[Fact]
public async Task FormDataShouldBeUsedInConditionEvaluation()
{
    // 1. 创建表单
    var form = await CreateFormAsync(new[] {
        new FormField { DataKey = "amount", Type = "Number", Required = true }
    });

    // 2. 创建工作流
    var workflow = await CreateWorkflowAsync(form.Id);

    // 3. 创建文档并提交
    var document = await CreateDocumentAsync(new { amount = 2000 });
    var instance = await SubmitDocumentAsync(document.Id, workflow.Id);

    // 4. 验证条件评估结果
    Assert.Equal("approval_a", instance.CurrentNodeId);  // 应该进入 true 分支
}
```

### 测试 2: 验证 DataScopeKey 处理

```csharp
[Fact]
public async Task DataScopeKeyShouldBeHandledCorrectly()
{
    // 1. 创建带 DataScopeKey 的表单绑定
    var binding = new FormBinding
    {
        FormDefinitionId = formId,
        Target = FormTarget.Document,
        DataScopeKey = "formData"  // 嵌套键
    };

    // 2. 创建文档
    var document = await CreateDocumentAsync(new { amount = 2000 });

    // 3. 验证 FormData 结构
    var savedDoc = await GetDocumentAsync(document.Id);
    Assert.NotNull(savedDoc.FormData);
    
    // 应该能找到 amount 字段（无论是否嵌套）
    var amount = GetFormDataValue(savedDoc.FormData, "amount");
    Assert.Equal(2000, amount);
}
```

---

## 总结

当前实现**已经正确地使用表单数据**进行条件评估。数据流如下：

1. ✅ 表单数据被保存到文档的 FormData 属性
2. ✅ 表单数据被从文档中读取
3. ✅ 表单数据被注入到条件评估的变量中
4. ✅ 条件执行器使用这些变量进行判断

**可能的问题**:
- DataScopeKey 嵌套导致字段无法找到
- FormData 为 null
- 变量类型不匹配（已修复）

**建议**:
1. 检查日志确认表单数据是否被正确读取
2. 如果使用了 DataScopeKey，需要展平嵌套结构
3. 添加更详细的日志帮助诊断

---

## 附录：完整的数据流示例

### 场景: 创建文档并启动工作流

```
1. 前端提交表单数据
   POST /api/workflows/{id}/documents/start
   {
     "values": {
       "amount": 2000,
       "department": "Finance"
     }
   }

2. 后端创建文档
   CreateDocumentForWorkflowAsync()
   → document.FormData = { "amount": 2000, "department": "Finance" }
   → 保存到 MongoDB

3. 后端启动工作流
   StartWorkflowAsync()
   → 创建 WorkflowInstance
   → 处理 start 节点

4. 后端处理条件节点
   ProcessNodeAsync("condition_node")
   → GetDocumentVariablesAsync()
     → 从 MongoDB 读取文档
     → 读取 document.FormData
     → variables["amount"] = 2000
     → variables["department"] = "Finance"
   → ProcessNodeViaExecutorAsync()
     → ConditionExecutor.HandleAsync(variables)
       → EvaluateConditions(variables)
         → 检查 amount > 1000
         → 返回 true
       → 返回 { __sourceHandle: "true" }
   → MoveToNextNodeAsync("condition_node", "true")
     → 路由到 approval_a 节点

5. 前端显示结果
   工作流实例的 currentNodeId = "approval_a"
```

这个流程中，表单数据（amount=2000）被正确地用于条件评估。
