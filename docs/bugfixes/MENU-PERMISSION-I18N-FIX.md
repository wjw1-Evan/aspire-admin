# 菜单权限弹窗国际化修复

## 📋 问题描述

在角色管理页面中，"分配权限"菜单弹窗使用了硬编码的中文字符串，没有支持国际化（i18n），导致在切换语言时无法正确显示对应语言的文本。

### 影响范围

- **组件**: `Platform.Admin/src/pages/role-management/components/MenuPermissionModal.tsx`
- **硬编码文本**:
  - Modal 标题: `分配权限 - ${role?.name}`
  - 加载失败提示: `加载数据失败`
  - 成功提示: `权限分配成功`
  - 失败提示: `权限分配失败`
  - 按钮文本: `全选` / `取消全选`

## ✅ 修复内容

### 1. 添加多语言键值

在多语言文件中添加了新的翻译键值：

**中文简体** (`Platform.Admin/src/locales/zh-CN/menu.ts`)：
```typescript
'menu.permission.assign': '分配权限',
'menu.permission.loading': '加载数据失败',
'menu.permission.success': '权限分配成功',
'menu.permission.failed': '权限分配失败',
'menu.permission.selectAll': '全选',
'menu.permission.unselectAll': '取消全选',
```

**英文** (`Platform.Admin/src/locales/en-US/menu.ts`)：
```typescript
'menu.permission.assign': 'Assign Permissions',
'menu.permission.loading': 'Failed to load data',
'menu.permission.success': 'Permissions assigned successfully',
'menu.permission.failed': 'Failed to assign permissions',
'menu.permission.selectAll': 'Select All',
'menu.permission.unselectAll': 'Deselect All',
```

**繁体中文** (`Platform.Admin/src/locales/zh-TW/menu.ts`)：
```typescript
'menu.permission.assign': '分配權限',
'menu.permission.loading': '加載數據失敗',
'menu.permission.success': '權限分配成功',
'menu.permission.failed': '權限分配失敗',
'menu.permission.selectAll': '全選',
'menu.permission.unselectAll': '取消全選',
```

### 2. 修改组件代码

**引入 useIntl Hook**：
```typescript
import { useIntl } from '@umijs/max';

const MenuPermissionModal: React.FC<MenuPermissionModalProps> = ({
  visible,
  role,
  onCancel,
  onSuccess,
}) => {
  const intl = useIntl();
  // ...
```

**替换硬编码文本**：

```typescript
// Modal 标题
<Modal
  title={`${intl.formatMessage({ id: 'menu.permission.assign' })} - ${role?.name}`}
  // ...
>

// 错误提示
message.error(intl.formatMessage({ id: 'menu.permission.loading' }));

// 成功提示
message.success(intl.formatMessage({ id: 'menu.permission.success' }));

// 失败提示
message.error(response.errorMessage || intl.formatMessage({ id: 'menu.permission.failed' }));

// 按钮文本
{checkedKeys.length === expandedKeys.length 
  ? intl.formatMessage({ id: 'menu.permission.unselectAll' })
  : intl.formatMessage({ id: 'menu.permission.selectAll' })
}
```

## 🎯 修复效果

### 修复前
- 所有文本固定显示中文，无论用户选择什么语言
- 用户体验不一致，影响国际化功能

### 修复后
- ✅ 中文环境显示：`分配权限 - 管理员`
- ✅ 英文环境显示：`Assign Permissions - Admin`
- ✅ 繁体中文环境显示：`分配權限 - 管理員`
- ✅ 所有提示信息跟随系统语言自动切换
- ✅ 完整支持多语言切换

## 📝 使用示例

### 在角色管理页面中使用

```typescript
import MenuPermissionModal from './components/MenuPermissionModal';

const RoleManagement: React.FC = () => {
  const [modalVisible, setModalVisible] = useState(false);
  const [currentRole, setCurrentRole] = useState<Role>();

  const handleAssignPermissions = (role: Role) => {
    setCurrentRole(role);
    setModalVisible(true);
  };

  return (
    <>
      {/* 角色列表 */}
      <Button onClick={() => handleAssignPermissions(role)}>
        分配菜单权限
      </Button>

      {/* 权限分配弹窗 - 自动支持多语言 */}
      <MenuPermissionModal
        visible={modalVisible}
        role={currentRole}
        onCancel={() => setModalVisible(false)}
        onSuccess={() => {
          setModalVisible(false);
          // 刷新列表
        }}
      />
    </>
  );
};
```

## 🔧 相关文件

**修改的文件**：
- [MenuPermissionModal.tsx](mdc:Platform.Admin/src/pages/role-management/components/MenuPermissionModal.tsx) - 菜单权限弹窗组件
- [zh-CN/menu.ts](mdc:Platform.Admin/src/locales/zh-CN/menu.ts) - 中文简体多语言
- [en-US/menu.ts](mdc:Platform.Admin/src/locales/en-US/menu.ts) - 英文多语言
- [zh-TW/menu.ts](mdc:Platform.Admin/src/locales/zh-TW/menu.ts) - 繁体中文多语言

## 📚 相关文档

- [多语言支持文档](mdc:docs/features/MULTILINGUAL-SUPPORT.md)
- [Ant Design Pro 国际化](https://pro.ant.design/zh-CN/docs/i18n)
- [UmiJS 国际化插件](https://umijs.org/docs/max/i18n)

## ⚠️ 注意事项

1. **添加新文本时**：
   - 必须在所有语言文件中添加对应的翻译键值
   - 使用描述性的键名，如 `menu.permission.xxx`
   - 遵循现有的命名规范

2. **使用国际化**：
   - 在组件中引入 `useIntl` hook
   - 使用 `intl.formatMessage({ id: 'key' })` 获取翻译文本
   - 避免硬编码任何用户可见的文本

3. **测试验证**：
   - 切换到不同语言环境验证显示效果
   - 确保所有文本都能正确翻译
   - 检查文本长度在不同语言下的UI适配

## 🎯 最佳实践

### ✅ 推荐做法

```typescript
// ✅ 使用国际化
const title = intl.formatMessage({ id: 'menu.permission.assign' });

// ✅ 支持动态参数
const title = intl.formatMessage(
  { id: 'menu.permission.assignTo' },
  { roleName: role.name }
);

// ✅ 在JSX中使用
<Modal title={intl.formatMessage({ id: 'menu.permission.assign' })}>
```

### ❌ 避免的做法

```typescript
// ❌ 硬编码中文
<Modal title="分配权限">

// ❌ 手动判断语言
const title = locale === 'zh-CN' ? '分配权限' : 'Assign Permissions';

// ❌ 混合使用
<Modal title={`分配权限 - ${role.name}`}>
```

## 🔗 相关问题修复

此次修复同时解决了以下相关问题：
- 菜单权限弹窗无法切换语言
- 提示信息在英文环境下仍显示中文
- 按钮文本国际化缺失

## ✨ 后续改进建议

1. **全面审查**：检查其他组件是否存在类似的硬编码问题
2. **Lint 规则**：考虑添加 ESLint 规则检测硬编码的中文字符串
3. **文档完善**：在开发规范中强调国际化的重要性
4. **自动化测试**：添加国际化相关的测试用例

## 📊 影响评估

- **用户影响**：提升了国际化用户体验
- **代码质量**：提高了代码的可维护性
- **技术债务**：减少了硬编码文本的技术债务
- **扩展性**：为未来添加更多语言打下基础

