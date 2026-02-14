# Aspire Admin 微信小程序

Aspire Admin 的移动端配套应用，基于微信小程序原生框架开发。为用户提供园区管理、任务协作、云存储等核心业务的移动化操作能力。

## 🌟 核心理念

- **极致统一**：通过全局共享的样式系统，确保所有业务模块的视觉和交互体验高度一致。
- **国际化原生支持**：系统级集成 18 种语言支持，实现跨区域业务覆盖。
- **高性能 & 轻量化**：完全基于微信小程序原生 API，确保在各种移动设备上的流畅运行。

## 🏗️ 架构模式

### 1. 统一样式系统 (Unified Styling)
为了维护代码的可维护性和视觉一致性，所有页面样式的编写必须遵循以下层级：
- **`app.wxss`**：全局基础样式（变量、基础布局、iconfont）。
- **`styles/business.wxss`**：**核心业务组件库**。包含搜索栏、标签栏、通用卡片 (`biz-card`)、信息行 (`info-row`)、FAB、加载/空状态等。
- **`styles/forms.wxss` & `styles/details.wxss`**：表单和详情页的标准布局样式。
- **页面级 `.wxss`**：仅允许保留页面特有的**唯一性样式**。如果某个样式在超过两个页面中出现，应考虑迁移至 `business.wxss`。

### 2. 国际化 (i18n)
- **翻译定义**：所有文本定义在 `utils/i18n.js` 中。
- **逻辑绑定**：页面需通过 `withI18n` 包装。

### 3. 鉴权与请求
- **`utils/request.js`**：统一拦截器，自动处理 Token、多租户 Header 以及全局错误提示。
- **`utils/auth.js`**：通过 `withAuth` 装饰器实现路由守卫，确保未授权用户无法访问受限内容。

## 📂 项目目录

```text
├── assets/             # 静态资源（图像、Logo）
├── pages/              # 业务页面
│   ├── park/           # 园区管理模块（资产、租户、走访、招商）
│   ├── task/           # 任务管理模块
│   └── cloud-storage/  # 云存储模块
├── styles/             # 公共样式库（Business/Forms/Details）
├── utils/              # 辅助工具（i18n, Request, Auth, RSA）
├── app.js/json/wxss    # 小程序入口及全局配置
└── project.config.json # 小程序项目配置
```

## 🛠️ 开发规范

- **对话 & 注释**：优先使用 **中文**。
- **Git 提交**：必须使用 **简体中文**，并遵循约定式提交规范（如 `feat:`, `fix:`, `docs:`, `refactor:`）。
- **样式清理**：严禁在页面 `.wxss` 中重复定义已在 `business.wxss` 中存在的样式。

## 🚀 快速开始

1. 使用微信开发者工具打开当前目录。
2. 确保已在 `project.config.json` 中配置正确的 `appid`。
3. 后端服务默认连接至 `Platform.AppHost`。

---
*Powered by Antigravity Design System*
