# 前端开发规范（Admin）— Ant Design Pro V6

> **开发标准参考**：`src/pages/password-book/index.tsx` 是所有列表页面的开发标准。

---

## 🧭 目录

- [7.1 技术栈总览](#71-技术栈总览)
- [7.2 路由与菜单](#72-路由与菜单)
- [7.3 API 端点规范](#73-api-端点规范)
- [7.4 类型安全](#74-类型安全)
- [7.5 统一 API 响应类型](#75-统一-api-响应类型)
- [7.6 数据请求（React Query）](#76-数据请求react-query)
- [7.7 列表页面关键结构](#77-列表页面关键结构)
- [7.8 表单处理规范](#78-表单处理规范)
- [7.9 错误处理规范](#79-错误处理规范)
- [7.10 国际化 (i18n)](#710-国际化-i18n)
- [7.11 样式体系（Tailwind + antd-style）](#711-样式体系tailwind--antd-style)
- [7.12 权限管理](#712-权限管理)
- [7.13 认证与 Token 管理](#713-认证与-token-管理)
- [7.14 SSE 连接管理](#714-sse-连接管理)
- [7.15 用户体验设计要点](#715-用户体验设计要点)
- [7.16 统一开发标准](#716-统一开发标准)
- [7.17 已重构页面清单](#717-已重构页面清单)

---

## 7.1 技术栈总览

| 层 | 技术 | 版本 |
|----|------|------|
| **框架** | Umi Max | `^4.6.53` |
| **UI 库** | Ant Design | `^6.3.7` |
| **Pro 组件** | `@ant-design/pro-components` | `^3.1.12` |
| **图标** | `@ant-design/icons` | `^6.2.2` |
| **AI 组件** | `@ant-design/x` | `^2.7.0` |
| **数据请求** | `@tanstack/react-query` | `^5.100.10` |
| **样式** | Tailwind CSS (`^4.3.0`) + antd-style (`^4.1.0`) | |
| **日期** | dayjs (`^1.11.20`) | 已替换 moment |
| **代码检查** | Biome (`^2.4.15`) | 替代 ESLint + Prettier |
| **构建引擎** | utoopack（Turbopack + Rust） | |
| **React** | React 19 | 支持并发模式 |

### 导入路径规范

所有 Umi Max 相关 API 统一从 `@umijs/max` 导入：

```typescript
// ✅ 正确
import { useIntl, request, useModel, useAccess, getLocale, history } from '@umijs/max';

// ❌ 错误
import { useIntl } from 'umi';
import { request } from 'umi';
```

--- 

## 7.2 路由与菜单

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

### 路由配置规范（V6 模式）

**[强制]** 所有业务页面路由配置在 `config/routes.ts` 中，支持以下 ProLayout 路由属性：

```typescript
{
  path: '/dashboard',
  routes: [
    { path: '/dashboard', component: './dashboard' },
    { path: '/dashboard/:id', component: './dashboard/[id]' },
  ],
}
```

| 路由属性 | 类型 | 说明 |
|---------|------|------|
| `flatMenu` | boolean | 设为 true 时该项在菜单中隐藏，子项上提显示 |
| `hideChildrenInMenu` | boolean | 隐藏子菜单项 |
| `hideInMenu` | boolean | 隐藏自身和子菜单 |
| `hideInBreadcrumb` | boolean | 在面包屑中隐藏 |
| `access` | string | 权限控制，与 `src/access.ts` 配合 |
| `headerRender` | false | 不显示顶部栏 |
| `footerRender` | false | 不显示页脚 |
| `menuRender` | false | 不显示菜单 |
| `menuHeaderRender` | false | 不显示菜单标题和 logo |
| `name` | string | 自动映射为 `menu.{name}` i18n 键 |

### 数据库菜单与路由映射

后端返回的菜单树通过 `app.tsx` 的 `menuDataRender` 转换为 ProLayout 格式：

```typescript
// app.tsx 中的关键模式
menuDataRender: () => {
  const menus = initialState?.currentUser?.menus;
  if (!menus) return [];
  const orderedMenus = sortMenusByConfig(menus, menuConfig);
  return convertMenuTreeToProLayout(orderedMenus);
}
```

---

## 7.3 API 端点规范

### 后端路由约定

```
api/xxx              - CRUD 主资源
api/xxx/list         - 分页列表（部分控制器使用 /query 替代，见实际后端实现）
api/xxx/{id}         - 单个资源
api/xxx/statistics   - 获取统计信息
```

### 前端 API 封装

**[强制]** 简单模块 API 直接内联在页面组件中（参考 `password-book`），降低模块间耦合。仅当 API 逻辑复杂或被多页面复用时才抽离到 `@/services`：

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

## 7.4 类型安全

**[强制]** 禁止使用 `any` 类型，定义具体接口：

```typescript
interface TaskFormValues {
  taskName: string;
  priority?: number;
}
```

---

## 7.5 统一 API 响应类型

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

## 7.6 数据请求（React Query）

Ant Design Pro V6 使用 `@tanstack/react-query` 替代传统的 `useRequest` 模式。推荐两种方式并存：

### 方式一：ProTable 内置数据流（推荐用于列表页）

ProTable 内置数据请求，通过 `request` prop 直调，不需要专门使用 useQuery：

```typescript
<ProTable
  request={async (params, sort, filter) => {
    const res = await api.list({ ...params, search, sort, filter });
    return { data: res.data?.queryable || [], total: res.data?.rowCount || 0, success: res.success };
  }}
/>
```

### 方式二：React Query 用于非列表数据（统计、下拉选项等）

```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

// 查询
const { data: stats, isLoading } = useQuery({
  queryKey: ['passwordBook', 'statistics'],
  queryFn: () => api.statistics(),
  select: (res) => res.data,
});

// 变更（创建/更新/删除）
const queryClient = useQueryClient();
const deleteMutation = useMutation({
  mutationFn: (id: string) => api.delete(id),
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ['passwordBook'] });
    message.success('删除成功');
  },
});
```

### 方式三：传统 useState + useEffect（简单场景保留使用）

```typescript
const [data, setData] = useState<Stats | null>(null);
const [loading, setLoading] = useState(true);

useEffect(() => {
  setLoading(true);
  api.statistics()
    .then(r => { if (r.success && r.data) setData(r.data); })
    .finally(() => setLoading(false));
}, []);
```

---

## 7.7 列表页面关键结构

完整代码参考 `src/pages/password-book/index.tsx`：

```typescript
// 状态管理（局部状态）
const [state, setState] = useState({
  formVisible: false,
  editingEntry: null as Entry | null,
});
const set = useCallback((partial: Partial<typeof state>) => setState(prev => ({ ...prev, ...partial })), []);

// 响应式布局
const screens = useBreakpoint();
const isMobile = !screens.md;

// 列表请求（ProTable 内置）
<ProTable
  request={async (params: any, sort: any, filter: any) => {
    const res = await api.list({ ...params, search: state.search, sort, filter });
    return { data: res.data?.queryable || [], total: res.data?.rowCount || 0, success: res.success };
  }}
/>

// 列定义
const columns: ProColumns<Entry>[] = [
  { title: '名称', dataIndex: 'name', sorter: true },
  {
    title: '操作',
    valueType: 'option',
    fixed: 'right',
    width: 180,
    render: (_, r) => (
      <Space size={4}>
        <Button type="link" size="small" icon={<EditOutlined />} onClick={() => set({ editingEntry: r, formVisible: true })}>编辑</Button>
        <Popconfirm title="确认删除？" onConfirm={handleDelete}>
          <Button type="link" size="small" danger icon={<DeleteOutlined />}>删除</Button>
        </Popconfirm>
      </Space>
    ),
  },
];
```

---

## 7.8 表单处理规范

使用 `@ant-design/pro-components` 的 `ModalForm` 组件（ProComponents v3）：

```typescript
<ModalForm
  key={state.editingEntry?.id || 'create'}
  title={state.editingEntry ? '编辑' : '新建'}
  open={state.formVisible}
  onOpenChange={(open) => { if (!open) set({ formVisible: false, editingEntry: null }); }}
  initialValues={state.editingEntry || undefined}
  onFinish={handleFinish}
  autoFocusFirstInput
  width={600}
>
  <ProFormText name="name" label="名称" rules={[{ required: true }]} />
</ModalForm>
```

### 表单用户体验要点

- **失焦校验**：用户离开字段时即时校验，不打断输入流
- **提交 loading**：`ModalForm` 提交按钮自动进入 loading 状态，防止重复提交
- **保留上下文**：表单验证失败时，保留已填内容不丢失
- **智能默认值**：常用字段预填合理默认值，减少输入

---

## 7.9 错误处理规范

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
| Chunk 加载失败 | 显示重试提示（V6 内置自动重试） | 白屏 |

---

## 7.10 国际化 (i18n)

- **[强制]** 所有新页面必须使用 `useIntl` 替代硬编码中文文本
- **[强制]** 使用 `@umijs/max` 的 `useIntl` Hook 而非 `getIntl()`
- 支持 18 种语言：zh-CN, zh-TW, en-US, ja-JP, ko-KR 等

```typescript
const intl = useIntl();
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

## 7.11 样式体系（Tailwind + antd-style）

Ant Design Pro V6 使用**三件套**样式体系，按优先级排列：

| 方案 | 用途 | 示例 |
|------|------|------|
| **Tailwind CSS v4** | 布局、间距、排版原子样式 | `className="flex items-center gap-2"` |
| **antd-style v4** | 消费 Ant Design Token 的动态样式 | `const { styles, cx } = useStyles();` |
| **CSS Modules** | 组件级样式隔离 | `import styles from './index.module.css';` |

```tsx
// Tailwind 布局示例
<div className="flex items-center justify-between p-4">
  <span className="text-lg font-semibold">标题</span>
  <Space>
    <Button type="primary">新建</Button>
  </Space>
</div>

// antd-style 动态主题样式
import { createStyles } from 'antd-style';
const useStyles = createStyles(({ token }) => ({
  card: {
    background: token.colorBgContainer,
    borderRadius: token.borderRadiusLG,
    padding: token.paddingLG,
  },
}));
const { styles } = useStyles();
<div className={styles.card}>内容</div>
```

---

## 7.12 权限管理

### Access 模式

使用 `@umijs/max` 的 `useAccess` Hook + `src/access.ts` 定义：

```typescript
// src/access.ts
export default function access(initialState) {
  const { currentUser } = initialState ?? {};
  return {
    adminAccess: currentUser?.access === 'admin',
    canAdmin: currentUser?.roles?.includes('管理员') ?? false,
    canAccessMenu: (menuId: string) => { /* ... */ },
    canAccessPath: (path: string) => { /* ... */ },
    hasRole: (roleName: string) => currentUser?.roles?.includes(roleName) ?? false,
  };
}

// 页面中使用
import { useAccess } from '@umijs/max';
const access = useAccess();
if (access.canAdmin) { /* 显示管理功能 */ }
```

### 菜单权限

后端返回的菜单树通过 `menuDataRender` 过滤 `hideInMenu` 项，用户仅能看到有权限的菜单。

---

## 7.13 认证与 Token 管理

- **Token 存储**：`localStorage`，键名 `auth_token`、`refresh_token`
- **自动刷新**：`src/utils/tokenRefreshManager.ts`，401 时自动刷新并重试
- **密码加密**：登录密码使用国密 SM2 非对称加密传输
- **Token 过期处理**：`app.tsx` 的 `request.responseInterceptors` 中统一处理

---

## 7.14 SSE 连接管理

- **核心 Hook**：`src/hooks/useSseConnection.ts`
- **连接端点**：`/apiservice/api/stream/sse?token=<jwt>`
- **认证方式**：通过查询参数 `?token=` 传递 JWT

---

## 7.15 用户体验设计要点

### 页面状态设计原则

每个页面必须覆盖以下 5 种状态：

```tsx
// 1. 加载状态（可使用顶层 loading.tsx 骨架屏）
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

| 事项 | 说明 |
|------|------|
| **响应式列数** | 窄屏时自动隐藏非关键列，使用 `responsive` 属性 |
| **触摸友好** | 按钮最小 44px，点击反馈明显 |
| **安全区域** | 适配刘海屏、底部 Home Indicator |
| **横向滚动** | 表格 `scroll={{ x: 'max-content' }}` 允许横向滚动 |

### 操作反馈设计

| 用户操作 | 反馈方式 | 时机 |
|---------|---------|------|
| 点击按钮 | 按钮显示 loading | 立即（< 100ms） |
| 提交表单 | 按钮 loading + "提交中..." | 点击确认时 |
| 操作成功 | `message.success` + 关闭弹窗 | 接口返回时 |
| 操作失败 | 定位到错误字段 + 提示 | 接口返回时 |
| 删除确认 | `Popconfirm` 弹窗 | 点击删除时 |
| 网络断开 | V6 内置状态提示横幅 | 检测到离线时 |

### 关键检查清单

- [ ] **加载中** — 看到 Skeleton 还是白屏？
- [ ] **空状态** — 空表格还是友好引导？
- [ ] **出错时** — 用户知道怎么恢复吗？
- [ ] **移动端** — 手机布局不乱？
- [ ] **操作后** — 知道操作成功了吗？下一步去哪？
- [ ] **键盘可操作** — Tab 切换、Enter 提交？
- [ ] **加载超时** — 3s+ 请求有进度提示？

---

## 7.16 统一开发标准

> **开发标准参考**：`src/templates/StandardPageTemplate.tsx`

### 十大统一标准

| # | 标准项 | 说明 |
|---|--------|------|
| **1** | **状态管理** | `useState` + `useCallback` 局部状态模式 |
| **2** | **表单组件** | 统一使用 `ModalForm`（ProComponents v3） |
| **3** | **国际化** | 所有文本使用 `useIntl` Hook |
| **4** | **统计信息** | 页面顶部显示统计卡片或 Tags |
| **5** | **详情显示** | 使用 `Drawer` + `ProDescriptions` |
| **6** | **列操作** | 统一 `Space size={4}` + `Button` + `Popconfirm` |
| **7** | **布局样式** | Tailwind 布局 + `PageContainer` 包裹 |
| **8** | **API 调用** | 统一 `request` + `ApiResponse` 类型，推荐 `@tanstack/react-query` |
| **9** | **代码组织** | 按序：导入 → 类型 → API → 组件 |
| **10** | **错误处理** | 使用 `getErrorMessage` 工具函数 |

### 导入路径映射速查

| 功能 | V6 导入路径 |
|------|------------|
| React | `import React from 'react'` |
| Umi 运行时 | `import { request, useIntl, useModel, useAccess, history } from '@umijs/max'` |
| Ant Design | `import { Button, Space, Tag, Popconfirm, App } from 'antd'` |
| Pro 组件 | `import { ProTable, ModalForm, ProFormText, ProDescriptions, PageContainer, ProCard } from '@ant-design/pro-components'` |
| 图标 | `import { EditOutlined, DeleteOutlined } from '@ant-design/icons'` |
| React Query | `import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'` |
| dayjs | `import dayjs from 'dayjs'` |
| 响应式 | `const screens = Grid.useBreakpoint()` |

---

## 7.17 已重构页面清单

> 完整清单见 [AGENTS.md - 相关代码位置](../../AGENTS.md#3-相关代码位置)。
