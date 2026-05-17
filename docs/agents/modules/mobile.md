# App 端开发规范（纯 Expo）

> **重要**：本项目移动端全部使用 Expo 开发（禁止引入原生 React Native 项目或使用 `npx react-native init`）。所有移动端功能必须在 `Platform.App/` 目录下实现。

## 8. App 端开发规范（Expo）

### 8.1 技术栈

| 技术 | 版本 | 用途 |
|------|------|------|
| Expo | ~55.0.23 | 跨平台开发框架 |
| React Native | 0.83.6 | 移动端 UI 框架 |
| Expo Router | ~55.0.14 | 文件系统路由 |
| expo-splash-screen | ~55.0.20 | 启动屏 |
| expo-secure-store / AsyncStorage | latest | 本地存储 |
| axios | ^1.16.0 | HTTP 客户端 |
| react-native-toast-message | ^2.3.3 | 轻提示 |

### 8.2 项目结构

```
Platform.App/
├── app/                    # Expo Router 页面路由
│   ├── (auth)/            # 认证相关页面组
│   │   ├── _layout.tsx    # 认证组布局
│   │   ├── login.tsx      # 登录页
│   │   └── register.tsx   # 注册页
│   ├── (tabs)/            # 底部 Tab 页面组
│   │   ├── _layout.tsx    # Tab 导航布局
│   │   ├── index.tsx      # 首页
│   │   ├── profile.tsx    # 个人中心
│   │   ├── tasks/         # 任务模块
│   │   └── projects/      # 项目模块
│   ├── project/           # 项目详情/创建/编辑
│   │   ├── [id].tsx       # 项目详情（动态路由）
│   │   ├── create.tsx     # 创建项目
│   │   └── edit/[id].tsx  # 编辑项目
│   ├── task/              # 任务详情/创建/编辑/执行
│   │   ├── [id].tsx
│   │   ├── create.tsx
│   │   ├── edit/[id].tsx
│   │   └── execute/[id].tsx
│   ├── _layout.tsx        # 根布局（认证守卫、全局配置）
│   ├── +not-found.tsx     # 404 页面
│   └── modal.tsx          # 模态页面
├── components/            # 可复用组件
│   ├── ui/               # 通用 UI 组件
│   │   ├── ConfirmModal.tsx
│   │   ├── EmptyState.tsx
│   │   ├── ErrorView.tsx
│   │   ├── LoadingView.tsx
│   │   ├── PageContainer.tsx
│   │   ├── SearchBar.tsx
│   │   └── StatusTag.tsx
│   ├── project/          # 项目相关组件
│   ├── task/             # 任务相关组件
│   └── statistics/       # 统计组件
├── services/             # API 服务层（使用 axios）
│   ├── api.ts            # 统一 HTTP 客户端（含 Token 刷新、401 拦截）
│   ├── authService.ts    # 认证服务
│   ├── projectService.ts # 项目服务
│   ├── taskService.ts    # 任务服务
│   └── ...
├── hooks/                # 自定义 Hooks
│   ├── useApi.ts         # API 调用 Hook
│   └── useRefresh.ts     # 下拉刷新 Hook
├── contexts/             # React Context
│   └── ThemeContext.tsx   # 主题上下文
├── types/                # TypeScript 类型定义
│   ├── api.ts            # ApiResponse<T>、PagedResult<T>
│   ├── auth.ts
│   ├── project.ts
│   └── task.ts
├── utils/                # 工具函数
│   ├── storage.ts        # AsyncStorage 封装
│   ├── token.ts          # Token 管理
│   └── constants.ts      # 全局常量
└── constants/            # 样式常量
    ├── Colors.ts         # 颜色主题（light/dark）
    └── AppStyles.ts      # 间距、圆角、阴影等
```

### 8.3 路由规则

- 使用 **Expo Router** 文件系统路由（`app/` 目录即路由）
- 路由组：`(auth)` 认证相关、`(tabs)` 底部 Tab 导航
- 动态路由：`[id].tsx` 对应 `project/123`
- 编辑页：`edit/[id].tsx` 对应 `project/edit/123`
- 根布局 `_layout.tsx` 统一处理：认证守卫（未登录跳转登录页）、主题注入、Toast 全局配置
- Tab 布局 `(tabs)/_layout.tsx` 统一配置底部导航

