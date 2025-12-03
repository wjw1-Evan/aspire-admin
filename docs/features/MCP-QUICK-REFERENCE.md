# MCP 服务快速参考

## API 端点速查表

### 工具相关

| 方法 | 端点 | 描述 | 认证 |
|-----|------|------|------|
| POST | `/api/mcp/tools/list` | 列出所有可用工具 | ✅ 需要 |
| POST | `/api/mcp/tools/call` | 调用指定工具 | ✅ 需要 |

### 资源相关

| 方法 | 端点 | 描述 | 认证 |
|-----|------|------|------|
| POST | `/api/mcp/resources/list` | 列出所有可用资源 | ✅ 需要 |
| POST | `/api/mcp/resources/read` | 读取指定资源 | ✅ 需要 |

### 提示词相关

| 方法 | 端点 | 描述 | 认证 |
|-----|------|------|------|
| POST | `/api/mcp/prompts/list` | 列出所有可用提示词 | ✅ 需要 |
| POST | `/api/mcp/prompts/get` | 获取指定提示词 | ✅ 需要 |

### 初始化

| 方法 | 端点 | 描述 | 认证 |
|-----|------|------|------|
| POST | `/api/mcp/initialize` | 初始化 MCP 服务器 | ✅ 需要 |

## 常用工具列表

### 用户管理

```
get_user_info
  - 获取用户信息
  - 参数: userId, username, email
  
search_users
  - 搜索用户列表
  - 参数: keyword, status, page, pageSize
```

### 聊天功能

```
get_chat_sessions
  - 获取聊天会话列表
  - 参数: keyword, page, pageSize
  
get_chat_messages
  - 获取聊天消息列表
  - 参数: sessionId, page, pageSize (必需: sessionId)
```

### 企业管理

```
get_company_info
  - 获取企业信息
  - 参数: companyId (可选)
  
search_companies
  - 搜索企业列表
  - 参数: keyword
```

### 角色管理

```
get_all_roles
  - 获取所有角色
  - 参数: includeStats
  
get_role_info
  - 获取角色详细信息
  - 参数: roleId (必需)
```

### 活动日志

```
get_my_activity_logs
  - 获取我的活动日志
  - 参数: action, startDate, endDate, page, pageSize
```

### 任务管理

```
get_tasks
  - 获取任务列表
  - 参数: status, priority, assignedTo, search, page, pageSize
  
get_task_detail
  - 获取任务详细信息
  - 参数: taskId (必需)
  
create_task
  - 创建任务
  - 参数: taskName, taskType (必需), description, priority, ...
  
update_task
  - 更新任务
  - 参数: taskId (必需), taskName, description, status, ...
  
assign_task
  - 分配任务
  - 参数: taskId, assignedTo (必需)
  
complete_task
  - 完成任务
  - 参数: taskId (必需), executionResult, remarks
  
get_task_statistics
  - 获取任务统计
  - 参数: userId (可选)
  
get_my_task_count
  - 获取我的任务数
  - 参数: includeCompleted
  
get_my_tasks
  - 获取我的任务
  - 参数: status, page, pageSize
```

### 社交功能

```
get_nearby_users
  - 获取附近用户
  - 参数: center (必需), radiusMeters, limit
```

## 请求示例

### 1. 初始化 MCP 服务器

```bash
curl -X POST http://localhost:5000/api/mcp/initialize \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "protocolVersion": "2024-11-05",
    "capabilities": {},
    "clientInfo": {
      "name": "my-client",
      "version": "1.0.0"
    }
  }'
```

### 2. 列出所有工具

```bash
curl -X POST http://localhost:5000/api/mcp/tools/list \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json"
```

### 3. 调用工具 - 获取用户信息

```bash
curl -X POST http://localhost:5000/api/mcp/tools/call \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "get_user_info",
    "arguments": {
      "userId": "507f1f77bcf86cd799439011"
    }
  }'
```

### 4. 调用工具 - 搜索用户

```bash
curl -X POST http://localhost:5000/api/mcp/tools/call \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "search_users",
    "arguments": {
      "keyword": "admin",
      "page": 1,
      "pageSize": 20
    }
  }'
```

### 5. 调用工具 - 创建任务

```bash
curl -X POST http://localhost:5000/api/mcp/tools/call \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "create_task",
    "arguments": {
      "taskName": "修复登录问题",
      "taskType": "bug",
      "priority": 2,
      "description": "用户无法通过邮箱登录",
      "estimatedDuration": 120,
      "tags": ["urgent", "authentication"]
    }
  }'
```

### 6. 列出所有资源

```bash
curl -X POST http://localhost:5000/api/mcp/resources/list \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json"
```

### 7. 读取资源

```bash
curl -X POST http://localhost:5000/api/mcp/resources/read \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "uri": "user://507f1f77bcf86cd799439011"
  }'
```

### 8. 列出所有提示词

```bash
curl -X POST http://localhost:5000/api/mcp/prompts/list \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json"
```

### 9. 获取提示词

```bash
curl -X POST http://localhost:5000/api/mcp/prompts/get \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "search_user",
    "arguments": {
      "keyword": "admin"
    }
  }'
```

## 响应示例

### 成功响应

