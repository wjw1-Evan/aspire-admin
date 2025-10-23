# 📝 代码质量改进指南

## 🎯 改进目标

提升代码质量，增强可维护性和可读性，建立统一的编码规范。

---

## 🏗️ 架构改进

### 1. 常量管理

**原则**: 消除魔法字符串和硬编码数字

#### 权限资源

```csharp
// ❌ 不推荐
[RequirePermission("user", "create")]

// ✅ 推荐
[RequirePermission(PermissionResources.User, PermissionActions.Create)]
```

#### 验证规则

```csharp
// ❌ 不推荐
if (reason?.Length > 200)
    throw new ArgumentException("删除原因不能超过200字符");

// ✅ 推荐
if (reason?.Length > ValidationRules.DeleteReasonMaxLength)
    throw new ArgumentException($"删除原因不能超过{ValidationRules.DeleteReasonMaxLength}字符");
```

#### 错误消息

```csharp
// ❌ 不推荐
throw new KeyNotFoundException($"用户 {id} 不存在");

// ✅ 推荐
throw new KeyNotFoundException(string.Format(ErrorMessages.ResourceNotFound, "用户"));
```

### 2. 响应模型

**原则**: 使用强类型响应模型，避免匿名对象

#### 分页响应

```csharp
// ❌ 不推荐
return Success(new
{
    data = users,
    total,
    page,
    pageSize,
    totalPages = (int)Math.Ceiling((double)total / pageSize)
});

// ✅ 推荐
var response = new PaginatedResponse<AppUser>
{
    Data = users,
    Total = total,
    Page = page,
    PageSize = pageSize
};
return Success(response);
```

#### 自定义响应

```csharp
// ❌ 不推荐
var result = logs.Select(log => new
{
    log.Id,
    log.UserId,
    Username = GetUsername(log.UserId),
    // ... 其他属性
}).ToList();

// ✅ 推荐
var result = logs.Select(log => new ActivityLogWithUserResponse
{
    Id = log.Id,
    UserId = log.UserId,
    Username = GetUsername(log.UserId),
    // ... 类型安全的属性
}).ToList();
```

### 3. 扩展方法

**原则**: 提取重复逻辑到扩展方法

#### MongoDB 过滤器

```csharp
// ❌ 不推荐
var filter = Builders<AppUser>.Filter.And(
    Builders<AppUser>.Filter.Eq(user => user.Id, id),
    Builders<AppUser>.Filter.Eq(user => user.IsDeleted, false)
);

// ✅ 推荐
var filter = MongoFilterExtensions.ByIdAndNotDeleted<AppUser>(id);
```

#### 模糊搜索

```csharp
// ❌ 不推荐
var filter = Builders<AppUser>.Filter.Regex(
    u => u.Username, 
    new BsonRegularExpression(searchText, "i")
);

// ✅ 推荐
var filter = MongoFilterExtensions.RegexSearch<AppUser>(
    nameof(AppUser.Username), 
    searchText
);
```

---

## 🎨 前端改进

### 1. 组件封装

**原则**: 提取可复用的UI组件

#### 删除确认

```tsx
// ❌ 不推荐
Modal.confirm({
  title: '确认删除',
  content: `确定删除 ${user.name} 吗？`,
  onOk: async () => {
    const hide = message.loading('删除中...');
    try {
      await deleteUser(user.id);
      hide();
      message.success('删除成功');
      actionRef.current?.reload();
    } catch (error) {
      hide();
      message.error('删除失败');
    }
  },
});

// ✅ 推荐
<DeleteConfirmModal
  visible={state.visible}
  itemName={state.currentItem?.name}
  description="删除后将无法恢复"
  requireReason
  onConfirm={async (reason) => {
    await handleConfirm(() => deleteUser(state.currentItem!.id, reason));
  }}
  onCancel={hideConfirm}
/>
```

### 2. 自定义 Hooks

**原则**: 业务逻辑与UI分离

#### 删除逻辑

