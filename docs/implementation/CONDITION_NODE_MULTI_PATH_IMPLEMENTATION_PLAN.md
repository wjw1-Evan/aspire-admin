s# 条件节点多路径实现计划

## 概述

本文档详细说明如何实现条件节点的多路径支持，允许用户创建多个条件分支，每个分支连接到不同的下一个节点。

## 实现阶段

### 阶段 1：后端数据模型更新（优先级：高）

#### 1.1 更新 ConditionConfig 数据结构

**文件**: `Platform.ApiService/Models/Workflow/WorkflowDefinition.cs`

```csharp
// 新增：条件分支
public class ConditionBranch
{
    [BsonElement("id")]
    public string Id { get; set; } = string.Empty;

    [BsonElement("label")]
    public string Label { get; set; } = string.Empty;

    [BsonElement("conditions")]
    public List<ConditionRule> Conditions { get; set; } = new();

    [BsonElement("logicalOperator")]
    public string LogicalOperator { get; set; } = "and";

    [BsonElement("targetNodeId")]
    public string TargetNodeId { get; set; } = string.Empty;

    [BsonElement("order")]
    public int Order { get; set; } = 0;

    [BsonElement("enabled")]
    public bool Enabled { get; set; } = true;
}

// 更新：ConditionConfig
public class ConditionConfig
{
    [BsonElement("branches")]
    public List<ConditionBranch> Branches { get; set; } = new();

    [BsonElement("defaultBranchId")]
    public string? DefaultBranchId { get; set; }

    [BsonElement("expression")]
    public string? Expression { get; set; }

    // 向后兼容：保留旧字段
    [BsonElement("conditions")]
    [BsonIgnoreIfNull]
    public List<ConditionRule>? LegacyConditions { get; set; }

    [BsonElement("logicalOperator")]
    [BsonIgnoreIfNull]
    public string? LegacyLogicalOperator { get; set; }
}

// 更新：ConditionRule（添加 formId）
public class ConditionRule
{
    [BsonElement("formId")]
    public string? FormId { get; set; }

    [BsonElement("variable")]
    public string Variable { get; set; } = string.Empty;

    [BsonElement("operator")]
    public string Operator { get; set; } = "equals";

    [BsonElement("value")]
    public string? Value { get; set; }
}
```

#### 1.2 数据迁移

创建迁移脚本，将现有的单分支条件转换为多分支格式：

```csharp
// 迁移逻辑伪代码
foreach (var workflow in workflows)
{
    foreach (var node in workflow.Graph.Nodes)
    {
        if (node.Data?.Config?.Condition != null)
        {
            var oldCondition = node.Data.Config.Condition;
            
            // 创建新的分支结构
            var branches = new List<ConditionBranch>();
            
            // True 分支
            branches.Add(new ConditionBranch
            {
                Id = "true",
                Label = "True",
                Conditions = oldCondition.LegacyConditions ?? new(),
                LogicalOperator = oldCondition.LegacyLogicalOperator ?? "and",
                TargetNodeId = FindTrueTargetNode(node),
                Order = 0
            });
            
            // False 分支
            branches.Add(new ConditionBranch
            {
                Id = "false",
                Label = "False",
                TargetNodeId = FindFalseTargetNode(node),
                Order = 1
            });
            
            oldCondition.Branches = branches;
        }
    }
}
```

### 阶段 2：后端条件评估引擎更新（优先级：高）

#### 2.1 更新 WorkflowExpressionEvaluator

**文件**: `Platform.ApiService/Services/WorkflowExpressionEvaluator.cs`

