# 走访时间必填字段测试指南

## 🧪 API 测试用例

### 1. 创建任务 - 缺少走访时间（应该失败）
```bash
curl -X POST http://localhost:15001/visit-management/task \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "title": "测试任务1",
    "managerName": "张三",
    "phone": "13800138000",
    "visitType": "日常走访",
    "visitMethod": "实地走访",
    "details": "测试描述"
  }'
```

**期望结果**: HTTP 400 Bad Request
**期望响应**:
```json
{
  "success": false,
  "errorMessage": "走访时间不能为空",
  "errorCode": "VALIDATION_ERROR"
}
```

### 2. 创建任务 - 包含走访时间（应该成功）
```bash
curl -X POST http://localhost:15001/visit-management/task \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "title": "测试任务2",
    "managerName": "李四",
    "phone": "13900139000",
    "visitType": "日常走访",
    "visitMethod": "实地走访",
    "visitDate": "2024-02-15T10:30:00Z",
    "details": "测试描述"
  }'
```

**期望结果**: HTTP 200 OK
**期望响应**:
```json
{
  "success": true,
  "data": {
    "id": "generated-id",
    "title": "测试任务2",
    "visitDate": "2024-02-15T10:30:00Z",
    "status": "Pending"
    // ... 其他字段
  }
}
```

### 3. 编辑任务 - 尝试清空走访时间（应该失败）
```bash
curl -X PUT http://localhost:15001/visit-management/task/TASK_ID \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "title": "修改后的任务",
    "managerName": "王五",
    "visitDate": null
  }'
```

**期望结果**: HTTP 400 Bad Request

## 📊 统计报表验证

### 1. 获取统计数据（验证数据完整性）
```bash
curl -X GET "http://localhost:15001/visit-management/statistics?period=Month" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**验证要点**:
- 所有统计数据都基于有效的走访时间
- 完成率计算准确
- 月度趋势数据完整

### 2. 数据库验证
```javascript
// MongoDB 查询验证
db.visittasks.find({ "visitDate": { $exists: false } }).count();
// 期望结果: 0 (没有空走访时间的记录)

// 验证索引
db.visittasks.getIndexes();
// 应该包含 visitDate 索引
```

## 🔍 前端验证清单

### 表单验证
- [ ] 走访时间字段标记为必填 (*)
- [ ] 不选择日期时显示错误提示
- [ ] 选择日期后错误提示消失
- [ ] 日期选择器设置合理的默认值

### 数据提交
- [ ] 表单提交前验证所有必填字段
- [ ] API 返回验证错误时正确显示
- [ ] 成功创建后跳转到列表页

### 编辑功能
- [ ] 编辑页面自动填充已有日期
- [ ] 尝试清空日期时显示验证错误
- [ ] 修改日期后能正常保存

## ⚠️ 注意事项

### 1. 现有数据处理
```javascript
// 迁移脚本示例：为空记录设置默认日期
db.visittasks.updateMany(
  { visitDate: null },
  { 
    $set: { 
      visitDate: new Date("2024-01-01T00:00:00Z"),
      notes: "系统自动设置默认走访时间，请及时更新"
    }
  }
);
```

### 2. 性能考虑
- 为 visitDate 字段添加数据库索引
- 统计查询现在不需要检查空值，性能更好
- 批量操作时注意日期格式统一

### 3. 用户体验
- 在表单中提供当前日期作为默认选项
- 支持快速选择常用时间（今天、明天、下周等）
- 提供日期范围限制（不能选择过去日期等）

## 🎯 成功标准

✅ **API层面**
- 创建任务时缺少 visitDate 返回 400 错误
- 包含有效 visitDate 的请求成功创建
- 统计查询性能提升，无空值检查

✅ **数据层面**
- 所有新记录都有 visitDate 值
- 历史空值记录得到处理
- 数据库索引正确建立

✅ **前端层面**
- 表单验证正确提示必填
- 用户体验良好，操作流畅
- 错误处理友好，信息清晰

---

**测试完成后，走访时间字段将成为可靠的统计数据源，为园区管理提供准确的时间维度分析支持。**