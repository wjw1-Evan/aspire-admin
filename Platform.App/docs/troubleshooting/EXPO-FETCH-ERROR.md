# Expo Fetch 错误解决方案

## 问题描述

启动 Expo 项目时出现 `TypeError: fetch failed` 错误，通常发生在 Expo CLI 尝试获取原生模块版本信息时。

## 错误信息

```
TypeError: fetch failed
at node:internal/deps/undici/undici:13510:13
at getNativeModuleVersionsAsync
```

## 解决方案

### 方案 1: 使用离线模式（推荐）

跳过网络检查，直接启动项目：

```bash
npx expo start --offline
```

或者设置环境变量：

```bash
export EXPO_OFFLINE=1
npx expo start
```

### 方案 2: 清除缓存并重试

```bash
# 清除 Expo 缓存
npx expo start --clear

# 或者清除 npm/yarn 缓存
npm cache clean --force
# 或
yarn cache clean
```

### 方案 3: 更新 Expo CLI

```bash
npm install -g @expo/cli@latest
# 或
npx expo install --fix
```

### 方案 4: 检查网络和代理设置

```bash
# 检查网络连接
curl -I https://exp.host

# 如果使用代理，设置代理环境变量
export HTTP_PROXY=http://proxy.example.com:8080
export HTTPS_PROXY=http://proxy.example.com:8080

# 或者禁用代理
unset HTTP_PROXY HTTPS_PROXY http_proxy https_proxy
```

### 方案 5: 使用本地开发模式

如果只是本地开发，可以跳过版本检查：

```bash
# 设置环境变量跳过版本检查
export EXPO_NO_DOTENV=1
export EXPO_SKIP_NATIVE_VERSION_CHECK=1
npx expo start
```

### 方案 6: 检查 Node.js 版本

确保使用兼容的 Node.js 版本：

```bash
node --version  # 应该 >= 18.0.0
```

如果版本过低，更新 Node.js：

```bash
# 使用 nvm 更新
nvm install 18
nvm use 18
```

## 临时解决方案

如果以上方案都不行，可以：

1. **等待几分钟后重试** - 可能是 Expo API 服务器临时问题
2. **使用 `--offline` 模式** - 跳过所有网络检查
3. **检查防火墙设置** - 确保允许访问 `exp.host` 和 `expo.dev`

## 验证

启动成功后，应该能看到：

```
› Metro waiting on exp://192.168.x.x:8081
› Scan the QR code above with Expo Go (Android) or the Camera app (iOS)
```

## 相关链接

- [Expo CLI 文档](https://docs.expo.dev/workflow/expo-cli/)
- [Expo 故障排除](https://docs.expo.dev/troubleshooting/clear-cache/)

