# 规则 MCP 集成指南

## 概述

规则管理系统已集成 MCP（Model Context Protocol）支持，允许将规则配置为 MCP 工具、资源或提示词，从而在 AI 助手中使用。

## 新增功能

### 1. MCP 规则配置

每个规则现在可以配置 MCP 相关参数，支持三种类型：

#### 1.1 MCP 工具（Tool）
将规则配置为可被 AI 助手调用的工具。

**配置字段：**
- `enabled`: 是否启用 MCP 集成
- `toolName`: 工具名称（唯一标识）
- `toolDescription`: 工具描述
- `inputSchema`: 工具参数模式（JSON Schema 格式）

**示例：**
```json
{
  "name": "查询用户规则",
  "desc": "用于查询系统中的用户信息",
  "mcpConfig": {
    "enabled": true,
    "toolName": "query_user",
    "toolDescription": "查询用户信息",
    "inputSchema": {
      "type": "object",
      "properties": {
        "userId": {
          "type": "string",
          "description": "用户ID"
        },
        "includeDetails": {
          "type": "boolean",
          "description": "是否包含详细信息"
        }
      },
      "required": ["userId"]
    }
  }
}
```

#### 1.2 MCP 资源（Resource）
将规则配置为可被 AI 助手读取的资源。

**配置字段：**
- `isResource`: 标记为资源
- `resourceUri`: 资源 URI（如 `rule://user-list`）
- `resourceMimeType`: MIME 类型（如 `application/json`）

**示例：**
```json
{
  "name": "用户列表资源",
  "desc": "系统中的所有用户列表",
  "mcpConfig": {
    "enabled": true,
    "isResource": true,
    "resourceUri": "rule://user-list",
    "resourceMimeType": "application/json"
  }
}
```

#### 1.3 MCP 提示词（Prompt）
将规则配置为 AI 助手可使用的提示词模板。

**配置字段：**
- `isPrompt`: 标记为提示词
- `promptArguments`: 提示词参数定义（JSON Schema 格式）
- `promptTemplate`: 提示词内容模板

**示例：**
```json
{
  "name": "用户分析提示词",
  "desc": "用于分析用户行为的提示词模板",
  "mcpConfig": {
    "enabled": true,
    "isPrompt": true,
    "promptArguments": {
      "type": "object",
      "properties": {
        "userId": {
          "type": "string",
          "description": "用户ID"
        },
        "timeRange": {
          "type": "string",
          "description": "时间范围（如 '7days', '30days'）"
        }
      },
      "required": ["userId"]
    },
    "promptTemplate": "分析用户 {{userId}} 在 {{timeRange}} 内的行为数据，包括登录次数、操作频率等。"
  }
}
```

## 数据模型

### RuleListItem（规则列表项）

新增字段：
```csharp
/// <summary>
/// MCP 相关配置
/// </summary>
public McpRuleConfig? McpConfig { get; set; }
```

### McpRuleConfig（MCP 规则配置）

```csharp
public class McpRuleConfig
{
    /// <summary>
    /// 是否启用 MCP 集成
    /// </summary>
    public bool Enabled { get; set; } = false;

    /// <summary>
    /// MCP 工具名称
    /// </summary>
    public string? ToolName { get; set; }

    /// <summary>
    /// MCP 工具描述
    /// </summary>
    public string? ToolDescription { get; set; }

    /// <summary>
    /// MCP 工具参数模式（JSON Schema）
    /// </summary>
    public Dictionary<string, object>? InputSchema { get; set; }

    /// <summary>
    /// 是否为 MCP 资源
    /// </summary>
    public bool IsResource { get; set; } = false;

    /// <summary>
    /// MCP 资源 URI
    /// </summary>
    public string? ResourceUri { get; set; }

    /// <summary>
    /// MCP 资源 MIME 类型
    /// </summary>
    public string? ResourceMimeType { get; set; }

    /// <summary>
    /// 是否为 MCP 提示词
    /// </summary>
    public bool IsPrompt { get; set; } = false;

    /// <summary>
    /// MCP 提示词参数定义
    /// </summary>
    public Dictionary<string, object>? PromptArguments { get; set; }

    /// <summary>
    /// MCP 提示词内容模板
    /// </summary>
    public string? PromptTemplate { get; set; }

    /// <summary>
    /// 创建时间
    /// </summary>
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    /// <summary>
    /// 更新时间
    /// </summary>
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}
```

## API 更新

### 创建规则请求

新增字段：
```csharp
/// <summary>
/// MCP 配置
/// </summary>
public CreateMcpRuleConfigRequest? McpConfig { get; set; }
```

### 更新规则请求

新增字段：
```csharp
/// <summary>
/// MCP 配置
/// </summary>
public UpdateMcpRuleConfigRequest? McpConfig { get; set; }
```

## 响应模型

### RuleMcpToolResponse（规则 MCP 工具响应）

```csharp
public class RuleMcpToolResponse
{
    public string Name { get; set; }
    public string Description { get; set; }
    public Dictionary<string, object>? InputSchema { get; set; }
    public string RuleId { get; set; }
    public string RuleName { get; set; }
}
```