```json
{
  "code": 200,
  "message": "success",
  "data": {
    "tools": [
      {
        "name": "get_user_info",
        "description": "获取用户信息。可以通过用户ID、用户名或邮箱查询用户详细信息。",
        "inputSchema": {
          "type": "object",
          "properties": {
            "userId": {
              "type": "string",
              "description": "用户ID（可选，如果提供则直接查询）"
            }
          }
        }
      }
    ]
  }
}
```

### 错误响应

```json
{
  "code": 400,
  "message": "缺少必需的参数: sessionId",
  "data": null
}
```

## 参数类型速查

### 基本类型

| 类型 | 示例 | 说明 |
|-----|------|------|
| string | "admin" | 字符串 |
| integer | 1, 20 | 整数 |
| number | 30.27415 | 浮点数 |
| boolean | true, false | 布尔值 |
| array | ["tag1", "tag2"] | 数组 |
| object | { "latitude": 30.27415 } | 对象 |

### 常用参数

| 参数 | 类型 | 说明 | 默认值 | 范围 |
|-----|------|------|--------|------|
| page | integer | 页码 | 1 | >= 1 |
| pageSize | integer | 每页数量 | 20 | 1-100 |
| keyword | string | 搜索关键词 | - | - |
| status | string/integer | 状态 | - | - |
| priority | integer | 优先级 | - | 0-3 |
| startDate | string | 开始日期 (ISO 8601) | - | - |
| endDate | string | 结束日期 (ISO 8601) | - | - |

## 状态码速查

| 代码 | 含义 | 说明 |
|-----|------|------|
| 200 | OK | 请求成功 |
| 400 | Bad Request | 请求参数错误 |
| 401 | Unauthorized | 未认证或认证失败 |
| 403 | Forbidden | 无权限访问 |
| 404 | Not Found | 资源不存在 |
| 500 | Internal Server Error | 服务器错误 |

## 常见错误和解决方案

### 错误 1：缺少认证令牌

**错误信息：** `401 Unauthorized`

**解决方案：**
```bash
# 添加 Authorization 头
curl -H "Authorization: Bearer YOUR_JWT_TOKEN" ...
```

### 错误 2：缺少必需参数

**错误信息：** `缺少必需的参数: taskId`

**解决方案：**
```json
{
  "name": "get_task_detail",
  "arguments": {
    "taskId": "507f1f77bcf86cd799439011"  // 添加必需参数
  }
}
```

### 错误 3：参数类型错误

**错误信息：** `参数类型不匹配`

**解决方案：**
```json
{
  "name": "get_tasks",
  "arguments": {
    "page": 1,        // 应该是 integer，不是 string
    "pageSize": 20    // 应该是 integer，不是 string
  }
}
```

### 错误 4：资源不存在

**错误信息：** `用户未找到`

**解决方案：**
- 检查用户 ID 是否正确
- 确认用户未被删除
- 检查权限是否足够

## 性能优化建议

### 1. 使用缓存

```bash
# 首次请求（~100-200ms）
curl -X POST http://localhost:5000/api/mcp/tools/list ...

# 后续请求（~5-10ms，使用缓存）
curl -X POST http://localhost:5000/api/mcp/tools/list ...
```

### 2. 合理分页

```json
{
  "name": "search_users",
  "arguments": {
    "page": 1,
    "pageSize": 50  // 不要超过 100
  }
}
```

### 3. 使用过滤条件

```json
{
  "name": "get_tasks",
  "arguments": {
    "status": 2,      // 只查询执行中的任务
    "priority": 2,    // 只查询高优先级任务
    "page": 1,
    "pageSize": 20
  }
}
```

## 规则配置快速指南

### 创建 MCP 工具规则

```json
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

### 创建 MCP 资源规则

```json
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

### 创建 MCP 提示词规则

```json
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
        }
      }
    },
    "promptTemplate": "分析 {{dataType}} 数据的趋势和规律"
  }
}
```

## 调试技巧

### 1. 启用详细日志

```csharp
// 在 appsettings.Development.json 中
{
  "Logging": {
    "LogLevel": {
      "Platform.ApiService.Services.McpService": "Debug"
    }
  }
}
```

### 2. 使用 Postman 测试

1. 创建新的 POST 请求
2. 设置 URL：`http://localhost:5000/api/mcp/tools/list`
3. 添加 Header：`Authorization: Bearer YOUR_JWT_TOKEN`
4. 发送请求

### 3. 查看缓存状态

```bash
# 查看日志中的缓存命中信息
grep "使用缓存的 MCP 工具列表" logs/*.log
```

## 常用命令

### 获取所有工具

```bash
curl -X POST http://localhost:5000/api/mcp/tools/list \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" | jq '.data.tools[] | {name, description}'
```

### 搜索特定工具

```bash
curl -X POST http://localhost:5000/api/mcp/tools/list \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" | jq '.data.tools[] | select(.name | contains("task"))'
```

### 获取工具参数

```bash
curl -X POST http://localhost:5000/api/mcp/tools/list \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" | jq '.data.tools[] | select(.name == "create_task") | .inputSchema'
```

## 相关资源

- [MCP 服务使用指南](./MCP-SERVICE-GUIDE.md)
- [MCP 服务完善指南](./MCP-SERVICE-IMPROVEMENTS.md)
- [规则 MCP 集成指南](./RULES-MCP-INTEGRATION.md)
- [MCP 实现检查清单](./MCP-IMPLEMENTATION-CHECKLIST.md)

---

**快速参考版本：** 1.0.0  
**最后更新：** 2024-12-03  
**维护者：** 开发团队