```csharp
public class ConditionEvaluationResult
{
    public string BranchId { get; set; } = string.Empty;
    public string TargetNodeId { get; set; } = string.Empty;
    public bool IsMatched { get; set; }
}

public async Task<ConditionEvaluationResult> EvaluateConditionBranchesAsync(
    ConditionConfig config,
    Dictionary<string, object> variables)
{
    // 按顺序评估每个分支
    foreach (var branch in config.Branches.OrderBy(b => b.Order))
    {
        if (!branch.Enabled) continue;

        // 评估该分支的条件
        var isMatched = await EvaluateConditionsAsync(
            branch.Conditions,
            branch.LogicalOperator,
            variables);

        if (isMatched)
        {
            return new ConditionEvaluationResult
            {
                BranchId = branch.Id,
                TargetNodeId = branch.TargetNodeId,
                IsMatched = true
            };
        }
    }

    // 如果没有分支匹配，使用默认分支
    if (!string.IsNullOrEmpty(config.DefaultBranchId))
    {
        var defaultBranch = config.Branches
            .FirstOrDefault(b => b.Id == config.DefaultBranchId);
        
        if (defaultBranch != null)
        {
            return new ConditionEvaluationResult
            {
                BranchId = defaultBranch.Id,
                TargetNodeId = defaultBranch.TargetNodeId,
                IsMatched = true
            };
        }
    }

    // 没有匹配的分支
    return new ConditionEvaluationResult { IsMatched = false };
}
```

#### 2.2 更新 WorkflowEngine

**文件**: `Platform.ApiService/Services/WorkflowEngine.cs`

```csharp
private async Task<string?> GetNextNodeIdAsync(
    WorkflowNode currentNode,
    WorkflowInstance instance)
{
    if (currentNode.Data?.Config?.Condition != null)
    {
        var variables = await GetDocumentVariablesAsync(instance);
        
        var result = await _expressionEvaluator
            .EvaluateConditionBranchesAsync(
                currentNode.Data.Config.Condition,
                variables);

        if (result.IsMatched)
        {
            return result.TargetNodeId;
        }
    }

    // 其他节点类型的处理...
    return GetDefaultNextNode(currentNode);
}
```

### 阶段 3：前端 API 类型更新（优先级：中）

#### 3.1 更新 TypeScript 类型定义

**文件**: `Platform.Admin/src/services/workflow/api.ts`

```typescript
export interface ConditionBranch {
  id: string;
  label: string;
  conditions: ConditionRule[];
  logicalOperator: 'and' | 'or';
  targetNodeId: string;
  order: number;
  enabled?: boolean;
}

export interface ConditionConfig {
  branches: ConditionBranch[];
  defaultBranchId?: string;
  expression?: string;
}

export interface ConditionRule {
  formId?: string;
  variable: string;
  operator: string;
  value?: string;
}
```

### 阶段 4：前端 UI 更新（优先级：高）

#### 4.1 更新 NodeConfigDrawer 条件配置界面

**文件**: `Platform.Admin/src/pages/workflow/components/NodeConfigDrawer.tsx`

主要改动：
1. 将单个条件规则列表改为分支列表
2. 每个分支包含自己的条件规则
3. 支持添加/删除/编辑分支
4. 支持设置默认分支

```typescript
// 伪代码
{selectedNode?.data.nodeType === 'condition' && (
  <>
    <Divider titlePlacement="left" plain>条件分支</Divider>
    <Form.List name="branches">
      {(fields, { add, remove }) => (
        <>
          {fields.map(({ key, name, ...restField }) => (
            <Card key={key}>
              {/* 分支标签 */}
              <Form.Item
                {...restField}
                name={[name, 'label']}
                label="分支标签"
              >
                <Input placeholder="如：金额>100" />
              </Form.Item>

              {/* 分支条件规则 */}
              <Form.List name={[name, 'conditions']}>
                {/* 条件规则编辑 */}
              </Form.List>

              {/* 目标节点 */}
              <Form.Item
                {...restField}
                name={[name, 'targetNodeId']}
                label="目标节点"
              >
                <Select options={availableNodes} />
              </Form.Item>

              <Button danger onClick={() => remove(name)}>
                删除分支
              </Button>
            </Card>
          ))}
          <Button type="dashed" onClick={() => add()}>
            + 添加分支
          </Button>
        </>
      )}
    </Form.List>

    {/* 默认分支 */}
    <Form.Item name="defaultBranchId" label="默认分支">
      <Select placeholder="都不匹配时执行" />
    </Form.Item>
  </>
)}
```

