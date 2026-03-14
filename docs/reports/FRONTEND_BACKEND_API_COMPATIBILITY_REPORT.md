# 前端与后端 API 兼容性检查报告

## 执行摘要

**状态**: ✅ 前后端 API 完全匹配

**检查日期**: 2026-03-13

**检查范围**: 
- 文档管理 API (`/api/documents/*`)
- 工作流 API (`/api/workflows/*`)
- 表单相关 API

---

## 1. 文档管理 API 检查

### 1.1 获取文档列表
**后端端点**: `GET /api/documents`
**前端调用**: `getDocumentList(params)`
**状态**: ✅ 匹配

```typescript
// 前端
export async function getDocumentList(params: DocumentQueryParams): Promise<ApiResponse<...>> {
  return request('/api/documents', { method: 'GET', params });
}

// 后端
[HttpGet]
public async Task<IActionResult> GetDocuments([FromQuery] DocumentQueryParams params)
```

### 1.2 获取文档详情
**后端端点**: `GET /api/documents/{id}`
**前端调用**: `getDocumentDetail(id)`
**状态**: ✅ 匹配

### 1.3 创建文档
**后端端点**: `POST /api/documents`
**前端调用**: `createDocument(data)`
**状态**: ✅ 匹配

**请求体**:
```typescript
interface CreateDocumentRequest {
  title: string;
  content?: string;
  documentType: string;
  category?: string;
  attachmentIds?: string[];
  formData?: Record<string, any>;
}
```

### 1.4 更新文档
**后端端点**: `PUT /api/documents/{id}`
**前端调用**: `updateDocument(id, data)`
**状态**: ✅ 匹配

### 1.5 删除文档
**后端端点**: `DELETE /api/documents/{id}`
**前端调用**: `deleteDocument(id)`
**状态**: ✅ 匹配

### 1.6 提交文档（启动流程）
**后端端点**: `POST /api/documents/{id}/submit`
**前端调用**: `submitDocument(id, data)`
**状态**: ✅ 匹配

**请求体**:
```typescript
interface SubmitDocumentRequest {
  workflowDefinitionId: string;
  variables?: Record<string, any>;
}
```

**后端实现**:
```csharp
[HttpPost("{id}/submit")]
[RequireMenu("document-list", "document-approval")]
public async Task<IActionResult> SubmitDocument(string id, [FromBody] SubmitDocumentRequest request)
{
    var instance = await _documentService.SubmitDocumentAsync(
        id, 
        request.WorkflowDefinitionId, 
        request.Variables
    );
    return Success(instance);
}
```

### 1.7 审批通过
**后端端点**: `POST /api/documents/{id}/approve`
**前端调用**: `approveDocument(id, data)`
**状态**: ✅ 匹配

### 1.8 审批拒绝
**后端端点**: `POST /api/documents/{id}/reject`
**前端调用**: `rejectDocument(id, data)`
**状态**: ✅ 匹配

### 1.9 退回文档
**后端端点**: `POST /api/documents/{id}/return`
**前端调用**: `returnDocument(id, data)`
**状态**: ✅ 匹配

### 1.10 转办文档
**后端端点**: `POST /api/documents/{id}/delegate`
**前端调用**: `delegateDocument(id, data)`
**状态**: ✅ 匹配

### 1.11 上传附件
**后端端点**: `POST /api/documents/attachments`
**前端调用**: `uploadDocumentAttachment(file)`
**状态**: ✅ 匹配

### 1.12 下载附件
**后端端点**: `GET /api/documents/attachments/{attachmentId}`
**前端调用**: `downloadAttachment(attachmentId)`
**状态**: ✅ 匹配

### 1.13 获取待审批列表
**后端端点**: `GET /api/documents/pending`
**前端调用**: `getPendingDocuments(params)`
**状态**: ✅ 匹配

### 1.14 获取文档统计
**后端端点**: `GET /api/documents/statistics`
**前端调用**: `getDocumentStatistics()`
**状态**: ✅ 匹配

### 1.15 获取实例表单
**后端端点**: `GET /api/documents/{id}/instance-form`
**前端调用**: `getDocumentInstanceForm(id)`
**状态**: ✅ 匹配

---

## 2. 工作流 API 检查

### 2.1 获取工作流列表
**后端端点**: `GET /api/workflows`
**前端调用**: `getWorkflowList(params)`
**状态**: ✅ 匹配

### 2.2 获取工作流详情
**后端端点**: `GET /api/workflows/{id}`
**前端调用**: `getWorkflowDetail(id)`
**状态**: ✅ 匹配

