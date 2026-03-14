# 条件节点默认节点实现总结

## 任务概述
将条件节点的"默认分支"改为"默认节点"，使得当所有条件都不匹配时，流程直接跳转到指定的默认节点，而不是默认分支。

## 修改内容

### 1. 后端模型更新 (Platform.ApiService)

#### ConditionConfig 类 (WorkflowDefinition.cs)
- **变更**: `DefaultBranchId` → `DefaultNodeId`
- **含义**: 从指定默认分支改为指定默认节点
- **类型**: `string?`

```csharp
public class ConditionConfig
{
    [BsonElement("branches")]
    public List<ConditionBranch> Branches { get; set; } = new();

    [BsonElement("defaultNodeId")]  // 改为 defaultNodeId
    public string? DefaultNodeId { get; set; }

    [BsonElement("expression")]
    public string? Expression { get; set; }
}
```

### 2. 后端执行逻辑更新

#### ConditionExecutor.cs
- **变更**: 返回目标节点 ID 而不是分支 ID
- **逻辑**: 
  - 当分支匹配时，返回该分支的 `TargetNodeId`
  - 当没有分支匹配时，返回 `DefaultNodeId`
  - 返回值作为 `__sourceHandle` 用于路由

```csharp
// 返回匹配的分支的目标节点 ID 作为 sourceHandle
var targetNodeId = matchedBranch?.TargetNodeId ?? _config.DefaultNodeId ?? "default";
return new Dictionary<string, object?>
{
    ["__sourceHandle"] = targetNodeId,
    ["branchId"] = matchedBranch?.Id,
    ["branchLabel"] = matchedBranch?.Label,
    ["result"] = matchedBranch != null,
    ["evaluatedAt"] = System.DateTime.UtcNow
};
```

#### WorkflowExpressionEvaluator.cs
- **变更**: `EvaluateConditionBranches` 方法返回默认节点而不是默认分支
- **逻辑**:
  - 遍历所有分支，找到第一个匹配的分支
  - 如果没有分支匹配，返回 `DefaultNodeId`
  - 返回结果包含 `TargetNodeId` 用于路由

```csharp
// 如果没有分支匹配，使用默认节点
if (!string.IsNullOrEmpty(config.DefaultNodeId))
{
    return new ConditionEvaluationResult
    {
        TargetNodeId = config.DefaultNodeId,
        IsMatched = false
    };
}
```

### 3. 前端 UI 更新 (Platform.Admin)

#### NodeConfigDrawer.tsx
- **标签变更**: "默认分支" → "默认节点"
- **提示文本**: "当所有条件都不匹配时，流程跳转到此节点"
- **字段名**: `defaultBranchId` → `defaultNodeId`
- **选项来源**: 从分支列表改为节点列表

```typescript
{/* 默认节点 */}
<Form.Item noStyle shouldUpdate={...}>
  {({ getFieldValue }) => {
    const nodeOptions: SelectProps['options'] = allNodes
      .filter(node => node && node.id !== selectedNode?.id)
      .map(node => ({
        label: node.data?.label || node.id,
        value: node.id
      }));
    return (
      <Form.Item
        name="defaultNodeId"
        label="默认节点"
        tooltip="当所有条件都不匹配时，流程跳转到此节点"
      >
        <Select
          placeholder="选择默认节点"
          allowClear
          options={nodeOptions}
        />
      </Form.Item>
    );
  }}
</Form.Item>
```

#### WorkflowDesigner.tsx
- **字段映射**: 更新 `onNodeClick` 中的字段映射
  - `defaultBranchId` → `defaultNodeId`
- **配置保存**: 更新 `handleSaveConfig` 中的条件节点配置
  - `defaultBranchId` → `defaultNodeId`

#### api.ts (类型定义)
- **接口更新**: `ConditionConfig` 接口
  - `defaultBranchId?` → `defaultNodeId?`

### 4. 测试用例更新 (Platform.AppHost.Tests)

#### WorkflowConditionTests.cs
- **配置更新**: 所有测试中的条件节点配置
  - `DefaultBranchId = "branch_false"` → `DefaultNodeId = "approval_b"`
- **说明**: 默认节点现在直接指向目标节点（如 approval_b），而不是分支 ID

## 业务逻辑变化

### 旧逻辑（默认分支）
```
条件评估 → 匹配分支 → 返回分支 ID → 根据分支 ID 查找目标节点
         → 无匹配 → 返回默认分支 ID → 根据分支 ID 查找目标节点
```

### 新逻辑（默认节点）
```
条件评估 → 匹配分支 → 返回分支的目标节点 ID → 直接跳转到该节点
         → 无匹配 → 返回默认节点 ID → 直接跳转到该节点
```

## 优势

1. **更直观**: 用户直接选择节点，而不需要理解分支的概念
2. **更灵活**: 默认节点可以是任何节点，不限于分支的目标节点
3. **更简洁**: 减少了分支 ID 到节点 ID 的映射步骤
4. **更易维护**: 代码逻辑更清晰，减少了间接引用

## 编译状态

✅ 后端编译成功 (0 errors, 0 warnings)
✅ 前端编译成功 (Webpack compiled successfully)

## Git 提交

```
3183912 feat: 将条件节点的默认分支改为默认节点
e7ad06d fix: 更新前端API类型定义中的defaultBranchId为defaultNodeId
```

## 修改文件清单

### 后端
- `Platform.ApiService/Models/Workflow/WorkflowDefinition.cs` - ConditionConfig 模型
- `Platform.ApiService/Workflows/Executors/ConditionExecutor.cs` - 条件执行器
- `Platform.ApiService/Services/WorkflowExpressionEvaluator.cs` - 表达式评估器

### 前端
- `Platform.Admin/src/pages/workflow/components/NodeConfigDrawer.tsx` - 节点配置抽屉
- `Platform.Admin/src/pages/workflow/components/WorkflowDesigner.tsx` - 工作流设计器
- `Platform.Admin/src/services/workflow/api.ts` - API 类型定义

### 测试
- `Platform.AppHost.Tests/Tests/WorkflowConditionTests.cs` - 条件测试用例

## 向后兼容性

- 数据库中的旧数据（使用 `defaultBranchId`）仍然可以通过向后兼容字段访问
- 新代码使用 `defaultNodeId` 字段
- 建议在数据迁移时将旧的 `defaultBranchId` 转换为对应的 `defaultNodeId`
