# 条件节点多路径设计文档

## 需求描述

条件节点应该支持多个输出路径，每个路径对应不同的条件结果。例如：
- 路径1：金额 > 100 → 走线路一（如高级审批）
- 路径2：金额 ≤ 100 → 走线路二（如普通审批）
- 路径3：其他条件 → 走线路三（如拒绝）

## 当前架构分析

### 现有结构
```typescript
ConditionConfig {
  conditions: ConditionRule[]      // 条件规则列表
  logicalOperator: "and" | "or"    // 逻辑运算符
  expression?: string              // 自定义表达式
}

ConditionRule {
  variable: string                 // 变量名
  operator: string                 // 操作符
  value: string                    // 比较值
  targetNodeId?: string            // 目标节点ID（当前只支持一个）
}
```

### 问题
- `ConditionRule` 中的 `targetNodeId` 只能指向一个节点
- 无法表示多个条件分支
- 前端只能创建一个 true/false 分支

## 新设计方案

### 方案：条件分支（Condition Branches）

#### 1. 数据模型更新

```typescript
// 条件分支配置
ConditionBranch {
  id: string                       // 分支ID（唯一）
  label: string                    // 分支标签（如"金额>100"）
  conditions: ConditionRule[]      // 该分支的条件规则
  logicalOperator: "and" | "or"    // 该分支的逻辑运算符
  targetNodeId: string             // 该分支指向的目标节点
  order: number                    // 分支执行顺序
}

// 更新后的条件配置
ConditionConfig {
  branches: ConditionBranch[]      // 多个分支
  defaultBranchId?: string         // 默认分支（都不匹配时）
  expression?: string              // 自定义表达式（可选）
}
```

#### 2. 前端 Handle 设计

条件节点需要多个输出 Handle，每个对应一个分支：

```typescript
// 条件节点的 Handle
sourceHandles: [
  { id: "branch-1", label: "金额>100" },
  { id: "branch-2", label: "金额≤100" },
  { id: "default", label: "其他" }
]
```

#### 3. 边（Edge）更新

```typescript
WorkflowEdge {
  sourceHandle: string             // 来自条件节点的分支ID
  targetHandle?: string            // 目标节点的 Handle
  label?: string                   // 边的标签（分支条件）
}
```

## 实现步骤

### 第一阶段：后端数据模型更新
1. 更新 `ConditionConfig` 和 `ConditionRule` 数据结构
2. 更新数据库迁移脚本
3. 更新条件评估逻辑

### 第二阶段：后端条件评估引擎
1. 修改 `WorkflowExpressionEvaluator` 支持多分支评估
2. 实现分支匹配逻辑
3. 返回匹配的分支ID

### 第三阶段：前端 UI 更新
1. 修改 `NodeConfigDrawer` 支持多分支配置
2. 更新条件规则编辑界面
3. 支持添加/删除分支

### 第四阶段：前端流程设计器更新
1. 修改条件节点的 Handle 生成逻辑
2. 支持多个输出连接
3. 显示分支标签

### 第五阶段：测试
1. 单元测试：条件评估逻辑
2. 集成测试：多分支流程
3. UI 测试：分支配置和连接

## 向后兼容性

### 迁移策略
对于现有的单分支条件节点，自动转换为：
```typescript
{
  branches: [
    {
      id: "true",
      label: "True",
      conditions: [...],
      targetNodeId: "..."
    },
    {
      id: "false",
      label: "False",
      targetNodeId: "..."
    }
  ]
}
```

## 前端 UI 设计

### 条件分支编辑界面

```
┌─────────────────────────────────────┐
│ 条件分支配置                         │
├─────────────────────────────────────┤
│                                     │
│ 分支1: 金额 > 100                   │
│ ├─ 条件规则                         │
│ │  ├─ 表单: 金额                    │
│ │  ├─ 操作符: 大于                  │
│ │  └─ 值: 100                       │
│ └─ 目标节点: [高级审批 ▼]           │
│                                     │
│ 分支2: 金额 ≤ 100                   │
│ ├─ 条件规则                         │
│ │  ├─ 表单: 金额                    │
│ │  ├─ 操作符: 小于等于              │
│ │  └─ 值: 100                       │
│ └─ 目标节点: [普通审批 ▼]           │
│                                     │
│ [+ 添加分支]                        │
│                                     │
│ 默认分支: [拒绝 ▼]                  │
│                                     │
└─────────────────────────────────────┘
```

## 流程设计器中的表现

```
┌─────────────┐
│   开始      │
└──────┬──────┘
       │
       ▼
┌─────────────┐
│   条件      │
│  (金额判断) │
└──┬──────┬──┬┘
   │      │  │
   │      │  └─→ [其他]
   │      │
   │      └─→ [金额≤100]
   │
   └─→ [金额>100]
       │
       ▼
   ┌─────────────┐
   │  高级审批   │
   └─────────────┘
```

## 技术考虑

### 性能
- 条件评估需要按顺序检查分支
- 第一个匹配的分支被执行
- 如果都不匹配，执行默认分支

### 可维护性
- 分支应该有清晰的标签
- 条件规则应该易于理解
- 支持分支的启用/禁用

### 用户体验
- 直观的分支管理界面
- 清晰的分支连接可视化
- 支持分支的拖拽排序

## 相关文件修改

### 后端
- `Platform.ApiService/Models/Workflow/WorkflowDefinition.cs` - 数据模型
- `Platform.ApiService/Services/WorkflowExpressionEvaluator.cs` - 评估逻辑
- `Platform.ApiService/Services/WorkflowEngine.cs` - 流程引擎

### 前端
- `Platform.Admin/src/pages/workflow/components/NodeConfigDrawer.tsx` - 配置界面
- `Platform.Admin/src/pages/workflow/components/WorkflowDesigner.tsx` - 设计器
- `Platform.Admin/src/services/workflow/api.ts` - API 类型定义

## 时间估计

- 后端数据模型：2-3 小时
- 后端评估逻辑：3-4 小时
- 前端 UI：4-5 小时
- 测试：3-4 小时
- **总计：12-16 小时**

## 优先级

🔴 **高优先级** - 这是条件节点的核心功能，对工作流的灵活性至关重要。

## 下一步

1. 确认需求细节
2. 设计数据迁移方案
3. 开始后端实现
4. 并行进行前端设计
5. 集成测试
