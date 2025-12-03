# MCP 任务管理工具快速参考

## 工具列表

| 工具名称 | 功能描述 | 必需参数 | 可选参数 |
|---------|--------|--------|--------|
| `get_tasks` | 获取任务列表 | 无 | status, priority, assignedTo, search, page, pageSize |
| `get_task_detail` | 获取任务详情 | taskId | 无 |
| `create_task` | 创建新任务 | taskName, taskType | description, priority, assignedTo, estimatedDuration, tags |
| `update_task` | 更新任务信息 | taskId | taskName, description, status, priority, completionPercentage |
| `assign_task` | 分配任务给用户 | taskId, assignedTo | remarks |
| `complete_task` | 完成任务 | taskId | executionResult, remarks |
| `get_task_statistics` | 获取统计信息 | 无 | userId |

## 参数说明

### 任务状态 (status)
```
0 = 待分配 (Pending)
1 = 已分配 (Assigned)
2 = 执行中 (InProgress)
3 = 已完成 (Completed)
4 = 已取消 (Cancelled)
5 = 失败 (Failed)
6 = 暂停 (Paused)
```

### 优先级 (priority)
```
0 = 低 (Low)
1 = 中 (Medium)
2 = 高 (High)
3 = 紧急 (Urgent)
```

### 执行结果 (executionResult)
```
0 = 未执行 (NotExecuted)
1 = 成功 (Success)
2 = 失败 (Failed)
3 = 超时 (Timeout)
4 = 被中断 (Interrupted)
```

## 常见操作流程

### 流程 1: 创建并分配任务
```
1. create_task (创建任务)
   ↓
2. assign_task (分配给用户)
   ↓
3. 用户开始执行
```

### 流程 2: 查询和更新任务
```
1. get_tasks (查询任务列表)
   ↓
2. get_task_detail (获取详情)
   ↓
3. update_task (更新进度)
   ↓
4. complete_task (完成任务)
```

### 流程 3: 查看统计信息
```
1. get_task_statistics (获取全局统计)
   ↓
2. 分析任务完成率、平均耗时等
```

## API 端点

所有任务管理工具都通过以下端点调用：

```
POST /api/mcp/tools/call
```

## 响应格式

### 成功响应
```json
{
  "code": 0,
  "message": "success",
  "data": {
    "content": [
      {
        "type": "text",
        "text": "{...任务数据...}"
      }
    ],
    "isError": false
  }
}
```

### 错误响应
```json
{
  "code": 0,
  "message": "success",
  "data": {
    "content": [
      {
        "type": "text",
        "text": "错误: 缺少必需的参数: taskId"
      }
    ],
    "isError": true
  }
}
```

## 实际示例

### 示例 1: 查询我的待处理任务
```bash
curl -X POST http://localhost:8000/api/mcp/tools/call \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "name": "get_tasks",
    "arguments": {
      "status": 2,
      "assignedTo": "YOUR_USER_ID",
      "page": 1,
      "pageSize": 10
    }
  }'
```

### 示例 2: 创建一个高优先级的紧急任务
```bash
curl -X POST http://localhost:8000/api/mcp/tools/call \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "name": "create_task",
    "arguments": {
      "taskName": "紧急修复生产环境问题",
      "taskType": "bug",
      "description": "数据库连接超时，影响用户登录",
      "priority": 3,
      "estimatedDuration": 60,
      "tags": ["production", "critical"]
    }
  }'
```

### 示例 3: 更新任务进度
```bash
curl -X POST http://localhost:8000/api/mcp/tools/call \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "name": "update_task",
    "arguments": {
      "taskId": "507f1f77bcf86cd799439011",
      "completionPercentage": 75,
      "status": 2
    }
  }'
```

### 示例 4: 完成任务
```bash
curl -X POST http://localhost:8000/api/mcp/tools/call \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "name": "complete_task",
    "arguments": {
      "taskId": "507f1f77bcf86cd799439011",
      "executionResult": 1,
      "remarks": "已完成，通过测试验证"
    }
  }'
```

### 示例 5: 获取任务统计
```bash
curl -X POST http://localhost:8000/api/mcp/tools/call \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "name": "get_task_statistics",
    "arguments": {}
  }'
```

## 注意事项

1. **企业隔离**: 所有操作都基于用户的当前企业，确保数据安全
2. **分页限制**: pageSize 最大为 100，超过会自动限制
3. **参数验证**: 所有必需参数都会被验证，缺少会返回错误
4. **权限检查**: 需要有效的授权令牌才能调用任务管理工具
5. **日期格式**: 使用 ISO 8601 格式（如：2024-01-01T00:00:00Z）

## 故障排除

### 问题: "无法确定当前企业"
**原因**: 用户未设置 CurrentCompanyId
**解决**: 确保用户已关联到某个企业

### 问题: "缺少必需的参数"
**原因**: 请求中缺少必需的参数
**解决**: 检查请求参数是否完整

### 问题: "任务未找到"
**原因**: 任务 ID 不存在或已被删除
**解决**: 验证任务 ID 是否正确

### 问题: "任务分配成功" 但用户未收到通知
**原因**: 通知系统可能未配置
**解决**: 检查通知服务是否启用

## 性能建议

1. **分页查询**: 大量任务时使用分页，避免一次加载过多数据
2. **缓存**: 考虑缓存任务统计信息，减少数据库查询
3. **索引**: 确保数据库中的 status、priority、assignedTo 字段有索引
4. **批量操作**: 如需批量更新，考虑使用数据库事务

## 相关资源

- MCP 协议文档: [Model Context Protocol](https://modelcontextprotocol.io/)
- 任务模型定义: `Platform.ApiService/Models/TaskModels.cs`
- 任务服务接口: `Platform.ApiService/Services/ITaskService.cs`
- MCP 服务实现: `Platform.ApiService/Services/McpService.cs`

