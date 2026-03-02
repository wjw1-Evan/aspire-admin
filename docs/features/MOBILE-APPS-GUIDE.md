# 移动端应用开发指南 (Mobile Apps Guide)

> 本文档说明 Aspire Admin 平台的移动端架构，涵盖 Expo App (`Platform.App`) 和微信小程序 (`Platform.MiniApp`)。

## 📋 概述

平台提供两种移动端形态以满足不同场景：
- **Platform.App**: 基于 Expo (React Native) 开发，适用于高性能、原生体验的 iOS/Android 应用。
- **Platform.MiniApp**: 基于微信小程序原生框架开发，适用于轻量级、社交传播与快速接入场景。

## 🏗️ 核心架构

### 1. 统一认证与请求
两个平台均通过 JWT 与后端通信：
- **认证**: 登录获取 Token，存储在本地 (AsyncStorage 或微信存储)。
- **拦截器**: 统一处理多租户 Header (`X-Company-Id`) 和 401 自动跳转。
- **网关地址**: 开发环境默认为 `http://[IP]:15000/apiservice`。

### 2. 国际化 (i18n)
支持 18 种语言：
- **Expo**: 使用 `i18n-js` 或类似库，翻译文件位于 `constants/i18n`。
- **MiniApp**: 自研 `withI18n` 装饰器，翻译定义在 `utils/i18n.js`。

## ✨ 移动端功能地图

| 模块 | Expo App | 微信小程序 | 描述 |
| :--- | :---: | :---: | :--- |
| **工作空间** | ✅ | ✅ | 任务看板、项目协作 |
| **园区管理** | ✅ | ✅ | 资产查询、租户合同、走访任务 |
| **云存储** | ✅ | ✅ | 文件浏览、上传预览、共享管理 |
| **智能助手** | ✅ | ✅ | 集成 Xiaoke AI (SSE 流式回复) |
| **系统管理** | ✅ | ✅ | 个人中心、企业切换、关于我们 |

## 🎨 UI & 样式系统

### Platform.App (Expo)
- 使用 `Tamagui` 或原生 `StyleSheet`。
- 遵循 Material Design / iOS 设计指南。

### Platform.MiniApp (原生)
- **统一样式库**: `styles/business.wxss` 提供了 `biz-card`、`info-row` 等业务级 UI。
- **极致轻量**: 避免引入大型第三方组件库，优先使用原生组件。

## 🚀 开发调试

### Expo App
```bash
cd Platform.App
npm install
npm start # 扫描二维码或按 'w' 预览 Web 版
```

### 微信小程序
1. 使用 **微信开发者工具** 打开 `Platform.MiniApp` 目录。
2. 开启“不校验合法域名”进行本地开发。

## 📝 开发规范
- ✅ **多租户意识**: 页面初始化必须从全局状态获取 `currentCompanyId`。
- ✅ **离线友好**: 关键数据应有本地缓存策略。
- ✅ **一致性**: 移动端文案应与管理后台 (`Platform.Admin`) 保持一致。

---
相关文档：
- [SSE 实时通信指南](SSE-REALTIME-COMMUNICATION.md)
- [后端核心与中间件规范](BACKEND-RULES.md)
