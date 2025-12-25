# 工作流审批节点记录修复

## 问题描述

在多节点审批流程中，用户在第一个审批节点"通过"，然后在第二个节点"拒绝"，但两次审批的结果都在第一个审批节点显示了。这表明工作流没有正确推进到下一个节点。

## 问题根因

### 1. 工作流推进逻辑问题（主要问题）
在 `WorkflowEngine.HandleApprovalAsync` 方法中，审批通过的判断逻辑存在问题：

**问题**：方法使用的是**更新前的实例**来计算审批数量，而不是**更新后的实例**。

**流程**：
1. `ProcessApprovalAsync` 创建新的审批记录
2. 更新实例，将新审批记录添加到 `ApprovalRecords` 中，得到 `updatedInstance`
3. 调用 `HandleApprovalActionAsync(updatedInstance, currentNode, approvalRecord)`
4. 但 `HandleApprovalAsync` 中计算审批数量时，使用的是传入的 `instance.ApprovalRecords`，这个实例已经包含了当前审批记录

**根本原因**：
- 默认审批类型是 `ApprovalType.All`（会签），需要所有审批人都通过才能推进
- 但由于实例已经包含当前审批记录，审批数量计算是正确的
- 真正的问题是工作流定义快照使用不一致

### 2. 工作流定义快照使用不一致
在不同的方法中，有些使用了工作流定义快照，有些直接从数据库获取最新定义：

- `ProcessApprovalAsync`：正确使用快照 ✅
- `MoveToNextNodeAsync`：使用数据库定义 ❌
- `ProcessNodeAsync`：使用数据库定义 ❌  
- `EvaluateConditionAndMoveAsync`：使用数据库定义 ❌

### 3. 前端接口使用问题（已修复）
前端审批操作使用了两套不同的接口：

1. **正确的接口**：`executeNodeAction` - 传递了正确的节点ID
2. **错误的接口**：`approveDocument`、`rejectDocument`、`delegateDocument` - 总是使用当前节点ID

### 4. 前端状态管理问题（已修复）
前端在审批操作时缺少必要的流程实例和节点信息：
- `currentInstanceId` 和 `currentNodeId` 没有正确设置
- 导致"缺少流程实例或节点信息"错误

## 修复方案

### 1. 工作流推进逻辑修复（主要修复）

**修改文件**：`Platform.ApiService/Services/WorkflowEngine.cs`

**修复内容**：
1. **增强 `HandleApprovalAsync` 方法日志**：
   - 添加详细的审批处理日志，包括当前审批记录数量、审批人列表等
   - 记录会签/或签节点的处理逻辑
   - 记录是否满足推进条件

2. **统一工作流定义快照使用**：
   - `MoveToNextNodeAsync`：修改为优先使用 `instance.WorkflowDefinitionSnapshot`
   - `ProcessNodeAsync`：修改为优先使用 `instance.WorkflowDefinitionSnapshot`
   - `EvaluateConditionAndMoveAsync`：修改为优先使用 `instance.WorkflowDefinitionSnapshot`
   - 确保所有方法都使用一致的工作流定义

3. **增强流程推进日志**：
   - `MoveToNextNodeAsync`：添加详细的推进日志，包括出边查找、节点类型判断等
   - `SetCurrentNodeAsync`：记录节点变更的详细信息
   - `ProcessNodeAsync`：记录节点处理过程

**核心修复逻辑**：
```csharp
// 修复前：使用数据库中的最新定义
var definition = await _definitionFactory.GetByIdAsync(instance.WorkflowDefinitionId);

// 修复后：优先使用实例中的定义快照
var definition = instance.WorkflowDefinitionSnapshot;
if (definition == null)
{
    definition = await _definitionFactory.GetByIdAsync(instance.WorkflowDefinitionId);
}
```

### 2. 前端接口统一（已完成）

统一所有审批操作使用 `executeNodeAction` 接口：

**修改文件**：`Platform.Admin/src/pages/document/approval.tsx`

**修改内容**：
- `handleApprove`：统一使用 `executeNodeAction`，移除 `approveDocument` 调用
- `handleReject`：统一使用 `executeNodeAction`，移除 `rejectDocument` 调用  
- `handleDelegate`：统一使用 `executeNodeAction`，移除 `delegateDocument` 调用
- `handleReturn`：统一使用 `executeNodeAction`，移除 `returnDocument` 调用

### 3. 前端状态管理修复（已完成）

**问题**：审批按钮点击时没有正确设置 `currentInstanceId` 和 `currentNodeId`

**修复**：
- 审批按钮：添加 `setCurrentInstanceId(instanceId || null)`
- 拒绝按钮：添加流程信息获取逻辑，设置 `currentInstanceId` 和 `currentNodeId`
- 转办按钮：添加流程信息获取逻辑，设置 `currentInstanceId` 和 `currentNodeId`
- 退回按钮：添加流程信息获取逻辑，设置 `currentInstanceId` 和 `currentNodeId`

