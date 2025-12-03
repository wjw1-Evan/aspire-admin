# MCP 任务管理功能 - 快速入门

## 📋 概述

MCP 任务管理功能为 Aspire Admin 项目添加了完整的任务管理能力。通过 MCP 协议，AI 助手可以帮助用户创建、查询、更新、分配和完成任务。

## 🚀 快速开始

### 1. 查看可用工具
```bash
curl -X POST http://localhost:8000/api/mcp/tools/list \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### 2. 创建一个任务
```bash
curl -X POST http://localhost:8000/api/mcp/tools/call \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "create_task",
    "arguments": {
      "taskName": "修复登录页面",
      "taskType": "bug",
      "priority": 2
    }
  }'
```

### 3. 查询任务列表
```bash
curl -X POST http://localhost:8000/api/mcp/tools/call \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "get_tasks",
    "arguments": {
      "status": 2,
      "page": 1,
      "pageSize": 10
    }
  }'
```

## 📚 文档导航

| 文档 | 描述 |
|------|------|
| [快速参考](./TASK_MANAGEMENT_QUICK_REFERENCE.md) | 工具列表、参数说明、使用示例 |
| [功能总结](./MCP_TASK_MANAGEMENT_SUMMARY.md) | 详细的功能说明和技术细节 |
| [变更日志](./CHANGELOG_TASK_MANAGEMENT.md) | 完整的变更记录 |
| [实现清单](./IMPLEMENTATION_CHECKLIST.md) | 实现验收标准 |
| [实现报告](./TASK_MANAGEMENT_IMPLEMENTATION_REPORT.md) | 项目完整报告 |

## 🛠️ 可用工具

### 任务查询
- **get_tasks** - 获取任务列表（支持筛选和分页）
- **get_task_detail** - 获取单个任务的详细信息

### 任务管理
- **create_task** - 创建新任务
- **update_task** - 更新任务信息
- **assign_task** - 分配任务给用户
- **complete_task** - 标记任务为完成

### 统计分析
- **get_task_statistics** - 获取任务统计信息

## 📊 任务状态

| 状态 | 值 | 描述 |
|------|-----|------|
| Pending | 0 | 待分配 |
| Assigned | 1 | 已分配 |
| InProgress | 2 | 执行中 |
| Completed | 3 | 已完成 |
| Cancelled | 4 | 已取消 |
| Failed | 5 | 失败 |
| Paused | 6 | 暂停 |

## ⭐ 优先级

| 优先级 | 值 | 描述 |
|--------|-----|------|
| Low | 0 | 低 |
| Medium | 1 | 中 |
| High | 2 | 高 |
| Urgent | 3 | 紧急 |

## 🔄 典型工作流

### 创建和分配任务
```
1. create_task      创建新任务
   ↓
2. assign_task      分配给用户
   ↓
3. 用户开始执行
```

### 跟踪任务进度
```
1. get_tasks        查询任务列表
   ↓
2. get_task_detail  获取详细信息
   ↓
3. update_task      更新进度
   ↓
4. complete_task    完成任务
```

### 分析任务统计
```
1. get_task_statistics  获取统计数据
   ↓
2. 分析完成率、平均耗时等
```

## ✅ 常见任务

### 查询我的待处理任务
```bash
curl -X POST http://localhost:8000/api/mcp/tools/call \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "name": "get_tasks",
    "arguments": {
      "status": 2,
      "assignedTo": "YOUR_USER_ID"
    }
  }'
```

### 创建高优先级任务
```bash
curl -X POST http://localhost:8000/api/mcp/tools/call \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "name": "create_task",
    "arguments": {
      "taskName": "紧急修复",
      "taskType": "bug",
      "priority": 3,
      "description": "生产环境问题"
    }
  }'
```

### 更新任务进度
```bash
curl -X POST http://localhost:8000/api/mcp/tools/call \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "name": "update_task",
    "arguments": {
      "taskId": "TASK_ID",
      "completionPercentage": 75
    }
  }'
```

### 完成任务
```bash
curl -X POST http://localhost:8000/api/mcp/tools/call \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "name": "complete_task",
    "arguments": {
      "taskId": "TASK_ID",
      "executionResult": 1,
      "remarks": "已完成"
    }
  }'
```

## 🔐 安全性

- ✅ 需要有效的授权令牌
- ✅ 企业隔离 - 只能访问自己企业的任务
- ✅ 参数验证 - 所有输入都经过验证
- ✅ 错误处理 - 异常被正确捕获和记录

## 📞 故障排除

### 问题: "无法确定当前企业"
**解决**: 确保用户已关联到某个企业

### 问题: "缺少必需的参数"
**解决**: 检查请求中是否包含所有必需参数

### 问题: "任务未找到"
**解决**: 验证任务 ID 是否正确

### 问题: "未授权"
**解决**: 检查授权令牌是否有效

更多问题请参考 [快速参考](./TASK_MANAGEMENT_QUICK_REFERENCE.md) 中的故障排除部分。

## 🎯 下一步

1. 📖 阅读 [快速参考](./TASK_MANAGEMENT_QUICK_REFERENCE.md) 了解所有工具
2. 🧪 使用提供的示例进行测试
3. 📊 查看 [实现报告](./TASK_MANAGEMENT_IMPLEMENTATION_REPORT.md) 了解技术细节
4. 🚀 在生产环境中部署

## 📝 更新日志

### v1.0.0 (2025-12-02)
- ✅ 实现 7 个任务管理工具
- ✅ 完成企业隔离和安全检查
- ✅ 生成完整文档和示例

## 📄 许可证

本功能是 Aspire Admin 项目的一部分。

## 👥 支持

如有问题或建议，请参考相关文档或联系开发团队。

---

**最后更新**: 2025-12-02  
**版本**: 1.0.0  
**状态**: ✅ 生产就绪

