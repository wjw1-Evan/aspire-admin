# 多语言支持重新整理完成

## 概述

已成功将所有 18 种语言的翻译文件从单一的大文件拆分为模块化结构，便于维护和 AI 开发。

## 支持的语言

| 语言 | 代码 | 状态 |
|------|------|------|
| 简体中文 | zh-CN | ✅ |
| 繁体中文 | zh-TW | ✅ |
| 英语 | en-US | ✅ |
| 日语 | ja-JP | ✅ |
| 韩语 | ko-KR | ✅ |
| 德语 | de-DE | ✅ |
| 法语 | fr-FR | ✅ |
| 西班牙语 | es-ES | ✅ |
| 意大利语 | it-IT | ✅ |
| 俄语 | ru-RU | ✅ |
| 葡萄牙语（巴西） | pt-BR | ✅ |
| 阿拉伯语（埃及） | ar-EG | ✅ |
| 波斯语（伊朗） | fa-IR | ✅ |
| 印尼语 | id-ID | ✅ |
| 孟加拉语 | bn-BD | ✅ |
| 泰语 | th-TH | ✅ |
| 土耳其语 | tr-TR | ✅ |
| 越南语 | vi-VN | ✅ |

## 目录结构

```
src/locales/
├── zh-CN/                    # 简体中文
│   ├── pages/               # 模块化翻译目录
│   │   ├── index.ts        # 统一导出入口
│   │   ├── common.ts       # 通用翻译
│   │   ├── auth.ts         # 认证相关
│   │   ├── user.ts         # 用户相关
│   │   ├── task.ts         # 任务相关
│   │   ├── project.ts      # 项目相关
│   │   ├── workflow.ts     # 工作流相关
│   │   ├── document.ts     # 公文管理
│   │   ├── iot.ts          # IoT 平台
│   │   ├── park.ts         # 园区管理
│   │   ├── organization.ts # 组织架构
│   │   ├── role.ts         # 角色管理
│   │   ├── company.ts      # 企业相关
│   │   ├── help.ts         # 帮助文档
│   │   ├── xiaoke.ts       # 小科管理
│   │   └── other.ts        # 其他未分类
│   ├── pages.ts            # 统一导出入口（向后兼容）
│   ├── menu.ts
│   ├── component.ts
│   └── ...
├── en-US/                    # 英语
│   ├── pages/
│   │   ├── index.ts
│   │   ├── common.ts
│   │   ├── auth.ts
│   │   └── ...（其他模块）
│   ├── pages.ts
│   └── ...
├── ja-JP/                    # 日语
│   ├── pages/
│   │   └── ...
│   └── ...
└── ...（其他语言）
```

## 模块划分

| 模块 | 文件 | 说明 | 翻译键数量（zh-CN） |
|------|------|------|-------------------|
| 通用 | `common.ts` | 通用操作、按钮、表格、消息等 | 208 |
| 认证 | `auth.ts` | 登录、注册、修改密码、验证码等 | 111 |
| 用户 | `user.ts` | 用户管理、用户详情、个人中心等 | 86 |
| 任务 | `task.ts` | 任务管理、任务详情等 | 121 |
| 项目 | `project.ts` | 项目管理、项目详情等 | 86 |
| 工作流 | `workflow.ts` | 工作流管理、流程监控等 | 269 |
| 公文 | `document.ts` | 公文管理、审批等 | 113 |
| IoT | `iot.ts` | IoT 平台、设备管理等 | 28 |
| 园区 | `park.ts` | 园区管理、租户管理等 | 87 |
| 组织 | `organization.ts` | 组织架构管理等 | 31 |
| 角色 | `role.ts` | 角色管理、权限配置等 | 25 |
| 企业 | `company.ts` | 企业设置、企业切换等 | 87 |
| 帮助 | `help.ts` | 帮助文档、FAQ 等 | 213 |
| 小科 | `xiaoke.ts` | 小科管理、聊天记录等 | 83 |
| 其他 | `other.ts` | 其他未分类的翻译 | 760 |

