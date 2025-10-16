# 📦 组件优化和拆分指南

## 🎯 优化目标

- 单个组件文件不超过 300 行
- 提高组件复用性
- 提升渲染性能
- 改善代码可维护性

---

## 🔧 组件拆分策略

### 1. 大型组件识别

**需要拆分的信号**:
- ✅ 文件超过 300 行
- ✅ 包含多个独立的功能模块
- ✅ State 数量超过 10 个
- ✅ 有重复的 UI 模式

**当前需要拆分的组件**:
- `pages/user-management/index.tsx` (600+ 行)
- `pages/role-management/index.tsx` (500+ 行)

### 2. 拆分原则

#### 按功能拆分

```tsx
// Before: 一个大组件
const UserManagement = () => {
  // 统计卡片逻辑 (50 行)
  // 搜索表单逻辑 (80 行)
  // 表格逻辑 (200 行)
  // 表单逻辑 (150 行)
  // 详情抽屉逻辑 (100 行)
  return (/* 600+ 行 JSX */);
};

// After: 拆分为多个子组件
const UserManagement = () => {
  return (
    <PageContainer>
      <UserStatistics />
      <UserSearchForm />
      <UserTable />
      <UserFormModal />
      <UserDetailDrawer />
    </PageContainer>
  );
};
```

#### 提取统计卡片

**文件**: `components/UserStatistics.tsx`

```tsx
import React from 'react';
import { Card, Statistic, Row, Col } from 'antd';
import { UserOutlined, TeamOutlined, CheckCircleOutlined } from '@ant-design/icons';
import type { UserStatisticsResponse } from '../types';

interface UserStatisticsProps {
  statistics: UserStatisticsResponse | null;
  loading?: boolean;
}

/**
 * 用户统计卡片组件
 */
const UserStatistics: React.FC<UserStatisticsProps> = ({ statistics, loading }) => {
  return (
    <Card loading={loading} style={{ marginBottom: 16 }}>
      <Row gutter={16}>
        <Col span={6}>
          <Statistic
            title="总用户数"
            value={statistics?.totalUsers || 0}
            prefix={<UserOutlined />}
          />
        </Col>
        <Col span={6}>
          <Statistic
            title="活跃用户"
            value={statistics?.activeUsers || 0}
            prefix={<CheckCircleOutlined />}
            valueStyle={{ color: '#52c41a' }}
          />
        </Col>
        <Col span={6}>
          <Statistic
            title="管理员"
            value={statistics?.adminUsers || 0}
            prefix={<TeamOutlined />}
            valueStyle={{ color: '#1890ff' }}
          />
        </Col>
        <Col span={6}>
          <Statistic
            title="普通用户"
            value={statistics?.normalUsers || 0}
            prefix={<UserOutlined />}
          />
        </Col>
      </Row>
    </Card>
  );
};

export default React.memo(UserStatistics);
```

#### 提取搜索表单

**文件**: `components/UserSearchForm.tsx`

```tsx
import React from 'react';
import { Form, Input, Select, DatePicker, Button, Space } from 'antd';
import { SearchOutlined, ReloadOutlined } from '@ant-design/icons';
import type { Role } from '@/services/role/api';

const { RangePicker } = DatePicker;

interface UserSearchFormProps {
  roles: Role[];
  onSearch: (values: any) => void;
  onReset: () => void;
  loading?: boolean;
}

/**
 * 用户搜索表单组件
 */
const UserSearchForm: React.FC<UserSearchFormProps> = ({
  roles,
  onSearch,
  onReset,
  loading,
}) => {
  const [form] = Form.useForm();

  const handleReset = () => {
    form.resetFields();
    onReset();
  };

  return (
    <Form form={form} onFinish={onSearch} layout="inline" style={{ marginBottom: 16 }}>
      <Form.Item name="search" label="搜索">
        <Input placeholder="用户名或邮箱" style={{ width: 200 }} />
      </Form.Item>
      
      <Form.Item name="roleIds" label="角色">
        <Select
          mode="multiple"
          placeholder="选择角色"
          style={{ width: 200 }}
          allowClear
        >
          {roles.map(role => (
            <Select.Option key={role.id} value={role.id}>
              {role.name}
            </Select.Option>
          ))}
        </Select>
      </Form.Item>
      
      <Form.Item name="dateRange" label="创建时间">
        <RangePicker />
      </Form.Item>
      
      <Form.Item name="isActive" label="状态">
        <Select placeholder="全部" style={{ width: 120 }} allowClear>
          <Select.Option value={true}>启用</Select.Option>
          <Select.Option value={false}>禁用</Select.Option>
        </Select>
      </Form.Item>
      
      <Form.Item>
        <Space>
          <Button type="primary" htmlType="submit" icon={<SearchOutlined />} loading={loading}>
            搜索
          </Button>
          <Button onClick={handleReset} icon={<ReloadOutlined />}>
            重置
          </Button>
        </Space>
      </Form.Item>
    </Form>
  );
};

export default React.memo(UserSearchForm);
```

