# 管理后台页面布局统一规范

## 📋 概览

本文档定义了 Platform.Admin 管理后台的页面布局统一标准，确保所有页面具有一致的用户体验和视觉风格。

**更新日期**: 2025-10-11  
**状态**: ✅ 已实施

## 🎯 布局统一前后对比

### ❌ 修复前的问题

| 页面 | PageContainer | 页面标题位置 | 子标题 | 问题 |
|-----|--------------|------------|--------|------|
| 用户管理 | ✅ | PageContainer | ✅ | 完整 |
| 角色管理 | ❌ | ProTable headerTitle | ❌ | 缺少页面容器 |
| 菜单管理 | ❌ | ProTable headerTitle | ❌ | 缺少页面容器 |
| 权限管理 | ✅ | PageContainer | ✅ | 完整 |
| 用户日志 | ❌ | ProTable headerTitle | ❌ | 缺少页面容器 |

### ✅ 统一后的效果

| 页面 | PageContainer | 页面标题位置 | 子标题 | 状态 |
|-----|--------------|------------|--------|------|
| 用户管理 | ✅ | PageContainer | ✅ | ✅ 统一 |
| 角色管理 | ✅ | PageContainer | ✅ | ✅ 统一 |
| 菜单管理 | ✅ | PageContainer | ✅ | ✅ 统一 |
| 权限管理 | ✅ | PageContainer | ✅ | ✅ 统一 |
| 用户日志 | ✅ | PageContainer | ✅ | ✅ 统一 |

## 📐 标准布局结构

### 1. 基础列表页面布局

所有列表页面必须遵循以下结构：

```tsx
import { PageContainer, ProTable } from '@ant-design/pro-components';

const YourManagement: React.FC = () => {
  return (
    <PageContainer
      header={{
        title: '页面标题',
        subTitle: '页面副标题/描述',
      }}
    >
      <ProTable
        // ProTable 配置
        actionRef={actionRef}
        rowKey="id"
        columns={columns}
        // 不再需要 headerTitle，因为已经在 PageContainer 中定义
      />
    </PageContainer>
  );
};
```

### 2. 带统计卡片的页面布局

对于需要显示统计数据的页面：

```tsx
import { PageContainer, ProCard, ProTable } from '@ant-design/pro-components';
import { Row, Col, Statistic } from 'antd';

const YourManagement: React.FC = () => {
  return (
    <PageContainer
      header={{
        title: '页面标题',
        subTitle: '页面副标题/描述',
      }}
    >
      {/* 统计卡片 */}
      <ProCard
        style={{ marginBottom: 16 }}
        ghost
        gutter={16}
      >
        <Row gutter={16}>
          <Col span={6}>
            <Statistic title="总数" value={totalCount} />
          </Col>
          <Col span={6}>
            <Statistic title="活跃" value={activeCount} />
          </Col>
          {/* 更多统计... */}
        </Row>
      </ProCard>

      {/* 数据表格 */}
      <ProTable
        actionRef={actionRef}
        rowKey="id"
        columns={columns}
      />
    </PageContainer>
  );
};
```

### 3. 带自定义内容的页面布局

对于非表格页面（如权限管理）：

```tsx
import { PageContainer, ProCard } from '@ant-design/pro-components';

const YourManagement: React.FC = () => {
  return (
    <PageContainer
      header={{
        title: '页面标题',
        subTitle: '页面副标题/描述',
      }}
    >
      <ProCard>
        {/* 自定义内容 */}
        <YourCustomContent />
      </ProCard>
    </PageContainer>
  );
};
```

## 📝 具体实施案例

### 案例 1: 角色管理页面

**修改前**：
```tsx
// ❌ 不规范：直接使用 ProTable，没有 PageContainer
const RoleManagement: React.FC = () => {
  return (
    <>
      <ProTable<Role>
        headerTitle="角色管理"  // 标题在 ProTable 中
        // ...
      />
      {/* Modals... */}
    </>
  );
};
```

**修改后**：
```tsx
// ✅ 规范：使用 PageContainer 包裹
const RoleManagement: React.FC = () => {
  return (
    <PageContainer
      header={{
        title: '角色管理',
        subTitle: '系统角色配置和权限管理',
      }}
    >
      <ProTable<Role>
        // headerTitle 已移除，标题在 PageContainer 中
        actionRef={actionRef}
        // ...
      />
      {/* Modals 仍在 PageContainer 内部... */}
    </PageContainer>
  );
};
```

