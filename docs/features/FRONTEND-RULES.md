## 前端开发规范（UmiJS & Ant Design Pro）

> 本文档对 `.cursor/rules/rule.mdc` 中的前端规范进行详细展开，包含路由、services、hooks、页面结构和多语言菜单等约定。

### 1. 路由与菜单配置

- **路由文件**：`Platform.Admin/config/routes.ts`
  - 使用 Umi 路由配置定义页面路径、组件与菜单元数据。
  - 推荐为每个路由配置 `name`、`icon`、`access` 等字段，与菜单和权限联动。
- **菜单与国际化**：
  - 各语言菜单名称在 `src/locales/*/menu.ts` 中维护，key 与路由 `name`/菜单标识一致。
  - 新增页面时必须同步更新对应语言的菜单文案，保证菜单在多语言下完整。
- **与后端菜单权限的映射**：
  - 前端路由/菜单 key 应与后端菜单标识保持稳定映射关系（例如统一使用 `rule.list` 或 `rule:list` 风格）。
  - 前端**不再依赖隐藏按钮/菜单实现权限**，最终访问控制以后端 `RequireMenu` 判定为准。

### 2. 服务层封装（services）

- **统一使用 `@umijs/max` 的 `request`**：
  - 所有 HTTP 请求必须通过 `request` 封装，禁止在组件中直接 `fetch`。
  - 服务文件集中放在 `src/services/` 目录，每个领域一个文件（如 `user.ts`、`rule.ts`、`iotService.ts`）。
- **与 ApiResponse 对接**：
  - 后端返回统一的 `ApiResponse<T>`，前端应优先按 `success` / `data` / `errorMessage` 处理，而非旧的 `code` / `msg`。
  - 建议在 `request` 的拦截器或统一错误处理里集中处理 `success=false` 的情况（弹出 message、跳转登录等）。

### 3. 页面与组件结构

- **页面骨架**：
  - 列表页面推荐使用：
    - 外层：`PageContainer`（`@ant-design/pro-components`）
    - 内容：`ProTable` 或 `Table`，配合 `useRequest` 或自定义 hooks 拉取数据。
  - 表单页面推荐使用：
    - `ModalForm` / `DrawerForm` / `ProForm` / `Form` 搭配表单组件，提交通过 service 调用后端。
- **组件拆分**：
  - 复用较高的表单、列表操作栏等拆分为独立组件放在 `src/components/`，避免在页面中堆积过多逻辑。
  - UI 组件不直接调用后端 services，由页面或 hooks 层处理数据与副作用。

### 3.1 页面风格统一规范

> **强制要求**：所有列表/管理页面必须遵循以下统一风格，确保整个平台视觉和交互一致性。

#### 3.1.1 页面容器规范

- **PageContainer 设置**：
  ```tsx
  <PageContainer style={{ paddingBlock: 12 }}>
    {/* 页面内容 */}
  </PageContainer>
  ```
  - 统一使用 `paddingBlock: 12`，保持上下内边距一致
  - 禁止使用自定义 `padding` 或 `margin` 覆盖默认样式

#### 3.1.2 统计卡片区域规范

- **必须使用 StatCard 组件**：
  - 所有管理页面（任务管理、用户管理、IoT 平台子页面等）必须在页面顶部显示统计卡片
  - 使用统一的 `StatCard` 组件（位于 `src/components/StatCard.tsx`）
  
- **布局规范**：
  ```tsx
  <Card style={{ marginBottom: 16, borderRadius: 12 }}>
    <Row gutter={[12, 12]}>
      <Col xs={24} sm={12} md={6}>
        <StatCard
          title="统计项标题"
          value={statistics.value}
          icon={<IconComponent />}
          color="#1890ff"
        />
      </Col>
      {/* 更多统计卡片 */}
    </Row>
  </Card>
  ```
  - 使用 `Card` 包裹统计区域，设置 `marginBottom: 16`、`borderRadius: 12`
  - `Row` 的 `gutter` 固定为 `[12, 12]`
  - 每个统计卡片使用 `Col`，响应式断点：`xs={24} sm={12} md={6}`（移动端单列，平板两列，桌面四列）

- **StatCard 组件特性**：
  - 图标在左，数值和标题在右垂直排列
  - 卡片内边距：`10px 12px`
  - 图标尺寸：`20px`，数值字号：`20px`，标题字号：`12px`
  - 数值和标题右对齐

#### 3.1.3 表格组件规范

- **统一使用 ProTable**：
  - 所有列表页面必须使用 `ProTable`（`@ant-design/pro-components`），禁止使用普通 `Table`
  - ProTable 提供统一的搜索、排序、分页、工具栏等功能

- **ProTable 标准配置**：
  ```tsx
  <ProTable<T>
    actionRef={actionRef}
    columns={columns}
    request={fetchData}
    rowKey="id"
    search={false} // 或配置搜索表单
    toolbar={{
      actions: [
        <Button key="create" type="primary" icon={<PlusOutlined />} onClick={handleCreate}>
          新建
        </Button>,
        <Button key="refresh" icon={<ReloadOutlined />} onClick={() => actionRef.current?.reload()}>
          刷新
        </Button>,
      ],
    }}
    pagination={{
      pageSize: 20,
      pageSizeOptions: [10, 20, 50, 100],
    }}
  />
  ```

- **工具栏规范**：
  - 使用 ProTable 的 `toolbar.actions` 配置操作按钮
  - 主要操作按钮（如"新建"）使用 `type="primary"`
  - 刷新按钮使用 `icon={<ReloadOutlined />}`
  - 按钮之间保持适当间距

