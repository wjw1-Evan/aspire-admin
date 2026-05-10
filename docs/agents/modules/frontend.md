# 前端开发规范（Admin）

> **开发标准参考**：`src/pages/password-book/index.tsx` 是所有列表页面的开发标准。

---

## 🧭 目录

- [7.1 路由与菜单](#71-路由与菜单)
- [7.2 API 端点规范](#72-api-端点规范)
- [7.3 类型安全](#73-类型安全)
- [7.4 统一 API 响应类型](#74-统一-api-响应类型)
- [7.5 列表页面关键结构](#75-列表页面关键结构)
- [7.6 表单处理规范](#76-表单处理规范)
- [7.7 错误处理规范](#77-错误处理规范)
- [7.8 国际化 (i18n)](#78-国际化-i18n)
- [7.9 统一开发标准](#79-统一开发标准)
- [7.10 已重构页面清单](#710-已重构页面清单)
- [7.11 认证与 Token 管理](#711-认证与-token-管理)
- [7.12 SSE 连接管理](#712-sse-连接管理)
- [7.13 用户体验设计要点（新增）](#713-用户体验设计要点新增)

---

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

---

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

---

## 7.3 类型安全

**[强制]** 禁止使用 `any` 类型，定义具体接口：

```typescript
interface TaskFormValues {
  taskName: string;
  priority?: number;
}
```

---

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

---

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

---

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

### 表单用户体验要点

- **失焦校验**：用户离开字段时即时校验，不打断输入流
- **提交 loading**：提交按钮自动进入 loading 状态，防止重复提交
- **保留上下文**：表单验证失败时，保留已填内容不丢失
- **智能默认值**：常用字段预填合理默认值，减少输入

---

## 7.7 错误处理规范

**[强制]** 前端显示错误信息时，必须优先使用 `errorCode` 进行 i18n 翻译：

```typescript
import { getErrorMessage } from '@/utils/getErrorMessage';
message.error(getErrorMessage(response, 'pages.xxx.operationFailed'));
```

### 用户体验层面的错误处理

| 错误场景 | 推荐处理方式 | 不推荐的处理方式 |
|---------|------------|----------------|
| 网络断开 | 显示友好提示 + 重试按钮 | 直接白屏或报 JSON 解析错误 |
| 表单提交失败 | 保留表单内容，定位到错误字段 | 清空表单让用户重新填 |
| Token 过期 | 自动刷新 Token 并重试请求 | 直接跳转登录页丢失当前操作 |
| 请求超时 | 提示"请求超时，请检查网络" | 没有任何反馈（页面卡死） |

---

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

---

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

---

## 7.10 已重构页面清单

| 页面 | 路径 | 完成项 |
|------|------|--------|
| 密码本 | `src/pages/password-book/index.tsx` | ✅ 国际化、移动端适配、统计信息 |
| 任务管理 | `src/pages/task-management/index.tsx` | ✅ ModalForm、国际化 |
| IoT 平台 | `src/pages/iot-platform/index.tsx` | ✅ 国际化、移动端适配 |
| 用户管理 | `src/pages/user-management/index.tsx` | ✅ 统一状态管理、国际化 |
| 工作流表单 | `src/pages/workflow/forms/index.tsx` | ✅ ModalForm、国际化 |
| 项目管理 | `src/pages/project-management/index.tsx` | ✅ 国际化、统计信息 |
| 云存储文件 | `src/pages/cloud-storage/files/index.tsx` | ✅ 国际化 |
| 园区租户 | `src/pages/park-management/tenant/index.tsx` | ✅ 国际化 |
| 组织架构 | `src/pages/organization/index.tsx` | ✅ 国际化 |
| 网页抓取 | `src/pages/web-scraper/index.tsx` | ✅ 国际化 |
| 分享页面 | `src/pages/share/index.tsx` | ✅ 国际化 |

---

## 7.11 认证与 Token 管理

- **Token 存储**：`localStorage`，键名 `auth_token`、`refresh_token`
- **自动刷新**：`src/utils/tokenRefreshManager.ts`，401 时自动刷新并重试
- **密码加密**：登录密码使用国密 SM2 非对称加密传输

---

## 7.12 SSE 连接管理

- **核心 Hook**：`src/hooks/useSseConnection.ts`
- **连接端点**：`/apiservice/api/stream/sse?token=<jwt>`
- **认证方式**：通过查询参数 `?token=` 传递 JWT

---

## 7.13 用户体验设计要点（新增）

### 页面状态设计原则

每个页面必须覆盖以下 5 种状态：

```tsx
// 1. 加载状态
if (loading) return <Skeleton active />;

// 2. 空状态
if (data.length === 0) return <Empty description="暂无数据" />;

// 3. 错误状态
if (error) return <Result status="error" title="加载失败" extra={<Button onClick={retry}>重试</Button>} />;

// 4. 无权限
if (!hasPermission) return <Result status="403" title="暂无权限" subTitle="请联系管理员开通" />;

// 5. 正常展示
return <ProTable dataSource={data} />;
```

### 移动端适配要点

所有列表页面必须考虑移动端显示：

| 事项 | 说明 |
|------|------|
| **响应式列数** | 窄屏时自动隐藏非关键列 |
| **触摸友好** | 按钮最小 44px，点击反馈明显 |
| **安全区域** | 适配刘海屏、底部 Home Indicator |
| **横向滚动** | 表格内容过多时允许横向滚动 |

> 参考 `src/pages/password-book/index.tsx` 中的 `responsive` 列配置。

### 操作反馈设计

| 用户操作 | 反馈方式 | 时机 |
|---------|---------|------|
| 点击按钮 | 按钮显示 loading | 立即（< 100ms） |
| 提交表单 | 按钮 loading + "提交中..." | 点击确认时 |
| 操作成功 | `message.success` + 关闭弹窗 | 接口返回时 |
| 操作失败 | 定位到错误字段 + 提示 | 接口返回时 |
| 删除确认 | `Popconfirm` 弹窗 | 点击删除时 |
| 长时间操作 | 进度条 + 百分比显示 | 超过 3s 时 |

### 常见前端用户体验反模式

```tsx
// ❌ 反模式 1：没有 loading 状态
const [data, setData] = useState([]);
useEffect(() => { fetchData().then(setData); }, []);
// 页面会先白屏，等数据加载完才突然出现

// ✅ 正确：始终有 loading
const [loading, setLoading] = useState(true);
useEffect(() => {
  setLoading(true);
  fetchData().then(setData).finally(() => setLoading(false));
}, []);

// ❌ 反模式 2：错误静默处理
try { await submit();
} catch (e) {} // 用户点了提交毫无反应

// ✅ 正确：错误一定有反馈
try { await submit();
} catch (e) { message.error(getErrorMessage(e)); }

// ❌ 反模式 3：表单提交成功后清空所有内容
// 用户需要全部重新填写

// ✅ 正确：保留一些上下文，或者提示用户下一步可以做什么
```

### 关键用户体验检查清单

开发每个页面时，问自己：

- [ ] **加载中** — 用户看到的是 Skeleton 还是白屏？
- [ ] **空状态** — 没数据时是空表格还是友好的引导？
- [ ] **出错时** — 用户知道怎么恢复吗？
- [ ] **移动端** — 手机上看布局会乱吗？
- [ ] **操作后** — 用户知道操作成功了吗？下一步去哪？
- [ ] **键盘可操作** — 能 Tab 切换字段、Enter 提交吗？
- [ ] **加载超时** — 超过 3 秒的请求有进度提示吗？
