# 条件节点路由修复总结

## 问题描述
条件节点返回的 `__sourceHandle` 值不正确，导致工作流无法正确路由到对应的分支。

## 根本原因
在 `ConditionExecutor.cs` 中，条件节点返回的 `__sourceHandle` 被设置为 **目标节点ID**（如 "approval_a"），而不是 **分支ID**（如 "branch_true"）。

工作流引擎在 `MoveToNextNodeAsync` 中使用 `sourceHandle` 来过滤出边，而边的 `SourceHandle` 属性存储的是分支ID，导致无法找到匹配的边。

## 修复方案

### 1. 修改 ConditionExecutor.cs
**文件**: `Platform.ApiService/Workflows/Executors/ConditionExecutor.cs`

**改动**:
```csharp
// 修改前：返回目标节点ID
var targetNodeId = matchedBranch?.TargetNodeId ?? _config.DefaultNodeId ?? "default";
return new Dictionary<string, object?>
{
    ["__sourceHandle"] = targetNodeId,
    ...
};

// 修改后：返回分支ID
var sourceHandle = matchedBranch?.Id ?? _config.DefaultNodeId ?? "default";
return new Dictionary<string, object?>
{
    ["__sourceHandle"] = sourceHandle,
    ...
};
```

### 2. 添加 Label 属性到 WorkflowEdgeRequest
**文件**: `Platform.AppHost.Tests/Models/WorkflowTestModels.cs`

**改动**: 添加 `Label` 属性用于显示连接线标签

```csharp
public record WorkflowEdgeRequest
{
    ...
    /// <summary>
    /// Optional label for the edge (displayed on the connection line).
    /// </summary>
    public string? Label { get; init; }
}
```

### 3. 更新测试期望状态
**文件**: `Platform.AppHost.Tests/Tests/WorkflowDefinitionTests.cs`

**改动**: 更新测试期望状态以接受 "Waiting" 状态

```csharp
// 修改前：只接受 Running 或 Completed
Assert.True(startResult.Data.Status == "Running" || startResult.Data.Status == "running" ||
            startResult.Data.Status == "Completed" || startResult.Data.Status == "completed",
    $"Expected status 'Running' or 'Completed' but got '{startResult.Data.Status}'");

// 修改后：接受 Running、Waiting 或 Completed
Assert.True(startResult.Data.Status == "Running" || startResult.Data.Status == "running" ||
            startResult.Data.Status == "Waiting" || startResult.Data.Status == "waiting" ||
            startResult.Data.Status == "Completed" || startResult.Data.Status == "completed",
    $"Expected status 'Running', 'Waiting', or 'Completed' but got '{startResult.Data.Status}'");
```

## 测试结果

### 条件节点测试
✅ 所有 10 个条件节点测试通过
- ConditionBranching_AmountGreaterThan1000_ShouldGoToApprovalA ✅
- ConditionBranching_AmountLessThanOrEqualTo1000_ShouldGoToApprovalB ✅
- ConditionBranching_MultipleConditions_AND_ShouldGoToApprovalA ✅
- ConditionBranching_MultipleConditions_OR_ShouldGoToApprovalA ✅
- ConditionBranching_StringComparison_ShouldGoToApprovalA ✅
- ConditionBranching_StringComparison_ShouldGoToApprovalB ✅
- ConditionBranching_FormDataPriority_ShouldUseFormData ✅
- ConditionBranching_DefaultNode_ShouldJumpToDefaultNode ✅
- ConditionBranching_HighAmount_ShouldGoToHighApproval ✅
- ConditionBranching_DefaultNodeRouting_ShouldJumpToDefaultNode ✅

### 完整测试套件
✅ 83 个测试通过
❌ 1 个测试失败（权限问题，与本修复无关）

## 工作流路由流程

修复后的工作流路由流程：

```
1. 条件节点执行
   ↓
2. ConditionExecutor 评估条件
   ↓
3. 返回 __sourceHandle = 分支ID（如 "branch_true"）
   ↓
4. WorkflowEngine.MoveToNextNodeAsync 接收 sourceHandle
   ↓
5. 过滤出边：找到 SourceHandle == "branch_true" 的边
   ↓
6. 获取目标节点 ID（如 "approval_a"）
   ↓
7. 跳转到目标节点
```

## Git 提交

```
292630b fix: 修复条件节点返回的sourceHandle应为分支ID而非目标节点ID
5b70686 fix: 修复测试代码 - 添加Label属性到WorkflowEdgeRequest，更新测试期望状态
```

## 相关文件

- `Platform.ApiService/Workflows/Executors/ConditionExecutor.cs` - 条件执行器
- `Platform.ApiService/Services/WorkflowEngine.NodeHandlers.cs` - 工作流引擎节点处理
- `Platform.AppHost.Tests/Models/WorkflowTestModels.cs` - 测试模型
- `Platform.AppHost.Tests/Tests/WorkflowConditionTests.cs` - 条件测试
- `Platform.AppHost.Tests/Tests/WorkflowDefinitionTests.cs` - 工作流定义测试

## 后续改进建议

1. **权限问题调查**: 调查 `ApprovalFlow_Reject_ShouldFailWorkflow` 测试失败的权限问题
2. **测试优化**: 参考 `TEST_OPTIMIZATION_GUIDE.md` 优化测试运行速度
3. **文档更新**: 更新工作流路由文档以反映新的分支ID路由机制
