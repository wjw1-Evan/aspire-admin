# 欢迎页面可拖动卡片布局功能

## 功能概述

为欢迎页面添加了可拖动卡片布局功能，用户可以通过拖动调整卡片位置，并自动保存布局配置到后端。

## 核心特性

### 1. 拖动调整位置
- 点击卡片左上角的"解锁"按钮进入编辑模式
- 在编辑模式下，卡片可以在左右两列之间拖动
- 拖动时卡片会显示半透明效果，提示用户正在拖动
- 拖动完成后自动保存布局配置

### 2. 布局持久化
- 用户的布局配置自动保存到后端 API：`/api/user/welcome-layout`
- 页面加载时自动恢复用户上次保存的布局
- 如果没有保存的布局，使用默认配置

### 3. 权限控制
- 审批卡片只在用户有权限时显示
- 其他卡片根据用户权限动态显示

## 实现细节

### 文件结构

```
Platform.Admin/src/
├── pages/
│   ├── Welcome.tsx                          # 主欢迎页面（已重构）
│   └── welcome/
│       └── components/
│           ├── DraggableCardContainer.tsx   # 可拖动卡片容器
│           └── index.ts                     # 组件导出
├── services/
│   └── welcome/
│       └── layout.ts                        # 布局API服务
```

### 核心组件

#### 1. Welcome.tsx
主欢迎页面组件，负责：
- 管理卡片布局状态 (`cardLayouts`)
- 处理拖动逻辑 (`handleDragStart`, `handleDragOver`, `handleDrop`)
- 加载和保存布局配置
- 渲染左右两列的卡片

**关键状态**：
```typescript
const [cardLayouts, setCardLayouts] = useState<CardLayoutConfig[]>([]);
const [draggingCard, setDraggingCard] = useState<string | null>(null);
const [isSavingLayout, setIsSavingLayout] = useState(false);
```

**默认布局**：
```typescript
const defaultLayouts: CardLayoutConfig[] = [
  { cardId: 'task-overview', order: 0, column: 'left', visible: true },
  { cardId: 'project-list', order: 1, column: 'left', visible: true },
  { cardId: 'statistics-overview', order: 2, column: 'left', visible: true },
  { cardId: 'approval-overview', order: 0, column: 'right', visible: canAccessApproval },
  { cardId: 'iot-events', order: 1, column: 'right', visible: true },
  { cardId: 'system-resources', order: 2, column: 'right', visible: true },
];
```

#### 2. DraggableCardContainer.tsx
卡片容器组件，负责：
- 提供拖动交互界面
- 显示编辑模式切换按钮（锁定/解锁）
- 处理拖动事件

**编辑模式**：
- 点击左上角按钮切换编辑模式
- 编辑模式下显示拖动图标和半透明效果
- 非编辑模式下卡片不可拖动

#### 3. layout.ts
布局API服务，提供：
- `getWelcomeLayout()` - 获取用户保存的布局配置
- `saveWelcomeLayout(config)` - 保存布局配置到后端

**API 端点**：
- GET `/api/user/welcome-layout` - 获取布局
- POST `/api/user/welcome-layout` - 保存布局

## 使用流程

### 用户操作流程

1. **进入编辑模式**
   - 点击卡片左上角的"解锁"按钮
   - 卡片进入可拖动状态

2. **拖动卡片**
   - 按住卡片并拖动到目标位置
   - 可以在左右两列之间拖动
   - 拖动时卡片显示半透明效果

3. **完成拖动**
   - 释放鼠标完成拖动
   - 布局自动保存到后端
   - 显示"布局已保存"提示

4. **退出编辑模式**
   - 点击卡片左上角的"锁定"按钮
   - 卡片恢复正常状态

### 页面加载流程

1. 页面初始化时加载用户保存的布局配置
2. 如果没有保存的配置，使用默认配置
3. 根据布局配置渲染卡片
4. 定时轮询更新卡片数据

## 技术实现

### 拖动逻辑