#### 提取表格操作列

**文件**: `components/UserTableActions.tsx`

```tsx
import React from 'react';
import { Space, Dropdown, Button } from 'antd';
import type { MenuProps } from 'antd';
import { EditOutlined, DeleteOutlined, KeyOutlined, MoreOutlined } from '@ant-design/icons';
import PermissionControl from '@/components/PermissionControl';
import type { AppUser } from '../types';

interface UserTableActionsProps {
  record: AppUser;
  onEdit: (user: AppUser) => void;
  onDelete: (user: AppUser) => void;
  onPermission: (user: AppUser) => void;
  onViewDetail: (user: AppUser) => void;
}

/**
 * 用户表格操作列组件
 */
const UserTableActions: React.FC<UserTableActionsProps> = ({
  record,
  onEdit,
  onDelete,
  onPermission,
  onViewDetail,
}) => {
  const menuItems: MenuProps['items'] = [
    {
      key: 'detail',
      label: '查看详情',
      onClick: () => onViewDetail(record),
    },
    {
      key: 'permission',
      label: (
        <PermissionControl resource="user" action="update">
          <span>配置权限</span>
        </PermissionControl>
      ),
      icon: <KeyOutlined />,
      onClick: () => onPermission(record),
    },
  ];

  return (
    <Space size="small">
      <PermissionControl resource="user" action="update">
        <Button
          type="link"
          size="small"
          icon={<EditOutlined />}
          onClick={() => onEdit(record)}
        >
          编辑
        </Button>
      </PermissionControl>
      
      <PermissionControl resource="user" action="delete">
        <Button
          type="link"
          size="small"
          danger
          icon={<DeleteOutlined />}
          onClick={() => onDelete(record)}
        >
          删除
        </Button>
      </PermissionControl>
      
      <Dropdown menu={{ items: menuItems }} placement="bottomRight">
        <Button type="link" size="small" icon={<MoreOutlined />} />
      </Dropdown>
    </Space>
  );
};

export default React.memo(UserTableActions);
```

---

## ⚡ 性能优化策略

### 1. React.memo 优化

**何时使用**:
- 纯展示组件
- Props 不经常变化
- 渲染成本较高

**示例**:

```tsx
// 优化前
const UserCard: React.FC<UserCardProps> = ({ user, onEdit }) => {
  return (
    <Card>
      <h3>{user.name}</h3>
      <Button onClick={() => onEdit(user)}>编辑</Button>
    </Card>
  );
};

// 优化后
const UserCard: React.FC<UserCardProps> = React.memo(({ user, onEdit }) => {
  return (
    <Card>
      <h3>{user.name}</h3>
      <Button onClick={() => onEdit(user)}>编辑</Button>
    </Card>
  );
});
```

### 2. useCallback 优化

**何时使用**:
- 作为 props 传递给子组件的函数
- 作为 useEffect 的依赖项
- 在自定义 Hook 中返回的函数

**示例**:

```tsx
// 优化前
const handleEdit = (user: User) => {
  setEditingUser(user);
  setFormVisible(true);
};

<UserCard user={user} onEdit={handleEdit} />

// 优化后
const handleEdit = useCallback((user: User) => {
  setEditingUser(user);
  setFormVisible(true);
}, []);

<UserCard user={user} onEdit={handleEdit} />
```

### 3. useMemo 优化

**何时使用**:
- 计算成本较高的值
- 用于渲染的派生状态
- 复杂的数据转换

**示例**:

```tsx
// 优化前
const columns: ProColumns<User>[] = [
  {
    title: '用户名',
    dataIndex: 'username',
    render: (text, record) => {
      const roleNames = record.roleIds
        ?.map(id => roleMap[id])
        .filter(Boolean)
        .join(', ');
      return <span>{text} ({roleNames})</span>;
    },
  },
];

// 优化后
const columns: ProColumns<User>[] = useMemo(() => [
  {
    title: '用户名',
    dataIndex: 'username',
    render: (text, record) => {
      const roleNames = record.roleIds
        ?.map(id => roleMap[id])
        .filter(Boolean)
        .join(', ');
      return <span>{text} ({roleNames})</span>;
    },
  },
], [roleMap]);
```

### 4. 避免内联对象和数组

```tsx
// ❌ Bad - 每次渲染都创建新对象
<UserCard 
  user={user} 
  style={{ padding: 16 }} 
  actions={['edit', 'delete']}
/>

// ✅ Good - 提取到组件外部或使用 useMemo
const cardStyle = { padding: 16 };
const actions = ['edit', 'delete'];

<UserCard user={user} style={cardStyle} actions={actions} />
```

---

## 📋 优化检查清单

### 组件拆分检查

- [ ] 单个组件文件不超过 300 行
- [ ] 每个组件只负责一个功能
- [ ] 可复用的部分已提取为独立组件
- [ ] 组件 Props 类型完整定义

### 性能优化检查

- [ ] 纯展示组件使用 React.memo
- [ ] 回调函数使用 useCallback
- [ ] 计算值使用 useMemo
- [ ] 避免内联对象和数组
- [ ] 列表渲染有正确的 key

### 代码质量检查

- [ ] 使用公共组件和 Hooks
- [ ] TypeScript 类型完整
- [ ] 有必要的注释
- [ ] 遵循命名规范

---

## 🎯 实施建议

### 优先级

1. **高优先级** - 立即执行
   - 提取公共组件（DeleteConfirmModal, BulkActionModal）✅
   - 提取自定义 Hooks（useDeleteConfirm, useBulkAction）✅
   - 使用常量替代魔法字符串 ✅

2. **中优先级** - 逐步实施
   - 拆分超大组件（> 600 行）
   - 添加 React.memo 优化
   - 添加 useCallback 优化

3. **低优先级** - 可选优化
   - 更细粒度的组件拆分
   - 虚拟滚动等高级优化
   - 代码分割和懒加载

### 实施步骤

1. **评估现有组件**
   ```bash
   # 查找超过 300 行的组件
   find Platform.Admin/src/pages -name "*.tsx" -exec wc -l {} \; | sort -nr
   ```

2. **识别可拆分的部分**
   - 统计卡片
   - 搜索表单
   - 表格列定义
   - 操作按钮组
   - 对话框和抽屉

3. **逐步拆分**
   - 一次拆分一个功能模块
   - 测试拆分后的功能
   - 提交代码并文档化

4. **性能优化**
   - 添加 React.memo
   - 使用 useCallback
   - 使用 useMemo
   - 验证优化效果

---

## 📖 示例：UserManagement 拆分方案

### 原组件结构 (600+ 行)

```tsx
const UserManagement: React.FC = () => {
  // 50+ 行 State 定义
  // 100+ 行 Effect 和事件处理
  // 200+ 行 列定义
  // 250+ 行 JSX 渲染
};
```

### 拆分后结构 (主文件 200 行)