#### 4.2 更新 WorkflowDesigner 条件节点 Handle

**文件**: `Platform.Admin/src/pages/workflow/components/WorkflowDesigner.tsx`

```typescript
// 为条件节点生成多个输出 Handle
const generateConditionHandles = (node: Node) => {
  const config = node.data?.config?.condition;
  if (!config?.branches) return [];

  return config.branches.map((branch, index) => ({
    id: branch.id,
    position: 'right' as const,
    top: `${20 + index * 40}%`,
    label: branch.label,
  }));
};
```

### 阶段 5：测试（优先级：高）

#### 5.1 后端单元测试

**文件**: `Platform.ApiService.Tests/Services/WorkflowExpressionEvaluatorTests.cs`

```csharp
[Fact]
public async Task EvaluateConditionBranches_MultipleConditions_ShouldReturnCorrectBranch()
{
    // Arrange
    var config = new ConditionConfig
    {
        Branches = new List<ConditionBranch>
        {
            new ConditionBranch
            {
                Id = "high",
                Label = "金额>1000",
                Conditions = new List<ConditionRule>
                {
                    new ConditionRule
                    {
                        Variable = "amount",
                        Operator = "greater_than",
                        Value = "1000"
                    }
                },
                TargetNodeId = "approval_high",
                Order = 0
            },
            new ConditionBranch
            {
                Id = "low",
                Label = "金额≤1000",
                Conditions = new List<ConditionRule>
                {
                    new ConditionRule
                    {
                        Variable = "amount",
                        Operator = "less_than_or_equal",
                        Value = "1000"
                    }
                },
                TargetNodeId = "approval_low",
                Order = 1
            }
        }
    };

    var variables = new Dictionary<string, object> { { "amount", 2000 } };

    // Act
    var result = await _evaluator.EvaluateConditionBranchesAsync(config, variables);

    // Assert
    Assert.Equal("high", result.BranchId);
    Assert.Equal("approval_high", result.TargetNodeId);
}
```

#### 5.2 集成测试

**文件**: `Platform.AppHost.Tests/Tests/WorkflowConditionTests.cs`

```csharp
[Fact]
public async Task MultiBranchCondition_ShouldRouteToCorrectNode()
{
    // 创建多分支条件流程
    // 验证不同条件值路由到不同节点
}
```

## 实现顺序

1. **第1天**：后端数据模型更新 + 数据迁移
2. **第2天**：后端评估引擎更新 + 单元测试
3. **第3天**：前端 API 类型更新 + UI 设计
4. **第4天**：前端 UI 实现 + 集成测试
5. **第5天**：端到端测试 + 文档

## 风险和缓解

| 风险 | 影响 | 缓解措施 |
|------|------|---------|
| 数据迁移失败 | 现有流程损坏 | 完整备份 + 回滚方案 |
| 性能下降 | 流程执行变慢 | 优化分支评估逻辑 |
| 向后兼容性 | 旧流程无法运行 | 完整的迁移脚本 |

## 验收标准

- ✅ 支持创建多个条件分支
- ✅ 每个分支可以有独立的条件规则
- ✅ 分支可以连接到不同的节点
- ✅ 条件评估按顺序进行
- ✅ 支持默认分支
- ✅ 现有流程自动迁移
- ✅ 所有测试通过
- ✅ 文档完整

## 后续优化

1. 分支的拖拽排序
2. 分支的启用/禁用
3. 分支的复制/粘贴
4. 条件规则的模板库
5. 可视化条件编辑器

## 相关文档

- `CONDITION_NODE_MULTI_PATH_DESIGN.md` - 设计文档
- `CASCADING_SELECT_FINAL_SUMMARY.md` - 二级联动选择实现
- `REALTIME_FORM_SELECTION_UPDATE.md` - 实时表单选择更新