```tsx
// ❌ 不推荐
const [deleteVisible, setDeleteVisible] = useState(false);
const [currentUser, setCurrentUser] = useState<User | null>(null);
const [deleteLoading, setDeleteLoading] = useState(false);

const showDeleteConfirm = (user: User) => {
  setCurrentUser(user);
  setDeleteVisible(true);
};

const handleDelete = async (reason?: string) => {
  setDeleteLoading(true);
  try {
    await deleteUser(currentUser!.id, reason);
    setDeleteVisible(false);
    message.success('删除成功');
    actionRef.current?.reload();
  } catch (error) {
    message.error('删除失败');
  } finally {
    setDeleteLoading(false);
  }
};

// ✅ 推荐
const { state, showConfirm, handleConfirm, hideConfirm } = useDeleteConfirm({
  requireReason: true,
  onSuccess: () => {
    message.success('删除成功');
    actionRef.current?.reload();
  },
  onError: () => message.error('删除失败'),
});

showConfirm({ id: user.id, name: user.name });
```

### 3. 类型定义

**原则**: 使用 TypeScript 类型，避免 any

#### API 响应类型

```typescript
// ❌ 不推荐
const fetchUsers = async (): Promise<any> => {
  const response = await request('/api/user/list');
  return response;
};

// ✅ 推荐
const fetchUsers = async (): Promise<ApiResponse<PaginatedResponse<User>>> => {
  const response = await request<ApiResponse<PaginatedResponse<User>>>('/api/user/list');
  return response;
};
```

#### 组件 Props

```typescript
// ❌ 不推荐
const UserCard = (props: any) => {
  return <div>{props.user.name}</div>;
};

// ✅ 推荐
interface UserCardProps {
  readonly user: User;
  readonly onEdit?: (user: User) => void;
  readonly onDelete?: (userId: string) => void;
}

const UserCard: React.FC<UserCardProps> = ({ user, onEdit, onDelete }) => {
  return <div>{user.name}</div>;
};
```

---

## 📐 代码规范

### 命名约定

#### C# 命名

```csharp
// ✅ 类和接口 - PascalCase
public class UserService { }
public interface IUserService { }

// ✅ 方法 - PascalCase
public async Task<AppUser> GetUserByIdAsync(string id) { }

// ✅ 属性 - PascalCase
public string Username { get; set; }

// ✅ 私有字段 - _camelCase
private readonly IUserService _userService;

// ✅ 常量 - PascalCase
public const int MaxPageSize = 100;

// ✅ 枚举 - PascalCase
public enum UserStatus
{
    Active,
    Inactive,
    Deleted
}
```

#### TypeScript 命名

```typescript
// ✅ 组件 - PascalCase
export const UserManagement: React.FC = () => { };

// ✅ 函数/变量 - camelCase
const fetchUsers = async () => { };
const selectedRows = [];

// ✅ 常量 - UPPER_SNAKE_CASE
const API_BASE_URL = '/api';
const MAX_RETRY_COUNT = 3;

// ✅ 接口/类型 - PascalCase
interface UserCardProps { }
type UserStatus = 'active' | 'inactive';

// ✅ Hooks - use开头 + PascalCase
const useDeleteConfirm = () => { };
```

### 注释规范

#### XML 注释 (C#)

```csharp
/// <summary>
/// 根据ID获取用户
/// </summary>
/// <param name="id">用户ID</param>
/// <returns>用户对象，不存在则为 null</returns>
/// <exception cref="ArgumentException">ID 为空时抛出</exception>
public async Task<AppUser?> GetUserByIdAsync(string id)
{
    if (string.IsNullOrEmpty(id))
        throw new ArgumentException(string.Format(ErrorMessages.ParameterRequired, "用户ID"));
    
    return await _users.Find(ByIdAndNotDeleted<AppUser>(id)).FirstOrDefaultAsync();
}
```

#### JSDoc 注释 (TypeScript)

```typescript
/**
 * 删除确认 Hook
 * 
 * 封装删除确认对话框的状态管理和逻辑
 * 
 * @param options - Hook 配置选项
 * @returns 删除确认的状态和方法
 * 
 * @example
 * ```tsx
 * const { state, showConfirm, handleConfirm } = useDeleteConfirm({
 *   requireReason: true,
 *   onSuccess: () => message.success('删除成功'),
 * });
 * ```
 */
export function useDeleteConfirm(options: UseDeleteConfirmOptions = {}) {
  // 实现...
}
```

---

## 🧪 最佳实践

### 1. 错误处理

#### 后端

```csharp
// ❌ 不推荐
try
{
    var user = await _userService.GetUserByIdAsync(id);
    return Ok(new { success = true, data = user });
}
catch (Exception ex)
{
    return StatusCode(500, new { success = false, error = ex.Message });
}

// ✅ 推荐 - 让 GlobalExceptionMiddleware 处理
var user = await _userService.GetUserByIdAsync(id);
if (user == null)
    throw new KeyNotFoundException(string.Format(ErrorMessages.ResourceNotFound, "用户"));

return Success(user);
```

