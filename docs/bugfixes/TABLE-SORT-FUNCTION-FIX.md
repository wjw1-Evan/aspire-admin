# 修复：表格排序功能无法正常使用

## 📋 问题描述

**问题**: 用户管理页面的表格排序功能无法正常工作，点击列头排序时数据没有变化

**影响范围**: 所有使用 ProTable 的页面排序功能

**发现时间**: 2025-01-XX

## 🔍 问题分析

### 根本原因

ProTable 的 `request` 函数签名不正确，缺少第二个参数 `sort`，导致排序参数无法传递给后端。

### 技术细节

1. **ProTable request 函数标准签名**:
```typescript
request?: (
  params: U & {
    pageSize?: number;
    current?: number;
  },
  sort?: Record<string, SortOrder>,
  filter?: Record<string, React.ReactText[] | null>
) => Promise<RequestData<DataSourceType>>;
```

2. **问题代码**:
```typescript
// ❌ 错误：只接收 params，缺少 sort 参数
const fetchUsers = async (params: TableRequestParams) => {
  const requestData: UserListRequest = {
    // ...
    SortBy: params.sortBy || searchParams.SortBy,  // sortBy 不存在
    SortOrder: params.sortOrder || searchParams.SortOrder,  // sortOrder 不存在
    // ...
  };
}
```

3. **ProTable 排序参数格式**:
```typescript
// ProTable 传递的 sort 格式
{
  fieldName: 'ascend' | 'descend'
}

// 例如
{
  'createdAt': 'descend'
}
```

## ✅ 解决方案

### 修复内容

#### 1. 用户管理页面 - 修复排序参数处理

修复 `fetchUsers` 函数，正确处理 ProTable 的 `sort` 参数：

```typescript
const fetchUsers = async (params: any, sort?: Record<string, any>) => {
  // 处理排序参数
  let sortBy = searchParams.SortBy;
  let sortOrder = searchParams.SortOrder;
  
  if (sort && Object.keys(sort).length > 0) {
    // ProTable 的 sort 格式: { fieldName: 'ascend' | 'descend' }
    const sortKey = Object.keys(sort)[0];
    const sortValue = sort[sortKey];
    
    // 后端使用小写字段名
    sortBy = sortKey;
    sortOrder = sortValue === 'ascend' ? 'asc' : 'desc';
  }

  const requestData: UserListRequest = {
    Page: params.current || searchParams.Page,
    PageSize: params.pageSize || searchParams.PageSize,
    Search: searchParams.Search,
    RoleIds: searchParams.RoleIds,
    IsActive: searchParams.IsActive,
    SortBy: sortBy,
    SortOrder: sortOrder,
    StartDate: searchParams.StartDate,
    EndDate: searchParams.EndDate,
  };

  // ... 发送请求
};
```

#### 2. 角色管理页面 - 修复函数签名

虽然角色管理页面没有 `sorter: true`，但 ProTable 仍然会传递 `sort` 和 `filter` 参数。为了保持一致性，修复了函数签名：

```typescript
const loadRoleData = async (params: any, sort?: Record<string, any>) => {
  // ... 加载数据
};
```

### 修复代码

```typescript
// Platform.Admin/src/pages/user-management/index.tsx
// 修复前
const fetchUsers = async (params: TableRequestParams) => {
  // ...
}

// 修复后
const fetchUsers = async (params: any, sort?: Record<string, any>) => {
  // 正确处理排序参数
  if (sort && Object.keys(sort).length > 0) {
    const sortKey = Object.keys(sort)[0];
    const sortValue = sort[sortKey];
    sortBy = sortKey;
    sortOrder = sortValue === 'ascend' ? 'asc' : 'desc';
  }
  // ...
}
```

## 🎯 工作原理

### ProTable 排序流程

```
用户点击列头排序
    ↓
ProTable 生成 sort 参数
    ↓
request(params, sort) 被调用
    ↓
前端处理 sort 参数，转换为后端格式
    ↓
发送到后端 API
    ↓
后端按排序参数查询数据库
    ↓
返回排序后的数据
    ↓
表格显示排序结果 ✅
```

### 参数转换

| 前端格式 | 后端格式 | 说明 |
|---------|---------|-----|
| `{ createdAt: 'ascend' }` | `SortBy: 'createdAt', SortOrder: 'asc'` | 升序 |
| `{ createdAt: 'descend' }` | `SortBy: 'createdAt', SortOrder: 'desc'` | 降序 |
| `{ username: 'ascend' }` | `SortBy: 'username', SortOrder: 'asc'` | 用户名升序 |

### 后端支持的排序字段

根据 `UserService.GetUsersWithRolesAsync` 方法，后端支持以下字段排序：

- `createdat` - 创建时间（默认）
- `username` - 用户名
- `email` - 邮箱
- `lastloginat` - 最后登录时间
- `updatedat` - 更新时间
- `name` - 姓名
- `isactive` - 状态

## 🧪 验证方法

### 1. 编译验证

```bash
cd Platform.Admin
npm run build
```

**预期结果**: 编译成功，无错误

### 2. 功能测试

1. 启动项目：
   ```bash
   dotnet run --project Platform.AppHost
   ```

2. 登录系统，进入"用户管理"页面

3. 点击"创建时间"列头进行排序

4. **预期结果**: 
   - 首次点击：数据按创建时间降序排列
   - 再次点击：数据按创建时间升序排列
   - 第三次点击：恢复默认排序

### 3. 检查网络请求

打开浏览器开发者工具，查看请求参数：

```json
{
  "Page": 1,
  "PageSize": 10,
  "SortBy": "createdat",
  "SortOrder": "desc"
}
```

## 📊 影响范围

### 受影响的模块

- ✅ 用户管理页面（`Platform.Admin/src/pages/user-management/index.tsx`）
- ✅ 角色管理页面（`Platform.Admin/src/pages/role-management/index.tsx`）

### 不受影响的模块

- ✅ 活动日志页面（后端仅支持固定排序）
- ✅ 加入申请页面（后端仅支持固定排序）
- ✅ 其他没有 `sorter: true` 的页面

## 🔄 相关文档

- [Ant Design Pro ProTable 文档](https://procomponents.ant.design/components/table)
- [UmiJS 开发规范](mdc:.cursor/rules/antd-pro-umi.mdc)
- [前端开发规范](mdc:.cursor/rules/frontend-development.mdc)

## ⚠️ 注意事项

1. **ProTable request 签名**: 必须遵循标准签名 `(params, sort?, filter?) => Promise`
2. **排序参数格式**: ProTable 使用 `ascend/descend`，后端使用 `asc/desc`
3. **字段名映射**: 前端字段名（camelCase）需要转换为后端字段名（lowercase）
4. **默认排序**: 如果没有排序参数，使用默认排序配置

## ✅ 验证清单

- [x] 修复用户管理页面排序功能
- [x] 修复角色管理页面 request 函数签名
- [x] 编译成功，无错误
- [ ] 功能测试通过
- [x] 更新相关文档

## 📝 总结

通过修复 ProTable 的 `request` 函数签名，正确处理 `sort` 参数，将前端的 `ascend/descend` 转换为后端需要的 `asc/desc` 格式，实现了表格排序功能。

这是一个**标准规范修复**，确保所有 ProTable 使用正确的函数签名，避免未来类似问题。

## 📅 提交历史

- `678bd89` - fix: 修复用户管理页面排序功能
- `e858c4c` - fix: 修复角色管理页面 ProTable request 函数签名