### 案例 2: 菜单管理页面

**修改内容**：
- 添加 `PageContainer` 导入
- 移除 `ProTable` 的 `headerTitle` 属性
- 添加页面标题和副标题

```diff
- import { ProTable, ActionType, ProColumns } from '@ant-design/pro-components';
+ import { PageContainer, ProTable, ActionType, ProColumns } from '@ant-design/pro-components';

  return (
+   <PageContainer
+     header={{
+       title: '菜单管理',
+       subTitle: '系统菜单配置和层级管理',
+     }}
+   >
      <ProTable<MenuTreeNode>
-       headerTitle="菜单管理"
        actionRef={actionRef}
        // ...
      />
+   </PageContainer>
  );
```

### 案例 3: 用户日志页面

**修改内容**：
- 添加 `PageContainer` 包裹
- 提供清晰的页面描述

```diff
- import { ProTable, ActionType, ProColumns } from '@ant-design/pro-components';
+ import { PageContainer, ProTable, ActionType, ProColumns } from '@ant-design/pro-components';

  return (
+   <PageContainer
+     header={{
+       title: '用户操作日志',
+       subTitle: '系统用户活动记录和审计日志',
+     }}
+   >
      <ProTable<UserActivityLog>
-       headerTitle="用户操作日志"
        actionRef={actionRef}
        // ...
      />
+   </PageContainer>
  );
```

## 🎨 布局元素规范

### PageContainer Header

| 属性 | 类型 | 必需 | 说明 | 示例 |
|-----|------|------|------|------|
| title | string | ✅ | 页面主标题，简洁明了 | "用户管理" |
| subTitle | string | ✅ | 页面副标题，提供详细说明 | "系统用户账号管理和权限配置" |

**标题命名规范**：
- **主标题**: 2-6 个字，清晰表达页面功能
  - ✅ "用户管理"、"角色管理"、"权限管理"
  - ❌ "用户"、"管理用户的页面"

- **副标题**: 10-20 个字，描述页面具体功能
  - ✅ "系统用户账号管理和权限配置"
  - ❌ "管理"、"这是一个用于管理系统用户账号的页面"

### ProTable 配置

当使用 `PageContainer` 后，`ProTable` 的配置要点：

```tsx
<ProTable
  // ❌ 不要再使用 headerTitle
  // headerTitle="用户管理"
  
  // ✅ 必需配置
  actionRef={actionRef}      // 操作引用
  rowKey="id"                // 行唯一键
  columns={columns}          // 列定义
  request={loadData}         // 数据请求
  
  // ✅ 可选配置
  search={false}             // 是否显示搜索表单
  pagination={...}           // 分页配置
  toolBarRender={() => [...]} // 工具栏按钮
/>
```

## 📦 完整页面清单

| 页面路径 | 页面名称 | 标题 | 副标题 | 状态 |
|---------|---------|------|--------|------|
| `/system/user-management` | 用户管理 | 用户管理 | 系统用户账号管理和权限配置 | ✅ |
| `/system/role-management` | 角色管理 | 角色管理 | 系统角色配置和权限管理 | ✅ |
| `/system/menu-management` | 菜单管理 | 菜单管理 | 系统菜单配置和层级管理 | ✅ |
| `/system/permission-management` | 权限管理 | 权限管理 | 系统权限配置和管理 | ✅ |
| `/system/user-log` | 用户日志 | 用户操作日志 | 系统用户活动记录和审计日志 | ✅ |
| `/account/center` | 个人中心 | 个人中心 | 用户个人信息和活动记录 | ⚠️ 已有但可优化 |

## 🚫 常见错误和避免方法

### ❌ 错误 1: 直接使用 ProTable 而不包裹 PageContainer

```tsx
// ❌ 错误
const UserManagement: React.FC = () => {
  return (
    <ProTable
      headerTitle="用户管理"
      // ...
    />
  );
};
```

```tsx
// ✅ 正确
const UserManagement: React.FC = () => {
  return (
    <PageContainer
      header={{
        title: '用户管理',
        subTitle: '系统用户账号管理和权限配置',
      }}
    >
      <ProTable
        // ...
      />
    </PageContainer>
  );
};
```

### ❌ 错误 2: ProTable 和 PageContainer 同时设置标题

```tsx
// ❌ 错误：标题重复
<PageContainer
  header={{
    title: '用户管理',
    subTitle: '描述',
  }}
>
  <ProTable
    headerTitle="用户管理"  // 重复！
    // ...
  />
</PageContainer>
```