### RuleMcpResourceResponse（规则 MCP 资源响应）

```csharp
public class RuleMcpResourceResponse
{
    public string Uri { get; set; }
    public string Name { get; set; }
    public string? Description { get; set; }
    public string? MimeType { get; set; }
    public string RuleId { get; set; }
}
```

### RuleMcpPromptResponse（规则 MCP 提示词响应）

```csharp
public class RuleMcpPromptResponse
{
    public string Name { get; set; }
    public string? Description { get; set; }
    public Dictionary<string, object>? Arguments { get; set; }
    public string? Template { get; set; }
    public string RuleId { get; set; }
}
```

## 使用场景

### 场景 1：创建自定义 MCP 工具

```bash
POST /api/rule

{
  "name": "获取部门信息",
  "desc": "获取指定部门的详细信息",
  "owner": "admin",
  "status": 1,
  "mcpConfig": {
    "enabled": true,
    "toolName": "get_department_info",
    "toolDescription": "获取部门信息，包括部门成员、预算等",
    "inputSchema": {
      "type": "object",
      "properties": {
        "departmentId": {
          "type": "string",
          "description": "部门ID"
        }
      },
      "required": ["departmentId"]
    }
  }
}
```

### 场景 2：创建 MCP 资源规则

```bash
POST /api/rule

{
  "name": "企业配置资源",
  "desc": "企业的配置信息资源",
  "owner": "admin",
  "status": 1,
  "mcpConfig": {
    "enabled": true,
    "isResource": true,
    "resourceUri": "rule://company-config",
    "resourceMimeType": "application/json"
  }
}
```

### 场景 3：创建 MCP 提示词规则

```bash
POST /api/rule

{
  "name": "数据分析提示词",
  "desc": "用于数据分析的提示词模板",
  "owner": "admin",
  "status": 1,
  "mcpConfig": {
    "enabled": true,
    "isPrompt": true,
    "promptArguments": {
      "type": "object",
      "properties": {
        "dataType": {
          "type": "string",
          "description": "数据类型"
        },
        "timeRange": {
          "type": "string",
          "description": "时间范围"
        }
      }
    },
    "promptTemplate": "分析 {{dataType}} 数据在 {{timeRange}} 的趋势和规律"
  }
}
```

## 与 AI 助手的集成

配置好 MCP 规则后，AI 助手（小科）可以：

1. **调用 MCP 工具**：
   ```
   用户：查询部门 DEPT001 的信息
   小科：[使用 get_department_info 工具] 部门信息如下：...
   ```

2. **读取 MCP 资源**：
   ```
   用户：查看企业配置
   小科：[读取 rule://company-config 资源] 企业配置信息：...
   ```

3. **使用 MCP 提示词**：
   ```
   用户：分析最近30天的销售数据
   小科：[使用数据分析提示词] 根据提示词分析...
   ```

## 最佳实践

### 1. 命名规范

- **工具名称**：使用 snake_case，如 `get_user_info`、`search_products`
- **资源 URI**：使用 `rule://` 前缀，如 `rule://user-list`、`rule://company-config`
- **提示词名称**：使用描述性名称，如 `user_analysis`、`data_summary`

### 2. 参数定义

- 使用 JSON Schema 标准定义参数
- 明确指定必需参数（`required` 字段）
- 为每个参数提供清晰的描述

### 3. 启用/禁用

- 使用 `enabled` 字段控制 MCP 集成的启用状态
- 禁用时，规则仍然存在但不会被 MCP 服务暴露

### 4. 权限控制

- MCP 工具/资源/提示词 继承规则的权限设置
- 只有有权访问规则的用户才能使用对应的 MCP 功能

## 迁移指南

### 从现有规则启用 MCP

对于现有规则，可以通过更新操作添加 MCP 配置：

```bash
PUT /api/rule

{
  "key": 1,
  "mcpConfig": {
    "enabled": true,
    "toolName": "existing_rule_tool",
    "toolDescription": "现有规则的 MCP 工具",
    "inputSchema": {
      "type": "object",
      "properties": {}
    }
  }
}
```

## 故障排除

### 问题 1：MCP 工具不显示在列表中

**原因**：`enabled` 字段为 `false`

**解决**：更新规则，将 `mcpConfig.enabled` 设置为 `true`

### 问题 2：工具参数验证失败

**原因**：`inputSchema` 定义不符合 JSON Schema 标准

**解决**：检查 `inputSchema` 的格式，确保符合 JSON Schema 规范

### 问题 3：资源 URI 冲突

**原因**：多个规则使用相同的 `resourceUri`

**解决**：确保每个资源的 URI 唯一

## 相关文档

- [MCP 服务使用指南](./MCP-SERVICE-GUIDE.md)
- [规则管理 API 文档](../api/rules.md)
- [JSON Schema 标准](https://json-schema.org/)

## 更新日志

- **2024-12-01**: 初始版本，支持规则的 MCP 工具、资源、提示词配置