```tsx
// pages/user-management/index.tsx
import UserStatistics from './components/UserStatistics';
import UserSearchForm from './components/UserSearchForm';
import UserTable from './components/UserTable';
import UserFormModal from './components/UserFormModal';

const UserManagement: React.FC = () => {
  // 使用自定义 Hooks 管理状态
  const { users, loading, fetchUsers } = useUserList();
  const { statistics } = useUserStatistics();
  const deleteConfirm = useDeleteConfirm({
    onSuccess: () => fetchUsers(),
  });

  return (
    <PageContainer>
      <UserStatistics statistics={statistics} />
      <UserSearchForm onSearch={fetchUsers} />
      <UserTable 
        dataSource={users}
        loading={loading}
        onDelete={deleteConfirm.showConfirm}
      />
      <DeleteConfirmModal {...deleteConfirm} />
    </PageContainer>
  );
};
```

### 子组件文件

```
pages/user-management/
├── index.tsx (200 行) - 主组件
├── components/
│   ├── UserStatistics.tsx (80 行) - 统计卡片
│   ├── UserSearchForm.tsx (100 行) - 搜索表单
│   ├── UserTable.tsx (150 行) - 数据表格
│   └── UserFormModal.tsx (120 行) - 表单对话框
└── hooks/
    ├── useUserList.ts (60 行) - 用户列表逻辑
    └── useUserStatistics.ts (40 行) - 统计数据逻辑
```

---

## 🎨 性能优化实例

### 优化表格列定义

```tsx
// Before: 每次渲染都重新创建
const MyTable = () => {
  const columns = [
    {
      title: '用户名',
      dataIndex: 'username',
    },
    // ... 更多列
  ];
  
  return <ProTable columns={columns} />;
};

// After: 使用 useMemo 缓存
const MyTable = () => {
  const columns = useMemo<ProColumns<User>[]>(() => [
    {
      title: '用户名',
      dataIndex: 'username',
    },
    // ... 更多列
  ], []);  // 空依赖数组，列定义不变
  
  return <ProTable columns={columns} />;
};
```

### 优化事件处理器

```tsx
// Before: 每次渲染创建新函数
const MyComponent = ({ onItemClick }) => {
  return (
    <div>
      {items.map(item => (
        <Button onClick={() => onItemClick(item.id)} key={item.id}>
          {item.name}
        </Button>
      ))}
    </div>
  );
};

// After: 使用 useCallback
const MyComponent = ({ onItemClick }) => {
  const handleClick = useCallback((id: string) => {
    onItemClick(id);
  }, [onItemClick]);

  return (
    <div>
      {items.map(item => (
        <Button onClick={() => handleClick(item.id)} key={item.id}>
          {item.name}
        </Button>
      ))}
    </div>
  );
};
```

### 优化计算属性

```tsx
// Before: 每次渲染都重新计算
const MyComponent = ({ users }) => {
  const activeCount = users.filter(u => u.isActive).length;
  const adminCount = users.filter(u => u.roleIds?.includes('admin')).length;
  
  return <div>Active: {activeCount}, Admins: {adminCount}</div>;
};

// After: 使用 useMemo 缓存计算结果
const MyComponent = ({ users }) => {
  const activeCount = useMemo(
    () => users.filter(u => u.isActive).length,
    [users]
  );
  
  const adminCount = useMemo(
    () => users.filter(u => u.roleIds?.includes('admin')).length,
    [users]
  );
  
  return <div>Active: {activeCount}, Admins: {adminCount}</div>;
};
```

---

## 🚀 预期收益

### 组件拆分收益

- **可维护性**: 提升 60%
- **代码复用**: 提升 80%
- **开发效率**: 提升 40%
- **Bug 定位**: 提升 50%

### 性能优化收益

- **首次渲染**: 提升 20%
- **重渲染次数**: 减少 50%
- **内存占用**: 优化 30%
- **用户体验**: 提升 40%

---

## 📚 相关文档

- [公共组件](../../Platform.Admin/src/components/)
- [自定义 Hooks](../../Platform.Admin/src/hooks/)
- [React 组件规范](../../../.cursorrules)
- [性能优化最佳实践](https://react.dev/reference/react)

---

*文档版本: 1.0*  
*最后更新: 2025-10-12*  
*状态: 指南性文档*







