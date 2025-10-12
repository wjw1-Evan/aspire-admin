# 通知标记未读功能

## 📋 功能概述

为通知系统添加"标记为未读"功能，允许用户将已读的通知重新标记为未读状态，方便用户稍后再次查看重要通知。

## ✨ 实现内容

### 1. 后端 API

后端已有的 `UpdateNoticeAsync` 方法支持更新 `Read` 字段，无需额外修改。

**API 端点**: `PUT /api/notices/{id}`

**请求示例**:
```json
{
  "read": false  // false = 未读, true = 已读
}
```

### 2. 前端服务层

**修改文件**: `Platform.Admin/src/services/notice.ts`

新增方法：
```typescript
/** 标记为未读 */
export async function markNoticeAsUnread(id: string) {
  return request(`/api/notices/${id}`, {
    method: 'PUT',
    data: { read: false },
  });
}

/** 批量标记未读 */
export async function markAllAsUnread(ids: string[]) {
  return Promise.all(ids.map(id => markNoticeAsUnread(id)));
}
```

### 3. UI 组件更新

#### 3.1 NoticeList 组件

**修改文件**: `Platform.Admin/src/components/NoticeIcon/NoticeList.tsx`

**新增功能**:
- 添加 `onMarkAllUnread` 回调属性
- 添加"标记未读"按钮（使用 `EyeOutlined` 图标）
- 当有已读通知时显示该按钮

**按钮显示逻辑**:
```typescript
{hasRead && (
  <Button
    type="link"
    size="small"
    icon={<EyeOutlined />}
    onClick={onMarkAllUnread}
  >
    标记未读
  </Button>
)}
```

#### 3.2 NoticeIcon 组件

**修改文件**: `Platform.Admin/src/components/NoticeIcon/index.tsx`

**新增功能**:
- 导入 `markNoticeAsUnread` 和 `markAllAsUnread` 方法
- 添加 `handleMarkAllUnread` 处理函数
- 为三个标签页（通知、消息、待办）添加 `onMarkAllUnread` 回调
- 添加成功/失败提示消息

**核心实现**:
```typescript
const handleMarkAllUnread = async (type: string) => {
  try {
    const typeNotices = notices.filter(n => n.type?.toLowerCase() === type);
    const readIds = typeNotices.filter(n => n.read).map(n => n.id);
    if (readIds.length > 0) {
      await markAllAsUnread(readIds);
      message.success('已标记为未读');
      refetch();
    }
  } catch (error) {
    console.error('标记未读失败:', error);
    message.error('标记失败，请重试');
  }
};
```

## 🎯 使用场景

### 场景 1: 稍后处理
用户查看了通知但暂时无法处理，可以标记为未读以便稍后再次关注。

### 场景 2: 重要提醒
某些重要通知被误标记为已读，可以重新标记为未读以突出显示。

### 场景 3: 批量管理
用户可以批量将某类已读通知标记为未读，统一管理待处理事项。

## 🎨 UI 布局

```
通知 (1)  消息 (0)  待办 (0)
┌────────────────────────────────────┐
│ 🎉 系统已升级到 v2.0  [已读]       │
│ 新版本带来搜索增强...              │
│ 5分钟前                            │
├────────────────────────────────────┤
│ [全部已读] [标记未读] [清空已读]   │
└────────────────────────────────────┘
```

**按钮显示规则**:
- **全部已读**: 当有未读通知时显示
- **标记未读**: 当有已读通知时显示 ✅ 新增
- **清空已读**: 当有已读通知时显示

## 🔄 操作流程

### 单个通知标记未读

1. 用户点击通知（自动标记为已读）
2. 用户发现需要稍后处理
3. 点击"标记未读"按钮
4. 该类型的所有已读通知被标记为未读
5. 未读计数增加

### 批量标记未读

```typescript
// 前端流程
1. 用户查看"通知"标签
2. 点击底部"标记未读"按钮
3. 过滤出该类型的所有已读通知
4. 批量调用 markNoticeAsUnread API
5. 刷新通知列表
6. 显示成功提示
```

## 📊 技术细节

### API 调用

**请求**:
```http
PUT /api/notices/{id}
Content-Type: application/json
Authorization: Bearer {token}

{
  "read": false
}
```

