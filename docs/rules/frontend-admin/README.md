# Admin 前端规则

> 本目录包含 React/Ant Design Pro/UmiJS 管理后台的详细规范。

## 文件索引

| 文件 | 内容 |
|------|------|
| [`01-路由与菜单.md`](./01-路由与菜单.md) | 路由配置、菜单多语言 |
| [`02-服务层封装.md`](./02-服务层封装.md) | request 封装、ApiResponse 处理 |
| [`03-页面与组件结构.md`](./03-页面与组件结构.md) | 页面骨架、组件拆分 |
| [`04-TypeScript类型安全.md`](./04-TypeScript类型安全.md) | 禁止 any、类型定义规范 |
| [`05-页面风格统一规范.md`](./05-页面风格统一规范.md) | 页面容器、统计卡片、表格、操作列 |

## 快速参考

### 请求封装
```tsx
// ✅ 正确：使用统一 request
import { request } from '@umijs/max';
const response = await request('/api/users', { method: 'GET' });

// ❌ 禁止：直接 fetch
fetch('/api/users').then(res => res.json());
```

### 类型安全
```tsx
// ✅ 正确：定义明确类型
interface TaskFormValues {
  taskName: string;
  priority?: number;
}
const handleSubmit = async (values: TaskFormValues) => {};

// ❌ 禁止：使用 any
const handleSubmit = async (values: any) => {};
```

### 页面结构
```tsx
// ✅ 正确：统一页面结构
<PageContainer style={{ paddingBlock: 12 }}>
  <Card> {/* 统计卡片 */} </Card>
  <Card> {/* 搜索表单 */} </Card>
  <DataTable /> {/* 数据表格 */}
</PageContainer>
```

## 相关文档

- [`00-通用原则.md`](../00-通用原则.md) - 核心架构原则
- [`AGENTS.md`](../../../AGENTS.md) - 项目总纲与 AI 交互指南