## 使用方式

### 方式 1：使用默认导出（向后兼容）

```typescript
import pages from '@/locales/zh-CN/pages';

// 使用翻译
const text = pages['pages.login.title'];
```

### 方式 2：导入特定模块（推荐）

```typescript
import auth from '@/locales/zh-CN/pages/auth';

// 使用翻译
const text = auth['pages.login.title'];
```

### 方式 3：使用命名导出

```typescript
import { auth, common } from '@/locales/zh-CN/pages';

// 使用翻译
const text = auth['pages.login.title'];
```

## 优势

### 1. 易于维护
- 每个模块文件独立，便于查找和修改
- 模块划分清晰，职责明确

### 2. AI 友好
- 文件大小适中（每个模块约 5-10KB），AI 可以更容易理解和修改
- 模块化设计，AI 可以专注于特定模块

### 3. 团队协作
- 不同开发者可以并行维护不同模块
- 减少代码冲突

### 4. 性能优化
- 按需加载模块，减少不必要的加载
- 提高构建速度

### 5. 代码清晰
- 模块划分清晰，代码结构更易理解
- 便于新成员快速上手

## 自动化脚本

### 拆分单个语言

```bash
npm run split-locales
```

### 拆分所有语言

```bash
node scripts/split-all-locales.js
```

## 注意事项

1. **向后兼容**：保留了原 `pages.ts` 文件作为入口，确保现有代码不受影响
2. **模块差异**：不同语言的翻译内容可能不同，某些模块可能不存在
3. **键名一致性**：拆分后保持翻译键名不变，确保功能正常
4. **测试验证**：每次拆分后需要测试相关功能

## 文件大小对比

### 拆分前

| 语言 | pages.ts 大小 |
|------|--------------|
| zh-CN | 148KB |
| en-US | 135KB |
| ja-JP | 120KB |
| ... | ... |

### 拆分后

| 语言 | 最大模块 | 总大小 |
|------|---------|--------|
| zh-CN | other.ts (43KB) | 184KB |
| en-US | other.ts (39KB) | 170KB |
| ja-JP | other.ts (35KB) | 160KB |
| ... | ... | ... |

## 常见问题

### Q: 为什么要拆分翻译文件？
A: 原文件过大（148KB），不便于维护和 AI 开发。拆分后每个模块文件更小，更易于理解和修改。

### Q: 拆分后会影响现有功能吗？
A: 不会。我们保留了原 `pages.ts` 文件作为入口，确保向后兼容。

### Q: 如何选择使用哪种导入方式？
A: 推荐使用模块化导入（方式 2），这样可以只加载需要的模块，提高性能。

### Q: 可以逐步拆分吗？
A: 可以。可以按优先级逐步拆分模块，不需要一次性完成。

### Q: AI 如何更好地理解翻译文件？
A: 模块化后，每个文件更小、更聚焦，AI 可以更容易理解每个模块的用途和翻译内容。

### Q: 如何运行拆分脚本？
A: 运行 `npm run split-locales` 拆分单个语言，或 `node scripts/split-all-locales.js` 拆分所有语言。

### Q: 拆分脚本会覆盖现有文件吗？
A: 会。建议先备份原文件，或使用版本控制。

## 相关文件

- `scripts/split-locales.js` - 单语言拆分脚本
- `scripts/split-all-locales.js` - 多语言拆分脚本
- `src/locales/zh-CN/pages/index.ts` - 统一导出入口示例
- `src/locales/zh-CN/pages/common.ts` - 通用翻译模块示例
- `src/locales/zh-CN/pages/auth.ts` - 认证相关模块示例

## 总结

通过模块化拆分翻译文件，我们成功解决了文件过大的问题，同时提供了 AI 友好的开发体验。自动化脚本使得拆分过程简单快捷，向后兼容的设计确保了现有代码的稳定性。所有 18 种语言都已成功拆分，为后续的多语言维护和 AI 辅助开发奠定了良好的基础。