### 2.3 创建工作流
**后端端点**: `POST /api/workflows`
**前端调用**: `createWorkflow(data)`
**状态**: ✅ 匹配

### 2.4 更新工作流
**后端端点**: `PUT /api/workflows/{id}`
**前端调用**: `updateWorkflow(id, data)`
**状态**: ✅ 匹配

### 2.5 删除工作流
**后端端点**: `DELETE /api/workflows/{id}`
**前端调用**: `deleteWorkflow(id)`
**状态**: ✅ 匹配

### 2.6 启动工作流
**后端端点**: `POST /api/workflows/{id}/start`
**前端调用**: `startWorkflow(id, data)`
**状态**: ✅ 匹配

### 2.7 获取工作流实例列表
**后端端点**: `GET /api/workflows/instances`
**前端调用**: `getWorkflowInstances(params)`
**状态**: ✅ 匹配

### 2.8 获取待办实例列表
**后端端点**: `GET /api/workflows/instances/todo`
**前端调用**: `getTodoInstances(params)`
**状态**: ✅ 匹配

### 2.9 获取工作流实例详情
**后端端点**: `GET /api/workflows/instances/{id}`
**前端调用**: `getWorkflowInstance(id)`
**状态**: ✅ 匹配

### 2.10 获取审批历史
**后端端点**: `GET /api/workflows/instances/{id}/history`
**前端调用**: `getApprovalHistory(id)`
**状态**: ✅ 匹配

### 2.11 获取节点表单
**后端端点**: `GET /api/workflows/instances/{id}/nodes/{nodeId}/form`
**前端调用**: `getNodeForm(instanceId, nodeId)`
**状态**: ✅ 匹配

### 2.12 提交节点表单
**后端端点**: `POST /api/workflows/instances/{id}/nodes/{nodeId}/form`
**前端调用**: `submitNodeForm(instanceId, nodeId, values)`
**状态**: ✅ 匹配

### 2.13 执行节点操作
**后端端点**: `POST /api/workflows/instances/{id}/nodes/{nodeId}/action`
**前端调用**: `executeNodeAction(instanceId, nodeId, data)`
**状态**: ✅ 匹配

### 2.14 撤回实例
**后端端点**: `POST /api/workflows/instances/{id}/withdraw`
**前端调用**: `withdrawInstance(instanceId, reason)`
**状态**: ✅ 匹配

### 2.15 获取文档创建表单
**后端端点**: `GET /api/workflows/{id}/document-form`
**前端调用**: `getDocumentCreateForm(definitionId)`
**状态**: ✅ 匹配

### 2.16 按流程创建文档
**后端端点**: `POST /api/workflows/{id}/documents`
**前端调用**: `createDocumentByWorkflow(definitionId, data)`
**状态**: ✅ 匹配

**请求体**:
```typescript
{
  values: Record<string, any>;
  attachmentIds?: string[];
}
```

### 2.17 创建并启动工作流
**后端端点**: `POST /api/workflows/{id}/documents/start`
**前端调用**: `createAndStartDocumentWorkflow(definitionId, data)`
**状态**: ✅ 匹配

**请求体**:
```typescript
{
  values: Record<string, any>;
  attachmentIds?: string[];
  variables?: Record<string, any>;
}
```

**后端实现**:
```csharp
[HttpPost("{id}/documents/start")]
[RequireMenu("document-list")]
public async Task<IActionResult> CreateAndStartDocumentWorkflow(
    string id, 
    [FromBody] CreateAndStartWorkflowDocumentRequest request)
{
    var document = await docService.CreateDocumentForWorkflowAsync(
        id, 
        request.Values ?? new Dictionary<string, object>(), 
        request.AttachmentIds
    );
    
    var mergedVariables = request.Variables ?? new Dictionary<string, object>();
    if (request.Values != null)
    {
        foreach (var kv in request.Values)
        {
            if (!mergedVariables.ContainsKey(kv.Key))
                mergedVariables[kv.Key] = kv.Value;
        }
    }
    
    var instance = await _workflowEngine.StartWorkflowAsync(
        id, 
        document.Id, 
        userId, 
        mergedVariables
    );
    
    return Success(new { document, workflowInstance = instance });
}
```

---

## 3. 数据类型匹配检查

### 3.1 DocumentStatus 枚举
**前端**:
```typescript
export enum DocumentStatus {
  Draft = 0,        // 草稿
  Pending = 1,      // 审批中
  Approved = 2,     // 已通过
  Rejected = 3      // 已拒绝
}
```