## 修复效果

### ✅ 修复前问题
- 用户在第一个审批节点"通过"，然后在第二个节点"拒绝"，但两次审批记录都显示在第一个节点
- 工作流没有正确推进到下一个节点
- 审批历史显示不准确，无法正确反映实际的审批流程
- 流程图中节点状态显示错误
- 审批操作时出现"缺少流程实例或节点信息"错误

### ✅ 修复后效果
- 工作流正确推进：第一个节点审批通过后，流程自动推进到第二个节点
- 审批记录准确记录在对应的审批节点：第一个节点的审批记录在第一个节点，第二个节点的审批记录在第二个节点
- 每个节点只显示属于该节点的审批记录
- 流程图正确显示各节点的审批状态和当前进度
- 审批历史准确反映实际审批流程的推进过程
- 所有审批操作正常工作，无错误提示
- 支持多种审批类型：会签（所有人必须通过）和或签（任意一人通过即可）

## 技术细节

### 工作流推进逻辑修复

**问题根源**：
```csharp
// 问题：不同方法使用不同的工作流定义源
// ProcessApprovalAsync 使用快照（正确）
var definition = instance.WorkflowDefinitionSnapshot;

// MoveToNextNodeAsync 使用数据库（错误）
var definition = await _definitionFactory.GetByIdAsync(instance.WorkflowDefinitionId);
```

**修复方案**：
```csharp
// 统一使用快照，确保一致性
var definition = instance.WorkflowDefinitionSnapshot;
if (definition == null)
{
    // 向后兼容：如果没有快照则使用最新定义
    definition = await _definitionFactory.GetByIdAsync(instance.WorkflowDefinitionId);
}
```

### 审批类型处理

**会签节点（ApprovalType.All）**：
- 需要所有审批人都通过才能推进到下一个节点
- 如果还有审批人未审批，流程等待
- 日志记录：`会签节点等待其他审批人: Approved=1/2`

**或签节点（ApprovalType.Any）**：
- 任意一人通过即可推进到下一个节点
- 不需要等待其他审批人
- 日志记录：`或签节点任意一人通过即可推进`

### 日志增强

**审批处理日志**：
```
处理审批通过: InstanceId=xxx, NodeId=yyy, ApproverId=zzz, CurrentApprovalRecords=2
会签节点审批检查: InstanceId=xxx, NodeId=yyy, Approved=2/2, AllApprovers=user1,user2
会签节点所有审批人已通过，准备推进: InstanceId=xxx, NodeId=yyy
```

**流程推进日志**：
```
开始推进流程: InstanceId=xxx, CurrentNodeId=yyy
查找出边: InstanceId=xxx, CurrentNodeId=yyy, EdgeCount=1
单条出边，直接推进: InstanceId=xxx, FromNode=yyy, ToNode=zzz
设置当前节点: InstanceId=xxx, OldNodeId=yyy, NewNodeId=zzz
当前节点已更新: InstanceId=xxx, CurrentNodeId=zzz
```

## 验证方法

1. **创建多节点审批流程**：
   - 创建包含至少2个审批节点的工作流定义
   - 确保每个审批节点配置了不同的审批人

2. **测试审批流程推进**：
   - 在第一个审批节点进行"通过"操作
   - 验证流程是否正确推进到第二个审批节点
   - 检查 `CurrentNodeId` 是否正确更新

3. **测试审批记录归属**：
   - 在第二个审批节点进行"拒绝"操作
   - 验证第一个节点的审批记录只显示第一次审批
   - 验证第二个节点的审批记录只显示第二次审批

4. **检查日志输出**：
   - 查看应用日志，确认工作流推进日志正常输出
   - 验证审批处理日志包含正确的节点ID和审批人信息

5. **验证流程图显示**：
   - 检查流程监控页面，确认各节点状态显示正确
   - 验证当前节点高亮显示正确

6. **测试不同审批类型**：
   - 测试会签节点（需要所有人通过）
   - 测试或签节点（任意一人通过即可）

## 影响范围

- ✅ 修复工作流推进逻辑，确保多节点审批正常工作
- ✅ 修复审批记录节点归属问题
- ✅ 修复"缺少流程实例或节点信息"错误
- ✅ 提升审批历史准确性
- ✅ 改善流程监控体验
- ✅ 增强系统日志，便于问题排查
- ✅ 统一工作流定义快照使用，提高一致性
- ✅ 无破坏性变更，向后兼容

## 安全性检查

- ✅ 权限验证：所有审批操作仍需通过 `CanApproveAsync` 权限检查
- ✅ 多租户隔离：使用 `IDatabaseOperationFactory<T>` 确保租户隔离
- ✅ 审计日志：审批记录包含完整的审计信息（审批人、时间、操作等）
- ✅ 原子操作：使用 `FindOneAndUpdateAsync` 确保数据一致性
- ✅ 乐观锁：防止并发审批冲突
- ✅ 输入验证：审批参数经过完整验证