# 前端开发规范（Admin）

> **开发标准参考**：`src/pages/password-book/index.tsx` 是所有列表页面的开发标准。

## 7.1 路由与菜单

### 菜单数据初始化

本项目采用**数据库动态菜单**机制，菜单数据存储在 MongoDB 中。

**菜单配置文件**：`Platform.DataInitializer/Menus.json`

**新增模块开发流程**：

1. 在 `Menus.json` 中添加菜单项
2. 在 `config/routes.ts` 中添加路由
3. 在 `src/locales/zh-CN/menu.ts` 中添加翻译
4. 在 `src/locales/zh-CN/modules/` 下创建模块翻译文件
5. 创建前端页面组件
6. 重启 `Platform.DataInitializer` 服务

### 路由配置规范

**[强制]** 所有业务页面路由必须配置在 `config/routes.ts` 中：

```typescript
{
  path: '/dashboard',
  routes: [
    { path: '/dashboard', component: './dashboard' },
    { path: '/dashboard/:id', component: './dashboard/[id]' },
  ],
}
```

## 7.2 API 端点规范

### 后端路由约定

```
api/xxx              - CRUD 主资源
api/xxx/list         - 分页列表
api/xxx/{id}         - 单个资源
api/xxx/statistics   - 获取统计信息
```

### 前端 API 封装

**[推荐]** 简单模块 API 直接内联在页面组件中：

```typescript
const api = {
  list: (params: any) => request<ApiResponse<PagedResult<Entry>>>('/apiservice/api/password-book/list', { params }),
  get: (id: string) => request<ApiResponse<Entry>>(`/apiservice/api/password-book/${id}`),
  create: (data: Partial<Entry>) => request<ApiResponse<Entry>>('/apiservice/api/password-book', { method: 'POST', data }),
  update: (id: string, data: Partial<Entry>) => request<ApiResponse<Entry>>(`/apiservice/api/password-book/${id}`, { method: 'PUT', data }),
  delete: (id: string) => request<ApiResponse<void>>(`/apiservice/api/password-book/${id}`, { method: 'DELETE' }),
};
```

## 7.3 类型安全

**[强制]** 禁止使用 `any` 类型，定义具体接口：

```typescript
interface TaskFormValues {
  taskName: string;
  priority?: number;
}
```

## 7.4 统一 API 响应类型

所有 API 相关类型统一定义在 `@/types/api-response.ts`：

```typescript
export interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  data?: T;
  errorCode?: string;
  errors?: any;
}

export interface PagedResult<T> {
  queryable: T[];
  currentPage: number;
  pageSize: number;
  rowCount: number;
  pageCount: number;
}
```

## 7.5 列表页面关键结构

完整代码参考 `src/pages/password-book/index.tsx`：

```typescript
// 状态管理
const [state, setState] = useState({
  formVisible: false,
  editingEntry: null as Entry | null,
});
const set = useCallback((partial: Partial<typeof state>) => setState(prev => ({ ...prev, ...partial })), []);

// 列表请求
request={async (params: any, sort: any, filter: any) => {
  const res = await api.list({ ...params, search: state.search, sort, filter });
  return { data: res.data?.queryable || [], total: res.data?.rowCount || 0, success: res.success };
}}

// 列定义
const columns: ProColumns<Entry>[] = [
  { title: '名称', dataIndex: 'name', sorter: true },
  {
    title: '操作',
    render: (_, r) => (
      <Space>
        <Button onClick={() => set({ viewingId: r.id, detailVisible: true })}>查看</Button>
        <Button onClick={() => set({ editingEntry: r, formVisible: true })}>编辑</Button>
      </Space>
    ),
  },
];
```

## 7.6 表单处理规范

使用 `@ant-design/pro-components` 的 `ModalForm` 组件：

```typescript
<ModalForm
  key={state.editingEntry?.id || 'create'}
  title={state.editingEntry ? '编辑' : '新建'}
  open={state.formVisible}
  onOpenChange={(open) => { if (!open) set({ formVisible: false, editingEntry: null }); }}
  initialValues={state.editingEntry || undefined}
  onFinish={handleFinish}
>
  <ProFormText name="name" label="名称" rules={[{ required: true }]} />
</ModalForm>
```

## 7.7 错误处理规范

**[强制]** 前端显示错误信息时，必须优先使用 `errorCode` 进行 i18n 翻译：

```typescript
import { getErrorMessage } from '@/utils/getErrorMessage';
message.error(getErrorMessage(response, 'pages.xxx.operationFailed'));
```

## 7.8 国际化 (i18n)

- **[强制]** 所有新页面必须使用 `intl.formatMessage` 替代硬编码中文文本
- 支持 18 种语言：zh-CN, zh-TW, en-US, ja-JP, ko-KR 等

```typescript
const intl = getIntl();
intl.formatMessage({ id: 'pages.xxx.title' })
```

### 翻译键命名规范

| 类型 | 命名格式 |
|------|---------|
| 页面标题 | `pages.{module}.title` |
| 表单字段 | `pages.{module}.form.{field}` |
| 按钮文本 | `pages.{module}.button.{action}` |
| 列标题 | `pages.{module}.columns.{field}` |

## 7.9 统一开发标准

> **开发标准参考**：`src/templates/StandardPageTemplate.tsx`

### 十大统一标准

| 标准项 | 说明 |
|--------|------|
| **1. 状态管理** | 使用 `useState` + `useCallback` 模式 |
| **2. 表单组件** | 统一使用 `ModalForm` |
| **3. 国际化** | 所有文本使用 `intl.formatMessage` |
| **4. 统计信息** | 页面顶部显示统计卡片 |
| **5. 详情显示** | 使用 `Drawer` + `ProDescriptions` |
| **6. 列操作** | 统一使用 `Space` + `Button` + `Popconfirm` |
| **7. 布局样式** | 使用 `ProCard` 包裹 |
| **8. API 调用** | 统一使用 `request` + `ApiResponse` 类型 |
| **9. 代码组织** | 按顺序：导入 → 类型 → API → 组件 |
| **10. 错误处理** | 使用 `getErrorMessage` 工具函数 |

## 7.10 已重构页面清单

| 页面 | 路径 | 完成项 |
|------|------|--------|
| 密码本 | `src/pages/password-book/index.tsx` | ✅ 国际化、统计信息 |
| 任务管理 | `src/pages/task-management/index.tsx` | ✅ ModalForm、国际化 |
| IoT 平台 | `src/pages/iot-platform/index.tsx` | ✅ 国际化、移动端适配 |
| 用户管理 | `src/pages/user-management/index.tsx` | ✅ 统一状态管理 |
| 工作流表单 | `src/pages/workflow/forms/index.tsx` | ✅ ModalForm、国际化 |
| 项目管理 | `src/pages/project-management/index.tsx` | ✅ 国际化、统计信息 |

## 7.11 认证与 Token 管理

- **Token 存储**：`localStorage`，键名 `auth_token`、`refresh_token`
- **自动刷新**：`src/utils/tokenRefreshManager.ts`，401 时自动刷新并重试
- **密码加密**：登录密码使用国密 SM2 非对称加密传输

## 7.12 SSE 连接管理

- **核心 Hook**：`src/hooks/useSseConnection.ts`
- **连接端点**：`/apiservice/api/stream/sse?token=<jwt>`
- **认证方式**：通过查询参数 `?token=` 传递 JWT
