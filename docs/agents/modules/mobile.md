# 移动端开发规范（Expo + 微信小程序）

## 8. 移动端开发规范（Expo App）

### 8.1 Expo App 项目结构

**位置**：`Platform.App/`

| 目录 | 说明 |
|------|------|
| `app/` | Expo Router 页面路由 |
| `components/` | 可复用组件 |
| `services/` | API 服务层 |
| `hooks/` | 自定义 Hooks |
| `constants/` | 常量定义 |
| `assets/` | 静态资源 |

### 8.2 Expo 技术栈

| 技术 | 版本 | 用途 |
|------|------|------|
| Expo | 54.0.31 | 跨平台开发框架 |
| React Native | 0.83.1 | 移动端 UI 框架 |
| Expo Router | latest | 文件系统路由 |
| expo-notifications | latest | 原生通知 |

### 8.3 标准页面模板

```typescript
// app/index.tsx
import { View, Text } from 'react-native';
import { useAuth } from '../hooks/useAuth';

export default function HomeScreen() {
  const { user } = useAuth();

  return (
    <View style={{ padding: 16 }}>
      <Text style={{ fontSize: 24, fontWeight: 'bold' }}>
        欢迎, {user?.name}
      </Text>
    </View>
  );
}
```

### 8.4 API 服务层

```typescript
// services/api.ts
import Constants from 'expo-constants';

const API_URL = Constants.expoConfig?.extra?.apiUrl || 'http://localhost:15000';

export async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const token = await getToken();
  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });

  if (!response.ok) {
    throw new Error(`API Error: ${response.status}`);
  }

  return response.json();
}
```

### 8.5 原生通知集成

项目已集成 `expo-notifications`，支持：

- 本地通知
- 远程推送通知
- 通知权限管理
- 通知点击事件处理

```typescript
// hooks/useNotifications.ts
import * as Notifications from 'expo-notifications';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

export function useNotifications() {
  const registerForPushNotifications = async () => {
    const { status } = await Notifications.requestPermissionsAsync();
    if (status !== 'granted') {
      throw new Error('推送通知权限被拒绝');
    }
  };

  return { registerForPushNotifications };
}
```

## 8.6 微信小程序开发规范

### 小程序项目结构

**位置**：`Platform.MiniApp/`

| 文件 | 说明 |
|------|------|
| `app.js` | 小程序入口 |
| `app.json` | 全局配置 |
| `pages/` | 页面目录 |
| `components/` | 组件目录 |
| `utils/` | 工具函数 |

### 小程序标准页面

```javascript
// pages/index/index.js
Page({
  data: {
    message: 'Hello MiniApp'
  },

  onLoad() {
    console.log('页面加载');
  },

  handleClick() {
    wx.showToast({ title: '点击成功' });
  }
});
```

### 小程序 API 调用

```javascript
// utils/request.js
const API_URL = 'http://localhost:15000';

function request(url, method = 'GET', data = {}) {
  return new Promise((resolve, reject) => {
    wx.request({
      url: `${API_URL}${url}`,
      method,
      data,
      header: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${wx.getStorageSync('token')}`
      },
      success: (res) => {
        if (res.statusCode === 200) {
          resolve(res.data);
        } else {
          reject(res);
        }
      },
      fail: reject
    });
  });
}

module.exports = { request };
```

### 8.7 多端 API 对接规范

**统一原则**：
- API 基础路径：`/apiservice/api/`
- 认证方式：Bearer Token（存储在各端存储中）
- 响应格式：统一 `ApiResponse<T>` 格式

**各端存储位置**：

| 端 | 存储方式 | Token 键名 |
|----|---------|-----------|
| Admin (Web) | localStorage | `auth_token` |
| Expo App | expo-secure-store | `auth_token` |
| 微信小程序 | wx.setStorageSync | `auth_token` |

### 8.8 移动端适配建议

1. **响应式布局**：使用 `Flexbox` 和百分比宽度
2. **安全区域**：处理 iPhone 刘海屏和底部 Home Indicator
3. **字体大小**：使用 `rem` 或 `em` 单位
4. **触摸友好**：按钮最小 44x44 像素
5. **网络状态**：监听网络变化，显示离线提示

```typescript
// 使用 SafeAreaView 处理安全区域
import { SafeAreaView } from 'react-native-safe-area-context';

<SafeAreaView style={{ flex: 1 }}>
  <YourContent />
