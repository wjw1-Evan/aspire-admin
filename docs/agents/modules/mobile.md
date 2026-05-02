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
