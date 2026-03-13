# 条件节点多路径分支实现完成总结

## 概述
成功实现了工作流条件节点的多路径分支功能。条件节点现在支持配置多个分支，每个分支可以有不同的条件规则和目标节点，实现更灵活的流程控制。

## 核心改动

### 1. 后端数据模型更新

#### ConditionBranch 类（新增）
```csharp
public class ConditionBranch
{
    public string Id { get; set; }              // 分支唯一标识
    public string Label { get; set; }           // 分支标签（如"金额 > 100"）
    public List<ConditionRule> Conditions { get; set; }  // 分支内的条件规则
    public string LogicalOperator { get; set; } // 分支内条件的逻辑运算符（and/or）
    public string TargetNodeId { get; set; }    // 分支匹配时的目标节点
    public int Order { get; set; }              // 分支执行顺序
    public bool Enabled { get; set; }           // 分支是否启用
}
```

#### ConditionConfig 类（更新）
```csharp
public class ConditionConfig
{
    public List<ConditionBranch> Branches { get; set; }  // 多个分支
    public string? DefaultBranchId { get; set; }         // 默认分支（无分支匹配时使用）
    public string? Expression { get; set; }              // 自定义表达式（可选）
    // 向后兼容字段
    public List<ConditionRule>? LegacyConditions { get; set; }
    public string? LegacyLogicalOperator { get; set; }
}
```

### 2. 后端执行逻辑更新

#### ConditionExecutor 类（重构）
- **新方法 `EvaluateConditionBranches()`**：遍历所有启用的分支，按 Order 排序，返回第一个匹配的分支
- **新方法 `EvaluateBranchConditions()`**：评估单个分支内的所有条件规则
- **更新 `HandleAsync()`**：返回匹配的分支 ID 作为 `__sourceHandle`，用于路由

**执行流程**：
1. 遍历所有启用的分支（按 Order 排序）
2. 对每个分支评估其内部的条件规则
3. 返回第一个匹配的分支 ID
4. 如果没有分支匹配，使用 `DefaultBranchId`

### 3. 前端类型定义更新

#### TypeScript 接口更新（`api.ts`）
```typescript
interface ConditionRule {
  formId?: string;           // 新增：表单 ID
  variable: string;
  operator: string;
  value: string;
}

interface ConditionBranch {
  id: string;
  label: string;
  conditions: ConditionRule[];
  logicalOperator: 'and' | 'or';
  targetNodeId: string;
  order: number;
  enabled: boolean;
}

interface ConditionConfig {
  branches?: ConditionBranch[];
  defaultBranchId?: string;
  expression?: string;
  // 向后兼容
  logicalOperator?: 'and' | 'or';
  conditions?: ConditionRule[];
  targetNodeId?: string;
}
```

### 4. 前端 UI 更新

#### NodeConfigDrawer 组件（重构条件配置部分）
- **分支管理**：支持添加、删除、编辑多个分支
- **分支配置**：每个分支包含：
  - 分支标签（用户自定义）
  - 启用/禁用开关
  - 分支内的条件规则列表
  - 条件间的逻辑运算符（AND/OR）
  - 目标节点选择
- **默认分支**：支持设置当所有条件都不匹配时的默认分支

#### WorkflowDesignerConstants 组件（更新节点渲染）
- **CustomNode 组件**：为条件节点生成多个输出 handle
  - 每个分支对应一个 handle
  - Handle ID 为分支 ID
  - Handle 位置均匀分布在节点底部

#### WorkflowDesigner 组件（更新配置保存）
- **handleSaveConfig 函数**：处理新的多分支结构
  - 将分支数据转换为正确的格式
  - 为每个分支生成唯一 ID
  - 设置分支顺序和启用状态

### 5. 测试更新

#### WorkflowConditionTests（更新测试辅助方法）
- **CreateWorkflowWithFormBinding 方法**：
  - 将条件转换为分支结构
  - 创建两个分支：条件满足 → approval_a，条件不满足 → approval_b
  - 使用新的 `Branches` 结构而不是旧的 `Conditions`

### 6. Bug 修复

#### WorkflowController.GetWorkflowFormsAndFields
- **问题**：类型不匹配导致编译错误（`??` 操作符无法应用于不同类型）
- **解决**：使用条件表达式处理 null 情况，确保类型一致

## 工作流程

### 设计阶段
1. 用户在条件节点配置中添加多个分支
2. 每个分支定义条件规则和目标节点
3. 设置分支执行顺序和默认分支

### 执行阶段
1. 流程到达条件节点
2. 后端 ConditionExecutor 评估所有分支
3. 返回第一个匹配的分支 ID 作为 sourceHandle
4. WorkflowEngine 根据 sourceHandle 路由到对应的目标节点

### 可视化
- 条件节点显示分支数量
- 每个分支对应一个输出 handle
- 边连接到对应的分支 handle

## 向后兼容性

- 保留旧的 `LegacyConditions` 和 `LegacyLogicalOperator` 字段
- 现有的单条件流程可以继续运行
- 新创建的流程使用新的多分支结构

## 文件变更清单

### 后端
- `Platform.ApiService/Models/Workflow/WorkflowDefinition.cs`：新增 ConditionBranch 类，更新 ConditionConfig
- `Platform.ApiService/Workflows/Executors/ConditionExecutor.cs`：重构条件评估逻辑
- `Platform.ApiService/Controllers/WorkflowController.cs`：修复 GetWorkflowFormsAndFields 方法

### 前端
- `Platform.Admin/src/services/workflow/api.ts`：更新 TypeScript 类型定义
- `Platform.Admin/src/pages/workflow/components/NodeConfigDrawer.tsx`：重构条件配置 UI
- `Platform.Admin/src/pages/workflow/components/WorkflowDesignerConstants.tsx`：更新节点渲染逻辑
- `Platform.Admin/src/pages/workflow/components/WorkflowDesigner.tsx`：更新配置保存逻辑

### 测试
- `Platform.AppHost.Tests/Tests/WorkflowConditionTests.cs`：更新测试辅助方法

## 编译状态
✅ 后端编译成功（0 个警告，0 个错误）
✅ 前端编译成功

## 下一步

1. **运行集成测试**：验证多分支条件路由是否正常工作
2. **手动测试**：在 UI 中创建多分支条件流程并测试
3. **性能测试**：验证多分支评估的性能
4. **文档更新**：更新用户文档和 API 文档

## 技术亮点

1. **灵活的分支管理**：支持任意数量的分支，每个分支独立配置
2. **有序评估**：按 Order 排序评估分支，确保可预测的执行顺序
3. **默认分支**：提供默认分支机制，处理无分支匹配的情况
4. **可视化支持**：多个输出 handle 使流程图更直观
5. **向后兼容**：保留旧字段，支持平滑迁移

## 提交信息
```
feat: 条件节点支持多路径分支

- 后端：更新 ConditionConfig 和 ConditionBranch 数据模型，支持多分支结构
- 后端：更新 ConditionExecutor 以评估多个分支并返回匹配的分支 ID
- 前端：更新 TypeScript 类型定义以支持新的多分支结构
- 前端：修改 NodeConfigDrawer 条件配置 UI，支持分支管理
- 前端：更新 WorkflowDesignerConstants 中的 CustomNode 组件，为条件节点生成多个输出 handle
- 前端：更新 WorkflowDesigner 中的 handleSaveConfig 函数，处理新的多分支结构
- 测试：更新 WorkflowConditionTests 中的 CreateWorkflowWithFormBinding 方法，使用新的多分支结构
- 修复：修复 WorkflowController.GetWorkflowFormsAndFields 中的类型不匹配问题
```