</SafeAreaView>
```

### 8.9 移动端用户体验设计（新增）

#### 移动端 vs. 桌面端的用户体验差异

| 维度 | 桌面端 | 移动端 |
|------|--------|--------|
| 屏幕尺寸 | 大（>= 1024px） | 小（375-414px） |
| 交互方式 | 鼠标精确点击 | 手指触摸（精度差） |
| 网络环境 | 稳定 WiFi | 移动网络，可能断连 |
| 使用场景 | 专注操作 | 碎片时间、可能被打断 |
| 输入方式 | 键盘精准输入 | 虚拟键盘，易输错 |

#### 触摸交互设计

- **点按区域**：至少 44x44 像素（WCAG 标准），重要操作建议 48x48+
- **手势冲突**：避免页面滚动和手势操作冲突（如 Swipeable 和 ScrollView）
- **点击反馈**：所有可点击元素必须有按下态（opacity 或 ripple 效果）
- **误触防护**：危险操作（删除、提交）2 次确认，间隔 300ms 以上

```typescript
// ✅ 好的触摸反馈
<TouchableOpacity
  activeOpacity={0.7}
  style={{ minWidth: 48, minHeight: 48, padding: 12 }}
  onPress={handlePress}
>
  <Text>确认</Text>
</TouchableOpacity>

// ❌ 差的设计：太小，没有反馈
<Text style={{ fontSize: 12 }} onPress={handlePress}>x</Text>
```

#### 网络状态与离线体验

移动端网络不稳定是常态，必须处理：

| 网络状态 | 用户看到 |
|---------|---------|
| 无网络 | 温和提示"网络连接已断开"，显示缓存数据 |
| 弱网（> 3s） | 显示"网络较慢，正在加载..."，不卡死页面 |
| 请求超时 | "请求超时，请检查网络" + 重试按钮 |
| 恢复连接 | 自动重试失败请求，关闭网络提示 |

```typescript
// 网络状态监听示例
import NetInfo from '@react-native-community/netinfo';

const unsubscribe = NetInfo.addEventListener(state => {
  if (!state.isConnected) {
    // 显示离线提示
    showOfflineBanner();
    // 切换到离线模式（读取缓存）
    enableOfflineMode();
  } else {
    // 隐藏离线提示，同步数据
    hideOfflineBanner();
    syncPendingChanges();
  }
});
```

#### 手势导航

| 手势 | 功能 | 注意事项 |
|------|------|---------|
| 左滑 | 返回上一页 | 不要在内容页面自定义左滑 |
| 下拉 | 刷新列表 | 显示刷新动画 |
| 上滑 | 加载更多 | 使用无限滚动，不要分页加载 |
| 长按 | 进入编辑/选择模式 | 需要有视觉提示 |
| 双指缩放 | 图片/地图缩放 | 遵循系统缩放行为 |

#### iOS vs Android vs 微信小程序差异

| 特性 | iOS | Android | 微信小程序 |
|------|-----|---------|-----------|
| 返回方式 | 左滑手势 + 左上按钮 | 物理返回键 | 左上角 + 手势 |
| 导航栏 | 大标题 + 半透明 | 固定顶部栏 | 自定义导航 |
| 弹窗风格 | ActionSheet 底部弹出 | AlertDialog 居中 | wx.showModal |
| 输入框 | 无下划线 | 有下划线 | 有下划线 |
| 字体 | SF Pro | Roboto | 跟随系统 |

> 建议：各端尽量保持交互一致，但在系统惯例差异处**尊重用户习惯**。

#### 移动端加载体验

- 首次进入页面使用 Skeleton 效果（不要 Spin/loading）
- 列表数据使用分页加载 + 上滑无限滚动的模式
- 图片使用渐进式加载（先模糊后清晰）
- 预加载下一页数据，减少用户等待

```typescript
// Skeleton 加载组件
export function ListSkeleton() {
  return (
    <View style={{ padding: 16 }}>
      {[1, 2, 3, 4, 5].map(i => (
        <View key={i} style={{ marginBottom: 12 }}>
          <View style={{ width: '60%', height: 16, backgroundColor: '#E1E9EE', borderRadius: 4 }} />
          <View style={{ width: '80%', height: 12, backgroundColor: '#E1E9EE', borderRadius: 4, marginTop: 8 }} />
        </View>
      ))}
    </View>
  );
}
```

#### 关键用户体验检查清单

开发每个移动端页面时，问自己：

- [ ] **触摸区域** — 按钮够大吗（≥44px）？手指能准确定位吗？
- [ ] **网络状态** — 离线/弱网有提示吗？操作会丢失吗？
- [ ] **平台差异** — iOS 左滑返回和自定义手势冲突了吗？
- [ ] **加载速度** — 页面 3 秒内能显示出主要内容吗？
- [ ] **键盘处理** — 键盘弹出时会遮挡输入框吗？
- [ ] **中断恢复** — 接到电话/切到后台再回来，状态还在吗？
- [ ] **字体可读性** — 最小的字号在阳光下也能看清吗？