```typescript
// 处理放置
const handleDrop = useCallback((targetCardId: string, targetColumn: 'left' | 'right') => {
  if (!draggingCard) return;

  setCardLayouts(prevLayouts => {
    const newLayouts = [...prevLayouts];
    const draggedIndex = newLayouts.findIndex(l => l.cardId === draggingCard);
    const targetIndex = newLayouts.findIndex(l => l.cardId === targetCardId);

    if (draggedIndex === -1 || targetIndex === -1) return prevLayouts;

    // 交换卡片
    const draggedLayout = newLayouts[draggedIndex];
    const targetLayout = newLayouts[targetIndex];

    // 更新拖动卡片的列和顺序
    draggedLayout.column = targetColumn;
    draggedLayout.order = targetLayout.order;

    // 重新排序同列的卡片
    const sameColumnLayouts = newLayouts.filter(l => l.column === targetColumn);
    sameColumnLayouts.sort((a, b) => a.order - b.order);
    sameColumnLayouts.forEach((layout, index) => {
      layout.order = index;
    });

    // 保存布局到后端
    saveLayoutToBackend(newLayouts);

    return newLayouts;
  });

  setDraggingCard(null);
}, [draggingCard]);
```

### 布局持久化

```typescript
// 加载用户保存的布局配置
useEffect(() => {
  const loadLayout = async () => {
    try {
      const res = await getWelcomeLayout();
      if (res?.data?.layouts && res.data.layouts.length > 0) {
        setCardLayouts(res.data.layouts);
      } else {
        setCardLayouts(defaultLayouts);
      }
    } catch (error) {
      console.warn('加载布局配置失败，使用默认配置:', error);
      setCardLayouts(defaultLayouts);
    }
  };

  if (currentUser) {
    loadLayout();
  }
}, [currentUser, canAccessApproval]);
```

## 后端 API 要求

### 获取布局配置

**请求**：
```
GET /api/user/welcome-layout
```

**响应**：
```json
{
  "success": true,
  "data": {
    "layouts": [
      {
        "cardId": "task-overview",
        "order": 0,
        "column": "left",
        "visible": true
      },
      // ... 其他卡片配置
    ],
    "updatedAt": "2026-03-14T12:00:00Z"
  }
}
```

### 保存布局配置

**请求**：
```
POST /api/user/welcome-layout
Content-Type: application/json

{
  "layouts": [
    {
      "cardId": "task-overview",
      "order": 0,
      "column": "left",
      "visible": true
    },
    // ... 其他卡片配置
  ],
  "updatedAt": "2026-03-14T12:00:00Z"
}
```

**响应**：
```json
{
  "success": true,
  "data": {
    "layouts": [...],
    "updatedAt": "2026-03-14T12:00:00Z"
  }
}
```

## 测试指南

### 功能测试

1. **进入编辑模式**
   - 打开欢迎页面
   - 点击任意卡片左上角的"解锁"按钮
   - 验证卡片进入编辑模式（显示拖动图标）

2. **拖动卡片**
   - 在编辑模式下拖动卡片
   - 验证卡片可以在左右两列之间移动
   - 验证拖动时显示半透明效果

3. **保存布局**
   - 完成拖动后验证显示"布局已保存"提示
   - 刷新页面验证布局被保存
   - 检查浏览器控制台是否有错误

4. **退出编辑模式**
   - 点击卡片左上角的"锁定"按钮
   - 验证卡片恢复正常状态
   - 验证卡片不再可拖动

### 权限测试

1. **审批卡片权限**
   - 使用有审批权限的账户登录
   - 验证审批卡片显示
   - 使用无审批权限的账户登录
   - 验证审批卡片不显示

2. **其他卡片权限**
   - 验证其他卡片根据权限正确显示

### 性能测试

1. **加载性能**
   - 测试页面加载时间
   - 验证布局配置加载不阻塞页面渲染

2. **拖动性能**
   - 测试拖动流畅度
   - 验证没有明显的卡顿

3. **保存性能**
   - 测试快速拖动多个卡片
   - 验证保存请求不会重复发送

## 已知限制

1. **跨浏览器兼容性**
   - 拖动功能依赖 HTML5 Drag and Drop API
   - 某些旧版浏览器可能不支持

2. **移动设备支持**
   - 当前实现不支持移动设备上的拖动
   - 可以在未来版本中添加触摸支持

3. **并发编辑**
   - 如果多个标签页同时编辑布局，可能出现冲突
   - 建议在未来版本中添加冲突解决机制

## 未来改进

1. **触摸支持**
   - 添加移动设备上的拖动支持

2. **动画效果**
   - 添加拖动时的平滑动画

3. **撤销/重做**
   - 添加撤销和重做功能

4. **预设布局**
   - 提供多个预设布局供用户选择

5. **卡片隐藏**
   - 允许用户隐藏不需要的卡片