```tsx
// ✅ 正确：只在 PageContainer 设置标题
<PageContainer
  header={{
    title: '用户管理',
    subTitle: '描述',
  }}
>
  <ProTable
    // 不设置 headerTitle
    // ...
  />
</PageContainer>
```

### ❌ 错误 3: Modal 组件位置错误

```tsx
// ❌ 错误：Modal 在 PageContainer 外部
const Management: React.FC = () => {
  return (
    <>
      <PageContainer>
        <ProTable />
      </PageContainer>
      <Modal />  {/* 错误位置 */}
    </>
  );
};
```

```tsx
// ✅ 正确：Modal 在 PageContainer 内部
const Management: React.FC = () => {
  return (
    <PageContainer>
      <ProTable />
      <Modal />  {/* 正确位置 */}
    </PageContainer>
  );
};
```

## 🔧 实施步骤

### 对于新页面

1. **导入必要组件**
   ```tsx
   import { PageContainer, ProTable } from '@ant-design/pro-components';
   ```

2. **创建标准布局结构**
   ```tsx
   return (
     <PageContainer header={{ title: '...', subTitle: '...' }}>
       <ProTable {...config} />
     </PageContainer>
   );
   ```

3. **验证布局**
   - 检查页面标题和副标题是否正确显示
   - 确认面包屑导航是否正常
   - 验证响应式布局是否正常

### 对于现有页面

1. **检查当前布局**
   - 是否使用了 `PageContainer`？
   - `ProTable` 是否有 `headerTitle`？

2. **添加 PageContainer**
   ```tsx
   // 在组件导入中添加
   import { PageContainer, ... } from '@ant-design/pro-components';
   
   // 包裹现有内容
   return (
     <PageContainer header={{ ... }}>
       {/* 现有内容 */}
     </PageContainer>
   );
   ```

3. **移除重复标题**
   ```tsx
   // 移除 ProTable 的 headerTitle
   <ProTable
     // headerTitle="..." // 删除这一行
     {...otherProps}
   />
   ```

4. **测试验证**
   - 重新构建: `npm run build`
   - 检查页面显示
   - 验证功能正常

## 📊 布局统一的好处

### 1. 用户体验统一 ✨
- 所有页面具有一致的视觉层次
- 用户可以快速识别页面功能
- 降低学习成本

### 2. 代码可维护性提高 🔧
- 标准化的组件结构
- 更容易理解和修改
- 减少重复代码

### 3. SEO 和可访问性优化 ♿
- 清晰的页面标题结构
- 更好的语义化标签
- 支持屏幕阅读器

### 4. 响应式设计改善 📱
- `PageContainer` 自动处理响应式布局
- 在不同屏幕尺寸下保持一致性
- 移动端体验更好

## 🎯 检查清单

在提交页面代码前，请确认：

- [ ] 页面使用了 `PageContainer` 作为最外层容器
- [ ] `PageContainer` 的 `header` 包含 `title` 和 `subTitle`
- [ ] 标题简洁明了（2-6个字）
- [ ] 副标题描述清晰（10-20个字）
- [ ] `ProTable` 不包含 `headerTitle` 属性
- [ ] Modal、Drawer 等组件在 `PageContainer` 内部
- [ ] 代码通过 Biome 格式化检查
- [ ] 页面在不同屏幕尺寸下显示正常

## 📚 相关资源

- [Ant Design Pro - PageContainer](https://procomponents.ant.design/components/page-container)
- [Ant Design Pro - ProTable](https://procomponents.ant.design/components/table)
- [项目组件开发规范](mdc:Platform.Admin/README.md)
- [Ant Design Pro 开发规范](.cursor/rules/antd-pro-umi.md)

## 🔄 变更日志

### 2025-10-11
- ✅ 统一所有系统管理页面布局
- ✅ 修复角色管理、菜单管理、用户日志页面布局
- ✅ 创建布局统一规范文档
- ✅ 所有页面使用标准 `PageContainer` 结构

### 未来计划
- [ ] 为统计密集型页面添加统一的卡片布局
- [ ] 优化个人中心页面布局
- [ ] 添加页面加载动画统一标准
- [ ] 创建布局组件库

---

**文档版本**: 1.0  
**最后更新**: 2025-10-11  
**维护者**: Aspire Admin Team  
**状态**: ✅ 已实施并验证

