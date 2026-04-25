# 翻译文件模块化解决方案

## 问题

`pages.ts` 文件过大（148KB，2459行），存在以下问题：
1. 不便于维护和查找
2. AI 难以理解和修改
3. 团队协作困难
4. 性能问题（加载大文件）

## 解决方案

### 1. 模块化拆分

将 `pages.ts` 按功能模块拆分成多个小文件：

```
src/locales/zh-CN/
├── pages/                    # 模块化翻译目录
│   ├── index.ts             # 统一导出入口
│   ├── common.ts            # 通用翻译
│   ├── auth.ts              # 认证相关
│   ├── user.ts              # 用户相关
│   ├── task.ts              # 任务相关
│   ├── project.ts           # 项目相关
│   ├── workflow.ts          # 工作流相关
│   ├── document.ts          # 公文管理
│   ├── iot.ts               # IoT 平台
│   ├── park.ts              # 园区管理
│   ├── organization.ts      # 组织架构
│   ├── role.ts              # 角色管理
│   ├── company.ts           # 企业相关
│   ├── help.ts              # 帮助文档
│   ├── xiaoke.ts            # 小科管理
│   └── ...                  # 其他模块
├── pages.ts                 # 保留，作为向后兼容的入口
├── menu.ts
└── ...
```

### 2. 自动化拆分脚本

提供了自动化脚本 `scripts/split-locales.js`，可以自动拆分翻译文件：

```bash
npm run split-locales
```

### 3. 向后兼容

保留了原 `pages.ts` 文件作为入口，确保现有代码不受影响：

```typescript
// 方式 1：使用默认导出（向后兼容）
import pages from '@/locales/zh-CN/pages';

// 方式 2：导入特定模块（推荐）
import auth from '@/locales/zh-CN/pages/auth';

// 方式 3：使用命名导出
import { auth, common } from '@/locales/zh-CN/pages';
```

## 使用方法

### 快速开始

1. **运行拆分脚本**（自动拆分现有翻译文件）：

```bash
npm run split-locales
```

2. **在组件中使用**：

```typescript
import { auth } from '@/locales/zh-CN/pages';

const text = auth['pages.login.title'];
```

### 手动创建新模块

1. **创建模块文件**：

```typescript
// pages/newModule.ts
export default {
  'pages.newModule.title': '新模块标题',
  'pages.newModule.description': '新模块描述',
};
```

2. **在 index.ts 中导入**：

```typescript
import newModule from './newModule';

export default {
  ...common,
  ...auth,
  ...newModule,
};
```

3. **在组件中使用**：

```typescript
import { newModule } from '@/locales/zh-CN/pages';

const text = newModule['pages.newModule.title'];
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

## 模块划分

| 模块 | 文件 | 说明 | 翻译键数量 |
|------|------|------|-----------|
| 通用 | `common.ts` | 通用操作、按钮、表格、消息等 | ~200 |
| 认证 | `auth.ts` | 登录、注册、修改密码、验证码等 | ~50 |
| 用户 | `user.ts` | 用户管理、用户详情、个人中心等 | ~150 |
| 任务 | `task.ts` | 任务管理、任务详情等 | ~100 |
| 项目 | `project.ts` | 项目管理、项目详情等 | ~80 |
| 工作流 | `workflow.ts` | 工作流管理、流程监控等 | ~200 |
| 公文 | `document.ts` | 公文管理、审批等 | ~100 |
| IoT | `iot.ts` | IoT 平台、设备管理等 | ~50 |
| 园区 | `park.ts` | 园区管理、租户管理等 | ~100 |
| 组织 | `organization.ts` | 组织架构管理等 | ~50 |
| 角色 | `role.ts` | 角色管理、权限配置等 | ~80 |
| 企业 | `company.ts` | 企业设置、企业切换等 | ~100 |
| 帮助 | `help.ts` | 帮助文档、FAQ 等 | ~200 |
| 小科 | `xiaoke.ts` | 小科管理、聊天记录等 | ~100 |
| 其他 | `other.ts` | 其他未分类的翻译 | ~500 |

## 迁移步骤

### 阶段 1：创建模块化结构（已完成）
- ✅ 创建 `pages/` 目录
- ✅ 创建 `common.ts` 和 `auth.ts` 示例模块
- ✅ 创建 `index.ts` 统一导出入口
- ✅ 创建自动化拆分脚本
- ✅ 添加 npm 脚本命令

### 阶段 2：拆分现有翻译（进行中）
- 运行 `npm run split-locales` 自动拆分
- 检查拆分结果
- 调整模块划分（如需要）

### 阶段 3：更新引用（可选）
- 更新组件中的导入语句
- 使用模块化导入方式

### 阶段 4：清理（可选）
- 删除或重命名原 `pages.ts` 文件
- 更新文档

## 注意事项

1. **向后兼容**：保留原 `pages.ts` 文件作为入口，确保现有代码不受影响
2. **渐进式迁移**：可以逐步拆分模块，不需要一次性完成
3. **键名一致性**：拆分后保持翻译键名不变，确保功能正常
4. **测试验证**：每次拆分后需要测试相关功能

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
A: 运行 `npm run split-locales` 即可自动拆分现有翻译文件。

### Q: 拆分脚本会覆盖现有文件吗？
A: 会。建议先备份原文件，或使用版本控制。

## 相关文件

- `src/locales/zh-CN/pages/index.ts` - 统一导出入口
- `src/locales/zh-CN/pages/common.ts` - 通用翻译模块
- `src/locales/zh-CN/pages/auth.ts` - 认证相关模块
- `src/locales/zh-CN/pages/README.md` - 详细使用文档
- `scripts/split-locales.js` - 自动化拆分脚本

## 总结

这个解决方案通过模块化拆分翻译文件，解决了文件过大的问题，同时提供了 AI 友好的开发体验。自动化脚本使得拆分过程简单快捷，向后兼容的设计确保了现有代码的稳定性。