### 8.4 页面开发规范

#### 标准页面模板

```typescript
// app/index.tsx
import { View, Text } from 'react-native';
import { useAuth } from '../hooks/useAuth';
import { PageContainer } from '../components/ui/PageContainer';

export default function HomeScreen() {
  const { user } = useAuth();

  return (
    <PageContainer>
      <Text style={{ fontSize: 24, fontWeight: 'bold' }}>
        欢迎, {user?.name}
      </Text>
    </PageContainer>
  );
}
```

#### 列表页面模板

```typescript
import React, { useState, useEffect } from 'react';
import { FlatList, View, Text, StyleSheet, RefreshControl } from 'react-native';
import { PageContainer } from '@/components/ui/PageContainer';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorView } from '@/components/ui/ErrorView';
import { LoadingView } from '@/components/ui/LoadingView';

export default function ListScreen() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<any[]>([]);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      // const result = await someService.getList();
      // setData(result);
    } catch (err: any) {
      setError(err.message || '加载失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  if (loading && !refreshing) return <LoadingView />;
  if (error && data.length === 0) return <ErrorView message={error} onRetry={fetchData} />;
  if (!loading && data.length === 0) return <EmptyState message="暂无数据" />;

  return (
    <PageContainer>
      <FlatList
        data={data}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <Text>{item.name}</Text>}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={fetchData} />}
      />
    </PageContainer>
  );
}
```

### 8.5 API 服务层

所有 API 调用使用封装好的 `apiClient`（`services/api.ts`），它基于 **axios** 提供：

- 自动注入 Bearer Token
- Token 过期自动刷新（通过 `TokenRefreshManager`）
- 401 响应自动清除 Token 并触发登出
- 统一错误处理（返回 `ErrorResponse` 格式）

**服务调用规范**：每个业务模块对应一个独立的 Service 文件，调用 `apiClient` 发起请求：

```typescript
// services/projectService.ts
import { apiClient } from './api';
import { ApiResponse, PagedResult } from '@/types/api';
import { Project } from '@/types/project';

export const projectService = {
  getList: (params?: any) =>
    apiClient.get<ApiResponse<PagedResult<Project>>>('/projects', { params }),

  getById: (id: string) =>
    apiClient.get<ApiResponse<Project>>(`/projects/${id}`),

  create: (data: Partial<Project>) =>
    apiClient.post<ApiResponse<Project>>('/projects', data),

  update: (id: string, data: Partial<Project>) =>
    apiClient.put<ApiResponse<Project>>(`/projects/${id}`, data),

  delete: (id: string) =>
    apiClient.delete<ApiResponse<void>>(`/projects/${id}`),
};
```

### 8.6 UI 组件使用规范

通用 UI 组件位于 `components/ui/`，页面开发时优先使用：

| 组件 | 用途 | 使用场景 |
|------|------|---------|
| `PageContainer` | 页面容器（SafeAreaView + 内边距） | 每个页面的根组件 |
| `LoadingView` | 全屏加载状态 | 页面首次加载 |
| `EmptyState` | 空数据展示 | 列表无数据 |
| `ErrorView` | 错误提示 + 重试按钮 | 加载失败 |
| `ConfirmModal` | 操作确认弹窗 | 删除等危险操作 |
| `SearchBar` | 搜索输入框 | 列表搜索 |
| `StatusTag` | 状态标签 | 枚举状态展示 |

### 8.7 认证与权限

- 认证状态由 `authService` 统一管理，支持 `isAuthenticated()` 检测和 `addAuthListener` 监听
- 根布局 `_layout.tsx` 根据认证状态自动重定向（`(auth)` 组 ↔ `(tabs)` 组）
- Token 存储在 `AsyncStorage`，通过 `storage.ts` 统一存取
- Token 过期前自动刷新（`tokenRefreshManager.ts`）

### 8.8 主题与样式

- 颜色定义：`constants/Colors.ts`（light + dark 双主题）
- 通用样式：`constants/AppStyles.ts`（spacing、borderRadius、fontSize、shadows）
- 主题切换：`contexts/ThemeContext.tsx`
- 页面中使用 `useTheme()` hook 获取当前主题和颜色

### 8.8.1 配色方案（银蕨色主题）

本项目 App 端采用**新西兰银蕨色**作为品牌主色调，所有颜色必须从 `constants/Colors.ts` 和 `constants/AppStyles.ts` 中获取，**禁止在页面中硬编码配色**。