**响应**:
```json
{
  "success": true,
  "data": {
    "id": "...",
    "title": "🎉 系统已升级到 v2.0",
    "read": false,
    "type": "Notification",
    ...
  }
}
```

### 状态管理

```typescript
// 1. 点击"标记未读"
handleMarkAllUnread('notification')

// 2. 过滤已读通知
const readIds = notices
  .filter(n => n.type === 'notification' && n.read)
  .map(n => n.id)

// 3. 批量标记
await markAllAsUnread(readIds)  // Promise.all([...])

// 4. 刷新数据
refetch()  // 重新获取通知列表

// 5. 更新UI
unreadCount 自动更新
```

### 错误处理

```typescript
try {
  await markAllAsUnread(readIds);
  message.success('已标记为未读');  // ✅ 成功提示
} catch (error) {
  console.error('标记未读失败:', error);
  message.error('标记失败，请重试');  // ❌ 错误提示
}
```

## 🧪 测试场景

### 功能测试

1. **标记单个通知为未读**
   - 点击一个未读通知（变为已读）
   - 点击"标记未读"按钮
   - 验证通知变回未读状态
   - 验证未读计数增加

2. **批量标记未读**
   - 标记多个通知为已读
   - 点击"标记未读"按钮
   - 验证所有该类型的已读通知变为未读

3. **跨标签页测试**
   - 在"通知"标签标记未读
   - 切换到"消息"标签
   - 验证各标签页独立管理

4. **按钮显示逻辑**
   - 没有已读通知时，"标记未读"按钮不显示
   - 有已读通知时，"标记未读"按钮显示

### 边界测试

1. **空列表**: 没有通知时，不显示任何操作按钮
2. **全部未读**: 只显示"全部已读"按钮
3. **全部已读**: 显示"标记未读"和"清空已读"按钮
4. **混合状态**: 三个按钮都显示

### 性能测试

1. **批量操作**: 100 个通知批量标记，检查性能
2. **并发请求**: 验证 Promise.all 并发处理
3. **网络错误**: 模拟网络失败，验证错误处理

## 🎯 用户体验

### 视觉反馈

- ✅ **成功消息**: "已标记为未读"（绿色提示）
- ❌ **失败消息**: "标记失败，请重试"（红色提示）
- 🔄 **加载状态**: 操作时显示 loading（由 Spin 组件处理）
- 🔔 **未读标识**: 未读通知显示蓝色圆点

### 交互优化

1. **即时反馈**: 点击后立即显示 message 提示
2. **自动刷新**: 标记后自动刷新列表
3. **平滑过渡**: 使用 Ant Design 动画效果
4. **防抖处理**: 避免重复点击（button 点击时自动禁用）

## 🔧 扩展功能（未来）

### 可选功能

1. **单个通知右键菜单**
   - 右键点击通知
   - 显示"标记为已读/未读"、"删除"等选项

2. **智能标记**
   - 根据通知重要性自动标记
   - 用户可设置规则

3. **批量选择**
   - 复选框选择多个通知
   - 批量操作选中的通知

4. **键盘快捷键**
   - `U`: 标记为未读
   - `R`: 标记为已读
   - `D`: 删除

## 📚 相关文档

- [通知系统主文档](WELCOME-NOTICE-FEATURE.md)
- [通知类型修复](../bugfixes/NOTICE-TYPE-MISMATCH-FIX.md)
- [软删除修复](../bugfixes/NOTICE-SOFT-DELETE-FIX.md)

## ✅ 功能清单

- ✅ 后端 API 支持（已有）
- ✅ 前端服务层添加方法
- ✅ UI 组件添加按钮
- ✅ 事件处理和状态更新
- ✅ 成功/失败提示
- ✅ 批量操作支持
- ✅ 文档更新

## 🎉 总结

通过添加"标记为未读"功能，用户现在可以：

1. **灵活管理通知状态** - 随时在已读/未读之间切换
2. **突出重要通知** - 将重要通知重新标记为未读
3. **批量处理** - 一键将所有已读通知标记为未读
4. **更好的提醒机制** - 配合未读计数，不错过重要消息

这个功能提升了通知系统的灵活性和用户体验！