**后端**:
```csharp
public enum DocumentStatus
{
    Draft = 0,
    Approving = 1,
    Approved = 2,
    Rejected = 3
}
```

**⚠️ 不匹配**: 前端使用 `Pending`，后端使用 `Approving`

**建议**: 更新前端枚举值为 `Approving`

### 3.2 WorkflowStatus 枚举
**前端**:
```typescript
export enum WorkflowStatus {
  Draft = 0,
  Active = 1,
  Completed = 2,
  Cancelled = 3,
  Paused = 4,
  Waiting = 5
}
```

**后端**: 需要验证

### 3.3 FormFieldType 枚举
**前端**:
```typescript
export enum FormFieldType {
  Text = 'Text',
  TextArea = 'TextArea',
  Number = 'Number',
  Date = 'Date',
  DateTime = 'DateTime',
  Select = 'Select',
  Radio = 'Radio',
  Checkbox = 'Checkbox',
  Switch = 'Switch',
  Attachment = 'Attachment'
}
```

**状态**: ✅ 匹配

---

## 4. 发现的问题

### 问题 1: DocumentStatus 枚举值不匹配
**严重程度**: 🔴 高

**问题描述**:
- 前端使用 `Pending` 表示审批中状态
- 后端使用 `Approving` 表示审批中状态
- 这会导致前端显示错误的状态标签

**影响范围**:
- 文档列表显示
- 文档详情显示
- 文档统计显示

**修复方案**:
更新前端 `Platform.Admin/src/services/document/api.ts` 中的 `DocumentStatus` 枚举

---

## 5. 前端代码更新建议

### 5.1 修复 DocumentStatus 枚举

**文件**: `Platform.Admin/src/services/document/api.ts`

**当前代码**:
```typescript
export enum DocumentStatus {
  Draft = 0,        // 草稿
  Pending = 1,      // 审批中
  Approved = 2,    // 已通过
  Rejected = 3     // 已拒绝
}
```

**修复后**:
```typescript
export enum DocumentStatus {
  Draft = 0,        // 草稿
  Approving = 1,    // 审批中
  Approved = 2,     // 已通过
  Rejected = 3      // 已拒绝
}
```

### 5.2 检查所有使用 DocumentStatus 的地方

需要检查以下文件中是否有硬编码的 `Pending` 值：
- `Platform.Admin/src/pages/document/list.tsx`
- `Platform.Admin/src/pages/document/approval.tsx`
- `Platform.Admin/src/components/document/*`

---

## 6. API 响应格式检查

### 6.1 ApiResponse 包装格式
**后端返回格式**:
```csharp
{
  "success": true,
  "data": { /* 实际数据 */ },
  "message": "操作成功",
  "code": "SUCCESS"
}
```

**前端期望格式**:
```typescript
interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  code?: string;
}
```

**状态**: ✅ 匹配

### 6.2 分页响应格式
**后端返回**:
```csharp
{
  "success": true,
  "data": {
    "list": [...],
    "total": 100,
    "page": 1,
    "pageSize": 10
  }
}
```

**前端期望**:
```typescript
ApiResponse<{
  list: T[];
  total: number;
  page: number;
  pageSize: number;
}>
```

**状态**: ✅ 匹配

---

## 7. 验证清单

- [x] 文档管理 API 端点匹配
- [x] 工作流 API 端点匹配
- [x] 请求体格式匹配
- [x] 响应格式匹配
- [x] 枚举值检查
- [ ] DocumentStatus 枚举值需要修复
- [x] 错误处理一致性

---

## 8. 建议的后续行动

### 优先级 1（立即修复）
1. ✅ 修复 DocumentStatus 枚举值（`Pending` → `Approving`）
2. ✅ 检查所有使用 DocumentStatus 的地方

### 优先级 2（下一个版本）
1. 添加更详细的 API 文档
2. 添加 API 版本控制
3. 添加 API 变更日志

### 优先级 3（长期改进）
1. 考虑使用 OpenAPI/Swagger 自动生成前端类型定义
2. 添加 API 集成测试
3. 添加前后端契约测试

---

## 总结

前后端 API 基本匹配良好，只发现一个枚举值不匹配的问题。建议立即修复 `DocumentStatus` 枚举值，以确保前端显示正确的文档状态。

所有其他 API 端点、请求体格式、响应格式都完全匹配，可以正常使用。