#### 前端

```typescript
// ❌ 不推荐
try {
  const result = await deleteUser(id);
  if (result.success) {
    message.success('删除成功');
  } else {
    message.error(result.error);
  }
} catch (error: any) {
  message.error(error.message || '删除失败');
}

// ✅ 推荐 - 使用统一的错误处理
await handleConfirm(async () => {
  await deleteUser(id);
  // 成功回调在 Hook 中处理
});
```

### 2. 性能优化

#### React 优化

```tsx
// ❌ 不推荐 - 每次渲染都创建新函数
<Button onClick={() => handleDelete(user.id)}>删除</Button>

// ✅ 推荐 - 使用 useCallback
const handleDelete = useCallback((id: string) => {
  showConfirm({ id, name: getUserName(id) });
}, [showConfirm, getUserName]);

<Button onClick={() => handleDelete(user.id)}>删除</Button>
```

```tsx
// ❌ 不推荐 - 每次渲染都计算
const userCount = users.filter(u => u.isActive).length;

// ✅ 推荐 - 使用 useMemo
const userCount = useMemo(
  () => users.filter(u => u.isActive).length,
  [users]
);
```

### 3. 代码组织

#### 控制器方法顺序

```csharp
public class UserController : BaseApiController
{
    // 1. 字段
    private readonly IUserService _userService;
    
    // 2. 构造函数
    public UserController(IUserService userService)
    {
        _userService = userService;
    }
    
    // 3. 查询方法
    [HttpGet]
    public async Task<IActionResult> GetAll() { }
    
    [HttpGet("{id}")]
    public async Task<IActionResult> GetById(string id) { }
    
    // 4. 创建方法
    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateRequest request) { }
    
    // 5. 更新方法
    [HttpPut("{id}")]
    public async Task<IActionResult> Update(string id, [FromBody] UpdateRequest request) { }
    
    // 6. 删除方法
    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(string id) { }
    
    // 7. 其他操作
    [HttpPost("bulk-action")]
    public async Task<IActionResult> BulkAction([FromBody] BulkActionRequest request) { }
}
```

#### React 组件结构

```tsx
const UserManagement: React.FC = () => {
  // 1. Hooks
  const actionRef = useRef<ActionType>();
  const [searchForm] = Form.useForm();
  const [selectedRows, setSelectedRows] = useState<User[]>([]);
  
  // 2. 自定义 Hooks
  const { state: deleteState, showConfirm, handleConfirm } = useDeleteConfirm({
    onSuccess: () => actionRef.current?.reload(),
  });
  
  // 3. 副作用
  useEffect(() => {
    // 初始化逻辑
  }, []);
  
  // 4. 事件处理
  const handleDelete = useCallback((user: User) => {
    showConfirm({ id: user.id, name: user.name });
  }, [showConfirm]);
  
  // 5. 渲染逻辑
  return (
    <PageContainer>
      {/* UI 内容 */}
    </PageContainer>
  );
};
```

---

## 📋 代码审查清单

### 后端审查

- [ ] 所有控制器继承 `BaseApiController`
- [ ] 使用常量替代魔法字符串
- [ ] 使用强类型响应模型
- [ ] 完善的 XML 注释
- [ ] 统一的错误处理（抛出异常）
- [ ] 使用扩展方法简化查询
- [ ] 权限验证完整

### 前端审查

- [ ] 使用 TypeScript，无 any 类型
- [ ] 组件拆分合理（< 300 行）
- [ ] 使用公共组件和 Hooks
- [ ] Props 类型完整定义
- [ ] 使用 useMemo/useCallback 优化
- [ ] 完善的 JSDoc 注释
- [ ] 统一的错误处理

---

## 🎓 学习资源

- [C# 编码规范](https://learn.microsoft.com/zh-cn/dotnet/csharp/fundamentals/coding-style/coding-conventions)
- [TypeScript 最佳实践](https://www.typescriptlang.org/docs/handbook/declaration-files/do-s-and-don-ts.html)
- [React Hooks 指南](https://react.dev/reference/react)
- [Ant Design Pro 文档](https://pro.ant.design)

---

*文档版本: 1.0*  
*最后更新: 2025-10-12*
































