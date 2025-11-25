# Platform.App (Expo Mobile Application)

移动端应用，使用 Expo 和 React Native 开发，支持 iOS、Android 和 Web 平台。

## 🚀 快速开始

### 安装依赖

```bash
npm install
```

### 开发模式

**Web 预览（推荐用于开发）:**
```bash
npm run web
# 或在 Aspire 环境中自动启动
```

**iOS 模拟器:**
```bash
npm run ios
```

**Android 模拟器:**
```bash
npm run android
```

**Expo Go (真实设备):**
```bash
npm start
# 然后使用 Expo Go app 扫描二维码
```

## 📁 项目结构

```
Platform.App/
├── app/                    # Expo Router 文件路由
│   ├── (auth)/            # 认证相关页面
│   │   ├── login.tsx      # 登录页
│   │   └── register.tsx   # 注册页
│   ├── (tabs)/            # 主应用标签页
│   │   ├── index.tsx      # 首页
│   │   └── profile.tsx    # 个人资料页
│   └── _layout.tsx        # 根布局（包含认证守卫）
├── services/              # API 服务层
│   ├── api.ts            # Axios 配置
│   ├── authService.ts    # 认证服务
│   ├── userService.ts    # 用户服务
│   └── companyService.ts # 企业服务
├── types/                 # TypeScript 类型定义
│   ├── api.ts            # API 响应类型
│   ├── auth.ts           # 认证相关类型
│   └── company.ts        # 企业相关类型
├── utils/                 # 工具函数
│   ├── constants.ts      # 常量配置
│   └── storage.ts        # AsyncStorage 封装
└── components/           # 可复用组件

## 🔗 API 配置

应用默认连接到本地 API 网关：

- **开发环境**: `http://localhost:15000/apiservice`
- **生产环境**: 需在 `utils/constants.ts` 中配置

```typescript
export const API_BASE_URL = __DEV__ 
  ? 'http://localhost:15000/apiservice'
  : 'https://your-production-api.com';
```

## ✨ 功能特性

- ✅ 用户登录/注册
- ✅ JWT 认证和 Token 管理
- ✅ 自动登录守卫
- ✅ 用户个人资料展示
- ✅ 企业信息查看
- ✅ 企业切换功能
- ✅ 用户登出

## 🔧 在真实设备上测试

在真实设备（iOS/Android）上测试时，需要将 API_BASE_URL 修改为局域网 IP：

1. 找到你的电脑局域网 IP（例如 `192.168.1.100`）
2. 修改 `utils/constants.ts`:

```typescript
export const API_BASE_URL = 'http://192.168.1.100:15000/apiservice';
```

3. 确保设备和电脑在同一网络
4. 运行 `npm start` 并扫描二维码

## 🐛 常见问题

### CORS 错误

如果遇到 CORS 错误，确保后端 API 服务的 CORS 配置允许来自 Expo 开发服务器的请求。后端已配置允许 `http://localhost:15002`。

### 连接超时

- 检查 API 服务是否正在运行
- 确认 `API_BASE_URL` 配置正确
- 在真实设备上测试时，使用局域网 IP 而非 localhost

## 📦 构建和部署

### Web 构建

```bash
npx expo export:web
```

构建产物在 `dist/` 目录下，可用于部署到静态托管服务。

### iOS/Android 原生构建

需要 EAS Build 服务：

```bash
npm install -g eas-cli
eas build --platform ios
# 或
eas build --platform android
```

## 🔄 与 Aspire 集成

应用已集成到 Aspire AppHost 中：

- 端口：15002
- 自动安装依赖
- 支持 Docker 发布

启动整个平台：

```bash
cd ../Platform.AppHost
dotnet run
```

然后访问 http://localhost:15002