#### 3.1.4 操作列规范

- **操作按钮样式**：
  ```tsx
  {
    title: '操作',
    key: 'action',
    width: 150,
    fixed: 'right',
    render: (_, record) => (
      <Space size="small">
        <Button type="text" size="small" icon={<EyeOutlined />} onClick={() => handleView(record)} />
        <Button type="text" size="small" icon={<EditOutlined />} onClick={() => handleEdit(record)} />
        <Popconfirm
          title="确认删除"
          description="确定要删除此项吗？"
          onConfirm={() => handleDelete(record.id)}
          okText="确定"
          cancelText="取消"
        >
          <Button type="text" size="small" danger icon={<DeleteOutlined />} />
        </Popconfirm>
      </Space>
    ),
  }
  ```
  - 操作列固定宽度 `150px`，固定在右侧（`fixed: 'right'`）
  - 使用 `Button type="text" size="small"` 保持按钮样式一致
  - 删除操作必须使用 `Popconfirm` 确认，并设置 `danger` 属性

#### 3.1.5 页面间距规范

- **统一间距标准**：
  - `PageContainer` 上下内边距：`12px`
  - 统计卡片区域与表格之间：`16px`（通过 Card 的 `marginBottom: 16` 实现）
  - 卡片内部元素间距：使用 `gutter={[12, 12]}` 控制
  - 避免使用过大的 `margin` 或 `padding`，保持紧凑但可读的布局

#### 3.1.6 禁止使用的样式

- **禁止自定义样式类**：
  - 禁止在页面组件中使用自定义 CSS 类（如 `styles.table`、`styles.toolbar` 等）
  - 统一使用 Ant Design 和 ProComponents 提供的标准组件和样式
  - 如需自定义样式，应通过组件的 `style` 属性或 Ant Design 的 `theme` 配置实现

- **禁止使用普通 Table**：
  - 列表页面禁止使用 `Table` 组件，必须使用 `ProTable`
  - ProTable 提供更好的功能集成和统一的用户体验

#### 3.1.7 参考实现

- **标准页面结构示例**：
  ```tsx
  import { PageContainer, ProTable } from '@ant-design/pro-components';
  import { Card, Row, Col, Button, Space } from 'antd';
  import { StatCard } from '@/components';
  import type { ActionType, ProColumns } from '@ant-design/pro-components';

  const ManagementPage: React.FC = () => {
    const actionRef = useRef<ActionType>();

    return (
      <PageContainer style={{ paddingBlock: 12 }}>
        {/* 统计卡片区域 */}
        <Card style={{ marginBottom: 16, borderRadius: 12 }}>
          <Row gutter={[12, 12]}>
            <Col xs={24} sm={12} md={6}>
              <StatCard title="总数" value={100} icon={<Icon />} color="#1890ff" />
            </Col>
            {/* 更多统计卡片 */}
          </Row>
        </Card>

        {/* 数据表格 */}
        <ProTable
          actionRef={actionRef}
          columns={columns}
          request={fetchData}
          rowKey="id"
          toolbar={{
            actions: [
              <Button key="create" type="primary" icon={<PlusOutlined />}>新建</Button>,
              <Button key="refresh" icon={<ReloadOutlined />}>刷新</Button>,
            ],
          }}
        />
      </PageContainer>
    );
  };
  ```

- **已统一风格的页面**：
  - ✅ 任务管理（`src/pages/task-management/index.tsx`）
  - ✅ 用户管理（`src/pages/user-management/index.tsx`）
  - ✅ IoT 平台概览（`src/pages/iot-platform/index.tsx`）
  - ✅ 网关管理（`src/pages/iot-platform/components/GatewayManagement.tsx`）
  - ⚠️ 待统一：设备管理、数据点管理、事件管理（需要按此规范重构）

### 4. Hooks 与状态管理

- **优先使用 hooks 而非全局状态**：
  - 使用 `ahooks` 的 `useRequest` 管理请求状态（loading/error/data）和刷新逻辑。
  - 使用 Umi 的 `useModel` 管理跨页面共享状态（如当前用户信息、布局配置等）。
- **禁止过度使用第三方全局状态工具**：
  - 除非有明显的性能或架构需求，否则不引入额外的 Redux/MobX 等。

### 5. 错误处理与用户体验

- **加载状态**：
  - 表格、列表、按钮操作都应有 `loading` 状态，避免用户误以为无响应。
- **错误提示**：
  - 对于 `ApiResponse.success=false` 的情况，统一在拦截器或调用处弹出 `message.error(errorMessage)` 或 `notification.error`。
  - 表单校验错误优先使用 Ant Design 的表单校验规则，而不是在提交失败后才整体提示。

### 6. 在 Cursor Rules 总纲中的位置

- `.cursor/rules/rule.mdc` 中只保留以下前端相关**硬规则摘要**：
  - 所有 API 调用必须通过 `src/services` 中的封装 + `request`；
  - 页面结构使用 ProComponents/Ant Design 提供的标准骨架，处理好 loading/错误；
  - 路由/菜单配置与多语言菜单文件必须同步维护；
  - 不再依赖隐藏按钮实现权限，权限控制以后端为准。
  - **页面风格统一**：所有列表/管理页面必须使用 `ProTable`、`StatCard` 统计卡片、统一的 `PageContainer` 间距和布局规范（详见 3.1 节）。
- 详细约定与示例请以本文件为准。


