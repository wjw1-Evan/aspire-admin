# 规则管理系统文档

## 目录

1. [概述](#概述)
2. [核心概念](#核心概念)
3. [规则类型](#规则类型)
4. [API 接口](#api-接口)
5. [数据模型](#数据模型)
6. [使用示例](#使用示例)
7. [最佳实践](#最佳实践)
8. [常见问题](#常见问题)
9. [相关文档](#相关文档)

## 概述

规则管理系统是 Aspire Admin 平台的核心功能模块，用于管理系统中的各类规则、策略和配置。规则可以应用于权限控制、业务流程、数据验证等多个场景。

### 主要特性

- **灵活的规则配置**：支持多种规则类型和配置方式
- **权限集成**：与系统权限体系深度集成
- **MCP 支持**：支持将规则配置为 MCP 工具、资源或提示词
- **版本管理**：支持规则的版本控制和历史追踪
- **实时生效**：规则修改可实时生效
- **审计日志**：完整的操作审计记录

## 核心概念

### 规则（Rule）

规则是系统中的基本配置单元，定义了特定的业务逻辑或策略。

**关键属性：**
- `id`: 规则唯一标识
- `name`: 规则名称
- `desc`: 规则描述
- `owner`: 规则所有者
- `status`: 规则状态（启用/禁用）
- `content`: 规则内容（JSON 格式）
- `tags`: 规则标签，用于分类和搜索
- `version`: 规则版本号
- `createdAt`: 创建时间
- `updatedAt`: 更新时间

### 规则状态

- `0`: 禁用 - 规则存在但不生效
- `1`: 启用 - 规则正常生效
- `2`: 草稿 - 规则未发布
- `3`: 已过期 - 规则已过期

### 规则权限

规则支持以下权限操作：
- `view`: 查看规则
- `create`: 创建规则
- `update`: 更新规则
- `delete`: 删除规则
- `execute`: 执行规则

## 规则类型

### 1. 权限规则

用于定义系统的权限和访问控制。

**示例：**
```json
{
  "name": "用户管理权限规则",
  "desc": "定义用户管理模块的权限",
  "type": "permission",
  "content": {
    "resources": ["user:view", "user:create", "user:update", "user:delete"],
    "roles": ["admin", "manager"],
    "conditions": {
      "department": "HR"
    }
  }
}
```

### 2. 业务流程规则

用于定义和控制业务流程。

**示例：**
```json
{
  "name": "审批流程规则",
  "desc": "定义请假申请的审批流程",
  "type": "workflow",
  "content": {
    "steps": [
      {
        "id": "submit",
        "name": "提交申请",
        "actor": "employee"
      },
      {
        "id": "review",
        "name": "部门经理审批",
        "actor": "manager",
        "condition": "amount > 1000"
      },
      {
        "id": "approve",
        "name": "HR 审批",
        "actor": "hr"
      }
    ]
  }
}
```

### 3. 数据验证规则

用于定义数据验证规则。

**示例：**
```json
{
  "name": "用户信息验证规则",
  "desc": "验证用户信息的合法性",
  "type": "validation",
  "content": {
    "fields": {
      "email": {
        "type": "email",
        "required": true
      },
      "age": {
        "type": "number",
        "min": 18,
        "max": 100
      },
      "phone": {
        "type": "string",
        "pattern": "^1[3-9]\\d{9}$"
      }
    }
  }
}
```

### 4. 业务规则

用于定义通用的业务规则。

**示例：**
```json
{
  "name": "折扣规则",
  "desc": "定义商品折扣规则",
  "type": "business",
  "content": {
    "discounts": [
      {
        "condition": "amount >= 1000",
        "discount": 0.1
      },
      {
        "condition": "amount >= 5000",
        "discount": 0.2
      }
    ]
  }
}
```

### 5. MCP 规则

用于将规则配置为 MCP 工具、资源或提示词。详见 [MCP 集成指南](./features/RULES-MCP-INTEGRATION.md)。

## API 接口

### 获取规则列表

**请求：**
```http
GET /api/rule?pageNum=1&pageSize=10&name=&status=1
```

**参数：**
- `pageNum`: 页码（默认 1）
- `pageSize`: 每页数量（默认 10）
- `name`: 规则名称（可选）
- `status`: 规则状态（可选）
- `tags`: 规则标签（可选）

**响应：**
```json
{
  "code": 0,
  "msg": "success",
  "data": {
    "total": 100,
    "list": [
      {
        "id": "1",
        "name": "用户管理权限规则",
        "desc": "定义用户管理模块的权限",
        "owner": "admin",
        "status": 1,
        "tags": ["permission", "user"],
        "version": 1,
        "createdAt": "2024-01-01T00:00:00Z",
        "updatedAt": "2024-01-01T00:00:00Z"
      }
    ]
  }
}
```

### 获取规则详情

**请求：**
```http
GET /api/rule/{id}
```

**参数：**
- `id`: 规则 ID

**响应：**
```json
{
  "code": 0,
  "msg": "success",
  "data": {
    "id": "1",
    "name": "用户管理权限规则",
    "desc": "定义用户管理模块的权限",
    "owner": "admin",
    "status": 1,
    "content": {
      "resources": ["user:view", "user:create"],
      "roles": ["admin"]
    },
    "tags": ["permission", "user"],
    "version": 1,
    "createdAt": "2024-01-01T00:00:00Z",
    "updatedAt": "2024-01-01T00:00:00Z"
  }
}
```

### 创建规则

**请求：**
```http
POST /api/rule
Content-Type: application/json

{
  "name": "新规则",
  "desc": "规则描述",
  "owner": "admin",
  "status": 1,
  "content": {
    "type": "permission",
    "resources": ["user:view"]
  },
  "tags": ["permission"],
  "mcpConfig": {
    "enabled": false
  }
}
```

**参数：**
- `name`: 规则名称（必需）
- `desc`: 规则描述（可选）
- `owner`: 规则所有者（必需）
- `status`: 规则状态（默认 1）
- `content`: 规则内容（必需）
- `tags`: 规则标签（可选）
- `mcpConfig`: MCP 配置（可选）

**响应：**
```json
{
  "code": 0,
  "msg": "success",
  "data": {
    "id": "1",
    "name": "新规则",
    "desc": "规则描述",
    "owner": "admin",
    "status": 1,
    "version": 1,
    "createdAt": "2024-01-01T00:00:00Z",
    "updatedAt": "2024-01-01T00:00:00Z"
  }
}
```

### 更新规则

**请求：**
```http
PUT /api/rule
Content-Type: application/json

{
  "key": 1,
  "name": "更新的规则名称",
  "desc": "更新的描述",
  "status": 1,
  "content": {
    "type": "permission",
    "resources": ["user:view", "user:create"]
  },
  "tags": ["permission", "updated"]
}
```

**参数：**
- `key`: 规则 ID（必需）
- 其他字段同创建规则

**响应：**
```json
{
  "code": 0,
  "msg": "success",
  "data": {
    "id": "1",
    "name": "更新的规则名称",
    "version": 2,
    "updatedAt": "2024-01-02T00:00:00Z"
  }
}
```

### 删除规则

**请求：**
```http
DELETE /api/rule/{id}
```

**参数：**
- `id`: 规则 ID

**响应：**
```json
{
  "code": 0,
  "msg": "success",
  "data": null
}
```

### 批量删除规则

**请求：**
```http
POST /api/rule/delete
Content-Type: application/json

{
  "keys": [1, 2, 3]
}
```

**参数：**
- `keys`: 规则 ID 数组

**响应：**
```json
{
  "code": 0,
  "msg": "success",
  "data": {
    "deletedCount": 3
  }
}
```

### 获取 MCP 工具列表

**请求：**
```http
GET /api/rule/mcp/tools
```

**响应：**
```json
{
  "code": 0,
  "msg": "success",
  "data": [
    {
      "name": "query_user",
      "description": "查询用户信息",
      "inputSchema": {
        "type": "object",
        "properties": {
          "userId": {
            "type": "string",
            "description": "用户ID"
          }
        },
        "required": ["userId"]
      },
      "ruleId": "1",
      "ruleName": "查询用户规则"
    }
  ]
}
```

### 获取 MCP 资源列表

**请求：**
```http
GET /api/rule/mcp/resources
```

**响应：**
```json
{
  "code": 0,
  "msg": "success",
  "data": [
    {
      "uri": "rule://user-list",
      "name": "用户列表资源",
      "description": "系统中的所有用户列表",
      "mimeType": "application/json",
      "ruleId": "1"
    }
  ]
}
```

### 获取 MCP 提示词列表

**请求：**
```http
GET /api/rule/mcp/prompts
```

**响应：**
```json
{
  "code": 0,
  "msg": "success",
  "data": [
    {
      "name": "user_analysis",
      "description": "用户分析提示词",
      "arguments": {
        "type": "object",
        "properties": {
          "userId": {
            "type": "string"
          }
        }
      },
      "template": "分析用户 {{userId}} 的行为数据",
      "ruleId": "1"
    }
  ]
}
```

## 数据模型

### RuleListItem

```csharp
public class RuleListItem
{
    /// <summary>
    /// 规则 ID
    /// </summary>
    public string Id { get; set; }

    /// <summary>
    /// 规则名称
    /// </summary>
    public string Name { get; set; }

    /// <summary>
    /// 规则描述
    /// </summary>
    public string Desc { get; set; }

    /// <summary>
    /// 规则所有者
    /// </summary>
    public string Owner { get; set; }

    /// <summary>
    /// 规则状态
    /// </summary>
    public int Status { get; set; }

    /// <summary>
    /// 规则标签
    /// </summary>
    public List<string> Tags { get; set; }

    /// <summary>
    /// 规则版本
    /// </summary>
    public int Version { get; set; }

    /// <summary>
    /// MCP 配置
    /// </summary>
    public McpRuleConfig? McpConfig { get; set; }

    /// <summary>
    /// 创建时间
    /// </summary>
    public DateTime CreatedAt { get; set; }

    /// <summary>
    /// 更新时间
    /// </summary>
    public DateTime UpdatedAt { get; set; }
}
```

### RuleDetail

```csharp
public class RuleDetail
{
    /// <summary>
    /// 规则 ID
    /// </summary>
    public string Id { get; set; }

    /// <summary>
    /// 规则名称
    /// </summary>
    public string Name { get; set; }

    /// <summary>
    /// 规则描述
    /// </summary>
    public string Desc { get; set; }

    /// <summary>
    /// 规则所有者
    /// </summary>
    public string Owner { get; set; }

    /// <summary>
    /// 规则状态
    /// </summary>
    public int Status { get; set; }

    /// <summary>
    /// 规则内容
    /// </summary>
    public Dictionary<string, object> Content { get; set; }

    /// <summary>
    /// 规则标签
    /// </summary>
    public List<string> Tags { get; set; }

    /// <summary>
    /// 规则版本
    /// </summary>
    public int Version { get; set; }

    /// <summary>
    /// MCP 配置
    /// </summary>
    public McpRuleConfig? McpConfig { get; set; }

    /// <summary>
    /// 创建时间
    /// </summary>
    public DateTime CreatedAt { get; set; }

    /// <summary>
    /// 更新时间
    /// </summary>
    public DateTime UpdatedAt { get; set; }
}
```

### McpRuleConfig

详见 [MCP 集成指南](./features/RULES-MCP-INTEGRATION.md#数据模型)

## 使用示例

### 示例 1：创建权限规则

```bash
curl -X POST http://localhost:5000/api/rule \
  -H "Content-Type: application/json" \
  -d '{
    "name": "用户管理权限",
    "desc": "用户管理模块的权限规则",
    "owner": "admin",
    "status": 1,
    "content": {
      "resources": ["user:view", "user:create", "user:update", "user:delete"],
      "roles": ["admin", "manager"],
      "conditions": {
        "department": "HR"
      }
    },
    "tags": ["permission", "user"]
  }'
```

### 示例 2：创建业务流程规则

```bash
curl -X POST http://localhost:5000/api/rule \
  -H "Content-Type: application/json" \
  -d '{
    "name": "请假审批流程",
    "desc": "定义请假申请的审批流程",
    "owner": "admin",
    "status": 1,
    "content": {
      "steps": [
        {
          "id": "submit",
          "name": "提交申请",
          "actor": "employee"
        },
        {
          "id": "review",
          "name": "部门经理审批",
          "actor": "manager"
        },
        {
          "id": "approve",
          "name": "HR 审批",
          "actor": "hr"
        }
      ]
    },
    "tags": ["workflow", "leave"]
  }'
```

### 示例 3：创建 MCP 工具规则

```bash
curl -X POST http://localhost:5000/api/rule \
  -H "Content-Type: application/json" \
  -d '{
    "name": "查询用户规则",
    "desc": "用于查询系统中的用户信息",
    "owner": "admin",
    "status": 1,
    "content": {
      "type": "mcp_tool"
    },
    "tags": ["mcp", "tool"],
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
  }'
```

### 示例 4：更新规则

```bash
curl -X PUT http://localhost:5000/api/rule \
  -H "Content-Type: application/json" \
  -d '{
    "key": 1,
    "name": "用户管理权限（已更新）",
    "desc": "用户管理模块的权限规则（已更新）",
    "status": 1,
    "content": {
      "resources": ["user:view", "user:create", "user:update", "user:delete", "user:export"],
      "roles": ["admin", "manager", "supervisor"],
      "conditions": {
        "department": "HR"
      }
    },
    "tags": ["permission", "user", "updated"]
  }'
```

### 示例 5：查询规则列表

```bash
curl -X GET "http://localhost:5000/api/rule?pageNum=1&pageSize=10&status=1&tags=permission" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## 最佳实践

### 1. 命名规范

- **规则名称**：使用清晰、描述性的名称，如 "用户管理权限规则" 而不是 "规则1"
- **标签**：使用小写字母和下划线，如 `permission`、`user_management`
- **所有者**：明确指定规则的所有者，便于权限管理

### 2. 内容结构

- 使用 JSON 格式定义规则内容
- 保持内容结构简洁清晰
- 为复杂规则添加注释说明

### 3. 版本管理

- 每次修改规则时，系统自动递增版本号
- 保留规则的历史版本记录
- 重要规则修改前进行备份

### 4. 权限控制

- 根据用户角色设置规则的访问权限
- 定期审计规则的权限设置
- 遵循最小权限原则

### 5. 标签使用

- 为规则添加合适的标签，便于分类和搜索
- 使用统一的标签体系
- 定期清理过时的标签

### 6. 测试

- 新规则创建后进行充分测试
- 在生产环境应用前进行灰度测试
- 建立规则测试用例库

### 7. 文档

- 为复杂规则编写详细文档
- 说明规则的适用场景和限制条件
- 提供使用示例

## 常见问题

### Q1: 如何禁用规则而不删除它？

**A:** 将规则的 `status` 字段设置为 `0`（禁用）。规则仍然存在于系统中，但不会生效。

```bash
curl -X PUT http://localhost:5000/api/rule \
  -H "Content-Type: application/json" \
  -d '{
    "key": 1,
    "status": 0
  }'
```

### Q2: 如何查询特定标签的规则？

**A:** 使用 `tags` 参数进行查询。

```bash
curl -X GET "http://localhost:5000/api/rule?tags=permission,user" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Q3: 规则修改后多久生效？

**A:** 规则修改后立即生效。系统会实时加载最新的规则配置。

### Q4: 如何导出规则？

**A:** 通过 API 获取规则列表和详情，然后导出为 JSON 或 CSV 格式。

```bash
curl -X GET "http://localhost:5000/api/rule?pageSize=1000" \
  -H "Authorization: Bearer YOUR_TOKEN" > rules.json
```

### Q5: 规则是否支持版本回滚？

**A:** 当前版本不支持自动回滚，但可以通过更新规则内容来恢复到之前的版本。建议在修改重要规则前进行备份。

### Q6: MCP 规则如何与 AI 助手集成？

**A:** 详见 [MCP 集成指南](./features/RULES-MCP-INTEGRATION.md#与-ai-助手的集成)

### Q7: 如何批量导入规则？

**A:** 当前系统不提供批量导入功能，需要逐个创建规则。可以编写脚本调用 API 实现批量导入。

### Q8: 规则内容有大小限制吗？

**A:** 规则内容存储在 MongoDB 中，单个文档大小限制为 16MB。通常规则内容不会超过此限制。

## 相关文档

- [MCP 集成指南](./features/RULES-MCP-INTEGRATION.md)
- [MCP 服务使用指南](./features/MCP-SERVICE-GUIDE.md)
- [任务管理文档](./features/TASK-MANAGEMENT.md)
- [API 文档](./api/)

## 更新日志

- **2024-12-03**: 创建规则管理系统完整文档
- **2024-12-01**: 支持 MCP 集成
- **2024-11-01**: 初始版本发布