#### 品牌色定义

| 颜色变量 | Light 模式 | Dark 模式 | 用途 |
|---------|-----------|-----------|------|
| `primary` | `#4A7C59` | `#6BAF8D` | 主色调（按钮、链接、图标） |
| `primaryDark` | `#3A6347` | `#4A7C59` | 深色变体 |
| `primaryLight` | `#6BAF8D` | `#8FC9A5` | 浅色变体 |
| `tint` | `#4A7C59` | `#6BAF8D` | Tab 图标选中色、强调色 |

#### 语义色

| 颜色变量 | 值 | 用途 |
|---------|-----|------|
| `success` | `#10b981` / `#34d399` | 成功状态 |
| `error` | `#ef4444` / `#f87171` | 错误/危险状态 |
| `warning` | `#f59e0b` / `#fbbf24` | 警告状态 |

#### 背景与文本

| 颜色变量 | Light 模式 | Dark 模式 |
|---------|-----------|-----------|
| `background` | `#ffffff` | `#000000` |
| `cardBackground` | `#f2f2f7` | `#1c1c1e` |
| `text` | `#000000` | `#ffffff` |
| `textSecondary` | `#6e6e73` | `#8e8e93` |
| `textTertiary` | `#aeaeb2` | `#636366` |
| `border` | `#d1d1d6` | `#38383a` |
| `borderLight` | `#e5e5ea` | `#2c2c2e` |

#### 使用示例

```typescript
// ✅ 正确：从主题中获取颜色
const { colors } = useTheme();
<View style={{ backgroundColor: colors.primary }} />
<Text style={{ color: colors.text }} />

// ✅ 正确：使用 AppStyles 中的颜色
import { AppStyles } from '../../constants/AppStyles';
<View style={{ backgroundColor: AppStyles.colors.primary }} />

// ❌ 错误：硬编码颜色
<View style={{ backgroundColor: '#4A7C59' }} />
<Text style={{ color: 'red' }} />
```

#### 状态颜色映射（task.ts）

状态语义色（进行中、已完成等）使用标准 UX 配色，定义在 `utils/task.ts`：

| 状态 | 颜色 | 说明 |
|------|------|------|
| Pending | `#999` | 待处理 |
| Assigned | `#4A7C59` | 已分配（银蕨绿） |
| InProgress | `#60a5fa` | 进行中（蓝色） |
| Completed | `#34d399` | 已完成（绿色） |
| Cancelled/Failed | `#f87171` | 已取消/失败（红色） |
| Paused | `#fbbf24` | 已暂停（黄色） |

### 8.9 移动端用户体验设计

#### 触摸交互

- **点按区域**：至少 44x44 像素，重要操作 48x48+
- **手势冲突**：避免页面滚动和自定义手势冲突
- **点击反馈**：所有可点击元素使用 `TouchableOpacity`（`activeOpacity={0.7}`）
- **误触防护**：危险操作（删除、提交）用 `ConfirmModal` 二次确认

#### 网络状态与离线

| 网络状态 | 用户看到 |
|---------|---------|
| 无网络 | 温和提示 + 显示缓存数据 |
| 弱网（> 3s） | "网络较慢，正在加载..." |
| 请求超时 | 错误提示 + 重试按钮 |
| 恢复连接 | 自动重试失败请求 |

#### 页面状态规则

| 状态 | 组件 | 说明 |
|------|------|------|
| 加载中 | `LoadingView` | Skeleton 效果，首屏使用 |
| 空数据 | `EmptyState` | 插图 + "暂无数据" |
| 错误 | `ErrorView` | 友好提示 + 重试按钮 |
| 下拉刷新 | `RefreshControl` | FlatList 内置支持 |
| 上滑加载 | FlatList onEndReached | 无限滚动模式 |

### 8.10 常用命令

```bash
# 启动开发服务（默认端口 8081）
npm run dev

# 启动并指定平台
npm run ios        # iOS 模拟器
npm run android    # Android 模拟器
npm run web        # Web 端

# 依赖修复 / 诊断
npm run update:deps   # expo install --fix
npm run doctor        # expo-doctor 诊断
```

> 微信小程序（`Platform.MiniApp/`）使用微信原生开发，不在本规范范围内。
